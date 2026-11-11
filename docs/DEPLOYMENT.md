# Cloudflare deployment

The Saldo dashboard, glasses view and API run from the `saldo-glasses` Cloudflare Worker. D1 stores encrypted profiles and short-lived pairing records.

## Requirements

- Node.js and npm
- A Cloudflare account with Workers and D1 access
- The existing `saldo-glasses` Worker and D1 database configured in `wrangler.jsonc`

## Deploy the existing service

Install from the lockfile, apply pending schema migrations, then deploy:

```sh
npm ci
npx wrangler d1 migrations apply saldo-glasses --remote
npm run deploy
```

The Worker needs a `SALDO_ENCRYPTION_KEY` secret. To support shared glasses registration with Meta Display Apps, `MDA_LINK_SECRET` must match the secret configured on the Meta Display Apps, Orbit Calendar and WebUntis Workers. Keep these values in Cloudflare Worker Secrets; never commit them.

## Check the deployment

- Open `/` for the dashboard and `/glasses.html` for the glasses view.
- Open `/guide.html` or `/guide.de.html` for setup instructions.
- Check `/.well-known/meta-wearables-manifest.json` for the web app manifest.
- Apply database changes only through files in `migrations/` and preserve the existing D1 database ID.

For development, see the [local setup](../README.md#local-development). Do not use real financial data in development screenshots or fixtures.
