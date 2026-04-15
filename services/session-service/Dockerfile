FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate --schema prisma/schema.prisma

EXPOSE 4007

CMD ["npm", "run", "start"]
