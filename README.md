# Bodegas Marcela - Frontend

Interfaz web del sistema de inventario y ventas para una bodega. Este repositorio es solo el frontend: el backend corre por separado y expone una API REST que esta aplicación consume.

## Tecnologías

Angular con componentes standalone y signals, TypeScript, y Chart.js para los gráficos del dashboard. El diseño está hecho con CSS propio, sin librerías de UI externas.

## Qué hace

Incluye un panel que abre con la caja del día (cobrado, boletas, deuda por cobrar y productos por reponer), un módulo para registrar ventas e historial de boletas con impresión, una tabla de inventario con búsqueda, filtro por categoría y paginación donde se pueden editar productos y ajustar stock, una sección de reportes con gráficos de ventas por día, hora y producto —cada uno con su equivalente en tabla— y una sección de cuentas por cobrar para las ventas al crédito.

## Diseño

La app la usan a diario personas de más de 45 años, casi siempre desde el celular. Eso fija algunas reglas que conviene no romper al añadir pantallas:

- **Nada de texto por debajo de 14px, y los campos de formulario a 16px.** Por debajo de 16px, iOS Safari hace zoom automático al enfocar un campo. Todo mide en `rem` para que el ajuste de "texto grande" del sistema realmente escale.
- **Áreas táctiles de 48px (44px como mínimo), con 12px de separación entre acciones vecinas.** Una papelera pegada a un botón de "Ver" acaba borrando una venta.
- **Contraste AA como mínimo.** `src/styles.css` define los colores en `:root` con su ratio anotado. El amarillo de marca solo se usa como relleno con texto oscuro encima; para texto o indicadores finos sobre blanco existe `--color-accent-ink`.
- **El color nunca es el único canal.** Los badges llevan un punto sólido además del color de fondo.
- **Un error de red nunca se muestra como "no hay datos".** Para eso está `<app-error-state>`, con su botón de reintento. Toda llamada a la API maneja su `error`.

Las piezas compartidas viven en `src/app/components/`: `dialog/` (carcasa de diálogo con foco atrapado, Escape y bloqueo de scroll), `error-state/`, `modal/` (avisos y confirmaciones vía `ModalService`) y `boleta-impresion/`.

## Cómo correrlo localmente

Necesitas tener Node.js instalado. Luego, desde la raíz del proyecto:

    npm install
    npm start

La app queda disponible en http://localhost:4200. Por defecto apunta al backend en http://localhost:8080/api, así que también necesitas tener el backend corriendo para que funcione. Si quieres cambiar la URL del backend, está en `src/environments/environment.ts`.

Para las pruebas:

    npm test

Para generar el build de producción:

    npm run build
