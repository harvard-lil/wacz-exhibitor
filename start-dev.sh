# Build Docker image and run the container as single use
docker build . -t wacz-exhibitor-local;
docker run --rm -p 8080:8080 wacz-exhibitor-local;