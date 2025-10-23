#!/bin/bash

# Quick start script for Zillow MCP Server

echo "🏠 Zillow MCP Server - Quick Start"
echo "=================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Check which command to run
if [ "$1" = "deploy" ]; then
  echo "🚀 Deploying to Cloudflare Workers..."
  npm run build
  wrangler deploy
elif [ "$1" = "dev" ]; then
  echo "💻 Starting local development server..."
  npm run dev
elif [ "$1" = "ngrok" ]; then
  echo "🌐 Starting server and exposing with ngrok..."
  echo "Note: Make sure ngrok is installed (brew install ngrok)"
  echo ""
  
  # Start server in background
  npm run dev &
  SERVER_PID=$!
  
  # Wait for server to start
  sleep 3
  
  # Start ngrok
  ngrok http 8000
  
  # Cleanup on exit
  kill $SERVER_PID
else
  echo "Usage: ./quick-start.sh [command]"
  echo ""
  echo "Commands:"
  echo "  dev     - Start local development server"
  echo "  deploy  - Deploy to Cloudflare Workers"
  echo "  ngrok   - Start server and expose with ngrok for testing"
  echo ""
  echo "Example: ./quick-start.sh dev"
fi

