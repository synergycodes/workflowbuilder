FROM nginx:mainline-alpine

WORKDIR /usr/src/app

COPY . .

COPY --chown=nginx:nginx ./tools/deployment/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx ./tools/deployment/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx ./dist/apps/frontend /usr/share/nginx/html

RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid && \
    chown -R nginx:nginx /var/cache/nginx

USER nginx
