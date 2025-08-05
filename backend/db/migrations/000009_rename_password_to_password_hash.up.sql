-- Rename password column to password_hash to match code expectations
ALTER TABLE users RENAME COLUMN password TO password_hash;