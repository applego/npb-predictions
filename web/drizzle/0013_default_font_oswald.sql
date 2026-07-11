UPDATE site_settings
SET value = 'oswald', updated_at = unixepoch()
WHERE key = 'font_number' AND value = 'saira';
