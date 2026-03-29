FROM node:22-alpine AS frontend-build

WORKDIR /app

COPY frontend/package.json ./
RUN npm install

COPY frontend /app
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html
