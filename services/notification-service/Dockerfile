FROM node:18

WORKDIR /app

# copy package files first
COPY package*.json ./

RUN npm install

# copy everything AFTER install
COPY . .

# 🔥 VERY IMPORTANT
RUN npx prisma generate

EXPOSE 4005

CMD ["node", "index.js"]