-- Drop indexes
DROP INDEX IF EXISTS idx_user_tokens_is_active;
DROP INDEX IF EXISTS idx_user_tokens_permanent_token;
DROP INDEX IF EXISTS idx_user_tokens_user_id;

-- Drop the user_tokens table
DROP TABLE IF EXISTS user_tokens;
