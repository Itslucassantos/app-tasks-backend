FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

FROM builder AS test

FROM node:24-alpine AS production

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/generated   ./generated

COPY package*.json       ./
COPY prisma              ./prisma
COPY prisma.config.ts    ./

COPY files ./files

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && NODE_PATH=/app/dist node dist/src/main"]
