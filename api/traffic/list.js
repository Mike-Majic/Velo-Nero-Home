import { redis } from "../_lib/redis.js";
import { requireRole } from "../_lib/requireRole.js";

function normArea(v) {
  const a = String(v || "").trim().toLowerCase();
  if (a === "armi" || a === "droga") return a;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Tutti gli utenti autenticati possono leggere (anche none)
  const auth = await requireRole(req, ["none", "member", "vice", "boss", "owner"]);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

  try {
    const area = normArea(req.query?.area);
    const limitRaw = req.query?.limit;
    const limit = Math.max(1, Math.min(200, Number(limitRaw || 100)));

    const key = area ? `traffic:${area}` : "traffic:all";
    const items = await redis.lrange(key, 0, limit - 1);

    return res.status(200).json({
      ok: true,
      area: area || "all",
      count: (items || []).length,
      items: items || []
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
