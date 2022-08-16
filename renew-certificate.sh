#
# 1. Tries to renew the TLS certificate delivered by Certbot / Let's Encrypt.
# 2. Restarts server.
#
# [!] Assumes the server is running.
#
docker compose run --rm certbot renew;
docker-compose down;
docker-compose up --force-recreate -d;
