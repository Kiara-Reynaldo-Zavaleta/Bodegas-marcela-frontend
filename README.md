# Bodegas Marcela - Frontend

Interfaz web del sistema de inventario y ventas para una bodega. Este repositorio es solo el frontend: el backend corre por separado y expone una API REST que esta aplicación consume.

## Tecnologías

Angular con componentes standalone y signals, TypeScript, y Chart.js para los gráficos del dashboard. El diseño está hecho con CSS propio, sin librerías de UI externas.

## Qué hace

Incluye una pantalla principal con ventas recientes y stock, un módulo para registrar ventas y ver el historial de boletas, una tabla de inventario donde se pueden editar productos y ajustar stock, una sección de reportes con gráficos de ventas por día, hora y producto, y una sección de cuentas por cobrar para las ventas al crédito.

## Cómo correrlo localmente

Necesitas tener Node.js instalado. Luego, desde la raíz del proyecto:
npm install
npm start

La app queda disponible en http://localhost:4200. Por defecto apunta al backend en http://localhost:8080/api, así que también necesitas tener el backend corriendo para que funcione. Si quieres cambiar la URL del backend, está en `src/environments/environment.ts`.

Para generar el build de producción:

npm run build