# Blasteroids

A web-based Blasteroids game implementation.

## Source
Downloaded from: https://www.billy2thejack.com/

## Controls
- **Arrow Keys**: Rotate Left/Right
- **Up Arrow**: Thrust
- **Spacebar**: Fire
- **S**: Start Game

## How to Run

### Option 1: Quick Launch (Recommended)
Double-click `launch.sh` or run:
```bash
./launch.sh
```
This will automatically start the server and open the game in your browser.

### Option 2: Manual Launch
```bash
python3 -m http.server 8000
```
Then open http://localhost:8000 in your browser.

**Note:** You cannot simply open `index.html` directly due to CORS restrictions. A web server is required.

## Files
- `index.html` - Main game file (includes embedded CSS and game logic)
- `js/audio/sound-manager.js` - Audio management system
- `js/cinematic.js` - Cinematic effects and animations
- `js/submodes.js` - Game submodes and states

## Features
- Extra life at 1000 points
- Sound effects (can be toggled)
- FPS counter
- Debug mode available
