FROM nginx:latest

# Copy files
COPY ./html/ /usr/share/nginx/html/
COPY ./nginx.conf /etc/nginx/conf.d/nginx.conf

# Copy entrypoint script
COPY ./docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

# Default command (passed to entrypoint)
CMD ["nginx", "-g", "daemon off;"]