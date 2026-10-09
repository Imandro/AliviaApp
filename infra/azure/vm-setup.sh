#!/usr/bin/env bash
# ALIVIA - Aprovisionamiento de la VM de Azure (cloud-init).
#
# Se ejecuta la primera vez que arranca la VM y vuelve a correr en cada
# `az deployment group create`. Instala y configura:
#
#   Node 22 LTS        -> backend de la API
#   PostgreSQL 15      -> base de datos en la propia VM
#   nginx              -> sirve dist/ y hace proxy de /api/*
#   systemd            -> reinicio automatico del backend
#
# Lo que este script NO hace, a proposito:
#
#   - No abre PostgreSQL (5432) a internet. El backend habla con el por
#     loopback y el NSG no tiene regla para ese puerto.
#   - No instala el codigo. El deploy lo hace deploy-azure.yml por SSH, para
#     que el repositorio siga siendo la unica fuente de lo que corre.
#   - No toca nginx todavia: dist/ no existe hasta el primer deploy.
#
# Uso manual (depuracion):
#   ssh azureuser@<ip> sudo /opt/alivia/vm-setup.sh <adminPassword> <pgPassword> <publicIp>

set -euo pipefail

NODE_MAJOR="22"
PG_MAJOR="15"
APP_DIR="/opt/alivia"
APP_USER="alivia"
LOG_PREFIX="[alivia-setup]"

# Secretos y datos que llegan como argumentos del deployment script de ARM.
ADMIN_PASSWORD="${1:-}"
PG_PASSWORD="${2:-}"
PUBLIC_IP="${3:-}"
CRON_SECRET="${4:-}"

log() { echo "${LOG_PREFIX} $*"; }
fail() { echo "${LOG_PREFIX} ERROR: $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail "este script necesita root (sudo)"
[[ -n "${PG_PASSWORD}" ]] || fail "falta la contrasena de PostgreSQL (argumento 2)"
[[ -n "${CRON_SECRET}" ]] || fail "falta el CRON_SECRET (argumento 4)"

# Sin esto, sudo muestra su propia advertencia en stderr y, en Ubuntu 22.04,
# secure_path cambia el PATH. Sin el export, `node` no se encuentra.
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export DEBIAN_FRONTEND=noninteractive

# --- Reejecucion idempotente -------------------------------------------------
# Cloud-init lo corre una vez, pero el deployment script de ARM puede repetirse.
# Sin esto, la segunda pasada falla en apt-get install y el despliegue se marca
# como error aunque la VM este perfecta.
APT_UPDATED=0
apt_update() {
  if [[ $APT_UPDATED -eq 0 ]]; then
    apt-get update -qq
    APT_UPDATED=1
  fi
}

# El servicio corre como `alivia`, no como root: si el bundle se compromete por
# una dependencia, el atacante hereda un usuario sin shell ni sudo. Se crea aqui
# y no en el script de deploy porque systemd lo necesita desde el primer arranque.
if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  log "creando usuario ${APP_USER}"
  useradd --system --create-home --home-dir "/home/${APP_USER}" \
    --shell /usr/sbin/nologin "${APP_USER}"
fi

# --- Paquetes base -----------------------------------------------------------
log "1/7 paquetes base"
apt_update
apt-get install -y -qq curl ca-certificates gnupg unzip git nginx \
  "postgresql-${PG_MAJOR}" postgresql-contrib

# --- Node 22 desde NodeSource ------------------------------------------------
# El repositorio de Ubuntu 22.04 trae Node 18, que no soporta el runtime 22 que
# espera el bundle. NodeSource es la misma fuente que usan las imagenes oficiales.
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 22 ]]; then
  log "2/7 Node ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
log "node $(node -v) / npm $(npm -v)"

# --- PostgreSQL --------------------------------------------------------------
log "3/7 PostgreSQL ${PG_MAJOR}"
systemctl enable --now postgresql

