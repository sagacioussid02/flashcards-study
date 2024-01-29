FROM node:18

WORKDIR /usr/src/

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8001

CMD ["node", "src/app.js"]
