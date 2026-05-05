import bcrypt

def hash_password(plain_password: str) -> str:
    """
    Hashes a plain text password using bcrypt.
    Returns a hashed string safe to store in the database.
    """
    # Step 1 — encode string to bytes (bcrypt works with bytes, not strings)
    password_bytes = plain_password.encode("utf-8")

    # Step 2 — generate a salt and hash the password
    # rounds=12 means bcrypt runs 2^12 = 4096 iterations
    # more rounds = slower = harder to brute force
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)

    # Step 3 — decode back to string for storing in DB (VARCHAR column)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against a stored hash.
    Returns True if they match, False otherwise.
    """
    # Encode both to bytes for comparison
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")

    # bcrypt.checkpw handles the comparison securely
    # It's timing-safe — takes same time whether match or not
    # This prevents timing attacks
    return bcrypt.checkpw(password_bytes, hashed_bytes)