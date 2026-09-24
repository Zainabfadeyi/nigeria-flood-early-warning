# Built with the monorepo root as the Docker build context (Apify's git
# integration does this automatically), so the actor can depend on the
# `shared` workspace package.
FROM apify/actor-node:20 AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY shared/package.json shared/
COPY actor/package.json actor/

RUN npm ci --include=dev

COPY shared shared
COPY actor actor

RUN npm run build --workspace=@nigeria-flood/shared --workspace=@nigeria-flood/actor

FROM apify/actor-node:20

WORKDIR /usr/src/app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY shared/package.json shared/
COPY actor/package.json actor/

RUN npm ci --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

COPY --from=builder /usr/src/app/shared/dist shared/dist
COPY --from=builder /usr/src/app/actor/dist actor/dist
COPY actor/data actor/data

CMD ["node", "actor/dist/main.js"]
