FROM node:20-slim

WORKDIR /app

# Install dependencies for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma folder and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source files
COPY index.js ./
COPY kafka.js ./

# Expose port
EXPOSE 4006

# Start the service
CMD ["node", "index.js"]