# 1. Base Image
FROM node:lts AS base

# Update npm to the latest version
RUN npm install -g npm@latest

# 2. Working Directory
WORKDIR /app

# Set environment variables - defaults can be overridden at runtime
ENV NODE_ENV=production
ENV PORT=3000

# Install necessary packages for SQLite and potential runtime dependencies
# RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

# Create a non-root user and group
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy dependency files
COPY package.json package-lock.json* ./

# Install dependencies and rebuild lightningcss
RUN npm install --include=optional --verbose \
  && npm rebuild lightningcss --build-from-source --verbose

RUN npm install lightningcss-linux-x64-gnu

# Install production dependencies
RUN npm install --legacy-peer-deps --include=optional

# Copy all source files
COPY . .

# Ensure data directory exists (might be volume mounted later)
RUN mkdir -p data && chown nextjs:nodejs data

# Build the Next.js application
RUN npm run build

# Set environment variables again (needed in the final stage)
ENV NODE_ENV=production
ENV PORT=3000

# Switch to the non-root user
USER nextjs

# 7. Expose Port
EXPOSE ${PORT}

# 10. Default Command
CMD ["npm", "run", "start"] 
