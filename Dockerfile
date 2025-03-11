FROM docker.io/denoland/deno:alpine-2.2.3
WORKDIR /app
COPY . .
RUN deno task build
CMD ["deno", "task", "start"]
