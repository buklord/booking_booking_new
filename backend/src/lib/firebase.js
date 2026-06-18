import fs from "node:fs";
import admin from "firebase-admin";
import { env } from "../config.js";

let initialized = false;

// Lazily initialize the Firebase Admin SDK so the server can boot without
// credentials (e.g. for the health check), and only fail when push is needed.
function ensureInit() {
  if (initialized) return;

  const credPath = env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !fs.existsSync(credPath)) {
    throw new Error(
      "Firebase service account not found. Set GOOGLE_APPLICATION_CREDENTIALS " +
        "to the path of your firebase-service-account.json.",
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  initialized = true;
}

/**
 * Send a push notification to a single device token.
 * @returns {Promise<string>} FCM message id
 */
export async function sendPush(deviceToken, { title, body, data = {} }) {
  ensureInit();
  return admin.messaging().send({
    token: deviceToken,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)]),
    ),
    android: { priority: "high" },
    apns: { headers: { "apns-priority": "10" } },
  });
}
