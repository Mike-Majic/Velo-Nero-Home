import { appRole, supabaseRequest } from "../_lib/supabase.js";

function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }

export default async function handler(req, res, url) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ ok: false, error: "Method not allowed" }); }
  try {
    const email = normalizeEmail(url?.searchParams?.get("email") || req.query?.email);
    if (!email || !email.includes("@")) return res.status(400).json({ ok: false, error: "Email non valida" });
    const rows = await supabaseRequest(`/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=email,name,username,role&limit=1`);
    const user = rows?.[0] || null;
    return res.status(200).json({ ok: true, exists: !!user, user: user ? { email: user.email, name: user.name || user.username || "", role: appRole(user.role, user.email) } : null });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
