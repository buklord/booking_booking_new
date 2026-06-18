import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config.js";
import { usersRouter } from "./routes/users.js";
import { testCentresRouter } from "./routes/testCentres.js";
import { slotsRouter } from "./routes/slots.js";
import { scraperRouter } from "./routes/scraper.js";
import { billingRouter } from "./routes/billing.js";
import { scraperAuth } from "./middleware/scraperAuth.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// User-facing routes (in production, protect these with Supabase auth/JWT).
app.use("/api/users", usersRouter);
app.use("/api/test-centres", testCentresRouter);
app.use("/api/billing", billingRouter);

// The scraper reports found slots via POST /api/slots/report; protect it with
// the shared secret. This must be registered BEFORE the slotsRouter mount so
// the auth middleware runs first for that path.
app.use("/api/slots/report", scraperAuth);
app.use("/api/slots", slotsRouter);

// Scraper-facing routes, protected by a shared secret.
app.use("/api/scraper", scraperAuth, scraperRouter);

// Centralized error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.name === "ZodError" ? 400 : err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: err.name === "ZodError" ? "Validation failed" : err.message,
    details: err.name === "ZodError" ? err.errors : undefined,
  });
});

app.listen(env.PORT, () => {
  console.log(`[backend] listening on http://localhost:${env.PORT}`);
});

export { app };
