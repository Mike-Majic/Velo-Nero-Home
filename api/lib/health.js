import { redis } from "./_lib/redis.js";

export default async function handler(req, res) {
  try {
    // Check env base
    const hasAuthSecret = !!process.env.AUTH_SECRET;

    // Test Redis: set + get
    const key = "health:last";
    const now = Date.now();

    await redis.set(key, String(now), { ex: 60 });
    const readBack = await redis.get(key);

    res.status(200).json({
      ok: true,
      hasAuthSecret,
      redis: {
        ok: readBack === String(now),
        readBack
      },
      time: new Date(now).toISOString()
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || String(err)
    });
  }
}
