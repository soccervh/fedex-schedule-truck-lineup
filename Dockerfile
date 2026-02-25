FROM node:20-alpine AS base

WORKDIR /app

# --- Build client ---
FROM base AS client-build
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# --- Build server ---
FROM base AS server-build
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci
COPY server/ ./server/
RUN cd server && npx prisma generate && npm run build

# --- Production ---
FROM base AS production
ENV NODE_ENV=production

# Copy server production deps + built output
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules/.prisma ./server/node_modules/.prisma
COPY server/prisma ./server/prisma

# Copy built client
COPY --from=client-build /app/client/build ./client/build

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
