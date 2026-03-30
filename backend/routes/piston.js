// Proxy code execution to Piston (avoids browser CORS / Electron fetch issues)
// EMKC public Piston is whitelist-only as of 2026 — set PISTON_URL to your own Piston base
// (e.g. https://your-host/api/v2/piston) or another provider that exposes /execute.
const router = require('express').Router();

router.post('/execute', async (req, res) => {
  const base = (process.env.PISTON_URL || 'https://emkc.org/api/v2/piston').replace(/\/$/, '');
  const url = `${base}/execute`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'GridLock-backend/1.0',
  };
  if (process.env.PISTON_API_KEY) {
    headers.Authorization = `Bearer ${process.env.PISTON_API_KEY}`;
  }
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });
    const text = await r.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!r.ok) {
      const msg = data.message || data.error || text || `upstream ${r.status}`;
      return res.status(r.status).json({
        error: 'piston_upstream_error',
        status: r.status,
        message: msg,
        ...data,
      });
    }
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message || 'piston_proxy_failed' });
  }
});

module.exports = router;
