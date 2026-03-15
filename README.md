# 🚀 Sistema de Ventas La Kurva - Panel de Control

Bienvenido al sistema de gestión para minimarkets. Este documento sirve como punto de entrada central para toda la documentación organizada del proyecto.

---

## 📁 Estructura de Documentación

Toda la documentación ha sido organizada y optimizada para facilitar su acceso:

### 👤 Para el Cliente (Tu Comprador)
*   [**Manual de Usuario**](./documentacion/cliente/manual_usuario.md): Guía completa de uso del sistema, desde la primera venta hasta el cierre de caja. **(Este es el archivo que debes entregarle)**.

### 💼 Para Ti (Desarrollador / Vendedor)
*   [**Estrategia Comercial**](./documentacion/desarrollador/estrategia_comercial.md): Precios sugeridos, argumentos de venta y qué información compartir.
*   [**Guía Técnica**](./documentacion/desarrollador/guia_tecnica.md): Arquitectura del sistema, tecnologías y módulos internos.
*   [**Auditoría de Base de Datos**](./documentacion/desarrollador/auditoria_base_de_datos.md): Análisis profundo del esquema IndexedDB y mejoras críticas implementadas.
*   [**Historial de Cambios**](./documentacion/desarrollador/historial_cambios.md): Registro de versiones y evoluciones del sistema.

### 🏛️ Archivo Histórico y Técnico
*   [**Fases de Desarrollo**](./documentacion/archivo_tecnico/fases/): Reportes técnicos de cada fase implementada.
*   [**Mejoras de Stock**](./documentacion/archivo_tecnico/pasos_stock/): Detalle paso a paso de la corrección del motor de inventario.
*   [**Auditorías Anteriores**](./documentacion/archivo_tecnico/auditorias_anteriores/): Documentos de referencia sobre auditorías de stock y caja.

---

## ⚡ Resumen del Sistema (v1.2.0)

*   **Punto de Venta (POS):** Rápido, offline, soporte para código de barras y fiados.
*   **Inventario Inteligente:** Validación de stock real, trazabilidad total y conciliación automática.
*   **Gestión Financiera:** Control de caja con cuadratura, reportes de rentabilidad bruta y neta.
*   **Privacidad:** Datos 100% locales en la computadora del cliente (IndexedDB).

---

## 🛠️ Comandos Rápidos

*   `npm install` - Instalar dependencias.
*   `npm start` - Iniciar la aplicación en modo desarrollo.
*   `npm run dist` - Generar el instalador para el cliente.

---

**Última actualización:** Marzo 2026
