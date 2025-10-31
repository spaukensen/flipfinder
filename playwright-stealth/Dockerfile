FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server.js ./

EXPOSE 3001

CMD ["node", "server.js"]
