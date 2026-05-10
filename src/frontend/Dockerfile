# Stage 0, "build-stage", based on Node.js, to build and compile the frontend
FROM node:22 AS build-stage

WORKDIR /app

COPY package*.json /app/

RUN npm install

COPY ./ /app/

RUN npm run build


# Stage 1, based on Node.js, to run the standalone Next.js app
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=5002

COPY --from=build-stage /app/.next/standalone /app/
COPY --from=build-stage /app/.next/static /app/.next/static
COPY --from=build-stage /app/public /app/public

EXPOSE 5002

CMD ["node", "server.js"]