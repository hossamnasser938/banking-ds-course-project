FROM node:20-alpine AS build
WORKDIR /workspace

COPY package*.json ./
COPY services/authentication/package*.json services/authentication/
COPY services/banking/package*.json services/banking/
COPY services/observability/package*.json services/observability/
COPY services/ui/package*.json services/ui/
RUN npm ci

COPY . .
RUN npm run build -w services/banking

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

COPY --from=build /workspace/services/banking/dist services/banking/dist

EXPOSE 8080
CMD ["node", "services/banking/dist/main.js"]
