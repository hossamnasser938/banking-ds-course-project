#!/bin/sh
set -eu

: "${AUTH_SERVICE_URL:=http://localhost:8080}"
: "${BANKING_SERVICE_URL:=http://localhost:8080}"
: "${OBS_SERVICE_URL:=http://localhost:8080}"

envsubst '${AUTH_SERVICE_URL} ${BANKING_SERVICE_URL} ${OBS_SERVICE_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
