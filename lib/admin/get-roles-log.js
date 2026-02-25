import { redis } from "../_lib/redis.js";
import { requireRole } from "../_lib/requireRole.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Solo owner/boss/vice
  const auth = await requireRole(req, ["owner", "boss", "vice"]);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

  try {
    const limitRaw = req.query?.limit;
    const limit = Math.max(1, Math.min(200, Number(limitRaw || 50)));

    // lrange 0..limit-1 (Upstash supporta lrange)
    const items = await redis.lrange("logs:roles", 0, limit - 1);

    return res.status(200).json({
      ok: true,
      count: (items || []).length,
      items: items || []
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
