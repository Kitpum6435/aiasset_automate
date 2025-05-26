# --------------------------
#   Stage 1: Build
# --------------------------
FROM node:22-alpine AS builder

WORKDIR /app

#  Copy package files first for better caching
COPY package*.json ./

#  Install dependencies
RUN npm install

#  Copy .env.build for use only in build-time (mock config)
COPY .env.build .env

#  Copy all source files
COPY . .

#  Generate Prisma Client
RUN npx prisma generate

#  Build the Next.js application
RUN npm run build

# --------------------------
#   Stage 2: Production
# --------------------------
FROM node:22-alpine

WORKDIR /app

# 🧱 Copy runtime-only files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# ฃ DON'T COPY .env.build or any real .env into production image
#  Instead, use --env-file .env during docker run

#  Generate Prisma Client again to match environment
RUN npx prisma generate

#  Environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

#  Start the app
CMD ["npm", "start"]
