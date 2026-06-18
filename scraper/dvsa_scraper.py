"""
DVSA cancellation scraper using Playwright.

IMPORTANT - LEGAL / ToS NOTICE
------------------------------
Automating logins to and scraping of the DVSA booking website is against DVSA's
terms of use, and DVSA actively deploys anti-bot protection (queue systems,
Incapsula/Imperva, CAPTCHAs). The selectors below are PLACEHOLDERS and the real
DVSA flow will require maintenance, proxying and bot-mitigation handling that is
intentionally not implemented here. Use the bundled mock site (USE_MOCK=true)
for development. Running this against the real site is at your own risk.
"""
from __future__ import annotations

from datetime import datetime
from typing import Iterable

from playwright.sync_api import Page, sync_playwright

from config import DVSA_LOGIN_URL, HEADLESS, MOCK_URL, USE_MOCK


class DvsaScraper:
    """Logs in and reads available cancellation slots for given test centres."""

    def __init__(self, headless: bool = HEADLESS):
        self._headless = headless

    # -- public API ---------------------------------------------------------

    def find_slots(
        self, username: str, password: str, test_centres: Iterable[dict]
    ) -> dict[str, list[str]]:
        """
        Return a mapping of test_centre_id -> list of ISO8601 slot datetimes.
        """
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=self._headless)
            context = browser.new_context()
            page = context.new_page()
            try:
                if USE_MOCK:
                    return self._scrape_mock(page, test_centres)
                self._login(page, username, password)
                return self._scrape_real(page, test_centres)
            finally:
                context.close()
                browser.close()

    # -- mock implementation (for local dev/testing) ------------------------

    def _scrape_mock(self, page: Page, test_centres: Iterable[dict]) -> dict:
        """Scrape the bundled mock site, which mirrors the real DOM shape."""
        results: dict[str, list[str]] = {}
        for centre in test_centres:
            page.goto(f"{MOCK_URL}/centre/{centre.get('dvsa_id', 'mock')}")
            slots = self._read_slots(page)
            if slots:
                results[centre["id"]] = slots
        return results

    # -- real DVSA implementation (PLACEHOLDER selectors) -------------------

    def _login(self, page: Page, username: str, password: str) -> None:
        page.goto(DVSA_LOGIN_URL)
        # NOTE: placeholder selectors - update to match the live DVSA DOM.
        page.fill("#username", username)
        page.fill("#password", password)
        page.click("button[type=submit]")
        page.wait_for_load_state("networkidle")

    def _scrape_real(self, page: Page, test_centres: Iterable[dict]) -> dict:
        results: dict[str, list[str]] = {}
        for centre in test_centres:
            # Placeholder navigation - the real flow searches by centre/postcode.
            page.fill("#test-centres", centre["name"])
            page.click("#search")
            page.wait_for_load_state("networkidle")
            slots = self._read_slots(page)
            if slots:
                results[centre["id"]] = slots
        return results

    # -- shared DOM reader --------------------------------------------------

    def _read_slots(self, page: Page) -> list[str]:
        """
        Read slot elements from the page. Both the mock and the (expected) real
        DOM expose available slots as elements with [data-slot-datetime].
        """
        slots: list[str] = []
        for el in page.query_selector_all("[data-slot-datetime]"):
            value = el.get_attribute("data-slot-datetime")
            if not value:
                continue
            # Validate it parses as a datetime; normalise to ISO 8601.
            try:
                dt = datetime.fromisoformat(value)
            except ValueError:
                continue
            slots.append(dt.isoformat())
        return sorted(set(slots))
