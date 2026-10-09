# ALIVIA en Azure

Migracion de AWS a una VM de Azure. Sustituye a las cuatro Lambdas, RDS, S3 y
CloudFront por una sola VM Ubuntu con Node 22, PostgreSQL y nginx.

## Por que una VM y no Functions

El proyecto requiere acceso SSH, IP publica y puertos abiertos. Azure Functions y
App Service no tienen ninguno de los tres. Ademas, en AWS las cuatro Lambdas
estaban separadas por una razon economica: tres de ellas quedaron fuera del VPC
para no pagar un NAT Gateway (~$32/mes) al salir a Bing, OpenAI, Groq y WhatsApp.
En una VM hay salida a internet siempre, asi que esa separacion desaparece y las
cuatro rutas las sirve un unico proceso.

## Estructura

| Fichero | Que hace |
|---|---|
| `main.bicep` | Punto de entrada. Crea el grupo de recursos y orquesta el resto. |
| `network.bicep` | VNet, subred delegada a PostgreSQL y NSG (22, 80, 443 abiertos). |
| `vm.bicep` | VM Ubuntu 22.04 con IP publica estatica. |
| `keyvault.bicep` | Contraseñas de SSH y PostgreSQL, CRON_SECRET y claves de IA. |
| `vm-setup.sh` | Cloud-init: Node 22, PostgreSQL, nginx, systemd y el timer de notificaciones. |

El backend del servidor es `api/server/index.ts`, un entrypoint HTTP de Node que
reutiliza `api/lambda/router.ts` sin tocar los handlers. Compila a `server/dist/`
dentro de `npm run build:lambda`.

## Cron de notificaciones

En AWS lo programaba EventBridge Scheduler con `rate(15 minutes)`. En la VM es un
timer de systemd:

```bash
systemctl list-timers alivia-notify.timer
systemctl start alivia-notify.service      # disparo manual
journalctl -u alivia-notify -n 30
```

El servicio lee `CRON_SECRET` de `/etc/alivia/cron-secret` (no del `.env` del
backend, para no darle acceso a los demas secretos) y llama a
`http://127.0.0.1:3000/api/notifications/dispatch`.

Es la unica parte del sistema que no nace de una peticion de un usuario: si el
timer se rompe, nada mas lo nota quien esperaba un recordatorio. Conviene mirarlo
tras el primer despliegue.

## Despliegue

Requisitos: `az` CLI con version 2.54 o superior, y una suscripcion con permisos
de escritura en el grupo de recursos.

```bash
# 1. Crear el grupo de recursos
az group create --name alivia-rg --location eastus

# 2. Desplegar la infraestructura
az deployment group create \
  --resource-group alivia-rg \
  --template-file infra/azure/main.bicep \
  --parameters vmAdminUsername=azureuser adminPassword=<contrasena-segura>

# 3. Leer la IP publica que asigno Azure
az deployment group show \
  --resource-group alivia-rg \
  --name alivia-vm-deploy 2>/dev/null || \
az deployment group show --resource-group alivia-rg --query "properties.outputs.publicIpAddress.value" -t infra/azure/main.bicep
```

> **Requisito**: `vm-setup.sh` tiene que estar pusheado a `main` antes del primer
> despliegue, porque `main.bicep` lo baja con `primaryScriptUri` desde
> `raw.githubusercontent.com`.

La salida del despliegue incluye `publicIpAddress`, `sshCommand`, `appUrl` y
`apkUrl`.

## Verificacion

```bash
IP=$(az deployment group show --resource-group alivia-rg \
     --query properties.outputs.publicIpAddress.value \
     --template-file infra/azure/main.bicep)

# Sistema operativo y acceso remoto
ssh azureuser@$IP
. /etc/os-release && echo "$PRETTY_NAME"

# Puertos abiertos desde internet
curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://$IP/
curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://$IP/api/auth/me   # 401 esperado
ss -tlnp

# Entorno y base de datos
node --version
psql --version
sudo -u postgres psql -c '\l alivia'
sudo -u postgres psql -d alivia -c 'SELECT count(*) FROM users;'

# Estado del backend
sudo systemctl status alivia-api
sudo journalctl -u alivia-api -f

# Trafico real contra la IP publica (no localhost)
curl -s -X POST http://$IP/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"prueba","email":"prueba@alivia.lat","name":"Prueba","password":"ClaveSegura1!"}'
sudo -u postgres psql -d alivia -c "SELECT username FROM users WHERE username='prueba';"
```

Un `401` en `/api/auth/me` es la senal de que la cadena entera funciona: internet,
NSG, nginx, Node y PostgreSQL. Un `502` significa que el backend no arranco
(`journalctl -u alivia-api`) y un `404` que la ruta esta mal montada.

## Lo que no se expone

El NSG solo abre 22, 80 y 443. PostgreSQL (5432) y el backend Node (3000) no
tienen regla de entrada, y ademas el proceso escucha en `127.0.0.1`. A la base de
datos solo se llega desde la propia VM.

## Despliegue continuo

`.github/workflows/deploy-azure.yml` hace push a `main` con OIDC
(`azure/login`, sin secretos en el repo). El frontend y el backend se compilan en
el runner y se copian por SSH.

Variables de repositorio necesarias (`Settings > Secrets and variables > Actions`):

