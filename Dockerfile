# Stage 1: Build React Client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# Set server URL to same origin for production (empty = use same origin)
ENV VITE_SERVER_URL=
RUN npm run build

# Stage 2: Setup Server
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production

# Stage 3: Final Production Image
FROM node:20-alpine
WORKDIR /app

# Copy server files
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY shared/ ./shared/
COPY data/ ./data/

# Copy built client
COPY --from=client-build /app/client/dist ./client/dist

# Set working directory to server
WORKDIR /app/server

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "index.js"]

