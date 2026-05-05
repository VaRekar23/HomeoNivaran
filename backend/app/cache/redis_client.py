import json
import logging
from typing import Any, Optional
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger(__name__)

# Single shared connection pool
_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Get the shared Redis connection pool."""
    global _redis_pool

    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            max_connections=20,
        )

    return _redis_pool


async def close_redis():
    """Close the Redis connection pool on app shutdown."""
    global _redis_pool
    if _redis_pool:
        await _redis_pool.aclose()
        _redis_pool = None


async def cache_get(key: str) -> Optional[Any]:
    """
    Get a value from cache.
    Returns None if key not found OR if Redis is unavailable.
    Never raises — cache misses are silently handled.
    """
    if not settings.cache_enabled:
        return None

    try:
        redis = await get_redis()
        value = await redis.get(key)
        if value is None:
            return None
        return json.loads(value)
    except Exception as e:
        # Log warning but never crash because of cache failure
        logger.warning(f"Cache GET failed for key '{key}': {e}")
        return None


async def cache_set(
    key: str,
    value: Any,
    ttl_seconds: int
) -> bool:
    """
    Store a value in cache with expiry.
    Returns True on success, False if Redis unavailable.
    Never raises.
    """
    if not settings.cache_enabled:
        return False

    try:
        redis = await get_redis()
        serialized = json.dumps(value, default=str)
        # default=str handles UUID and datetime serialization
        await redis.setex(key, ttl_seconds, serialized)
        return True
    except Exception as e:
        logger.warning(f"Cache SET failed for key '{key}': {e}")
        return False


async def cache_delete(key: str) -> bool:
    """Delete a key from cache. Never raises."""
    try:
        redis = await get_redis()
        await redis.delete(key)
        return True
    except Exception as e:
        logger.warning(f"Cache DELETE failed for key '{key}': {e}")
        return False


async def cache_delete_pattern(pattern: str) -> int:
    """
    Delete all keys matching a pattern.
    e.g. pattern="ai_questions:*" deletes all question caches.
    Returns number of deleted keys.
    """
    try:
        redis = await get_redis()
        keys = await redis.keys(pattern)
        if keys:
            deleted = await redis.delete(*keys)
            logger.info(
                f"Cache: deleted {deleted} keys matching '{pattern}'"
            )
            return deleted
        return 0
    except Exception as e:
        logger.warning(
            f"Cache DELETE pattern failed for '{pattern}': {e}"
        )
        return 0


async def get_cache_stats() -> dict:
    """Returns Redis stats for the health check endpoint."""
    try:
        redis = await get_redis()
        info = await redis.info("stats")
        keyspace = await redis.info("keyspace")
        memory = await redis.info("memory")

        total_keys = 0
        for db_info in keyspace.values():
            if isinstance(db_info, str):
                # Parse "keys=5,expires=3,avg_ttl=86400000"
                for part in db_info.split(","):
                    if part.startswith("keys="):
                        total_keys += int(part.split("=")[1])

        return {
            "status":           "connected",
            "total_keys":       total_keys,
            "hits":             info.get("keyspace_hits", 0),
            "misses":           info.get("keyspace_misses", 0),
            "memory_used":      memory.get("used_memory_human", "N/A"),
        }
    except Exception as e:
        return {
            "status":  "unavailable",
            "error":   str(e),
        }