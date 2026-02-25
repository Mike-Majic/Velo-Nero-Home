import { verifyToken, parseCookies } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const cookies = parseCookies(req);
    const token = cookies.vn_token;

    if (!token) {
      return res.status(200).json({ ok: true, authenticated: false });
    }

    const payload = await verifyToken(token);

    return res.status(200).json({
      ok: true,
      authenticated: true,
      user: {
        email: payload.email,
        name: payload.name || "",
        picture: payload.picture || "",
        role: payload.role || "none"
      }
    });
  } catch (err) {
    // Token scaduto o non valido: consideriamo non autenticato
    return res.status(200).json({ ok: true, authenticated: false });
  }
}
