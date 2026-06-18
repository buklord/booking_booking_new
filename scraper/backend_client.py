"""Thin HTTP client for talking to the Node backend."""
from __future__ import annotations

import httpx

from config import BACKEND_URL, SCRAPER_API_KEY


class BackendClient:
    def __init__(self, base_url: str = BACKEND_URL, api_key: str = SCRAPER_API_KEY):
        self._base_url = base_url.rstrip("/")
        self._headers = {"x-scraper-key": api_key}

    def get_jobs(self) -> list[dict]:
        """Fetch the watch jobs (users + their active test centres)."""
        resp = httpx.get(
            f"{self._base_url}/api/scraper/jobs",
            headers=self._headers,
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("jobs", [])

    def report_slots(
        self, user_id: str, test_centre_id: str, slot_datetimes: list[str]
    ) -> dict:
        """Report found cancellation slots so the backend can notify the user."""
        resp = httpx.post(
            f"{self._base_url}/api/slots/report",
            headers=self._headers,
            json={
                "user_id": user_id,
                "test_centre_id": test_centre_id,
                "slots": slot_datetimes,
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()
