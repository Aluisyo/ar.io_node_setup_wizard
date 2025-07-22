FROM node:20-alpine AS builder
WORKDIR /app
# install all deps
COPY package.json package-lock.json ./
RUN npm ci
# copy source and build
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
# install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# copy built frontend and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server


ENV NODE_ENV=production

RUN apk add --no-cache docker-cli docker-compose git bash
# allow mounting Docker socket
VOLUME ["/var/run/docker.sock"]

EXPOSE 5001

CMD ["node", "server/index.js"]
