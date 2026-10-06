# SaMi Party – ét image med spilserver + byggede TV- og telefon-apps.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/host/package.json apps/host/
COPY apps/controller/package.json apps/controller/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app /app
EXPOSE 3000
CMD ["npm", "start"]
