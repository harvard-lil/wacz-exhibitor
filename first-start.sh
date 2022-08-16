# [!] This script is meant to be used with a (temporary) `.env` file.
if [ -f .env ]
then
  docker-compose up --force-recreate -d;
else
  echo 'Error: ".env" is missing (see: ".env.example").'
fi