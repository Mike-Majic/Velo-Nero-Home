import { redis } from "../_lib/redis.js";
import { requireRole } from "../_lib/requireRole.js";

function normStr(v) {
  return String(v || "").trim();
}

function dayFromMs(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Solo chi ha ruolo (NO none) può scrivere nel diario
  const auth = await requireRole(req, ["member", "vice", "boss", "owner"]);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const title = normStr(body.title);
    const text = normStr(body.text);

    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });

    const now = Date.now();
    const id = `d_${now}_${Math.random().toString(16).slice(2)}`;
    const day = dayFromMs(now);

    const entry = {
      id,
      at: now,
      day,
      title,
      text,
      by: auth.user.email,
      byRole: auth.user.role || "none"
    };

    // lista globale (ultimi in cima)
    await redis.lpush("diary:all", entry);
    // lista per giorno (ultimi in cima)
    await redis.lpush(`diary:day:${day}`, entry);

    return res.status(200).json({ ok: true, entry });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
