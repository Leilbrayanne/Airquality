# ── Stage 1: Build the React app ──────────────────────────────
FROM node:18-alpine AS build-stage

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --silent

# Copy source and build
COPY . .
RUN VITE_API_BASE_URL=/api npm run build

# ── Stage 2: Serve via Nginx ───────────────────────────────────
FROM nginx:stable-alpine AS production-stage

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
