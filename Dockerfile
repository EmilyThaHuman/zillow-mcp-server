# Use Node.js LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.ts ./

# Install dependencies
RUN npm ci

# Copy source code and UI components
COPY src ./src
COPY ui-components ./ui-components

# Build the widgets (Vite) and server (TypeScript)
# This creates the assets/ directory with built HTML/JS/CSS
RUN npm run build

# Expose the port
EXPOSE 8006

# Set environment variable for port
ENV PORT=8006

# Start the server
CMD ["node", "dist/server/server.js"]

