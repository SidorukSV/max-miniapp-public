FROM node:22-alpine AS frontend-build

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
ARG VITE_API_BASE=/api/v1
ARG VITE_APP_VERSION=0.0.0
ARG VITE_GIT_COMMIT=unknown
ARG VITE_BUILD_TIME=unknown
ENV VITE_API_BASE=${VITE_API_BASE}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_GIT_COMMIT=${VITE_GIT_COMMIT}
ENV VITE_BUILD_TIME=${VITE_BUILD_TIME}
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html
