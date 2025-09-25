# Echoland


Echoland is a single player (for now) user server for the defunct VR creation platform Anyland.

## About

Echoland is a community project I’ve been building myself, based on the archiver work by Zetaphor and Cyel, and the skeleton game server originally created by Cyel.
Since I’m still getting familiar with Git, I’ve created a separate repo where I’ll be setting up a simple Docker-based install, so anyone can run the server locally, even if it’s not 100% functional yet.

Just a heads-up: this is a community-driven effort. I started this with the goal of creating an open-source, writable archive. 

I’m not a trained developer, just someone diving in and learning as I go. The main goal is to give the community a solid foundation to build their own servers, fully customizable and free to modify however you like.

Basically, you can now create an area and build things, you’ll be assigned a name and an area automatically. Inventory and body attachment systems aren’t working yet since they still need to be implemented. 
I posted the repo anyway because I couldn’t wait any longer lol. 
But no worries, I’m still working on it, and the real magic is that any of you can too!

If you're just looking to play the game with a more functional setup, I recommend REnyland, a server I helped beta test. 

All the server-side work for Renyland was done by the creator, Axsys. REnyland isn’t open source (yet), as it’s still being finalized, 
but I’m offering Echoland as an alternative for those who want to tinker, explore, 
or build their own thing (especially me lol ❤️).

Disclaimer: I take no responsibility if the server breaks or if you lose your in-game progress. Once you’ve downloaded it, it’s all yours!


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

First download Docker Setup and run it : https://www.docker.com/get-started/

If you have steam change your hosts files : 
"yourserverip" app.anyland.com
"yourserverip" d6ccx151yatz6.cloudfront.net
"yourserverip" d26e4xubm8adxu.cloudfront.net
#"yourserverip" steamuserimages-a.akamaihd.net
*You'll not be using the last port as you already have acces to the steam artwork.

It will be : "127.0.0.1" (without quotes) if your server is on your local machine, if you start the server on another machine, 
then, you'll need to use it's ip.

If your game is non-steam and the client you downloaded change your hosts files : 

"yourserverip" app.anyland.com
"yourserverip" d6ccx151yatz6.cloudfront.net
"yourserverip" d26e4xubm8adxu.cloudfront.net
"yourserverip" steamuserimages-a.akamaihd.net

If you don't have the steam game please use the client : https://github.com/Echoland-AL/echoland/releases/tag/echoland-client

Again for non steam user you'd need the images : https://drive.google.com/file/d/1rSRWNtBepypfqHQ9LRPpDAsouAsByMCl/view?usp=drive_link
The images folder is placed inside the main folder.

Download and the [Anyland archive data file](https://github.com/Echoland-AL/echoland/releases/tag/archive-data).

Extract the `data.zip` contents into the main Echoland server folder.

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

Start Docker if not done already and then,
There's a start-server.bat file that you can start directly or open cmd type in after selecting the folder with the cd function : docker compose up
You can also make a shortcut of that .bat file for a rapid start.
It will take some time for the area index to load, afterwards you'll have a cache so the next time you start the server it will start in an instant.


