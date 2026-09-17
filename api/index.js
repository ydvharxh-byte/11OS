// api/index.js — Vercel Serverless Function Bridge
const server = require('../server.js');

module.exports = (req, res) => {
  server.emit('request', req, res);
};
