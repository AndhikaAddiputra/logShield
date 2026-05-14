FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/server-backend/package.json apps/server-backend/package.json
RUN npm install --omit=dev --ignore-scripts --workspace @log-shield/server-backend

COPY apps/server-backend apps/server-backend

WORKDIR /app/apps/server-backend

EXPOSE 4000

CMD ["npm", "start"]
