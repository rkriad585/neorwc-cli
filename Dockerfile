FROM oven/bun:1.2 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG VERSION
ARG COMMIT
ENV COMMIT_SHA=${COMMIT}
RUN bun run scripts/build.ts --target=bun-linux-x64 --outfile=/app/neorwc

FROM alpine:3.21 AS runtime
RUN apk add --no-cache ca-certificates
COPY --from=build /app/neorwc /usr/local/bin/neorwc
ENTRYPOINT ["neorwc"]
CMD ["--help"]
