import { Router } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { sendPush } from "../lib/firebase.js";

export const slotsRouter = Router();

// List slots found for a user (most recent first).
slotsRouter.get("/", async (req, res, next) => {
  try {
    const userId = z.string().uuid().parse(req.query.user_id);
    const { data, error } = await supabase
      .from("available_slots")
      .select("*, test_centres(name)")
      .eq("user_id", userId)
      .order("slot_datetime", { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

const reportSchema = z.object({
  user_id: z.string().uuid(),
  test_centre_id: z.string().uuid(),
  // DVSA slot times are local (no timezone), so accept both offset and local
  // ISO 8601 datetimes.
  slots: z.array(z.string().datetime({ offset: true, local: true })).min(1),
});

/**
 * Called by the scraper when it finds cancellation slots.
 * Inserts new slots (idempotent via unique constraint) and pushes a
 * notification for slots earlier than the user's current test date.
 * Protected by the scraper shared-secret middleware (mounted in index.js).
 */
slotsRouter.post("/report", async (req, res, next) => {
  try {
    const { user_id, test_centre_id, slots } = reportSchema.parse(req.body);

    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, fcm_device_token, current_test_date")
      .eq("id", user_id)
      .single();
    if (userErr) throw userErr;

    const rows = slots.map((slot_datetime) => ({
      user_id,
      test_centre_id,
      slot_datetime,
    }));

    // Upsert ignoring duplicates so we only act on genuinely new slots.
    const { data: inserted, error: insErr } = await supabase
      .from("available_slots")
      .upsert(rows, { onConflict: "test_centre_id,slot_datetime", ignoreDuplicates: true })
      .select();
    if (insErr) throw insErr;

    const currentDate = user.current_test_date
      ? new Date(user.current_test_date)
      : null;

    // Only notify for slots that beat the user's current booked date.
    const newSlots = (inserted ?? []).filter(
      (s) => !currentDate || new Date(s.slot_datetime) < currentDate,
    );

    let notified = 0;
    if (newSlots.length > 0 && user.fcm_device_token) {
      const soonest = newSlots
        .map((s) => s.slot_datetime)
        .sort()[0];
      try {
        await sendPush(user.fcm_device_token, {
          title: "Driving test cancellation found!",
          body: `${newSlots.length} earlier slot(s) available. Soonest: ${new Date(
            soonest,
          ).toLocaleString("en-GB")}`,
          data: { type: "slot_found", test_centre_id },
        });
        notified = newSlots.length;
        await supabase
          .from("available_slots")
          .update({ notified: true })
          .in(
            "id",
            newSlots.map((s) => s.id),
          );
      } catch (pushErr) {
        // Don't fail the whole request if push delivery fails.
        console.error("[slots] push failed:", pushErr.message);
      }
    }

    res.status(201).json({
      inserted: inserted?.length ?? 0,
      notified,
    });
  } catch (err) {
    next(err);
  }
});
