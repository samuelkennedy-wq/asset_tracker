# ==============================================================================
# [24]7.ai Asset Tracking & Security Clearance Gateway - Production Dockerfile
# Enterprise-ready multi-stage container build
# ==============================================================================

# --- Stage 1: Build Frontend and Backend Bundles ---
FROM node:22-alpine AS builder

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG http_proxy
ARG https_proxy

WORKDIR /app

# Enterprise network resilience: configure proxy if provided & increase timeouts
RUN if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi \
    && if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Stage 2: Production Minimal Runtime ---
FROM node:22-alpine AS runner

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG http_proxy
ARG https_proxy

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy application manifest and install production dependencies only
COPY package*.json ./
RUN if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi \
    && if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm install --omit=dev

# Copy compiled bundles and static assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/database.json ./database.json

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/status || exit 1

CMD ["node", "dist/server.cjs"]
