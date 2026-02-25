import { redis } from "../_lib/redis.js";
import { createToken, setCookie } from "../_lib/auth.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const email = normalizeEmail(body.email);

    if (!email || !email.includes("@")) {
      return res.status(400).json({ ok: false, error: "Missing/invalid email" });
    }

    // Dati opzionali (arriveranno dal frontend dopo login Google)
    const name = (body.name || "").toString().trim();
    const picture = (body.picture || "").toString().trim();
    const provider = (body.provider || "google").toString().trim();
    const providerSub = (body.sub || "").toString().trim();

    const userKey = `user:${email}`;

    // Se utente non esiste: crealo con ruolo default "none"
    const existing = await redis.get(userKey);

    let user;
    if (!existing) {
      user = {
        email,
        name,
        picture,
        provider,
        sub: providerSub,
        role: "none",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await redis.set(userKey, user);
    } else {
      user = {
        ...existing,
        // aggiorna solo se arrivano valori
        name: name || existing.name || "",
        picture: picture || existing.picture || "",
        provider: provider || existing.provider || "google",
        sub: providerSub || existing.sub || "",
        updatedAt: Date.now()
      };
      await redis.set(userKey, user);
    }

    // Token: contiene email + role (ruolo server-side)
    const token = await createToken({
      email: user.email,
      role: user.role,
      name: user.name || "",
      picture: user.picture || ""
    });

    setCookie(res, "vn_token", token, {
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: true
    });

    return res.status(200).json({
      ok: true,
      user: {
        email: user.email,
        name: user.name || "",
        picture: user.picture || "",
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
