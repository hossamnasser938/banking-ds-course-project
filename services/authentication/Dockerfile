FROM node:20-alpine AS build
WORKDIR /workspace

COPY package*.json ./
COPY services/authentication/package*.json services/authentication/
COPY services/banking/package*.json services/banking/
COPY services/observability/package*.json services/observability/
COPY services/ui/package*.json services/ui/
RUN npm ci

COPY . .
RUN npm run build -w services/authentication

FROM node:20-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
COPY services/authentication/package*.json services/authentication/
COPY services/banking/package*.json services/banking/
COPY services/observability/package*.json services/observability/
COPY services/ui/package*.json services/ui/
RUN npm ci --omit=dev

COPY --from=build /workspace/services/authentication/dist services/authentication/dist

EXPOSE 8080
CMD ["node", "services/authentication/dist/src/main.js"]
