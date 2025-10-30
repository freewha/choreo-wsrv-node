FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 可选：声明端口，但不硬编码
ARG PORT=3000
ENV PORT=$PORT
EXPOSE $PORT

CMD ["node", "index.js"]
