import { requireAuth } from "../_lib/requireRole.js";
import { supabaseRequest } from "../_lib/supabase.js";

function cleanKey(key) {
  return String(key || "").trim().slice(0, 200);
}

export default async function handler(req, res, url) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

  try {
    const key = cleanKey(req.query?.key || url?.searchParams?.get("key"));
    if (!key) return res.status(400).json({ ok: false, error: "Missing key" });

    const rows = await supabaseRequest(`/rest/v1/client_storage?key=eq.${encodeURIComponent(key)}&select=value&limit=1`);
    return res.status(200).json({ ok: true, value: rows?.[0]?.value ?? null });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
