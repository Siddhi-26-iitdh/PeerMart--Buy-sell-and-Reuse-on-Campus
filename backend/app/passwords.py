import os

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def demo_password() -> str:
    password = os.getenv("PEERMART_DEMO_PASSWORD")
    if not password:
        raise RuntimeError("PEERMART_DEMO_PASSWORD must be configured")
    return password
