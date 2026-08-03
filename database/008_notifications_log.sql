-- 008_notifications_log.sql
-- Histórico e controle de notificações transacionais (E-mail & WhatsApp)

CREATE TABLE IF NOT EXISTS universe.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient text NOT NULL,
  subject text,
  template_name text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'failed')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS universe_notifications_log_channel_idx ON universe.notifications_log(channel);
CREATE INDEX IF NOT EXISTS universe_notifications_log_recipient_idx ON universe.notifications_log(recipient);
CREATE INDEX IF NOT EXISTS universe_notifications_log_status_idx ON universe.notifications_log(status, created_at DESC);
