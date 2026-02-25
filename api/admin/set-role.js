import { redis } from "../_lib/redis.js";
import { requireRole } from "../_lib/requireRole.js";

function normalizeEmail(email) {
return String(email || "").trim().toLowerCase();
}

const ALLOWED_TARGET_ROLES = ["none", "member", "vice", "boss", "owner"];

function canAssign(actorRole, targetRole) {
if (!ALLOWED_TARGET_ROLES.includes(targetRole)) return false;

// owner può assegnare tutto
if (actorRole === "owner") return true;

// boss non può promuovere a owner
if (actorRole === "boss") return targetRole !== "owner";

// vice può solo dare/togliere membership base
if (actorRole === "vice") return targetRole === "member" || targetRole === "none";

return false;
}

export default async function handler(req, res) {
if (req.method !== "POST") {
res.setHeader("Allow", "POST");
return res.status(405).json({ ok: false, error: "Method not allowed" });
}

// Solo owner/boss/vice possono entrare qui
const auth = await requireRole(req, ["owner", "boss", "vice"]);
if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

try {
const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
const email = normalizeEmail(body.email);
const role = String(body.role || "").trim().toLowerCase();

if (!email || !email.includes("@")) {
  return res.status(400).json({ ok: false, error: "Missing/invalid email" });
}
if (!ALLOWED_TARGET_ROLES.includes(role)) {
  return res.status(400).json({ ok: false, error: "Invalid role" });
}

const actorRole = (auth.user?.role || "none").toLowerCase();
const actorEmail = auth.user?.email || "unknown";

if (!canAssign(actorRole, role)) {
  return res.status(403).json({ ok: false, error: "You cannot assign this role" });
}

const userKey = `user:${email}`;
const existing = await redis.get(userKey);

const now = Date.now();
const updated = {
  ...(existing || {}),
  email,
  role,
  updatedAt: now,
  createdAt: existing?.createdAt || now
};

await redis.set(userKey, updated);

// Log semplice (utile dopo in logs.html)
await redis.lpush("logs:roles", {
  at: now,
  action: "set-role",
  by: actorEmail,
  byRole: actorRole,
  target: email,
  role
});

return res.status(200).json({
  ok: true,
  user: {
    email: updated.email,
    role: updated.role
  }
});

} catch (err) {
return res.status(500).json({ ok: false, error: err?.message || String(err) });
}
}
