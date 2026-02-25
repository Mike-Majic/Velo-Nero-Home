import { redis } from "../_lib/redis.js";
import { requireRole } from "../_lib/requireRole.js";

function safeUser(u) {
  return {
    email: u?.email || "",
    name: u?.name || "",
    picture: u?.picture || "",
    role: u?.role || "none",
    createdAt: u?.createdAt || null,
    updatedAt: u?.updatedAt || null
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Visibile solo a owner/boss/vice
  const auth = await requireRole(req, ["owner", "boss", "vice"]);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

  try {
    // Legge tutte le chiavi "user:*"
    const keys = await redis.keys("user:*");

    if (!keys || keys.length === 0) {
      return res.status(200).json({ ok: true, users: [] });
    }

    // Prende tutti gli utenti in batch
    const users = await redis.mget(...keys);

    const cleaned = (users || [])
      .filter(Boolean)
      .map(safeUser)
      .sort((a, b) => {
        // prima owner/boss/vice, poi member, poi none
        const rank = { owner: 4, boss: 3, vice: 2, member: 1, none: 0 };
        const ra = rank[a.role] ?? 0;
        const rb = rank[b.role] ?? 0;
        if (rb !== ra) return rb - ra;
        return (a.email || "").localeCompare(b.email || "");
      });

    return res.status(200).json({
      ok: true,
      count: cleaned.length,
      users: cleaned
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
