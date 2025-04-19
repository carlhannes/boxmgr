# Stage 1: Install Dependencies
FROM node:lts-slim AS deps
WORKDIR /app

# Copy package.json and lock file
COPY package.json package-lock.json* ./

# Install dependencies using Clean Install (faster and more reliable for CI/CD)
# Requires package-lock.json
RUN npm ci

# Stage 2: Build the Application
FROM node:lts-slim AS builder
WORKDIR /app

# Copy dependencies from the previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the application code
COPY . .

# Build the Next.js application
# Ensure NODE_ENV is set if your build script relies on it, though `npm run build` often handles this.
# ENV NODE_ENV=production 
RUN npm run build

# Optional: Prune development dependencies if they were installed
# RUN npm prune --production

# Stage 3: Production Runner
FROM node:lts-slim AS runner
WORKDIR /app

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000
# ANTHROPIC_API_KEY and JWT_SECRET are managed internally by the application

# Create non-root user and group
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary artifacts from the builder stage
COPY --from=builder /app/public ./public
# Copy the production build output
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next 
# Copy production node_modules (adjust if you pruned in builder stage or if using standalone output)
COPY --from=builder /app/node_modules ./node_modules 
COPY --from=builder /app/package.json ./package.json
# Copy next.config.js if needed at runtime
COPY --from=builder /app/next.config.ts ./next.config.ts 

# Create and set ownership for the data directory
# The directory structure is copied, but content should be mounted via volume
RUN mkdir -p data && chown nextjs:nodejs data
# Copy the initial data directory structure if needed (e.g., for permissions)
# COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# Switch to the non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE ${PORT}

# Command to run the application
CMD ["npm", "run", "start"] 
