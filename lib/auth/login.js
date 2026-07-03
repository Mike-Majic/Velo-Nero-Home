import { createToken, setCookie } from "../_lib/auth.js";
import { appRole, ensureProfile, logActivity, signInWithPassword, supabaseRequest } from "../_lib/supabase.js";

function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ ok: false, error: "Method not allowed" }); }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    if (!email || !email.includes("@")) return res.status(400).json({ ok: false, error: "Missing/invalid email" });
    if (!password) return res.status(400).json({ ok: false, error: "Missing password" });

    const auth = await signInWithPassword(email, password);
    const profile = await ensureProfile(auth.user, { email, username: body.username, name: body.name, picture: body.picture });
    const role = appRole(profile.role);
    const token = await createToken({ sub: auth.user.id, email, role, name: profile.name || profile.username || "", picture: profile.picture || "" });
    setCookie(res, "vn_token", token, { maxAge: 60 * 60 * 24 * 7, path: "/", httpOnly: true, sameSite: "Lax", secure: true });
    await supabaseRequest("/rest/v1/auth_tokens", { method: "POST", body: [{ user_id: auth.user.id, email, token_type: "cookie", expires_at: new Date(Date.now() + 7 * 864e5).toISOString() }] }).catch(() => null);
    await logActivity({ action: "login", actor_email: email, target_email: email, metadata: { provider: "supabase" } }).catch(() => null);
    return res.status(200).json({ ok: true, user: { email, name: profile.name || profile.username || "", picture: profile.picture || "", role } });
  } catch (err) {
    return res.status(401).json({ ok: false, error: err?.message || String(err) });
  }
}
