# Express API (TypeScript)

TypeScript Express API designed to run as a standard Node.js process on a machine, VM, or container.

## Crypto rates data source

- Uses the same Redis app-variable pattern as the referenced service:
  - Key: `CRYPTO_rates`
  - Stored in Redis as: `${APP_MODE}-CRYPTO_rates`
- Flow:
  - Try Redis first via `getAppVariables('CRYPTO_rates')`
  - If empty, query DB (`threshold_asset` + `chain`)

## Run locally

`npm run dev`

Set env vars first (copy from `.env.example`):

```bash
cp .env.example .env
```

Test:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/rates
```

## Build and run

```bash
npm run build
npm start
```

## Run in production on a machine

Use a process manager (for restart + logs), for example PM2:

```bash
npm i -g pm2
npm run build
pm2 start dist/server.js --name rate-source
pm2 save
```

If you are behind a reverse proxy (Nginx/Caddy), expose this app on an internal port with `PORT`.

## Environment variables

Common runtime variables:

```bash
PORT=3000
APP_MODE=dev
```

## Structure

- `app.ts`: Express app and routes
- `server.ts`: Server process entry point
- `src/modules/crypto/*`: Typed crypto module and services
- `src/modules/giftcard/*`: Typed giftcard module scaffold
- `src/common/*`: Typed shared Redis and DB helpers
