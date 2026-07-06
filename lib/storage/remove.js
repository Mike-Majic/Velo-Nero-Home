import { requireAuth } from "../_lib/requireRole.js";
import { supabaseRequest } from "../_lib/supabase.js";

function cleanKey(key) {
  return String(key || "").trim().slice(0, 200);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const key = cleanKey(body.key);
    if (!key) return res.status(400).json({ ok: false, error: "Missing key" });

    await supabaseRequest(`/rest/v1/client_storage?key=eq.${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
