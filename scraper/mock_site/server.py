"""
A tiny mock of the DVSA booking site for local development and testing.

It serves pages at /centre/<id> that expose fake available slots as elements
with a [data-slot-datetime] attribute - the same selector the scraper reads on
the real site. Run with:

    python scraper/mock_site/server.py

Then set USE_MOCK=true and MOCK_URL=http://localhost:8000 in scraper/.env.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 8000


def _fake_slots() -> list[str]:
    """Return 0-4 random upcoming slots so the scraper sees changing data."""
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    count = random.randint(0, 4)
    slots = []
    for _ in range(count):
        days = random.randint(1, 30)
        hour = random.choice([9, 10, 11, 13, 14, 15])
        slots.append((now + timedelta(days=days)).replace(hour=hour).isoformat())
    return sorted(set(slots))


def _render(centre_id: str, slots: list[str]) -> bytes:
    items = "\n".join(
        f'    <li class="slot" data-slot-datetime="{s}">{s}</li>' for s in slots
    )
    html = f"""<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Mock DVSA - {centre_id}</title></head>
<body>
  <h1>Mock DVSA test centre: {centre_id}</h1>
  <ul id="available-slots">
{items if slots else '    <li class="no-slots">No slots available</li>'}
  </ul>
</body>
</html>"""
    return html.encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 - http.server API
        if self.path.startswith("/centre/"):
            centre_id = self.path.split("/centre/", 1)[1] or "unknown"
            body = _render(centre_id, _fake_slots())
            self.send_response(200)
        else:
            body = b"<h1>Mock DVSA site</h1><p>Try /centre/&lt;id&gt;</p>"
            self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):  # silence default noisy logging
        pass


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Mock DVSA site running at http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
