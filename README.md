# Zillow MCP Server with OpenAI Apps SDK

A TypeScript-based Model Context Protocol (MCP) server that integrates **real Zillow real estate data** via RapidAPI with ChatGPT using the OpenAI Apps SDK. This server provides interactive UI widgets for property search, home affordability calculations, and neighborhood exploration with actual market data.

## 🎯 Features

- **Real Zillow Data Integration** via RapidAPI - Live property listings, prices, and market data
- **4 Zillow Tools** integrated with rich UI widgets:
  - 🏘️ **City/Neighborhood Information** - Discover areas and neighborhoods with actual property counts and pricing
  - 💰 **Home Affordability Calculator** - Calculate maximum home price based on financial profile with accurate DTI calculations
  - 📊 **Mortgage Rate Simulator** - Explore current rates and monthly payments
  - 🏠 **Property Search** - Search for real homes with detailed filters and actual market data
- **Beautiful Interactive Widgets** - Custom HTML/CSS/JS components that render inline in ChatGPT
- **Graceful Fallback** - Works with demo data if no API key provided
- **Cloudflare Workers Ready** - Deploy globally with zero-config scaling
- **TypeScript** - Fully typed for better development experience

## 📋 Prerequisites

- Node.js 18+
- npm or pnpm
- RapidAPI account and API key (free tier available)
- Cloudflare account (for deployment)
- Wrangler CLI (for Cloudflare deployment)

```
zillow-mcp-server/
├── src/
│   ├── server.ts          # Node.js MCP server (for local development)
│   └── worker.ts          # Cloudflare Workers deployment
├── ui-components/
│   ├── zillow-areas.html           # Neighborhoods widget
│   ├── zillow-buyability.html      # Affordability calculator widget
│   └── zillow-property-search.html # Property listings widget
├── package.json
├── tsconfig.json
├── wrangler.toml          # Cloudflare Workers config
└── README.md
```

## Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (for deployment)
- Wrangler CLI (for Cloudflare deployment)

## 🚀 Installation

```bash
# Clone or navigate to the project
cd zillow-mcp-server

# Install dependencies
npm install
# or
pnpm install

# Create environment file
cp .env.example .env

# Edit .env and add your RapidAPI key
# RAPIDAPI_KEY=your_actual_rapidapi_key_here
```

## 🔧 Configuration

Edit the `.env` file and add your RapidAPI key:

```bash
RAPIDAPI_KEY=your_rapidapi_key_here
PORT=8000  # Optional, defaults to 8000
```

**Important**: The server will run in demo mode with mock data if no API key is provided, but you'll get real Zillow data with an API key!

## 💻 Local Development

### Run the Node.js MCP Server

```bash
# Make sure you've set RAPIDAPI_KEY in .env
npm run dev
```

The server will start on `http://localhost:8000` with these endpoints:
- **SSE Stream**: `GET http://localhost:8000/mcp`
- **Message Post**: `POST http://localhost:8000/mcp/messages?sessionId=...`

You'll see one of these startup messages:
- ✅ `Zillow API client initialized with RapidAPI key` - Real data mode
- ⚠️ `No RAPIDAPI_KEY found... API calls will use fallback data` - Demo mode

### Test with ngrok

To test with ChatGPT locally, expose your server using ngrok:

```bash
# Install ngrok if you haven't
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Expose your local server
ngrok http 8000
```

You'll get a public URL like `https://abc123.ngrok-free.app`. Use this in ChatGPT:
- Go to ChatGPT Settings → Connectors
- Add connector: `https://abc123.ngrok-free.app/mcp`

## Deployment to Cloudflare Workers

### Step 1: Install Wrangler

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

### Step 3: Update wrangler.toml

Edit `wrangler.toml` and update:

```toml
name = "zillow-mcp-server"

[vars]
BASE_URL = "https://zillow-mcp.YOUR-SUBDOMAIN.workers.dev"
```

### Step 4: Deploy

```bash
npm run deploy
# or
wrangler deploy
```

After deployment, Wrangler will provide your worker URL:
```
https://zillow-mcp-server.YOUR-SUBDOMAIN.workers.dev
```

### Step 5: Add to ChatGPT

1. Open ChatGPT → Settings → Connectors
2. Click "Add Connector"
3. Enter your Cloudflare Worker URL with `/mcp/rpc` endpoint:
   ```
   https://zillow-mcp-server.YOUR-SUBDOMAIN.workers.dev/mcp/rpc
   ```
4. Save and test!

## 🎮 Using in ChatGPT

Once connected, you can use natural language to interact with real Zillow data:

**Example Queries:**

- "What are the best neighborhoods in Austin, Texas?" *(gets real neighborhood data)*
- "Show me 3 bedroom homes for sale in Seattle under $600k" *(searches actual listings)*
- "How much house can I afford with $80,000 income and $40,000 down payment?" *(accurate DTI calculations)*
- "What's the monthly payment for a $500k house with 20% down?" *(uses current rates)*
- "Find apartments for rent in Brooklyn with 2+ bedrooms" *(real rental listings)*

The assistant will automatically invoke the appropriate tools with real Zillow data and render the interactive widgets.

## 🌐 Real API Features

When using a RapidAPI key, you get:

