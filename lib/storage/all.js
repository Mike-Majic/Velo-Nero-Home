import { requireAuth } from "../_lib/requireRole.js";
import { supabaseRequest } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

  try {
    const rows = await supabaseRequest("/rest/v1/client_storage?select=key,value");
    const items = {};
    for (const row of rows || []) items[row.key] = row.value ?? null;
    return res.status(200).json({ ok: true, items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