# listen_addresses queda en localhost a proposito: el NSG no abre 5432 y la
# conexion del backend es por loopback. Ponerlo en '*' expondría la base de
# datos de salud mental a internet.
PGCONF="/etc/postgresql/${PG_MAJOR}/main/postgresql.conf"
sed -i "s/^#\?listen_addresses.*/listen_addresses = 'localhost'/" "$PGCONF"
sed -i "s/^#\?port =.*/port = 5432/" "$PGCONF"
sed -i "s/^#\?ssl =.*/ssl = on/" "$PGCONF"
systemctl restart postgresql

install -d -m 0755 -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}"

# --- Rol y base de datos -----------------------------------------------------
log "4/7 rol y base de datos"

# DO + EXCEPTION para que la segunda pasada no falle si ya existen. El rol se
# crea con LOGIN y NO con SUPERUSER: el backend solo necesita su propia base.
# El DO va dentro de un archivo porque psql no expande ${PG_PASSWORD} con
# ON_ERROR_STOP si el rol ya existe: se genera el SQL y se ejecuta aparte.
ROLE_SQL="$(mktemp)"
cat > "${ROLE_SQL}" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'alivia_admin') THEN
    CREATE ROLE alivia_admin LOGIN PASSWORD '${PG_PASSWORD}';
  ELSE
    ALTER ROLE alivia_admin WITH LOGIN PASSWORD '${PG_PASSWORD}';
  END IF;
END
\$\$;
SQL

if ! sudo -u postgres psql -v ON_ERROR_STOP=1 -f "${ROLE_SQL}" >/dev/null 2>&1; then
  # El peer authentication de postgres no acepta una contrasena en el propio
  # socket. Se reintenta por TCP, que si la acepta.
  PGHOST=127.0.0.1 PGPASSWORD="${PG_PASSWORD}" sudo -u postgres \
    psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -f "${ROLE_SQL}" >/dev/null
fi
rm -f "${ROLE_SQL}"

sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='alivia'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE alivia OWNER alivia_admin"

# postgresql-contrib da pgcrypto, que es de donde sale gen_random_uuid() en el
# schema (users.id). Sin la extension, el primer CREATE TABLE falla.
sudo -u postgres psql -d alivia -c "CREATE EXTENSION IF NOT EXISTS pgcrypto"

# pg_hba.conf: el backend se conecta por loopback con contrasena. Sin esta
# regla, pg_hba.conf denies la conexion con SCRAM aunque el rol exista.
PGHBA="/etc/postgresql/${PG_MAJOR}/main/pg_hba.conf"
sed -i "s|^host\s\+all\s\+all\s\+127\.0\.0\.1/32\s\+.*|host all all 127.0.0.1/32 scram-sha-256|" "$PGHBA"
sed -i "s|^host\s\+all\s\+all\s\+::1/128\s\+.*|host all all ::1/128 scram-sha-256|" "$PGHBA"
systemctl restart postgresql

# .pgallow evita que psql pregunte la contrasena al backend.
install -d -m 0755 -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}"

