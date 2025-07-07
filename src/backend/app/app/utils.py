from datetime import datetime, timedelta
import re
from typing import Any, Dict, List, Optional, Tuple

from jose import jwt
from app.core.config import settings


def generate_password_reset_token(email: str) -> str:
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.utcnow()
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email}, settings.SECRET_KEY, algorithm="HS256",
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> Optional[str]:
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return decoded_token["email"]
    except jwt.JWTError:
        return None


def parse_period(period: str) -> Tuple[str, int, str]:
    match = re.match(r"^([A-Za-z]+)(?:\s+([IVXivx]+))?([a-zA-Z0-9]*)$", period)
    if not match:
        return (period, 0, "")

    prefix, roman, suffix = match.groups()

    if not roman:
        digit_match = re.match(r"^([A-Za-z]+)([0-9]*)$", prefix)
        if digit_match and digit_match.group(2):
            return (digit_match.group(1), int(digit_match.group(2)), suffix or "")
        return (prefix, 0, suffix or "")

    roman_map = {"i": 1, "v": 5, "x": 10, "l": 50, "c": 100, "d": 500, "m": 1000}
    roman = roman.lower()
    roman_value = 0
    prev_value = 0

    for char in reversed(roman):
        curr_value = roman_map[char]
        if curr_value >= prev_value:
            roman_value += curr_value
        else:
            roman_value -= curr_value
        prev_value = curr_value

    return (prefix, roman_value, suffix or "")
