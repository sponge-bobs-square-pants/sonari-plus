# syntax=docker/dockerfile:1

# ---- deps: install PRODUCTION node_modules only ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- run: slim runtime, non-root ----
FROM node:24-alpine
WORKDIR /app
# Only what's needed to run — deps + source (no dev deps, no tests).
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
# NODE_ENV / secrets come at runtime via --env-file (see Makefile), never baked.
USER node
EXPOSE 5174
CMD ["node", "src/index.js"]
