#!/bin/bash

# Default values
DETACHED_MODE=false
PORT=3000

# Parse command-line options using getopts
while getopts "dp:" option; do
  case $option in
    d)
      DETACHED_MODE=true # If -d is passed, set detached mode to true
      ;;
    p)
      PORT=$OPTARG # If -p is passed, set PORT to the provided argument
      ;;
    *)
      echo "Usage: $0 [-d] [-p <port>] <local-file-path>"
      echo "  -d            Run container in detached mode"
      echo "  -p <port>     Set the port to expose (default: 3000)"
      exit 1
      ;;
  esac
done

# Shift arguments to get the file path (the non-flag argument)
shift $((OPTIND - 1))

# Check if a file parameter is passed
if [ $# -eq 0 ]; then
  echo "Usage: $0 [-d] [-p <port>] <local-file-path>"
  exit 1
fi

# Local file to be mounted
LOCAL_FILE=$1

# Check if the file exists
if [ ! -f "$LOCAL_FILE" ]; then
  echo "Error: File '$LOCAL_FILE' does not exist."
  exit 1
fi

# Define the container path where the file will be mounted
CONTAINER_PATH="/app/$(basename "$LOCAL_FILE")"

# Define the Docker image name
IMAGE_NAME="konneqt-micro-gateway"

# Build the Docker run command
DOCKER_RUN_CMD="docker run -p $PORT:3000 -v $LOCAL_FILE:$CONTAINER_PATH $IMAGE_NAME"

# Add detached mode flag (-d) if DETACHED_MODE is true
if [ "$DETACHED_MODE" = true ]; then
  DOCKER_RUN_CMD="docker run -d -p $PORT:3000 -v $LOCAL_FILE:$CONTAINER_PATH $IMAGE_NAME"
fi

# Execute the Docker command
echo "Running: $DOCKER_RUN_CMD"
$DOCKER_RUN_CMD

# Success message
echo "Container started. Access Konneqt Micro-gateway at http://localhost:$PORT"
