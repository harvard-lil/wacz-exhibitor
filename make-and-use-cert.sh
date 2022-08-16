#
# 1. Generates a TLS certificate using Certbot / Let's Encrypt for $HOST_NAME.
# 2. Uncomments sections of NGINX's configuration template referencing the certificate.
# 3. Restarts the server.
#
# [!] This script is meant to be used with a (temporary) `.env` file.
# [!] Assumes the server is running.
# [!] Assumes DNS record for domain in $HOST_NAME is set and propagated. 
#
if [ -f .env ]
then
  export $(cat .env | xargs);
  docker-compose run --rm  certbot certonly --webroot --webroot-path /usr/share/nginx/html/certbot/ -d $HOST_NAME;
  sed "s/### //" ./nginx/default.conf.template > ./nginx/default.conf.template.temp;
  mv ./nginx/default.conf.template.temp ./nginx/default.conf.template;
  docker-compose down;
  docker-compose up --force-recreate -d;
else
  echo 'Error: ".env" is missing (see: ".env.example").'
fi
