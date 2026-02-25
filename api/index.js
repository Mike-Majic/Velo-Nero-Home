function send(res, code, data) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const path = url.pathname.replace(/^\/api\/?/, ""); // es: "diary/search"
    const parts = path.split("/").filter(Boolean);

    // /api o /api/
    if (parts.length === 0) return send(res, 200, { ok: true });

    const area = parts[0];                 // "diary"
    const route = parts[1] || "index";     // "search" (default "index")

    // prova import: lib/<area>/<route>.js
    const mod = await import(`../lib/${area}/${route}.js`);
    const fn = mod.default || mod.handler;

    if (typeof fn !== "function") {
      return send(res, 500, { error: "Handler non valido", area, route });
    }

    return await fn(req, res, url, parts);
  } catch (e) {
    return send(res, 404, { error: "Endpoint non trovato", message: String(e?.message || e) });
  }
}
