import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { decrypt } from "../lib/crypto.js";

export const scraperRouter = Router();

/**
 * Returns the list of active "watch jobs" the scraper should run: each user
 * with their decrypted DVSA credentials and active test centres.
 * Protected by the scraper shared-secret middleware (mounted in index.js).
 */
scraperRouter.get("/jobs", async (_req, res, next) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select(
        "id, dvsa_username, dvsa_password_enc, current_test_date, test_centres(id, name, dvsa_id, is_active)",
      );
    if (error) throw error;

    const jobs = (users ?? [])
      .filter((u) => u.dvsa_username && u.dvsa_password_enc)
      .map((u) => ({
        user_id: u.id,
        dvsa_username: u.dvsa_username,
        dvsa_password: decrypt(u.dvsa_password_enc),
        current_test_date: u.current_test_date,
        test_centres: (u.test_centres ?? []).filter((c) => c.is_active),
      }))
      .filter((j) => j.test_centres.length > 0);

    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});
