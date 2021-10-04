FROM node:16

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn
RUN yarn build

COPY . .

CMD [ "yarn", "start" ]
