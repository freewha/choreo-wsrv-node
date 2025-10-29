const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const etag = require('etag');
const crypto = require('crypto');

const app = express();
const MAX_DIM = 2000;

app.use(express.json());

// CORS 中间件
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  next();
});

app.get('/', async (req, res) => {
    // 获取 Last-Modified
  let lastModified = new Date().toUTCString();
  // 判断缓存命中
   const ifNoneMatch = req.headers['if-none-match'];
  const ifModifiedSince = req.headers['if-modified-since'] || lastModified;
  if (ifNoneMatch) {
    res.set({
      'Last-Modified': ifModifiedSince,
      'ETag': ifNoneMatch,
      'Access-Control-Allow-Origin': '*'
    });
    return res.status(304).send();
  }


  const { url, w, h, output = 'jpg' } = req.query;
  const width = parseInt(w);
  const height = parseInt(h);
  const quality = Math.min(Math.max(parseInt(req.query.quality) || 85, 1), 100);

  if (!url) {
    return res.send('Hello, 世界！这是一个简单的 Express 图片服务。');
  }


  try {
    const head = await axios.head(url, { timeout: 10000 });
    if (head.headers['last-modified']) {
      lastModified = head.headers['last-modified'];
    }
  } catch (e) {
    // 使用默认时间
  }



  // 获取图片流
  let imageStream;
  try {
    const response = await axios.get(url, { responseType: 'stream', timeout: 10000 });
    imageStream = response.data;
  } catch (e) {
    return res.status(400).send('Failed to fetch image');
  }

// 限制最大尺寸
const targetWidth = (width > 0 && width <= MAX_DIM) ? width : null;
const targetHeight = (height > 0 && height <= MAX_DIM) ? height : null;

  // 构建 sharp 转换流
  let transformer = sharp()
    .rotate(); // 自动根据 EXIF 旋转
 console.log(targetWidth, targetHeight);
  if (targetWidth && targetHeight) {
    transformer = transformer.resize(targetWidth, targetHeight, { fit: 'cover' });
  } else if (targetWidth || targetHeight) {
    transformer = transformer.resize(targetWidth, targetHeight, { fit: 'inside' });
  }

  if(targetHeight || targetWidth) {
    transformer = transformer.jpeg({ quality });
  }
  // 根据完整路径参数生成 ETag
  const paramsString = `${url}-${w || ''}-${h || ''}-${quality}-${output}`;
  const hash = crypto.createHash('md5').update(paramsString).digest('hex');
  const generatedEtag = etag(hash);
  // 设置响应头
  res.set({
    'Content-Type': 'image/jpeg',
    'ETag': generatedEtag,
    'Last-Modified': lastModified,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=31536000, immutable',
  });

  // 流式处理并返回
  imageStream.pipe(transformer).pipe(res);
});

app.listen(8080, () => {
  console.log('🚀 Image service running on http://localhost:8080');
});
