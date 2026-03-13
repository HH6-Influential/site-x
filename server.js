const http = require('http');

const PORT = process.env.PORT || 5005;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>site-x is running, new and improved!</h1>');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`site-x listening on port ${PORT}`);
});
