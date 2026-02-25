import { redis } from "../_lib/redis.js";
import { requireRole } from "../_lib/requireRole.js";

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Chi può creare azioni: member/vice/boss/owner (NO none)
  const auth = await requireRole(req, ["member", "vice", "boss", "owner"]);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    // amount: positivo = entrata, negativo = uscita
    const amount = toNumber(body.amount);
    if (amount === null || amount === 0) {
      return res.status(400).json({ ok: false, error: "Invalid amount (must be non-zero number)" });
    }

    const notes = String(body.notes || "").trim();

    const now = Date.now();
    const id = `a_${now}_${Math.random().toString(16).slice(2)}`;

    const action = {
      id,
      at: now,
      amount,
      notes, // NOTE: visibili a tutti (come richiesto)
      by: auth.user.email,
      byRole: auth.user.role || "none"
    };

    // Lista globale azioni (per dashboard/log)
    await redis.lpush("actions:all", action);

    // Indice per utente (comodo dopo)
    await redis.lpush(`actions:by:${auth.user.email}`, action);

    return res.status(200).json({ ok: true, action });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
