FROM node:20-alpine AS build
WORKDIR /workspace

COPY package*.json ./
COPY services/ui/package*.json services/ui/
COPY services/authentication/package*.json services/authentication/
COPY services/banking/package*.json services/banking/
COPY services/observability/package*.json services/observability/
RUN npm ci

COPY . .
WORKDIR /workspace/services/ui
RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache gettext
COPY services/ui/nginx.conf /etc/nginx/templates/default.conf.template
COPY services/ui/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=build /workspace/services/ui/dist /usr/share/nginx/html

EXPOSE 80
CMD ["/docker-entrypoint.sh"]
