#!/bin/sh
set -eu

APP_DOMAIN="${APP_DOMAIN:?APP_DOMAIN is required}"
APP_WWW_DOMAIN="${APP_WWW_DOMAIN:?APP_WWW_DOMAIN is required}"
APP_CANONICAL_HOST="${APP_CANONICAL_HOST:-$APP_DOMAIN}"

CERT_PATH="/etc/letsencrypt/live/${APP_CANONICAL_HOST}/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/${APP_CANONICAL_HOST}/privkey.pem"

render_config() {
  template_path="$1"
  output_path="$2"

  sed \
    -e "s|__APP_DOMAIN__|${APP_DOMAIN}|g" \
    -e "s|__APP_WWW_DOMAIN__|${APP_WWW_DOMAIN}|g" \
    -e "s|__APP_CANONICAL_HOST__|${APP_CANONICAL_HOST}|g" \
    "$template_path" > "$output_path"
}

if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
  render_config /etc/nginx/templates/nginx.tls.conf /etc/nginx/nginx.conf
  echo "Starting nginx with TLS config for ${APP_CANONICAL_HOST}"
else
  render_config /etc/nginx/templates/nginx.bootstrap.conf /etc/nginx/nginx.conf
  echo "Starting nginx in bootstrap HTTP mode until certificates are available"
fi

exec nginx -g 'daemon off;'
