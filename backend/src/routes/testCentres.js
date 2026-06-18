import { Router } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

export const testCentresRouter = Router();

const createSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(1),
  dvsa_id: z.string().optional(),
});

// List a user's watched test centres.
testCentresRouter.get("/", async (req, res, next) => {
  try {
    const userId = z.string().uuid().parse(req.query.user_id);
    const { data, error } = await supabase
      .from("test_centres")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Add a test centre to watch.
testCentresRouter.post("/", async (req, res, next) => {
  try {
    const payload = createSchema.parse(req.body);
    const { data, error } = await supabase
      .from("test_centres")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// Toggle/active or rename a test centre.
testCentresRouter.put("/:id", async (req, res, next) => {
  try {
    const patch = z
      .object({
        name: z.string().min(1).optional(),
        dvsa_id: z.string().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(req.body);
    const { data, error } = await supabase
      .from("test_centres")
      .update(patch)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Remove a test centre.
testCentresRouter.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await supabase
      .from("test_centres")
      .delete()
      .eq("id", req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
