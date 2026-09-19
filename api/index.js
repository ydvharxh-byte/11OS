// api/index.js — Vercel Serverless Function Bridge
const { handleRequest } = require('../server.js');

module.exports = async (req, res) => {
  try {
    // Await request execution to ensure Vercel Lambda does not terminate prematurely
    await handleRequest(req, res);
  } catch (err) {
    console.error('Vercel Invocation Error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Internal Serverless Error',
        message: err.message,
        tip: 'Study OS state is safely backed up in browser localStorage'
      }));
    }
  }
};
