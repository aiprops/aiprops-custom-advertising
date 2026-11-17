# AIPROPS Custom Advertising

Sitio HTML/CSS/JavaScript sin framework, con **130 artículos**, filtros, personalización, carrito de solicitudes, formulario y carga de archivos. Incluye función serverless de Vercel que envía la solicitud al correo de cotizaciones mediante Resend.

## Publicar en GitHub + Vercel

1. Crea un repositorio en GitHub y sube `index.html`, `api/quote.js`, `package.json` y `.gitignore` (no subas `.env`).
2. Importa el repositorio desde Vercel: **Add New → Project**. Selecciona **Other** / sin framework, raíz del proyecto. No necesitas build command. La carpeta `api/` se detecta automáticamente como función Vercel.
3. Registra tu dominio de envío en [Resend](https://resend.com/domains) y verifica los DNS. Crea una API key en Resend. **El dominio remitente debe estar verificado.**
4. En Vercel → Settings → Environment Variables configura:
   - `RESEND_API_KEY`: tu llave Resend.
   - `QUOTE_TO_EMAIL`: correo interno que recibirá las solicitudes.
   - `QUOTE_FROM_EMAIL`: remitente del dominio verificado, por ejemplo `cotizaciones@tudominio.com`.
   - `SEND_CUSTOMER_CONFIRMATION`: `true` si deseas correo automático de confirmación al cliente (opcional).
5. Haz **Redeploy** para aplicar las variables. Prueba desde el dominio desplegado con una solicitud real.
6. En `index.html` cambia `SALES_WHATSAPP` al teléfono comercial autorizado para atender solicitudes, en formato internacional sin + ni espacios.

## Qué funciona

- Búsqueda por nombre, 13 categorías y orden alfabético.
- 130 artículos (13 categorías × 10), cantidades y colores de referencia, variantes y técnicas de personalización.
- Artículos especiales fuera de la selección.
- Carrito que persiste entre visitas mediante `localStorage`.
- Formulario: nombre, empresa, email, teléfono, canal preferido, fecha, lugar de entrega, descripción, consentimiento.
- Carga opcional de hasta **2 archivos de 1 MB** cada uno (2 MB en conjunto), enviados como adjuntos al correo que recibe la solicitud.
- Correo al equipo comercial; respuesta inmediata con referencia. Email de confirmación opcional. Acceso a WhatsApp tras entregar la solicitud.

## Limitaciones y consideraciones importantes

- **No genera precios automáticos**. La solicitud se envía al instante; la cotización con precio se prepara después de validar disponibilidad, cantidades mínimas y costos del suplidor.
- Seleccionar WhatsApp/SMS/Llamada **no envía automáticamente un mensaje saliente** al cliente; indica el canal por el que el equipo comercial deberá contestar. Para envío automático requiere integrar WhatsApp Business Platform o proveedor de SMS con consentimiento y plantillas aprobadas.
- La carga de archivos está limitada para cumplir el tamaño máximo del cuerpo de funciones serverless y no almacena los archivos en una base de datos; se transmiten como adjuntos por Resend.
- Los emojis son ilustraciones de referencia, no fotografías reales de producto. Para lanzamiento comercial, sustituir por imágenes reales y fichas de proveedores con licencia y disponibilidad.
- Antes de aceptar pedidos, publicar una política de privacidad completa y definir cómo se comparte la información con el proveedor. Asegurar el acuerdo comercial para actuar bajo la marca AIPROPS mientras la cotización y factura las emite la empresa suplidora.
- Para tráfico público alto, añadir protección antispam con CAPTCHA/Turnstile, límites por IP y registros en base de datos/CRM. La implementación incluida tiene validación de entrada y límite de archivos, no rate limiting distribuido.
- El código de ejemplo contiene un teléfono configurado por defecto para el acceso a WhatsApp. **Revísalo antes de publicar.**

## Pruebas

Puedes abrir `index.html` en el navegador para probar catálogo/carrito. Para probar el envío real, hazlo desde un despliegue Vercel con variables configuradas. En modo archivo local `/api/quote` no estará disponible.
