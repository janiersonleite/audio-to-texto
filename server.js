const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PORT = 3000;

// Tipos MIME para servir os arquivos estáticos do PWA
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.css':  'text/css; charset=utf-8',
};

const server = http.createServer((req, res) => {
  // Remove querystring e normaliza o caminho (evita path traversal)
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const safePath = path
    .normalize(urlPath)
    .replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback para o index.html (comportamento SPA/PWA)
      fs.readFile(path.join(__dirname, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(500); res.end('Erro'); return; }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(html);
      });
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        localIP = addr.address;
        break;
      }
    }
  }
  console.log('\n✅ Servidor rodando!');
  console.log(`\n   Neste computador:  http://localhost:${PORT}`);
  console.log(`\n   No celular (mesmo Wi-Fi), abra o Chrome e acesse:`);
  console.log(`\n   👉  http://${localIP}:${PORT}\n`);
});
