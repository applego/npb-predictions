CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('color_theme', 'broadcast'),
  ('font_number', 'saira'),
  ('font_body', 'noto');

UPDATE site_settings
SET value = 'broadcast', updated_at = unixepoch()
WHERE key = 'color_theme' AND value = 'editorial-navy-ivory';

UPDATE site_settings
SET value = 'saira', updated_at = unixepoch()
WHERE key = 'font_number' AND value = 'bebas';
