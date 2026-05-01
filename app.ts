import express from 'express';
import { registerModules } from './src/modules';
import { endpointIpRateLimit } from './src/common/middleware/rate-limit';

const app = express();

// Disable this header to reduce tiny overhead and avoid exposing framework details.
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});
app.use(endpointIpRateLimit);

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'rate-source' });
});

registerModules(app);

app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

export default app;
