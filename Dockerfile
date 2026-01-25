FROM node:20-slim

# Install dependencies for canvas, FFmpeg, and Chromium (for Remotion)
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    ffmpeg \
    python3 \
    # Chromium dependencies for Remotion headless rendering
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for main app
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy remotion-studio package files and install
COPY remotion-studio/package*.json ./remotion-studio/
RUN cd remotion-studio && npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies for smaller image (keep remotion-studio deps)
RUN npm prune --production

# Create output directory and remotion public folder
RUN mkdir -p /app/output /app/remotion-studio/public/render-assets

EXPOSE 3001

CMD ["node", "dist/index.js"]
