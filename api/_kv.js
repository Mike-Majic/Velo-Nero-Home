import { kv } from "@vercel/kv";

export { kv };

export const KEYS = {
  user: (email) => `user:${(email || "").toLowerCase()}`,
  usersIndex: `users:index`,
  trusted: (email, deviceId) => `trusted:${(email || "").toLowerCase()}:${deviceId}`,
  loginLogs: `logs:login`,
  activityLogs: `logs:activity`
};

export const OWNER_EMAIL = "m.colurci@gmail.com";
