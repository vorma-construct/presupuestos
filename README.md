# Vornicu Reformas · app de presupuestos

PWA de presupuestos de reformas (dosier + presupuesto + contrato) para Vornicu Ioan Marian, Santutxu (Bilbao).
Hecha por Azkar Servicios sobre la misma base que la app de Azkar Mudanzas.

- `index.html` — toda la app (HTML + CSS + JS). Tarifa dentro (`TARIFA_BASE`).
- `sw.js`, `manifest.json`, `icons/` — instalación como app en el móvil.
- Datos guardados en el propio dispositivo (localStorage). Copia de seguridad en Ajustes.
- `buzon.js` — presupuestos que llegan por correo, sin IA: el programa `tools/correo-gmail.gs` (Apps Script, se pega en el Gmail de la empresa desde Ajustes) le pasa los correos nuevos; la app saca las partidas del texto, las capturas y el plano con el motor de `imagenes.js` y crea el presupuesto sola. Si se cambia `tools/correo-gmail.gs`, hay que volver a meterlo en `buzon.js` (lista `GS`).

Cada cambio: subir `APP_VERSION` en index.html y el nombre de caché en `sw.js`.
