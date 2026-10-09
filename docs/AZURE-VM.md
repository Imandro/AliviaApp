# Alivia en Azure: evidencia de conexión

Fecha: 9 de octubre de 2026.

## Aplicación publicada

Abrir https://57.156.61.193/ y seleccionar Abrir la app si aparece la landing. La web, la API y la base nueva funcionan en la VM vm-alivia de Azure. Se debe crear una cuenta nueva.

- IP pública: 57.156.61.193.
- VM: vm-alivia, grupo ALIVIA-RG-CL, Chile Central, Ubuntu 22.04.5 LTS.
- Web: nginx con HTTPS en 443; HTTP 80 redirige a HTTPS.
- API: Node.js 22, servicio alivia-azure-api, puerto interno 127.0.0.1:8080.
- Base: PostgreSQL 14 en la propia VM, base y usuario alivia_azure. Es una instalación en VM, no un servicio PostgreSQL administrado.
- Conexión API/base: socket Unix local /var/run/postgresql, autenticación peer del sistema operativo. PostgreSQL no está abierto a internet; no hay contraseña de base en el proyecto.
- HTTPS: certificado válido para la IP emitido por Let's Encrypt. Certbot configura renovación automática y un hook recarga nginx al renovar. Los certificados para IP son de duración corta: la VM y el puerto 80 deben estar disponibles durante las renovaciones.
- Código desplegado: 7e72a0ef4ee64b74fa3d56dd6f1138f6a066af71.
- Rama: desplegar-api-vm-azure; PR https://github.com/Imandro/AliviaApp/pull/45.

## Comprobaciones realizadas

- Build web y API correctos; 393 pruebas aprobadas.
- GET /: HTTP 200; pantalla de bienvenida visible en el navegador.
- GET /readyz: status ready.
- POST /api/posts: HTTP 201, registro de prueba id=1.
- GET /api/posts: HTTP 200, devuelve el mismo registro guardado.
- Registro de cuenta: HTTP 201; login, lectura de perfil y logout: HTTP 200.

Las pruebas de cuentas utilizaron datos técnicos con correo example.invalid. Las respuestas de registro y login contienen tokens: no incluirlos en capturas.

## Cómo mostrar la evidencia

1. Abrir https://57.156.61.193/ y crear una cuenta nueva para la demostración.
2. Abrir F12, pestaña Red / Network, filtro Fetch/XHR.
3. Entrar a Comunidad, publicar un mensaje de prueba y recargar.
4. Capturar la petición POST a https://57.156.61.193/api/posts con estado 201.
5. Capturar GET a esa misma URL con estado 200 y la respuesta que contiene el mensaje.
6. Mostrar también la IP pública y las reglas TCP 22, 80 y 443 en Azure.

Texto para el informe:

> Alivia se conecta mediante HTTPS a la IP pública 57.156.61.193 de una VM de Microsoft Azure. Su API recibe datos mediante POST y los almacena en PostgreSQL alojado en esa VM. Mediante GET se recuperan los registros guardados. El cliente utiliza la IP de Azure, sin un servidor localhost ni la API de AWS para estas operaciones.

## Alcance y archivos

Esta instalación usa una base nueva por decisión del usuario. AWS no se eliminó ni se migró. La URL anterior de Container Apps y su workflow no cambiaron: esta entrega se demuestra con la URL de la IP pública.

IA, proveedores de voz y notificaciones requieren configuración privada y pruebas adicionales. Los envíos externos están desactivados. El APK existente conserva su configuración anterior; no se recompiló para esta API. Para demostrar esta entrega usar la web.

- alivia-azure-web.jpg: pantalla de bienvenida.
- respuesta-api-azure.json: respuesta real con el registro de prueba.
- ALIVIA-web-build-azure.zip: build de la web publicada.
- ALIVIA-api-node.zip: API compilada y dependencias declaradas; requiere npm install y una base/usuario local configurados. No contiene credenciales.

Documentación: https://letsencrypt.org/2026/03/11/shorter-certs-certbot
