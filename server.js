const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5005;

const server = http.createServer((req, res) => {
    // List uploaded images
    if (req.method === 'GET' && req.url === '/uploads-list') {
      const uploadsDir = path.join(__dirname, 'uploads');
      fs.readdir(uploadsDir, (err, files) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }
        // Only show image files
        const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(imageFiles));
      });
      return;
    }
  // Handle image upload
  if (req.method === 'POST' && req.url === '/uploads') {
    let data = [];
    req.on('data', chunk => data.push(chunk));
    req.on('end', () => {
      const boundary = req.headers['content-type'].split('boundary=')[1];
      const buffer = Buffer.concat(data);
      const parts = buffer.toString().split('--' + boundary);
      for (const part of parts) {
        if (part.includes('Content-Disposition')) {
          const match = part.match(/filename="([^"]+)"/);
          if (match) {
            const filename = match[1];
            const fileStart = part.indexOf('\r\n\r\n') + 4;
            const fileEnd = part.lastIndexOf('\r\n');
            const fileData = part.substring(fileStart, fileEnd);
            const fileBuffer = Buffer.from(fileData, 'binary');
            const savePath = path.join(__dirname, 'uploads', filename);
            fs.writeFile(savePath, fileBuffer, err => {
              if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Upload failed');
                return;
              }
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('Uploaded');
            });
            return;
          }
        }
      }
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('No file uploaded');
    });
    return;
  }

  // Serve uploaded images
  if (req.method === 'GET' && req.url.startsWith('/uploads/')) {
    const fileName = req.url.replace('/uploads/', '');
    const filePath = path.join(__dirname, 'uploads', fileName);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
        return;
      }
      let contentType = 'application/octet-stream';
      if (fileName.match(/\.(jpg|jpeg)$/i)) contentType = 'image/jpeg';
      else if (fileName.match(/\.png$/i)) contentType = 'image/png';
      else if (fileName.match(/\.gif$/i)) contentType = 'image/gif';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  // Path to your local HTML file
  const filePath = path.join(__dirname, 'index.html');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      console.error(err);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`site-x listening on port ${PORT}`);
});