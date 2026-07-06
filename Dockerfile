FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@10 --activate

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm build

CMD ["sh", "-c", "pnpm preview --host 0.0.0.0 --port ${PORT:-4173}"]
