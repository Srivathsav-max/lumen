-- Rename password_hash column back to password
ALTER TABLE users RENAME COLUMN password_hash TO password;