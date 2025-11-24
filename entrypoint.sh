#!/bin/bash
set -e

# Get the values from environment variables
WARC_REMOTE=${WARC_REMOTE:-""}
WACZ_REMOTE=${WACZ_REMOTE:-""}

# Path to nginx config
NGINX_CONF="/etc/nginx/conf.d/nginx.conf"

# Perform replacement if environment variables are set
if [ -n "$WARC_REMOTE" ] && [ -n "$WACZ_REMOTE" ]; then    
    # Create a temporary file
    TEMP_FILE=$(mktemp)
    
    counter=0
    while IFS= read -r line; do
        if echo "$line" | grep -q "https://example.com"; then
            counter=$((counter + 1))
            if [ $counter -lt 3 ]; then
                echo "${line//https:\/\/example.com/$WARC_REMOTE}"
            else
                echo "${line//https:\/\/example.com/$WACZ_REMOTE}"
            fi
        else
            echo "$line"
        fi
    done < "$NGINX_CONF" > "$TEMP_FILE"
    
    # Replace original file
    mv "$TEMP_FILE" "$NGINX_CONF"
fi

exec "$@"