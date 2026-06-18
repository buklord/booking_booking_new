"""Scraper configuration loaded from environment variables."""
import os

from dotenv import load_dotenv

load_dotenv()


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")
SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY", "change-me")

DVSA_LOGIN_URL = os.getenv(
    "DVSA_LOGIN_URL", "https://driverpracticaltest.dvsa.gov.uk/login"
)

POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", "60"))
HEADLESS = _bool("HEADLESS", True)

USE_MOCK = _bool("USE_MOCK", True)
MOCK_URL = os.getenv("MOCK_URL", "http://localhost:8000")
