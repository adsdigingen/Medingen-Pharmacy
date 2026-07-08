# ==========================================
# Stage 1: Build Phase
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy root monorepo files for workspaces configuration
COPY package*.json ./
COPY tsconfig.json ./

# Copy packages/db source configurations
COPY packages/db/package*.json ./packages/db/
COPY packages/db/tsconfig.json ./packages/db/
COPY packages/db/prisma/schema.prisma ./packages/db/prisma/

# Copy apps/cloud source configurations
COPY apps/cloud/package*.json ./apps/cloud/
COPY apps/cloud/tsconfig*.json ./apps/cloud/
COPY apps/cloud/nest-cli.json ./apps/cloud/

# Install dependencies for workspaces
RUN npm ci

# Copy full packages/db and apps/cloud source files
COPY packages/db ./packages/db
COPY apps/cloud ./apps/cloud

# Generate Prisma Client & compile workspaces
RUN npm run db:generate
RUN npm run cloud:build

# ==========================================
# Stage 2: Production Execution Phase
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy root configurations and workspaces configurations
COPY package*.json ./
COPY packages/db/package*.json ./packages/db/
COPY apps/cloud/package*.json ./apps/cloud/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy generated prisma client and build artifacts from builder stage
COPY --from=builder /usr/src/app/packages/db/dist ./packages/db/dist
COPY --from=builder /usr/src/app/packages/db/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /usr/src/app/apps/cloud/dist /usr/src/app/apps/cloud/dist

EXPOSE 3002

CMD ["node", "apps/cloud/dist/main"]
