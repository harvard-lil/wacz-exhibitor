# Build Docker image and run the container as single use
docker build . -t wacz-exhibitor-local;
docker run --rm -e WARC_REMOTE="https://perma.s3.amazonaws.com" -e WACZ_REMOTE="https://perma-wacz.s3.amazonaws.com" -p 7080:8080 wacz-exhibitor-local;