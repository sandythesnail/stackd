const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.argv[2] ? Number(process.argv[2]) : 8080;
const root = __dirname;

const types = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let filePath = decodeURIComponent(req.url.split('?')[0]);
  if (filePath === '/') filePath = '/index.html';
  const full = path.join(root, filePath);
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}`));
