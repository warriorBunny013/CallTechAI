# VAPI Assistant Status Control

This feature allows you to activate/deactivate your VAPI AI voice assistant directly from the dashboard.

## Setup Instructions

### 1. Database Setup

Run the following SQL in your Supabase database to create the required table:

```sql
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
```

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# VAPI API Key (required)
VAPI_API_KEY=your_actual_vapi_api_key_here

# VAPI Assistant ID (optional, will use 'default' if not set)
VAPI_ASSISTANT_ID=your_assistant_id_here
```

### 3. How It Works

- **Toggle Switch**: Use the toggle in the dashboard header to activate/deactivate the assistant
- **Database Storage**: Status is persisted in the `assistant_settings` table
- **VAPI Integration**: When toggled, the system updates the VAPI assistant configuration
- **Real-time Updates**: Status changes are reflected immediately in the UI
- **Toast Notifications**: Success/error messages are shown when status is updated

### 4. Features

- **Persistent State**: Assistant status survives app restarts
- **VAPI Control**: Actually updates the VAPI assistant behavior
- **User Feedback**: Clear visual indicators and toast notifications
- **Error Handling**: Graceful fallbacks if VAPI is unavailable
- **Loading States**: Visual feedback during status updates

### 5. VAPI Behavior Changes

When the assistant is **deactivated**:
- First message changes to: "This assistant is currently unavailable. Please try again later."
- Calls will still be received but the assistant won't respond properly

When the assistant is **activated**:
- First message changes to: "Hello! I'm your CallTechAI assistant. How can I help you today?"
- Assistant responds normally to all calls

### 6. Troubleshooting

**Assistant status not updating:**
- Check your VAPI API key in environment variables
- Verify the database table was created correctly
- Check browser console for error messages

**VAPI integration not working:**
- Ensure your VAPI API key is valid
- Check if you have the correct assistant ID
- Verify VAPI API endpoints are accessible

**Database errors:**
- Run the SQL commands in Supabase SQL editor
- Check table permissions
- Verify database connection
