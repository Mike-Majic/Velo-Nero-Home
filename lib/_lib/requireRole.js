import { parseCookies, verifyToken } from "./auth.js";

export async function requireAuth(req) {
  const cookies = parseCookies(req);
  const token = cookies.vn_token;
  if (!token) return { ok: false, status: 401, error: "Not authenticated" };

  try {
    const payload = await verifyToken(token);
    return { ok: true, user: payload };
  } catch {
    return { ok: false, status: 401, error: "Invalid token" };
  }
}

export async function requireRole(req, allowedRoles = []) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  const role = auth.user?.role || "none";
  if (allowedRoles.length && !allowedRoles.includes(role)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, user: auth.user };
}
