import { parseCookies, verifyToken } from "./auth.js";
import { appRole, supabaseRequest } from "./supabase.js";

export async function requireAuth(req) {
  const token = parseCookies(req).vn_token;
  if (!token) return { ok: false, status: 401, error: "Not authenticated" };
  try {
    const payload = await verifyToken(token);
    const rows = await supabaseRequest(`/rest/v1/profiles?email=eq.${encodeURIComponent(payload.email)}&select=*`);
    const profile = rows?.[0] || {};
    return { ok: true, user: { ...payload, role: appRole(profile.role || payload.role), name: profile.name || profile.username || payload.name || "", picture: profile.picture || payload.picture || "" } };
  } catch { return { ok: false, status: 401, error: "Invalid token" }; }
}

export async function requireRole(req, allowedRoles = []) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;
  const role = auth.user?.role || "none";
  if (allowedRoles.length && !allowedRoles.includes(role)) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, user: auth.user };
}
