# Echoland

**Echoland** is a single-player (for now) user-hosted server for the defunct VR creation platform Anyland.

## About

Echoland is a community project I’ve been building myself, based on:

- The archiver work by Zetaphor and Cyel  
- The skeleton game server originally created by Cyel

Since I’m still getting familiar with Git, I’ve created a separate repo with a simple Docker-based setup so anyone can run the server locally, even if it’s not 100% functional yet.

This is a community-driven effort. I started this with the goal of creating an open-source, writable archive. I’m not a trained developer, just someone diving in and learning as I go. The goal is to give the community a solid foundation to build their own servers, fully customizable and free to modify however you like.

## Current Features

- Create an area and build things  
- Automatically assigned name and area  
- Inventory and body attachment systems are not yet implemented
- Newly created areas may return as private until you restart the server  
- Repo posted early due to excitement  
- Actively in development—and open for community contributions

## Looking to Just Play?

If you're looking for a more functional server just to play the game, check out REnyland, a server I helped beta test. All server-side work was done by the creator Axsys.

REnyland is not open source (yet) as it’s still being finalized. Echoland is offered as an alternative for those who want to tinker, explore, or build their own thing.

## Disclaimer

I take no responsibility if the server breaks or if you lose your in-game progress. Once you’ve downloaded it, it’s all yours.

## License

This server is available under the [AGPL-3.0 license](https://www.gnu.org/licenses/agpl-3.0.en.html).

If you run this server and allow users to access it over any network, you must make the complete source code available to those users—including both the original code and any modifications you make.

If you're not comfortable with this, please do not use this server or any code in this repository.

## Related Works

- [Libreland Server](https://github.com/LibrelandCommunity/libreland-server) – Deprecated project replaced by Echoland  
- [Old Anyland Archive](https://github.com/Zetaphor/anyland-archive) – Original archive started in 2020  
- [Anyland Archive](https://github.com/theneolanders/anyland-archive) – Latest snapshot before servers went offline  
- [Anyland API](https://github.com/Zetaphor/anyland-api) – Documentation of the client/server API

### Network Captures

Two `ndjson` files in the `live-captures` directory were recorded using Cyel’s proxy server and captured by Zetaphor.  
Watch the recordings here:

- [Capture 1](https://www.youtube.com/watch?v=DBnECgRMnCk)  
- [Capture 2](https://www.youtube.com/watch?v=sSOBRFApolk)

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for details.  
The server is written in TypeScript and runs with Bun. Contributions are welcome.

## Setup & Running

### 1. Install Docker

Get started here: [https://www.docker.com/get-started](https://www.docker.com/get-started)

### 2. Configure Hosts File

#### If you have the Steam version:
```

yourserverip app.anyland.com
yourserverip d6ccx151yatz6.cloudfront.net
yourserverip d26e4xubm8adxu.cloudfront.net
#yourserverip steamuserimages-a.akamaihd.net
```


You won’t need the last line if you already have access to Steam artwork.  
Use `127.0.0.1` if the server is on your local machine. Otherwise, use the IP of the machine hosting the server.

#### If you’re using the non-Steam client:
```

yourserverip app.anyland.com
yourserverip d6ccx151yatz6.cloudfront.net
yourserverip d26e4xubm8adxu.cloudfront.net
yourserverip steamuserimages-a.akamaihd.net
```


Download the client:  
[Client Release](https://github.com/Echoland-AL/echoland/releases/tag/echoland-client)

Download the images folder:  
[Images Folder (Google Drive)](https://drive.google.com/file/d/1rSRWNtBepypfqHQ9LRPpDAsouAsByMCl/view?usp=drive_link)

Place the images folder inside the main Echoland directory.

### 3. Download Archive Data

[Archive Data Release](https://github.com/Echoland-AL/echoland/releases/tag/archive-data)

Extract the `data.zip` contents into your Echoland server folder named as "data"

### 4. Start the Server

You can either:

- Run `start-server.bat` directly  
- Or open CMD, navigate to the folder using `cd`, and run:
docker compose up

Tip: Create a shortcut to the `.bat` file for quick access.  
The first launch may take time while the area index loads. After that, it will cache and start instantly next time.