| Tipo | Nombre | Valor |
|---|---|---|
| Variable | `AZURE_CLIENT_ID` | App registration federado a GitHub Actions |
| Variable | `AZURE_TENANT_ID` | Tenant de la suscripcion |
| Variable | `AZURE_SUBSCRIPTION_ID` | Id de la suscripcion |
| Variable | `AZURE_RESOURCE_GROUP` | `alivia-rg` |
| Variable | `VM_HOST` | IP publica de la VM |
| Variable | `VM_ADMIN_USERNAME` | `azureuser` |
| Variable | `VITE_API_URL` | `http://<ip>` |
| Variable | `VITE_TTS_URL` | `http://<ip>` |
| Variable | `VITE_VAPID_PUBLIC_KEY` | Clave VAPID publica |

`VITE_*` se leen en tiempo de build de Vite, no en runtime.

Los PR no despliegan: ejecutan `npm run build:lambda` y `npm test`, que es donde
se rompe el backend.

## APK

El APK se compila en local, no en Azure. Para Azure, publica en `dist/` y deja
que el deploy lo copie:

```bash
cd android && ./gradlew assembleRelease && cd ..
npm run release:apk -- android/app/build/outputs/apk/release/app-release.apk \
  --version 1.2.1 --publish --azure
```

`--azure` escribe el APK en `dist/releases/v1.2.1/` y actualiza
`public/releases.json`. Sin ese flag el script sube a S3 e invalida CloudFront
(rama de AWS). `--invalidate` se rechaza con `--azure`: es de CloudFront.

**Orden obligatorio:** `npm run build` borra `dist/` entero, asi que el APK se
tiene que preparar **después** del build, no antes.

## Secretos de runtime

El `.env` de la VM solo lleva lo necesario para arrancar:

```
NODE_ENV, PORT, HOST, DATABASE_URL
```

Las claves de IA, VAPID y WhatsApp van en el Key Vault y no hacen falta para
arrancar. La app degrada con normalidad si faltan (la IA cae a Groq si falta
OpenAI; las notificaciones push se desactivan sin VAPID):

```bash
KV=kv-alivia-<suffix>
az keyvault secret set --vault-name $KV --name openai-api-key --value 'sk-...'
az keyvault secret set --vault-name $KV --name groq-api-key   --value 'gsk-...'
```

Todas las que `api/` lee: `OPENAI_API_KEY`, `OPENAI_MODELS`, `GROQ_API_KEY`,
`GROQ_MODELS`, `GEMINI_API_KEY`, `GEMINI_MODELS`, `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `WHATSAPP_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `ELEVENLABS_API_KEY`,
`ELEVENLABS_MODEL`, `ELEVENLABS_VOICE_ID`, `SILAIS_NUMBER`,
`SILAIS_TEST_NUMBER`, `CRON_SECRET`.

## Limitaciones de servir por IP en claro

Una IP publica suelta no puede tener certificado TLS (las CA no emiten para IP), asi
que todo lo que dependa de un contexto seguro se degrada en la **web**. El APK no
sufrisce nada de esto: el WebView de Capacitor sirve el bundle desde
`http://localhost`, que los navegadores consideran contexto seguro.

| Que | Web en `http://<ip>` | APK nativo |
|---|---|---|
| API y login | funciona | funciona |
| Service worker / modo offline | **no** (no se registra) | no aplica (ya va empaquetado) |
| Notificaciones push | **no** | funciona (FCM) |
| Instalable como PWA | **no** | no aplica |
| Geolocalizacion | **no** | funciona |
| TTS | funciona por el proxy del servidor | funciona |

La causa es una sola: `navigator.serviceWorker`, `crypto.subtle`, `geolocation` y
`clipboard` solo existen en contexto seguro (HTTPS o `localhost`). En el shell
nativo el origen es `http://localhost`, asi que funcionan.

Para recuperar la web completa hace falta un dominio propio apuntando a la IP y un
certificado (Let's Encrypt con `certbot`, o el certificado gestionado de Azure).
Con eso, `AZURE_ORIGIN` pasa a `https://` y ademas se puede borrar el bloque de
cleartext de `android/app/src/main/res/xml/network_security_config.xml`.

El TTS degrada con elegancia en web: el camino directo a Bing usa `crypto.subtle`,
que no existe sin contexto seguro, pero `speakViaEdge` falla y cae al proxy
`/api/tts` del servidor (`src/utils/tts.ts:318`).

## Notas

- `vm-setup.sh` es idempotente: se puede volver a ejecutar sin romper nada.
- La contrasena de PostgreSQL se genera en el Key Vault y es distinta de la de
  SSH. Que compartieran secreto haria que entrar en la base de datos diese tambien
  acceso por SSH.
- La IP publica no tiene certificado TLS, asi que el origen del shell nativo es
  `http://` y no `https://`. Ver `src/utils/apiOrigins.ts`, donde `AZURE_IP` hay que
  rellenar con la IP real tras el despliegue.
- La base de datos se crea vacia. Migrar los datos de RDS a PostgreSQL en la VM es
  un paso aparte: `pg_dump` en RDS y `pg_restore` en la VM.
- `infra/` conserva los templates SAM de AWS. No se borran hasta que la
  migracion a Azure esté verificada.