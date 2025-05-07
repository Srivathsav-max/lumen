-- Create user_tokens table for permanent token storage
CREATE TABLE IF NOT EXISTS user_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permanent_token VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  device_info TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id, permanent_token)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_permanent_token ON user_tokens(permanent_token);
CREATE INDEX IF NOT EXISTS idx_user_tokens_is_active ON user_tokens(is_active);
