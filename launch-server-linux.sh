#!/bin/bash

export HOST=0.0.0.0
export PORT_API=8000
export PORT_CDN_THINGDEFS=8001
export PORT_CDN_AREABUNDLES=8002
export PORT_CDN_UGCIMAGES=8003

bun game-server.ts