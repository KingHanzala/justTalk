FROM node:22-alpine AS frontend-build

WORKDIR /app

COPY frontend/package.json ./
RUN npm install

COPY frontend /app
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx/nginx.bootstrap.conf /etc/nginx/templates/nginx.bootstrap.conf
COPY nginx/nginx.tls.conf /etc/nginx/templates/nginx.tls.conf
COPY nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY --from=frontend-build /app/dist /usr/share/nginx/html

ENTRYPOINT ["/entrypoint.sh"]
