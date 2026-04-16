FROM node:20

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install


COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 4004

CMD ["npm", "run", "start"]