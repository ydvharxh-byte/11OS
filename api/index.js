// api/index.js — Vercel Serverless Function Bridge with Diagnostics
module.exports = async (req, res) => {
  try {
    const server = require('../server.js');
    server.emit('request', req, res);
  } catch (err) {
    console.error('Vercel Serverless Invocation Error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Study OS · Cloud Deployment Notice</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1117; color: #e2e8f0; padding: 40px 20px; line-height: 1.6; }
          .card { max-width: 680px; margin: 0 auto; background: #1a1d27; border: 1px solid #2d3343; border-radius: 16px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
          h1 { color: #f87171; font-size: 22px; margin-top: 0; }
          code { background: #0d0f15; padding: 3px 6px; border-radius: 6px; color: #38bdf8; font-family: monospace; font-size: 13px; }
          pre { background: #0d0f15; padding: 14px; border-radius: 8px; overflow-x: auto; color: #f87171; font-size: 12px; }
          .tip { background: #1e293b; border-left: 4px solid #38bdf8; padding: 14px; border-radius: 6px; margin: 20px 0; font-size: 14px; }
          a { color: #38bdf8; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>⚠️ Vercel Serverless Limitation Detected</h1>
          <p><strong>Class 11 Study OS</strong> is a persistent stateful application requiring a persistent Node.js environment with SQLite database storage and active Telegram MTProto sockets.</p>
          
          <div class="tip">
            <strong>Recommended Cloud Host: Render.com (100% Free)</strong><br/>
            Render runs a full persistent Node.js 22+ server 24/7 with disk storage. Connect your GitHub repo <code>11OS</code> on <a href="https://render.com" target="_blank">Render.com</a> with start command <code>node server.js</code>.
          </div>

          <h3>Technical Diagnostic Details:</h3>
          <pre>${(err && err.stack) || err || 'Unknown serverless runtime error'}</pre>
        </div>
      </body>
      </html>
    `);
  }
};
