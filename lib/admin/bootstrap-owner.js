import { redis } from "../_lib/redis.js";

const OWNER_EMAIL = "m.colurci@gmail.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Sicurezza: si può usare SOLO se non esiste ancora un owner
    const existingOwners = await redis.keys("owner:*");
    if (existingOwners && existingOwners.length > 0) {
      return res.status(403).json({ ok: false, error: "Owner already set" });
    }

    const email = OWNER_EMAIL;
    const now = Date.now();

    // Marca owner
    await redis.set(`owner:${email}`, true);

    // Aggiorna/crea record utente come owner
    const userKey = `user:${email}`;
    const existing = await redis.get(userKey);

    const updated = {
      ...(existing || {}),
      email,
      role: "owner",
      updatedAt: now,
      createdAt: existing?.createdAt || now
    };

    await redis.set(userKey, updated);

    return res.status(200).json({
      ok: true,
      owner: { email, role: "owner" }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
