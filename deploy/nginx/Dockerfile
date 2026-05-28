FROM node:22-alpine AS frontend-build

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
ARG VITE_API_BASE=/api/v1
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html
