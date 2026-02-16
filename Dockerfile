# Use official Node.js image with Chromium pre-installed
FROM ghcr.io/puppeteer/puppeteer:21.11.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (Chromium already included in base image)
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Start the application
CMD ["node", "server.js"]
