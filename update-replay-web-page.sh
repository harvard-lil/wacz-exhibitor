#
# 1. Tries to renew the TLS certificate delivered by Certbot / Let's Encrypt.
# 2. Restarts server.
#
# [!] Assumes the server is running.
# [!] Assumes DNS record for domain in $HOST_NAME is set and propagated. 
#
# Pulls the latest version of https://replayweb.page 
curl https://cdn.jsdelivr.net/npm/replaywebpage/sw.js > html/replay-web-page/sw.js
curl https://cdn.jsdelivr.net/npm/replaywebpage/ui.js > html/replay-web-page/ui.js