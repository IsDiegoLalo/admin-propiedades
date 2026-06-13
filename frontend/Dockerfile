FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
# Variables de entorno inyectadas en build-time via --build-arg
ARG VITE_PROPERTIES_API_URL
ARG VITE_RESERVATIONS_API_URL
ARG VITE_REVIEWS_API_URL
ENV VITE_PROPERTIES_API_URL=$VITE_PROPERTIES_API_URL
ENV VITE_RESERVATIONS_API_URL=$VITE_RESERVATIONS_API_URL
ENV VITE_REVIEWS_API_URL=$VITE_REVIEWS_API_URL
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
