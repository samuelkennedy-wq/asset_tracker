# ==============================================================================
# [24]7.ai Asset Tracking & Security Clearance Gateway - Production Dockerfile
# Multi-stage build for minimal image size, high security, and fast execution
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Compile React SPA and Node.js Server
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy entire source code
COPY . .

# Compile production bundle (Vite React SPA + Express server)
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Minimal Runtime
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled distribution from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/database.json ./database.json

# Copy server assets and documentation
COPY --from=builder /app/TECHNICAL_ARCHITECTURE.md ./TECHNICAL_ARCHITECTURE.md
COPY --from=builder /app/TECHNICAL_ARCHITECTURE.doc ./TECHNICAL_ARCHITECTURE.doc

# Non-root user for enterprise container security
USER node

# Expose internal application port
EXPOSE 3000

# Healthcheck to verify service availability
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/status || exit 1

# Start production server
CMD ["node", "dist/server.cjs"]
