#!/bin/bash
set -euo pipefail
id alivia_azure >/dev/null 2>&1 || useradd --system --home /opt/alivia-azure --shell /usr/sbin/nologin alivia_azure
install -d -o alivia_azure -g alivia_azure -m 750 /opt/alivia-azure
if ! runuser -u postgres -- psql -Atc "SELECT 1 FROM pg_roles WHERE rolname='alivia_azure'" | grep -qx 1; then
  runuser -u postgres -- createuser alivia_azure
fi
if ! runuser -u postgres -- psql -Atc "SELECT 1 FROM pg_database WHERE datname='alivia_azure'" | grep -qx 1; then
  runuser -u postgres -- createdb -O alivia_azure alivia_azure
fi
runuser -u alivia_azure -- psql -d alivia_azure -Atc 'SELECT current_user, current_database();'
if ! command -v snap >/dev/null; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y snapd
fi
if ! snap list certbot >/dev/null 2>&1; then snap install --classic certbot; fi
/snap/bin/certbot --version
/snap/bin/certbot certonly --non-interactive --agree-tos --register-unsafely-without-email --webroot -w /var/www/html --ip-address 57.156.61.193 --preferred-profile shortlived --cert-name alivia-azure-ip
echo 'BASE_NUEVA_Y_CERTIFICADO_PREPARADOS'
