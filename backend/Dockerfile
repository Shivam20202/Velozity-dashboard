FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY backend/package.json ./backend/package.json
RUN npm install
COPY backend ./backend
RUN npm run prisma:generate -w backend && npm run build -w backend
EXPOSE 4000
CMD ["npm","run","start","-w","backend"]
