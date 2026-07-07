import { createToken, setCookie } from "../_lib/auth.js";
import { appRole, createAuthUser, ensureProfile, logActivity } from "../_lib/supabase.js";

function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ ok: false, error: "Method not allowed" }); }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    const name = String(body.name || body.gameName || "").trim();
    if (!email || !email.includes("@")) return res.status(400).json({ ok: false, error: "Email non valida" });
    if (!password || password.length < 6) return res.status(400).json({ ok: false, error: "Password troppo corta" });
    if (!name) return res.status(400).json({ ok: false, error: "Nome in game mancante" });

    const authUser = await createAuthUser({ email, password, name });
    const profile = await ensureProfile(authUser, { email, username: name, name });
    const role = appRole(profile.role, email);
    const token = await createToken({ sub: authUser.id, email, role, name: profile.name || profile.username || name, picture: profile.picture || "" });
    setCookie(res, "vn_token", token, { maxAge: 60 * 60 * 24 * 7, path: "/", httpOnly: true, sameSite: "Lax", secure: true });
    await logActivity({ action: "register", actor_email: email, target_email: email, metadata: { provider: "supabase", role } }).catch(() => null);
    return res.status(200).json({ ok: true, user: { email, name: profile.name || profile.username || name, role } });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err?.message || String(err) });
  }
}
