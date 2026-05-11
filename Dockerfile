# syntax=docker/dockerfile:1
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

LABEL org.opencontainers.image.title="tp-link-sms-forward"
LABEL org.opencontainers.image.description="TP-Link MR600 SMS bridge, poller, and SMTP gateway"
LABEL org.opencontainers.image.source="https://github.com/mare7777/tp-link-sms-forward"
LABEL org.opencontainers.image.licenses="GPL-3.0-or-later"

COPY package.json yarn.lock ./

RUN corepack enable \
  && corepack prepare yarn@1.22.22 --activate \
  && yarn install --frozen-lockfile --production=true \
  && yarn cache clean

COPY --chown=node:node . .

USER node

CMD ["node", "./api-bridge.mjs"]
