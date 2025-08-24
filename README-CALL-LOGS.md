# Call Logs Integration with Vapi

This application now integrates with Vapi to display real-time call logs and recordings in the Call Recordings section.

## Features

### Call Display
- **Phone Calls**: Shows actual phone numbers for traditional voice calls
- **Web Calls**: Displays "Web Call" for browser-based voice interactions
- **Call Information**: Date, time, duration, and detected intent
- **Recording Access**: Direct access to call recordings when available

### Filtering & Search
- **Search**: Search by phone number or intent
- **Date Filter**: Filter calls by specific dates
- **Intent Filter**: Filter calls by detected intent
- **Real-time Refresh**: Refresh button to get latest call data

### Statistics Dashboard
- **Phone Call Count**: Total number of traditional phone calls
- **Web Call Count**: Total number of browser-based calls
- **Total Calls**: Combined call count
- **Recordings Available**: Count of calls with available recordings

## API Integration

### Vapi API Route
- **Endpoint**: `/api/call-logs`
- **Method**: GET
- **Authentication**: Uses `NEXT_PUBLIC_VAPI_API_KEY` environment variable

### Data Structure
```typescript
interface CallLog {
  id: string
  phoneNumber: string | null
  isWebCall: boolean
  date: string
  time: string
  duration: string
  status: string
  recordingUrl: string | null
  intent: string
  createdAt: string
}
```

## Setup

### Environment Variables
Add to your `.env.local` file:
```bash
NEXT_PUBLIC_VAPI_API_KEY=your_actual_vapi_api_key_here
```

### Dependencies
The following packages are required:
- `@vapi-ai/server-sdk`: Server-side Vapi integration
- `@vapi-ai/web`: Client-side Vapi integration

## Usage

### Viewing Call Logs
1. Navigate to Dashboard → Call Recordings
2. View all calls with their details
3. Use filters to narrow down results
4. Click the play button to listen to recordings
5. Click the download button to access recording files

### Refreshing Data
- Click the refresh button to fetch latest call data
- Data automatically loads when the page is accessed

## Data Requirements

This application requires:
- A valid Vapi API key configured
- Active Vapi account with call data
- Proper permissions to access call logs
- Network access to Vapi API endpoints

## Error Handling

If Vapi is not configured or encounters errors:
- Clear error messages guide users to check configuration
- No dummy data is displayed
- UI remains functional but shows appropriate error states

## Customization

### Adding New Fields
To display additional call information:
1. Update the `CallLog` interface in `hooks/use-call-logs.ts`
2. Modify the API route to include new fields
3. Update the UI components to display new data

### Styling
- Phone calls use phone icon with standard styling
- Web calls use globe icon with blue accent
- Recordings available indicator shows in rose color
- Responsive grid layout for statistics cards

## Troubleshooting

### Common Issues
1. **No calls displayed**: Check Vapi API key configuration
2. **Import errors**: Ensure `@vapi-ai/server-sdk` is installed
3. **Empty results**: Verify Vapi account has call data
4. **Recording access**: Check if recordings are enabled in Vapi settings

### Debug Information
- Check browser console for API errors
- Verify network requests to `/api/call-logs`
- Review server logs for Vapi SDK issues

## Future Enhancements

- Real-time call updates via WebSocket
- Call analytics and insights
- Export functionality for call data
- Advanced filtering and sorting options
- Call transcription display
- Integration with CRM systems
