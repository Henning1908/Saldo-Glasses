# Architecture

Saldo is a browser dashboard and a lightweight Meta display glasses web app served by one Cloudflare Worker.

## Runtime

- `site/` contains the dashboard, glasses view, guides and static images.
- `src/worker.js` handles pairing, account state, encrypted profiles and the glasses API.
- Cloudflare D1 stores pairing records and encrypted finance profiles.
- `SALDO_ENCRYPTION_KEY` protects profile data at rest.

## Pairing and profiles

Standalone pairing uses a six-digit code that expires after ten minutes. When the glasses are linked to a Meta Display Apps account, the central Worker stores a SHA-256 device-token hash and the Saldo Worker resolves that registration through a shared secret. Saldo keeps its own encrypted profile for that device; calendar and timetable data stay in their own apps.

The browser dashboard uses the Meta Display Apps session when the account is linked. Otherwise, it can use Saldo's standalone pairing flow. The glasses keep a random device token in an HttpOnly cookie and call only Saldo API endpoints.

## Data boundaries

Saldo does not connect to a bank. The browser handles dashboard interactions, while the Worker validates requests and encrypts finance records before writing them to D1. The glasses receive only the fields needed for their compact views and transaction entry.
