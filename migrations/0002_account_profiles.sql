CREATE TABLE IF NOT EXISTS account_profiles (
  device_hash TEXT PRIMARY KEY NOT NULL,
  encrypted_profile TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
