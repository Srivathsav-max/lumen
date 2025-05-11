-- Remove email_verified column from users table
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
