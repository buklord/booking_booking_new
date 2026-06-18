import dotenv from "dotenv";

dotenv.config();

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    // We warn rather than throw so the server can still boot in dev without a
    // full .env (e.g. to hit the health check). Routes that need a given value
    // will fail loudly when actually used.
    console.warn(`[config] Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  CREDENTIALS_ENCRYPTION_KEY: required("CREDENTIALS_ENCRYPTION_KEY"),
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
  SCRAPER_API_KEY: required("SCRAPER_API_KEY", "change-me"),
};
