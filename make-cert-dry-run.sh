#
# Checks if Certbot / Let's encrypt can generate a certificate for $HOST_NAME.
#
# [!] This script is meant to be used with a (temporary) `.env` file.
# [!] Assumes the server is running.
# [!] Assumes DNS record for domain in $HOST_NAME is set and propagated. 
#
if [ -f .env ]
then
  export $(cat .env | xargs);
  docker-compose run --rm  certbot certonly --webroot --webroot-path /usr/share/nginx/html/certbot/ --dry-run -d $HOST_NAME;
else
  echo 'Error: ".env" is missing (see: ".env.example").'
fi