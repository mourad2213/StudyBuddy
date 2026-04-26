FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm cache clean --force && npm ci

COPY . .

RUN npx prisma generate

EXPOSE 4008

CMD ["npm", "run", "start:docker"]
