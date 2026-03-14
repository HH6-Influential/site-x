const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5005;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

function parseMultipart(buffer, boundary) {
  const boundaryBuf = Buffer.from('--' + boundary);
  const results = [];
  let start = 0;

  while (start < buffer.length) {
    const boundaryIdx = buffer.indexOf(boundaryBuf, start);
    if (boundaryIdx === -1) break;

    const afterBoundary = boundaryIdx + boundaryBuf.length;

    // Check for final boundary (--)
    if (buffer[afterBoundary] === 0x2d && buffer[afterBoundary + 1] === 0x2d) break;

    // Skip CRLF after boundary
    const headerStart = afterBoundary + 2;

    // Find end of headers (double CRLF)
    const CRLF2 = Buffer.from('\r\n\r\n');
    const headerEnd = buffer.indexOf(CRLF2, headerStart);
    if (headerEnd === -1) break;

    const headerStr = buffer.slice(headerStart, headerEnd).toString('utf8');
    const dataStart = headerEnd + 4;

    // Find next boundary
    const nextBoundary = buffer.indexOf(boundaryBuf, dataStart);
    if (nextBoundary === -1) break;

    // Data ends just before \r\n--boundary
    const dataEnd = nextBoundary - 2;
    const data = buffer.slice(dataStart, dataEnd);

    results.push({ headers: headerStr, data });
    start = nextBoundary;
  }

  return results;
}

const server = http.createServer((req, res) => {

  // List uploaded images
  if (req.method === 'GET' && req.url === '/uploads-list') {
    fs.readdir(UPLOAD_DIR, (err, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }
      const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(imageFiles));
    });
    return;
  }

  // Handle image upload
  if (req.method === 'POST' && req.url === '/uploads') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid content type. Please upload using a form with enctype="multipart/form-data".');
          return;
        }

        const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
        if (!boundaryMatch) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Malformed upload request: missing boundary.');
          return;
        }

        const boundary = boundaryMatch[1];
        const buffer = Buffer.concat(chunks);
        const parts = parseMultipart(buffer, boundary);

        const filePart = parts.find(p => p.headers.includes('filename='));
        if (!filePart) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('No file found in upload. Please select an image file.');
          return;
        }

        const filenameMatch = filePart.headers.match(/filename="([^"]+)"/);
        if (!filenameMatch || !filenameMatch[1]) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('No filename provided.');
          return;
        }

        const filename = path.basename(filenameMatch[1]);
        if (!filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Only image files are allowed (jpg, jpeg, png, gif).');
          return;
        }

        if (filePart.data.length === 0) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Uploaded file is empty.');
          return;
        }

        const savePath = path.join(UPLOAD_DIR, filename);
        fs.writeFile(savePath, filePart.data, err => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Upload failed: ' + err.message);
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Uploaded successfully: ' + filename);
        });

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Unexpected error during upload: ' + err.message);
      }
    });
    return;
  }

  // Serve uploaded images
  if (req.method === 'GET' && req.url.startsWith('/uploads/')) {
    const fileName = path.basename(req.url.replace('/uploads/', ''));
    const filePath = path.join(UPLOAD_DIR, fileName);
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

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  // Serve index.html
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