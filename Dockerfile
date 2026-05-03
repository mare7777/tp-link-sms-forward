# syntax=docker/dockerfile:1
FROM node:lts-alpine

WORKDIR /home/node/tp-link-modem-router-master

COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

COPY . .

CMD ["node", "./api-bridge.mjs"]
