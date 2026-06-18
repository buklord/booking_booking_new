"""
Entry point for the DVSA cancellation scraper.

Every POLL_INTERVAL_SECONDS it:
  1. fetches watch jobs from the backend,
  2. for each user, checks their active test centres for slots,
  3. reports any found slots back to the backend (which notifies via FCM).
"""
from __future__ import annotations

import logging
import time

import httpx

from backend_client import BackendClient
from config import POLL_INTERVAL_SECONDS, USE_MOCK
from dvsa_scraper import DvsaScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [scraper] %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)


def run_once(client: BackendClient, scraper: DvsaScraper) -> None:
    try:
        jobs = client.get_jobs()
    except httpx.HTTPError as exc:
        log.error("Failed to fetch jobs from backend: %s", exc)
        return

    log.info("Processing %d job(s)", len(jobs))
    for job in jobs:
        user_id = job["user_id"]
        centres = job.get("test_centres", [])
        try:
            found = scraper.find_slots(
                job.get("dvsa_username", ""),
                job.get("dvsa_password", ""),
                centres,
            )
        except Exception as exc:  # noqa: BLE001 - keep the loop alive
            log.exception("Scrape failed for user %s: %s", user_id, exc)
            continue

        for centre_id, slots in found.items():
            if not slots:
                continue
            try:
                result = client.report_slots(user_id, centre_id, slots)
                log.info(
                    "User %s centre %s: %d slot(s) found, %s inserted, %s notified",
                    user_id,
                    centre_id,
                    len(slots),
                    result.get("inserted"),
                    result.get("notified"),
                )
            except httpx.HTTPError as exc:
                log.error("Failed to report slots: %s", exc)


def main() -> None:
    client = BackendClient()
    scraper = DvsaScraper()
    log.info(
        "Starting scraper (interval=%ss, mock=%s)",
        POLL_INTERVAL_SECONDS,
        USE_MOCK,
    )
    while True:
        run_once(client, scraper)
        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
