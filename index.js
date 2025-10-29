import express from 'express';
import axios from 'axios';

const app = express();

app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.send(response.data);
  } catch (err) {
    res.status(500).send('Fetch failed');
  }
});

app.listen(8080, () => {
  console.log('Server running at http://localhost:8080');
});
