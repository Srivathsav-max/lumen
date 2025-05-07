-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
    ('registration_enabled', 'false', 'Controls whether new user registration is enabled'),
    ('maintenance_mode', 'false', 'Controls whether the system is in maintenance mode')
ON CONFLICT (key) DO NOTHING;
