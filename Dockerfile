# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.17.1
ARG NPM_TOKEN
FROM node:${NODE_VERSION}-alpine AS base

# Set working directory
WORKDIR /usr/src/app

################################################################################
# Stage for installing production dependencies
FROM base AS deps

# Copy dependency definition files
COPY package.json package-lock.json ./

# Install production dependencies with cache
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

################################################################################
# Stage for building the application
FROM base AS build

# Copy dependency definition files
COPY package.json package-lock.json ./

# Install all dependencies (including dev) with cache
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy application source code
COPY . .

# Build the application
RUN npm run build

################################################################################
# Final production image
FROM base AS final

# Set environment to production
ENV NODE_ENV=production

# Copy only necessary files for runtime
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/tsconfig*.json ./

# Set permissions for node user
RUN chown -R node:node /usr/local/lib/node_modules

# Switch to non-root user
USER node

# Expose application port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]