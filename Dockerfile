FROM node:16.14.2 as build

WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./
COPY .env ./

COPY . ./

RUN yarn install
RUN yarn build:prod

ENV PORT 9000

EXPOSE 9000

# ---
CMD ["node", "dist/src/app.js"]
