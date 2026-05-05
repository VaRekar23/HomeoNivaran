import httpx
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def send_telegram_alert(
    message: str,
    parse_mode: str = "HTML"
) -> bool:
    """
    Sends a message to the configured Telegram chat.
    Returns True if successful, False otherwise.
    Never raises — logging must never crash the app.
    """
    from app.config import settings

    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return False

    url = (
        f"https://api.telegram.org/bot"
        f"{settings.telegram_bot_token}/sendMessage"
    )

    payload = {
        "chat_id":    settings.telegram_chat_id,
        "text":       message,
        "parse_mode": parse_mode,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, json=payload)
            return response.status_code == 200
    except Exception as e:
        # Log to console only — don't recurse into DB logging
        print(f"[TELEGRAM] Failed to send alert: {e}")
        return False


def format_critical_alert(
    message:        str,
    module:         str = "",
    function_name:  str = "",
    line_number:    int = 0,
    request_url:    str = "",
    request_method: str = "",
    traceback:      str = "",
) -> str:
    """Formats a critical error into a readable Telegram message."""
    now = datetime.now(timezone.utc).strftime("%d %b %Y %H:%M:%S UTC")

    lines = [
        "🚨 <b>CRITICAL ERROR — HomeoNivaran</b>",
        "",
        f"🕐 <b>Time:</b> {now}",
        f"💬 <b>Error:</b> {_truncate(message, 300)}",
    ]

    if module:
        lines.append(f"📁 <b>Module:</b> {module}")
    if function_name:
        lines.append(f"🔧 <b>Function:</b> {function_name}()")
    if line_number:
        lines.append(f"📍 <b>Line:</b> {line_number}")
    if request_method and request_url:
        lines.append(
            f"🌐 <b>Request:</b> {request_method} {_truncate(request_url, 100)}"
        )
    if traceback:
        # Show last 5 lines of traceback — most relevant
        tb_lines = [
            l for l in traceback.strip().splitlines() if l.strip()
        ]
        last_lines = tb_lines[-5:] if len(tb_lines) > 5 else tb_lines
        tb_preview = "\n".join(last_lines)
        lines.append(
            f"\n🔍 <b>Traceback (last lines):</b>\n"
            f"<code>{_truncate(tb_preview, 500)}</code>"
        )

    lines.append("")
    lines.append("📊 Check Admin → Error Logs for full details")

    return "\n".join(lines)


def _truncate(text: str, max_len: int) -> str:
    """Truncates text with ellipsis if over max length."""
    if not text:
        return ""
    return text[:max_len] + "..." if len(text) > max_len else text