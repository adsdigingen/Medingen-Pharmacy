# ==========================================
# Stage 1: Build Phase
# ==========================================
FROM node:20-alpine AS builder

# Install system dependencies needed for Prisma
RUN apk add --no-cache openssl

WORKDIR /usr/src/app

# Copy root monorepo files for workspaces configuration
COPY package*.json ./

# Prune workspaces in package.json to only include apps/cloud and packages/db.
# This prevents npm ci from failing due to missing desktop workspaces.
RUN node -e " \
  const fs = require('fs'); \
  const pkg = JSON.parse(fs.readFileSync('package.json')); \
  pkg.workspaces = ['packages/db', 'apps/cloud']; \
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)); \
"

# Copy packages/db source configurations
COPY packages/db/package*.json ./packages/db/
COPY packages/db/tsconfig.json ./packages/db/
COPY packages/db/prisma/schema.prisma ./packages/db/prisma/

# Copy apps/cloud source configurations
COPY apps/cloud/package*.json ./apps/cloud/
COPY apps/cloud/tsconfig*.json ./apps/cloud/
COPY apps/cloud/nest-cli.json ./apps/cloud/

# Install dependencies for the pruned workspaces
RUN npm ci

# Copy full packages/db and apps/cloud source files
COPY packages/db ./packages/db
COPY apps/cloud ./apps/cloud

# Generate Prisma Client, build database workspace, & compile cloud app
RUN npm run db:generate
RUN npm run -w @medingen/db build
RUN npm run cloud:build

# ==========================================
# Stage 2: Production Execution Phase
# ==========================================
FROM node:20-alpine AS runner

# Install runtime system dependencies needed for Prisma
RUN apk add --no-cache openssl

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy pruned root configurations and workspaces configurations from builder stage
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/packages/db/package*.json ./packages/db/
COPY --from=builder /usr/src/app/apps/cloud/package*.json ./apps/cloud/

# Install only production dependencies for the pruned workspaces
RUN npm ci --omit=dev

# Copy generated prisma client and build artifacts from builder stage.
# Note: npm workspaces hoists @prisma/client to the root node_modules.
COPY --from=builder /usr/src/app/packages/db/dist ./packages/db/dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /usr/src/app/apps/cloud/dist ./apps/cloud/dist

EXPOSE 3002

CMD ["node", "apps/cloud/dist/main"]
