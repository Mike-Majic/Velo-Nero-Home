import { verifyToken, parseCookies } from "../_lib/auth.js";
import { appRole, supabaseRequest } from "../_lib/supabase.js";
export default async function handler(req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ ok: false, error: "Method not allowed" }); }
  try {
    const token = parseCookies(req).vn_token;
    if (!token) return res.status(200).json({ ok: true, authenticated: false });
    const payload = await verifyToken(token);
    const rows = await supabaseRequest(`/rest/v1/profiles?email=eq.${encodeURIComponent(payload.email)}&select=*`);
    const p = rows?.[0] || {};
    return res.status(200).json({ ok: true, authenticated: true, user: { email: payload.email, name: p.name || p.username || payload.name || "", picture: p.picture || payload.picture || "", role: appRole(p.role || payload.role) } });
  } catch { return res.status(200).json({ ok: true, authenticated: false }); }
}
