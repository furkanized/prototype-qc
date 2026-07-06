FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build

CMD ["sh", "-c", "npm run start -- --host 0.0.0.0 --port ${PORT:-4173}"]
