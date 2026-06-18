import { Router } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

export const billingRouter = Router();

/**
 * MOCK premium upgrade. In production this would create a Stripe Checkout
 * session and the upgrade would happen via a Stripe webhook. For now we simply
 * flip the is_premium flag so the mobile app flow can be demonstrated.
 */
billingRouter.post("/mock-upgrade", async (req, res, next) => {
  try {
    const { user_id } = z.object({ user_id: z.string().uuid() }).parse(req.body);
    const { data, error } = await supabase
      .from("users")
      .update({ is_premium: true })
      .eq("id", user_id)
      .select("id, email, is_premium")
      .single();
    if (error) throw error;
    res.json({ ...data, note: "Mock upgrade - no real payment was taken." });
  } catch (err) {
    next(err);
  }
});
