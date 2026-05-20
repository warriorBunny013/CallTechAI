-- One-click Telegram connect: deep-link token per organisation
ALTER TABLE organisation_alert_configs
  ADD COLUMN IF NOT EXISTS telegram_connect_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_alert_configs_telegram_connect_token
  ON organisation_alert_configs (telegram_connect_token)
  WHERE telegram_connect_token IS NOT NULL;
