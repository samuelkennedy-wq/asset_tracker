# ==============================================================================
# [24]7.ai Asset Tracking & Security Clearance Gateway - Production Dockerfile
# Fast, self-contained deployment for enterprise intranet environments
# ==============================================================================
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy application configuration and pre-built artifacts
COPY package*.json ./
COPY node_modules ./node_modules
COPY dist ./dist
COPY public ./public
COPY database.json ./database.json
COPY TECHNICAL_ARCHITECTURE.md ./TECHNICAL_ARCHITECTURE.md
COPY TECHNICAL_ARCHITECTURE.doc ./TECHNICAL_ARCHITECTURE.doc

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/status || exit 1

CMD ["node", "dist/server.cjs"]
