# Echoland


Echoland is a single player (for now) user server for the defunct VR creation platform Anyland.

## About

Echoland is a community project built by [GAMEDRIX](https://github.com/slimyburp-gamedrix), building atop the previous archiver work by Zetaphor and Cyel, and the skeleton game server by Cyel.

## License

This server is freely available under the [AGPL-3.0 license](https://www.gnu.org/licenses/agpl-3.0.en.html). This license requires that if you run this server and allow users to access it over any network, you must make the complete source code available to those users - including both the original code and any modifications you make. If you are not comfortable with this, do not use this server or any of the code in this repository.

## Related Works

* [Libreland Server](https://github.com/LibrelandCommunity/libreland-server) - A now deprecated project to build an open game server. This work has been replaced with Echoland
* [Old Anyland Archive](https://github.com/Zetaphor/anyland-archive) - The original Anyland archive, started in 2020 by Zetaphor back when the servers were still active
* [Anyland Archive](https://github.com/theneolanders/anyland-archive) - The latest Anyland archive, championed by Cyel with work by Zetaphor - This is the latest snapshot of the servers before they
went offline
* [Anyland API](https://github.com/Zetaphor/anyland-api) - Documentation of the Anyland client/server API documented before the servers went offline

### Network captures
There are two `ndjson` files in the `live-captures` directory. These were captured using Cyel's proxy server and recorded by Zetaphor, video captures of these recordings can be found [here](https://www.youtube.com/watch?v=DBnECgRMnCk) and [here](https://www.youtube.com/watch?v=sSOBRFApolk).

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md). The server is written in Typescript and run with Bun. Contributions are welcome!

## Setup and running

Download the latest server binary from the [releases page](https://github.com/Echoland-AL/echoland/releases/latest).

Download and extract the [Echoland Client](https://github.com/Echoland-AL/echoland/releases/tag/echoland-client).

Download and the [Anyland archive data file](https://github.com/Echoland-AL/echoland/releases/tag/archive-data).

Extract the `data.zip` contents into the Echoland server folder:

```
echoland-server-folder
  echoland-server-windows-x64.exe
  echoland-server-linux-x64
  echoland-server-linux-arm64
  data/
    └── area
    └── person
    └── thing
    └── placement
    └── forum
```

### Start the server

Run the binary for your platform.

*Windows*: Run `echoland-server-windows-x64.exe`.

*Linux*: Run `echoland-server-linux-x64` or `echoland-server-linux-arm64`.

### Start the client:

~~Note that this client does not require modification of the OS `hosts` file, it has been preconfigured to work with local servers.~~

Still needs Caddy for now, see [DEVELOPMENT.md](DEVELOPMENT.md).

### Windows

Run `anyland.exe` from the Echoland Client folder you downloaded and extracted.

### Linux

Configure your Proton version and Echoland client download path in `launch-anyland-linux.sh` and run the script.

The environment variables for running in VR with WiVRn are also preconfigured in the script. See the [LVRA wiki](https://lvra.gitlab.io) for more information on VR on Linux.