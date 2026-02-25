    if (!q || q.length < 2) {
      return res.status(200).json({ ok: true, query: q, results: [] });
    }

    const limitRaw = req.query?.limit;
    const limit = Math.max(1, Math.min(300, Number(limitRaw || 200)));

    // Prendiamo le ultime voci del diario
    const entries = await redis.lrange("diary:all", 0, limit - 1);

    const results = [];
    for (const e of entries || []) {
      const hayTitle = (e.title || "").toLowerCase();
      const hayText  = (e.text || "").toLowerCase();

      if (hayTitle.includes(q) || hayText.includes(q)) {
        results.push({
          type: "diary",
          id: e.id,
          day: e.day,
          at: e.at,
          title: e.title || "Diario",
          snippet: makeSnippet(e.text || "", q),
          by: e.by || ""
        });
      }
    }

    return res.status(200).json({
      ok: true,
      query: q,
      count: results.length,
      results
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

function makeSnippet(text, q) {
  const t = String(text);
  const low = t.toLowerCase();
  const i = low.indexOf(q);
  if (i === -1) return t.slice(0, 120);

  const start = Math.max(0, i - 40);
  const end   = Math.min(t.length, i + q.length + 40);
  let s = t.slice(start, end);
  if (start > 0) s = "…" + s;
  if (end < t.length) s = s + "…";
  return s;
}
