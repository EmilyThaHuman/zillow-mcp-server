# Zillow MCP Server

Model Context Protocol server for Zillow real estate integration with the ChatGPT Apps SDK. Search properties, explore neighborhoods, and calculate home affordability — all through natural language conversations with your AI assistant.

## Features

- **Property Search** — Search Zillow listings by location, price, beds/baths, and property type
- **Neighborhood Explorer** — Get real estate market data, trends, and neighborhood insights
- **Home Affordability Calculator** — Estimate buying power based on income, savings, and debt
- **Mortgage Payment Simulator** — Calculate monthly payments across interest rate scenarios
- **Interactive Widgets** — Rich, inline UI components rendered directly in ChatGPT
- **Real API Integration** — Live Zillow data via RapidAPI (with mock data fallback)
- **OAuth 2.0 Authentication** — Secure API access
- **Railway + Docker** deployment ready

## Tools

| Tool | Description |
|------|-------------|
| `zillow_property_search` | Search Zillow listings with filters for location, price, beds, baths, property type |
| `zillow_city_neighborhood_real_estate_information` | Get real estate market data and trends for a city or neighborhood |
| `calculateHomeAffordability` | Calculate how much home you can afford based on financial inputs |
| `interestRateMortgagePaymentSimulator` | Simulate monthly mortgage payments across different interest rate scenarios |

## Example Prompts

- "Find 3-bedroom homes in Austin, TX under $500,000"
- "What's the real estate market like in Scottsdale neighborhoods?"
- "I make $120k/year with $50k saved — how much house can I afford?"
- "Show me how my monthly payment changes if rates go from 6% to 7%"

## Installation

```bash
npm install
```

## Environment Variables

```bash
RAPIDAPI_KEY=your_rapidapi_key
REDIRECT_URI=http://localhost:8000/auth/callback
PORT=8000
```

## Development

```bash
# Run development server
npm run dev

# Build server and widgets
npm run build

# Build server only
npm run build:server

# Build widgets only
npm run build:widgets
```

## Deployment

Configured for Railway deployment with Docker. Set environment variables in your Railway project dashboard.

## License

MIT

---

## Powered by ZeroTwo

This MCP server is part of the [ZeroTwo AI platform](https://zerotwo.ai) — the all-in-one AI workspace combining GPT-5, Claude, Gemini, and real estate tools so you can make smarter home buying decisions with AI.

| | |
|---|---|
| 🌐 **[ZeroTwo — All AI Models in One App](https://zerotwo.ai)** | Search homes, analyze markets, and get AI-powered real estate insights — all in one place. |
| ✨ **[ZeroTwo Features](https://zerotwo.ai/features)** | AI chat, financial analysis, document tools, web search, and MCP-powered real estate tools. |
| 🤖 **[AI Models — GPT-5, Claude & Gemini](https://zerotwo.ai/zerotwo-models)** | Get expert real estate guidance from the world's most capable AI models. |
| 🔌 **[ZeroTwo Connectors & Integrations](https://zerotwo.ai/connectors)** | Connect Zillow, Expedia, Airtable, and more to power your AI workflows. |
| 💰 **[ZeroTwo Pricing](https://zerotwo.ai/pricing)** | One subscription that replaces ChatGPT Plus, Claude Pro, and Gemini Advanced. |
| 📝 **[ZeroTwo Blog](https://zerotwo.ai/blog)** | Real estate AI guides, market insights, and ZeroTwo product updates. |
| 🚀 **[Try ZeroTwo Free](https://app.zerotwo.ai/auth/login)** | Find your next home with AI — get started free today. |

> **Built for ZeroTwo** — Use this Zillow MCP server with [ZeroTwo's AI assistant](https://zerotwo.ai) to search properties, analyze neighborhoods, and calculate affordability through natural language — with beautiful interactive widgets.
