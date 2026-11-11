# Contributing

Thanks for your interest in Saldo Glasses.

## Run locally

```sh
npm install
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply saldo-glasses --local
npx wrangler dev
```

Set a random `SALDO_ENCRYPTION_KEY` in `.dev.vars`. Shared account linking also needs `MDA_LINK_SECRET`; use the same private value as the Meta Display Apps Worker. Never commit secrets, account data or `.wrangler/` files.

## Propose a change

Open an issue to discuss a larger change, then submit a pull request with a short description of the motivation and affected areas. Keep finance data private and use synthetic values in screenshots or examples.

For security issues, do not include private data or credentials in a public issue. Contact the maintainer through the profile linked from the [Meta Display Apps website](https://meta-display-apps.henning-orbit-calendar.workers.dev/about.html).
