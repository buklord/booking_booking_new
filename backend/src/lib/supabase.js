import { createClient } from "@supabase/supabase-js";
import { env } from "../config.js";

// Server-side Supabase client using the service-role key. This bypasses RLS, so
// it must only ever run on the backend, never in the mobile app.
//
// The real client is created lazily on first use so the server can still boot
// (e.g. for the /health check) without a fully populated .env. Requests that
// actually touch the database will throw a clear error if config is missing.
let client = null;

function getClient() {
  if (client) return client;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    );
  }
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// Proxy that defers client creation until a property (e.g. `.from`) is accessed.
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const real = getClient();
      const value = real[prop];
      return typeof value === "function" ? value.bind(real) : value;
    },
  },
);
