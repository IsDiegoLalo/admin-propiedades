FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM base AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM base AS test
COPY tsconfig.json jest.config.ts ./
COPY src ./src
CMD ["npm", "run", "test:coverage"]

FROM node:20-alpine AS production
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3003
CMD ["node", "dist/index.js"]
