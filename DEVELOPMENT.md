# Echoland Development

Contributions are welcome!

## Running the server

### Natively

```sh
bun game-server.ts # Tested with v1.1.43
caddy run --config ./Caddyfile
```

### Docker

A `Dockerfile` and `docker-compose.yml` are provided with a preconfigured bun installation and port forwarding

```bash
docker compose up
```

### Build

Build the server for the target platform. This will create a `build` directory with the executable.

```bash
bun build:linux # Linux x64
bun build:windows # Windows x64
bun build:arm # ARM64 Linux
```

Binaries are also built automatically by the GitHub Actions workflow when a commit is pushed to the `release` branch. These are uploaded as artifacts and can be downloaded from the [actions page](https://github.com/Echoland-AL/echoland/actions) or the [releases page](https://github.com/Echoland-AL/echoland/releases).