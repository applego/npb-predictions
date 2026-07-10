UPDATE seasons
SET lock_date = 0
WHERE is_active = 0
  AND lock_date IS NULL;
