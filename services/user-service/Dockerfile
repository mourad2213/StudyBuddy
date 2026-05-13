# Use Node.js
FROM node:20

# Create app directory inside container
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the code
COPY . .
# COPY .env ./
# Expose your port
EXPOSE 4001

# Start the app
CMD ["node", "index.js"]
