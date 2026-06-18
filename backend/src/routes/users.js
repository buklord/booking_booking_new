import { Router } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { encrypt } from "../lib/crypto.js";

export const usersRouter = Router();

const upsertUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().optional(),
  driving_licence_no: z.string().optional(),
  dvsa_username: z.string().optional(),
  dvsa_password: z.string().optional(),
  current_test_date: z.string().datetime().optional(),
  current_test_centre: z.string().optional(),
  fcm_device_token: z.string().optional(),
});

// Public, non-sensitive view of a user row.
function publicUser(row) {
  if (!row) return null;
  // Never return the encrypted password blob.
  const { dvsa_password_enc: _omit, ...safe } = row;
  return safe;
}

// Create or update a user by email.
usersRouter.post("/", async (req, res, next) => {
  try {
    const parsed = upsertUserSchema.parse(req.body);
    const { dvsa_password, ...rest } = parsed;

    const payload = { ...rest };
    if (dvsa_password) {
      payload.dvsa_password_enc = encrypt(dvsa_password);
    }

    const { data, error } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "email" })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(publicUser(data));
  } catch (err) {
    next(err);
  }
});

// Get a user by id.
usersRouter.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.params.id)
      .single();
    if (error) throw error;
    res.json(publicUser(data));
  } catch (err) {
    next(err);
  }
});

// Update the device push token.
usersRouter.put("/:id/device-token", async (req, res, next) => {
  try {
    const { fcm_device_token } = z
      .object({ fcm_device_token: z.string() })
      .parse(req.body);
    const { data, error } = await supabase
      .from("users")
      .update({ fcm_device_token })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(publicUser(data));
  } catch (err) {
    next(err);
  }
});
