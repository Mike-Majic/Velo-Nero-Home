import { redis } from "../_lib/redis.js";
import { requireRole } from "../_lib/requireRole.js";

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normStr(v) {
  return String(v || "").trim();
}

function normArea(v) {
  const a = normStr(v).toLowerCase();
  if (a === "armi" || a === "droga") return a;
  return null;
}

function normType(v) {
  const t = normStr(v).toLowerCase();
  // tipi “neutri” per RP/gestione interna
  if (t === "acquisto" || t === "vendita" || t === "movimento") return t;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // solo chi ha ruolo (NO none)
  const auth = await requireRole(req, ["member", "vice", "boss", "owner"]);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const area = normArea(body.area);
    const type = normType(body.type);
    const qty = toNumber(body.qty);
    const item = normStr(body.item);
    const notes = normStr(body.notes);

    if (!area) return res.status(400).json({ ok: false, error: "Invalid area (armi/droga)" });
    if (!type) return res.status(400).json({ ok: false, error: "Invalid type (acquisto/vendita/movimento)" });
    if (qty === null || qty <= 0) return res.status(400).json({ ok: false, error: "Invalid qty (must be > 0)" });
    if (!item) return res.status(400).json({ ok: false, error: "Missing item" });

    const now = Date.now();
    const id = `t_${now}_${Math.random().toString(16).slice(2)}`;

    const record = {
      id,
      at: now,
      area,     // "armi" | "droga"
      type,     // "acquisto" | "vendita" | "movimento"
      item,     // nome/descrizione RP
      qty,      // quantità (numero)
      notes,    // note (visibili dove decidi tu nel frontend)
      by: auth.user.email,
      byRole: auth.user.role || "none"
    };

    await redis.lpush("traffic:all", record);
    await redis.lpush(`traffic:${area}`, record);

    return res.status(200).json({ ok: true, record });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
