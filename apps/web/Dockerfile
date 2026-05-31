FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/domain/package.json packages/domain/package.json

RUN HUSKY=0 npm ci

COPY . .

ARG NEXT_PUBLIC_API_ORIGIN=http://localhost:4000
ARG NEXT_PUBLIC_WS_ORIGIN=ws://localhost:4000
ENV NEXT_PUBLIC_API_ORIGIN=${NEXT_PUBLIC_API_ORIGIN}
ENV NEXT_PUBLIC_WS_ORIGIN=${NEXT_PUBLIC_WS_ORIGIN}

RUN npm run db:generate
RUN npm run build --workspace @inquara/web
RUN npm run verify:debug-free

ENV NODE_ENV=production
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=3000
ENV PORT=${SERVER_PORT}
ENV HOSTNAME=${SERVER_HOST}

EXPOSE 3000

CMD ["node", "scripts/web-start.mjs"]
