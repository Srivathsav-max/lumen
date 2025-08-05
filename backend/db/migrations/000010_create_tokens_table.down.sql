-- Drop indexes
DROP INDEX IF EXISTS idx_tokens_is_revoked;
DROP INDEX IF EXISTS idx_tokens_expires_at;
DROP INDEX IF EXISTS idx_tokens_token_type;
DROP INDEX IF EXISTS idx_tokens_token;
DROP INDEX IF EXISTS idx_tokens_user_id;

-- Drop the tokens table
DROP TABLE IF EXISTS tokens;