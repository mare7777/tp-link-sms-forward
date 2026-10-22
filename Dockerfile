# syntax=docker/dockerfile:1
FROM node:22.23.4-alpine3.24

ENV NODE_ENV=production
WORKDIR /app

LABEL org.opencontainers.image.title="tp-link-sms-forward"
LABEL org.opencontainers.image.description="TP-Link MR600 SMS bridge, poller, and SMTP gateway"
LABEL org.opencontainers.image.source="https://github.com/mare7777/tp-link-sms-forward"
LABEL org.opencontainers.image.licenses="GPL-3.0-or-later"

COPY package.json yarn.lock ./

RUN corepack enable \
  && yarn install --immutable --mode=skip-build

COPY --chown=node:node . .

USER node

CMD ["node", "./api-bridge.mjs"]
