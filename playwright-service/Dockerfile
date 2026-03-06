# Use official Playwright image — includes Chromium + all dependencies
FROM mcr.microsoft.com/playwright:v1.49.0-noble

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install Node dependencies (skip Playwright browser download — already in image)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci --production

# Copy server code
COPY server.js .

# Railway sets PORT automatically
ENV PORT=3333

EXPOSE 3333

CMD ["node", "server.js"]
