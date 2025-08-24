-- Create assistant_settings table
CREATE TABLE IF NOT EXISTS assistant_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default record
INSERT INTO assistant_settings (id, is_active) 
VALUES (1, true) 
ON CONFLICT (id) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assistant_settings_updated_at 
  BEFORE UPDATE ON assistant_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
