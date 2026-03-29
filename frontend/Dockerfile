FROM node:22-alpine AS build

WORKDIR /app

COPY frontend/package.json ./
RUN npm install

COPY frontend /app

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app /app

EXPOSE 4173

CMD ["npm", "run", "preview"]
