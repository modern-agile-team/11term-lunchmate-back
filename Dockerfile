FROM node:22

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

RUN pnpm build

CMD ["pnpm", "start:prod"]