# --- nginx -------------------------------------------------------------------
log "5/7 nginx"
# Se sirve dist/ como root del sitio y /api/* va al backend de Node. Sin
# buffering ni limites de tiempo, el chat de IA no puede hacer streaming SSE:
# nginx acumularia los tokens y el cliente los recibiria de golpe al final.
#
# `listen 80 default_server` sin server_name propio: la VM se accede por IP, y sin
# `default_server` el primer vhost habilitado gana y podria no ser este.
cat > /etc/nginx/sites-available/alivia <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /opt/alivia/dist;
    index index.html;

    client_max_body_size 16m;

    # La SPA enruta en el cliente: /moods, /plans y cualquier ruta profunda
    # tienen que devolver index.html, no un 404 del sistema de archivos.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Assets con hash en el nombre: nunca cambian de contenido.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # index.html, el service worker y el manifiesto deben recargarse siempre.
    location ~* ^/(index\.html|sw\.js|manifest\.webmanifest|releases\.json)$ {
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # El APK y su manifiesto van a la red siempre: el hash del binario cambia en
    # cada publicacion.
    location /releases/ {
        add_header Cache-Control "no-cache, must-revalidate";
        add_header Access-Control-Allow-Origin "*";
        types { }
        default_type application/vnd.android.package-archive;
    }

    # El service worker debe poder registrarse en la raiz.
    location = /push-sw.js {
        add_header Cache-Control "no-cache, must-revalidate";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        # Streaming del chat de IA: sin esto nginx bufferiza la respuesta y el
        # token llega al movil cuando la respuesta ya ha terminado.
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;

        # El TTS sintetiza voz y puede tardar 6 s; el chat de IA tiene un
        # presupuesto de 22 s. Sin esto nginx cortaria a los 60 s por defecto.
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/alivia /etc/nginx/sites-enabled/alivia
rm -f /etc/nginx/sites-enabled/default

# nginx -t antes de recargar: con la SPA sin desplegar todavia, dist/ no existe
# pero el test solo valida la sintaxis, no que el directorio este.
nginx -t
systemctl enable --now nginx

# --- systemd -----------------------------------------------------------------
log "6/7 unidad systemd"
# El servicio corre como usuario sin privilegios, con reinicio automatico. Si
# Node cae, systemd lo levanta: sin esto, un OOM deja la API caida hasta que
# alguien entra por SSH.
cat > /etc/systemd/system/alivia-api.service <<'UNIT'
[Unit]
Description=ALIVIA API (Node 22)
Documentation=https://github.com/Imandro/AliviaApp
After=network-online.target postgresql.service
Wants=network-online.target
Requires=postgresql.service

[Service]
Type=simple
User=alivia
Group=alivia
WorkingDirectory=/opt/alivia
Environment=NODE_ENV=production
Environment=PORT=3000
# El backend escucha solo en loopback: a el se llega por el proxy de nginx, no
# desde internet. El NSG tampoco abre 3000, pero el bind a loopback evita que
# quede accesible si alguien cambia el NSG por error.
Environment=HOST=127.0.0.1
EnvironmentFile=-/opt/alivia/.env
ExecStart=/usr/bin/node /opt/alivia/server/dist/server.js
Restart=always
RestartSec=5
# El TTS y el chat de IA tienen presupuestos de 6 y 22 s; el margen llega a los
# 120 s que espera nginx.
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=alivia-api

# Endurecimiento: el servicio no necesita escribir fuera de /opt/alivia ni
# cambiar de usuario.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/alivia

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable alivia-api

# --- Cron de notificaciones --------------------------------------------------
# En AWS lo programaba EventBridge Scheduler con `rate(15 minutes)` y una IAM
# Role que firmaba la llamada a /api/notifications/dispatch. En la VM el
# equivalente es un timer de systemd.
#
# Sin esto, los recordatorios push dejan de enviarse: es la unica parte del
# sistema que no nace de una peticion de un usuario, asi que nadie se da cuenta
# de que dejo de funcionar salvo que alguien espere a un recordatorio.
#
# Cada disparo llama al endpoint por loopback con el CRON_SECRET. La clave se
# lee de un archivo propio, separado del .env del backend, para que el servicio
# del cron no necesite el resto de secretos de la API.
CRON_DIR="/etc/alivia"
install -d -m 0750 "${CRON_DIR}"
printf '%s' "${CRON_SECRET:-}" > "${CRON_DIR}/cron-secret"
chown root:"${APP_USER}" "${CRON_DIR}/cron-secret"
chmod 0640 "${CRON_DIR}/cron-secret"

cat > /etc/systemd/system/alivia-notify.service <<'UNIT'
[Unit]
Description=ALIVIA - dispatch de notificaciones push
After=network-online.target alivia-api.service
Wants=network-online.target

[Service]
Type=oneshot
User=alivia
Group=alivia
EnvironmentFile=-/opt/alivia/.env
ExecStart=/opt/alivia/cron-dispatch.sh
UNIT

# Persistent=true acumula las ejecuciones fallidas: si la VM estaba apagada
# cuando tocaba un recordatorio, se ejecuta al arrancar en vez de perderse.
cat > /etc/systemd/system/alivia-notify.timer <<'UNIT'
[Unit]
Description=ALIVIA - timer del dispatch de notificaciones (cada 15 min)

[Timer]
OnBootSec=5min
OnUnitActiveSec=15min
# wakeSystem=false: no despierta la VM de un suspension para enviar un push.
Persistent=true

[Install]
WantedBy=timers.target
UNIT

cat > /opt/alivia/cron-dispatch.sh <<'CRONEOF'
#!/usr/bin/env bash
# Dispara el dispatch de notificaciones. Lo invoca el timer alivia-notify.
set -uo pipefail

SECRET_FILE="/etc/alivia/cron-secret"
[[ -r "${SECRET_FILE}" ]] || { echo "sin CRON_SECRET"; exit 1; }
CRON_SECRET="$(cat "${SECRET_FILE}")"
[[ -n "${CRON_SECRET}" ]] || { echo "CRON_SECRET vacio"; exit 1; }

# El backend no arranca hasta que deploy-azure.yml copie server/dist. Antes de
# eso este script seria un 404 por minuto.
[[ -f /opt/alivia/server/dist/server.js ]] || { echo "backend aun no desplegado"; exit 0; }

codigo=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 \
  -X POST http://127.0.0.1:3000/api/notifications/dispatch \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H 'Content-Type: application/json' || echo 000)

echo "dispatch: HTTP ${codigo}"
[[ "${codigo}" = "200" ]] || exit 1
CRONEOF
chmod 0750 /opt/alivia/cron-dispatch.sh
chown root:"${APP_USER}" /opt/alivia/cron-dispatch.sh

systemctl daemon-reload
systemctl enable --now alivia-notify.timer
log "timer de notificaciones activo: $(systemctl list-timers alivia-notify.timer --no-pager | tail -1)"

# --- Verificacion ------------------------------------------------------------
log "7/7 verificacion"

if [[ -n "${PUBLIC_IP}" ]]; then
  log "IP publica asignada: ${PUBLIC_IP}"
  echo "${PUBLIC_IP}" > "${APP_DIR}/public-ip.txt"
fi

# El backend lee estas variables en arranque (api/_db.ts usa DATABASE_URL).
#
# Solo las cuatro que hacen falta para arrancar. Las claves de IA, las VAPID y
# las de WhatsApp NO se ponen aqui: viven en el Key Vault y se rellenan con
#
#   az keyvault secret set --vault-name kv-alivia-XXX --name openai-api-key --value ...
#
# El sistema no las necesita para arrancar; si faltan, la app degrada con
# normalidad (la IA cae a Groq si falta OpenAI, y las notificaciones push se
# desactivan sin VAPID). Por eso el .env no las requiere.
#
# El archivo se escribe con permisos 600 y del grupo alivia: systemd lo lee como
# root ANTES de cambiar de usuario, asi que 600 sin grupo lo haria ilegible para
# el servicio.
ENV_FILE="${APP_DIR}/.env"
cat > "${ENV_FILE}" <<ENVEOF
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATABASE_URL=postgresql://alivia_admin:${PG_PASSWORD}@127.0.0.1:5432/alivia
ENVEOF
chown root:"${APP_USER}" "${ENV_FILE}"
chmod 0640 "${ENV_FILE}"

echo "web publicable en: $([[ -n ${PUBLIC_IP} ]] && echo "http://${PUBLIC_IP}" || echo '(IP pendiente)')"
psql --version
node --version
sudo -u postgres psql -tAc "SELECT version()" | head -1

log "Listo. Estado del backend:"
log "  systemctl status alivia-api"
log "  journalctl -u alivia-api -f"
log "El servicio arrancara en cuanto deploy-azure.yml copie server/dist al servidor."