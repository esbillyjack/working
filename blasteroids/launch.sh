#!/bin/bash

# Blasteroids Game Launcher
# This script starts a local web server and opens the game in your browser

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the game directory
cd "$SCRIPT_DIR"

echo "🎮 Starting Blasteroids Game Server..."
echo "📂 Directory: $SCRIPT_DIR"
echo "🌐 Server will run on: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Open the browser after a short delay
(sleep 2 && open http://localhost:8000) &

# Start the Python HTTP server
python3 -m http.server 8000
