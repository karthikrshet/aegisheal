# ── AegisHeal production image ─────────────────────────────────
# Build:  docker build -t aegisheal .
# Run:    docker run -p 4000:4000 -e JWT_SECRET=$(openssl rand -hex 48) aegisheal
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY . .
RUN npm run build --workspace client

FROM node:20-alpine
ENV NODE_ENV=production API_PORT=4000 DATA_DIR=/data
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --workspace server --include-workspace-root=false && npm cache clean --force
COPY server/src server/src
COPY --from=build /app/client/dist client/dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "server/src/index.js"]
