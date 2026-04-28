import { NextFunction, Request, Response } from 'express';

type Counter = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, Counter>();
const LIMIT = 2;
const WINDOW_MS = 1000;

function buildKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const endpoint = req.originalUrl.split('?')[0] || req.path;
  return `${ip}:${req.method}:${endpoint}`;
}

function cleanupExpired(now: number): void {
  if (counters.size < 5000) {
    return;
  }

  for (const [key, counter] of counters.entries()) {
    if (counter.resetAt <= now) {
      counters.delete(key);
    }
  }
}

export function endpointIpRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const now = Date.now();
  cleanupExpired(now);

  const key = buildKey(req);
  const counter = counters.get(key);

  if (!counter || counter.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (counter.count >= LIMIT) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((counter.resetAt - now) / 1000),
    );

    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      message: 'Too many requests',
      error: 'Rate limit exceeded. Try again later.',
    });
    return;
  }

  counter.count += 1;
  counters.set(key, counter);
  next();
}
