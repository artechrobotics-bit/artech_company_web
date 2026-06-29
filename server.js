'use strict';

const express = require('express');
const path = require('path');
const os = require('os');

const app = express();

const PORT = Number(process.env.PORT || 5173);
const BACKEND_URL = String(process.env.BACKEND_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

function getLanIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const entries of Object.values(nets)) {
    for (const net of entries || []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

/*
  Proxy frontend -> backend SQL/API thật.
  - Trình duyệt chỉ gọi cùng domain frontend: /api/... và /uploads/...
  - File này chuyển tiếp sang BACKEND_URL, mặc định http://127.0.0.1:3000
  - Có thể đổi backend khi chạy:
      BACKEND_URL=http://192.168.1.93:3000 npm start
*/
async function proxyToBackend(req, res) {
  try {
    const targetUrl = BACKEND_URL + req.originalUrl;

    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];

    const fetchOptions = {
      method: req.method,
      headers,
      redirect: 'manual'
    };

    if (!['GET', 'HEAD'].includes(req.method)) {
      fetchOptions.body = req;
      fetchOptions.duplex = 'half';
    }

    const response = await fetch(targetUrl, fetchOptions);
    res.status(response.status);

    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey === 'content-encoding' ||
        lowerKey === 'transfer-encoding' ||
        lowerKey === 'connection'
      ) {
        return;
      }
      res.setHeader(key, value);
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return res.end(buffer);
  } catch (error) {
    console.error('[FRONTEND PROXY ERROR]', error);
    return res.status(502).json({
      success: false,
      message: 'Frontend proxy không kết nối được backend',
      backendUrl: BACKEND_URL,
      error: error.message
    });
  }
}

app.use('/api', proxyToBackend);
app.use('/uploads', proxyToBackend);

// Không public các file/cấu hình nhạy cảm nếu vô tình copy vào frontend.
app.use((req, res, next) => {
  const url = decodeURIComponent(req.path || '');
  if (
    url.startsWith('/database/') ||
    url.includes('/.env') ||
    url.endsWith('.mwb') ||
    url.endsWith('.sql')
  ) {
    return res.status(404).send('Not found');
  }
  return next();
});

app.use(express.static(__dirname, {
  index: 'index.html',
  dotfiles: 'ignore'
}));

// Fallback cho các route tĩnh khi refresh trang.
app.use((req, res, next) => {
  if (!['GET', 'HEAD'].includes(req.method)) return next();
  return res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ARTECH Frontend đang chạy: http://localhost:${PORT}`);
  for (const ip of getLanIps()) {
    console.log(`LAN Frontend: http://${ip}:${PORT}`);
  }
  console.log(`Proxy API/uploads sang backend: ${BACKEND_URL}`);
});
