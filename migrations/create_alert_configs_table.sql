-- Alert / notification configuration per organisation
-- Supports Telegram and WhatsApp (via Twilio) alerts for new calls and bookings

CREATE TABLE IF NOT EXISTS organisation_alert_configs (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  -- Telegram
  telegram_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_bot_token    TEXT,
  telegram_chat_id      TEXT,

  -- WhatsApp (via Twilio)
  whatsapp_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_to_number    TEXT,   -- e.g. +1234567890
  whatsapp_from_number  TEXT,   -- Twilio WhatsApp-enabled number e.g. +14155238886

  -- Trigger switches
  alert_on_new_call     BOOLEAN NOT NULL DEFAULT TRUE,
  alert_on_new_booking  BOOLEAN NOT NULL DEFAULT TRUE,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (organisation_id)
);

ALTER TABLE organisation_alert_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can manage alert configs" ON organisation_alert_configs;
CREATE POLICY "Org members can manage alert configs"
ON organisation_alert_configs FOR ALL
USING (
  organisation_id IN (
    SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organisation_id IN (
    SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
  )
);
