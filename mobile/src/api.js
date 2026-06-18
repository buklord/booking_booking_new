import Constants from "expo-constants";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  // Create/update the user (acts as "login" for this MVP).
  upsertUser: (body) =>
    request("/api/users", { method: "POST", body: JSON.stringify(body) }),

  getUser: (id) => request(`/api/users/${id}`),

  setDeviceToken: (id, fcm_device_token) =>
    request(`/api/users/${id}/device-token`, {
      method: "PUT",
      body: JSON.stringify({ fcm_device_token }),
    }),

  listTestCentres: (userId) =>
    request(`/api/test-centres?user_id=${encodeURIComponent(userId)}`),

  addTestCentre: (body) =>
    request("/api/test-centres", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  removeTestCentre: (id) =>
    request(`/api/test-centres/${id}`, { method: "DELETE" }),

  listSlots: (userId) =>
    request(`/api/slots?user_id=${encodeURIComponent(userId)}`),

  mockUpgrade: (userId) =>
    request("/api/billing/mock-upgrade", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),
};

export { API_URL };