### Property Search
- Real property listings from Zillow
- Actual prices, photos, and details
- Current market data
- Property specifications (beds, baths, sqft)
- Zestimate values where available

### Neighborhood Information
- Actual property counts by area
- Real market prices
- Region and neighborhood data
- Property availability statistics

### Affordability Calculator
- Accurate DTI (Debt-to-Income) ratio calculations
- Industry-standard lending formulas
- Realistic property tax estimates
- PMI calculations
- Detailed payment breakdowns

### Mortgage Simulator
- Current market rates
- Accurate amortization calculations
- APR estimates
- Total interest calculations

## 🔧 Customization

### API Client Configuration

The Zillow API client is in `src/zillow-api.ts`. Available methods:

```typescript
// Search properties
await zillowApi.searchProperties({
  location: "Austin, TX",
  status_type: "ForSale", // or "ForRent"
  minPrice: 300000,
  maxPrice: 600000,
  bedsMin: 3,
  bathsMin: 2,
});

// Get property details
await zillowApi.getPropertyDetails(zpid);

// Get Zestimate
await zillowApi.getZestimate(zpid);

// Search regions
await zillowApi.searchRegions("Seattle, WA");

// Calculate affordability
zillowApi.calculateAffordability({
  annualIncome: 80000,
  downPayment: 40000,
  creditScore: 720,
  monthlyDebts: 500,
});

// Calculate mortgage payment
zillowApi.calculateMortgagePayment({
  homePrice: 500000,
  downPayment: 100000,
  interestRate: 6.5,
  loanTerm: 30,
});
```

### Customizing UI Widgets

Edit the HTML files in `ui-components/` to customize the appearance:

- `zillow-areas.html` - Neighborhood cards
- `zillow-buyability.html` - Affordability calculator display
- `zillow-property-search.html` - Property listing cards

The widgets receive data via `window.__WIDGET_PROPS__` and can be styled with inline CSS.

## Architecture

### How It Works

1. **ChatGPT** sends a user query to the MCP server
2. **MCP Server** exposes tools via the Model Context Protocol
3. **Tool Handler** processes the request and returns:
   - Plain text response
   - Structured data (JSON)
   - Widget metadata (`_meta.openai/outputTemplate`)
4. **ChatGPT** renders the widget inline using the HTML template
5. **Widget** hydrates with the structured data from the tool response

### MCP Protocol Flow

```
ChatGPT → GET /mcp (SSE connection)
       ← tools/list (available tools)
       ← resources/list (widget templates)
       
ChatGPT → tools/call (invoke tool)
       ← content + structuredContent + _meta
       
ChatGPT → resources/read (fetch widget HTML)
       ← HTML template
       
ChatGPT renders widget with data
```

## Compliance Notice

This implementation includes tools for real estate search and financial calculations. When using real data, ensure compliance with:

- **U.S. Fair Housing Act** - No discriminatory practices
- **Truth in Lending Act (TILA)** - Accurate loan disclosures
- **State and Local Laws** - Vary by jurisdiction
- **Zillow Terms of Service** - If using Zillow APIs

The affordability calculator is labeled as powered by "Zillow Home Loans LLC (NMLS ID#: 10287) BuyAbility℠" per the requirements. Ensure all disclaimers are present when displaying financial calculations.

## Troubleshooting

### Server won't start

```bash
# Check if port 8000 is available
lsof -i :8000

# Use a different port
PORT=8001 npm run dev
```

### Widgets not rendering in ChatGPT

1. Check that the connector URL is correct
2. Verify CORS headers are set (already configured)
3. Check browser console for errors
4. Ensure `_meta.openai/outputTemplate` matches the resource URI

### Cloudflare deployment fails

```bash
# Check your Cloudflare account
wrangler whoami

# Verify wrangler.toml configuration
wrangler dev  # Test locally first
```

## Development Tips

- **Local Testing**: Use `npm run dev` and ngrok for rapid iteration
- **Widget Development**: Open `ui-components/*.html` files directly in a browser to test styling
- **Debugging**: Check MCP server logs for tool invocation details
- **Hot Reload**: Cloudflare Workers updates are near-instant after `wrangler deploy`

## Performance

- **Cloudflare Workers**: ~50ms cold start, ~10ms warm requests
- **Global CDN**: Deploy to 200+ cities worldwide
- **No Database**: Stateless design for maximum scalability

## Security

- **No Auth Required**: This example doesn't use authentication (mock data only)
- **CORS Enabled**: Allows ChatGPT to connect from any origin
- **Input Validation**: Uses Zod schemas to validate all inputs
- **Sandboxed Widgets**: HTML widgets run in isolated iframes

## License

MIT License - feel free to use this as a template for your own MCP servers!

## Resources

- [OpenAI Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
- [Model Context Protocol Spec](https://spec.modelcontextprotocol.io/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Zillow API Documentation](https://www.zillow.com/howto/api/APIOverview.htm)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues related to:
- **MCP Server**: Check the server logs and verify tool definitions
- **UI Widgets**: Inspect the HTML/CSS in `ui-components/`
- **Cloudflare Deployment**: Consult [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/)
- **ChatGPT Integration**: Ensure connector is properly configured in Settings

---

Built with ❤️ using TypeScript, MCP, and OpenAI Apps SDK

