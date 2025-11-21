# Google Maps API Setup

## Error: RefererNotAllowedMapError

If you see this error when running the preview:
```
Google Maps JavaScript API error: RefererNotAllowedMapError
Your site URL to be authorized: http://localhost:5175/
```

### Fix:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Find your API key (currently: `AIzaSyAMH3mSJD1zFkeUW0jhHFc9YUiBO5vHs8Y`)
4. Click **Edit API key**
5. Under **Application restrictions**, select **HTTP referrers**
6. Click **Add an item** and add these referrers:
   - `http://localhost:*`
   - `http://localhost:5175/*`
   - `http://127.0.0.1:*`
   - `https://*.chatgpt.com/*` (for production use in ChatGPT)
7. Click **Save**

### Alternative: Use a New API Key

If you don't have access to the existing key, create a new one:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Maps JavaScript API**
4. Create credentials > API Key
5. Restrict the key to HTTP referrers (see above)
6. Update the API key in:
   - `src/components/zillow-areas.tsx` (line 142)
   - `src/components/zillow-property-search.tsx` (if applicable)

### Current API Key Location

The API key is hardcoded in the component at:
```typescript
script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAMH3mSJD1zFkeUW0jhHFc9YUiBO5vHs8Y';
```

Consider moving this to an environment variable for production.

