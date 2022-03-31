FROM node:16.14.2 as build

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build:prod

ENV PORT 9000

EXPOSE 9000

# ---
CMD ["node", "dist/app.js"]
