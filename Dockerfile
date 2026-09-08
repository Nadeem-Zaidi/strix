# ---- Build stage ----
FROM node:20-bullseye AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* env vars into the JS bundle at BUILD time, not at
# container start time — so they have to be passed in as build args here,
# not as normal `environment:` entries in docker-compose.
#
# IMPORTANT: never add an AWS secret key (or any real secret) as a build
# arg here. Anything ARG'd in becomes readable in the shipped browser JS.
ARG VITE_API_URL
ARG VITE_FIREBASECONFIG_API
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_FIREBASECONFIG_API=$VITE_FIREBASECONFIG_API

RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]