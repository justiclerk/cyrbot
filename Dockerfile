# Build stage
FROM docker.io/denoland/deno:alpine-2.2.3 as builder
WORKDIR /app
COPY . .
RUN deno task build

# Production stage
FROM docker.io/denoland/deno:alpine-2.2.3
WORKDIR /app
COPY --from=builder /app .
CMD ["deno", "task", "start"]
