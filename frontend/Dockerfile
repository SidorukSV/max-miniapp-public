FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_BASE=/api/v1
ARG VITE_APP_VERSION=0.0.0
ARG VITE_GIT_COMMIT=unknown
ARG VITE_BUILD_TIME=unknown
ENV VITE_API_BASE=${VITE_API_BASE}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_GIT_COMMIT=${VITE_GIT_COMMIT}
ENV VITE_BUILD_TIME=${VITE_BUILD_TIME}
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
