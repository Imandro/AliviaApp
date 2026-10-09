#!/bin/bash
# Run as root on vm-alivia. Requires the fresh database/user and IP certificate.
set -euo pipefail
revision=${1:?Pass a tested Git commit SHA}
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid commit'; exit 1; }
app=/opt/alivia-azure
release="$app/releases/$revision"
install -d -o alivia_azure -g alivia_azure "$app/releases" "$release"
source_archive=$(mktemp)
trap 'rm -f "$source_archive"' EXIT
curl --fail --location --retry 3 "https://codeload.github.com/Imandro/AliviaApp/tar.gz/$revision" -o "$source_archive"
tar -xzf "$source_archive" --strip-components=1 -C "$release"
chown -R alivia_azure:alivia_azure "$release"
cd "$release"
runuser -u alivia_azure -- npm ci --no-audit --no-fund
runuser -u alivia_azure -- npm run build
runuser -u alivia_azure -- npm run build:api
runuser -u alivia_azure -- npm prune --omit=dev --no-audit --no-fund
ln -sfn "$release" "$app/current"
# nginx traverses directories and reads the public build, not private files.
chmod 755 "$app" "$app/releases" "$release"
install -d -m 700 /root/alivia-backups
cp -a /etc/nginx/sites-enabled /root/alivia-backups/sites-enabled-$(date +%Y%m%d%H%M%S)
cat > /etc/systemd/system/alivia-azure-api.service <<'UNIT'
[Unit]
Description=Alivia API on Azure VM
After=network.target postgresql.service
Requires=postgresql.service
[Service]
Type=simple
User=alivia_azure
Group=alivia_azure
WorkingDirectory=/opt/alivia-azure/current/dist-api
ExecStart=/usr/bin/node /opt/alivia-azure/current/dist-api/server.js
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=8080
Environment=DATABASE_TLS_MODE=local-socket
Environment="DATABASE_URL=postgresql:///alivia_azure?host=/var/run/postgresql&user=alivia_azure"
Environment=ALLOW_EXTERNAL_NOTIFICATIONS=false
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable alivia-azure-api
systemctl restart alivia-azure-api
for attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:8080/readyz; then break; fi
  sleep 2
done
curl --fail --silent http://127.0.0.1:8080/readyz
cp scripts/nginx-vm-azure.conf /etc/nginx/sites-available/alivia-azure
ln -sfn /etc/nginx/sites-available/alivia-azure /etc/nginx/sites-enabled/alivia-azure
if [ -L /etc/nginx/sites-enabled/default ]; then unlink /etc/nginx/sites-enabled/default; fi
if ! nginx -t; then
  unlink /etc/nginx/sites-enabled/alivia-azure
  ln -sfn /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
  echo 'Configuration rejected, existing nginx configuration restored'
  exit 1
fi
systemctl reload nginx
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nnginx -t && systemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/alivia-nginx
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/alivia-nginx
echo 'ALIVIA_AZURE_DEPLOYED'
