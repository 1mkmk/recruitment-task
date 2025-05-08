# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Setup the production environment
FROM nginx:stable-alpine

# Copy custom nginx config if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build output from the build stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check for nginx
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Command to run nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]