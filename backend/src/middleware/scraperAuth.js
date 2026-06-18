import { env } from "../config.js";

// Simple shared-secret auth for endpoints the Python scraper calls.
export function scraperAuth(req, res, next) {
  const provided = req.get("x-scraper-key");
  if (!provided || provided !== env.SCRAPER_API_KEY) {
    return res.status(401).json({ error: "Invalid or missing scraper API key" });
  }
  next();
}
