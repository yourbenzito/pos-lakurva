# Sistema de Ventas La Kurva

Sistema de gestión para minimarkets: punto de venta, inventario, clientes, proveedores, caja y reportes. Funciona **100% offline** con datos locales (IndexedDB).

**Versión:** 1.2.0

---

## Documentación

| Documento | Para quién | Contenido |
|-----------|------------|-----------|
| [README-CLIENTE.md](README-CLIENTE.md) | Usuario final | Manual de usuario, guías por módulo, solución de problemas |
| [README-DESARROLLADOR.md](README-DESARROLLADOR.md) | Vendedor/desarrollador | Estrategia de venta, precios sugeridos, explicación básica del código |
| [README-TECNICO.md](README-TECNICO.md) | Desarrollador técnico | Arquitectura, módulos, APIs, mejoras implementadas |
| [CHANGELOG.md](CHANGELOG.md) | Todos | Historial de versiones y cambios |

---

## Resumen del sistema

- **POS** – Ventas por código de barras o nombre, efectivo/tarjeta/QR, fiados
- **Productos** – Catálogo, códigos de barras, precios, stock, categorías
- **Clientes** – Cuenta corriente, pagos de deuda, historial
- **Proveedores y Compras** – Compras a proveedores, actualización de stock y costo
- **Caja** – Apertura/cierre, movimientos, cuadratura por efectivo
- **Gastos** – Registro por categoría y método de pago
- **Inventario** – Stock, ajustes, valor inventario (costo y venta)
- **Reportes** – Ventas, rentabilidad, productos más vendidos, stock
- **Configuración** – Backup/restauración, usuarios, seguridad

---

## Mejoras de auditoría (v1.2.0 - Feb 2026)

Implementadas 8 mejoras derivadas de la auditoría del sistema:

1. **Validación de datos**: ProductValidator en productos e importación; SaleValidator rechaza ventas con total distinto a la suma de ítems; unicidad de código de barras.
2. **Seguridad preload (Electron)**: Whitelist en getPath; validación de tipo, tamaño y JSON en backup a disco.
3. **Vencimientos**: Campo opcional fecha de vencimiento en producto; columna y filtro "Próximo a vencer" en Productos e Inventario.
4. **Límite de crédito**: Campo opcional en cliente; no se permite fiar por encima del límite (deuda actual + nueva venta).
5. **Transacción atómica**: Creación de venta y descuento de stock en una sola transacción IndexedDB (rollback automático si falla algo).
6. **Backup**: Rotación (últimos 30 archivos) y verificación post-escritura del archivo de backup.
7. **ProductService**: Capa de servicio para productos con validación centralizada; controller e importación lo usan.
8. **Confirmaciones**: Utilidades de caja y generación de código de recuperación usan el modal de confirmación de la app.

Detalle en [CHANGELOG.md](CHANGELOG.md).

---

## Actualizaciones recientes (v1.1.0)

### Caja
- Cuadratura corregida: al cerrar caja se compara solo el **efectivo contado** con el efectivo esperado (no la suma de todos los medios).
- Los pagos de deuda de clientes se cuentan una sola vez en el resumen de caja.
- Botón **«Historial de esta caja»** corregido; modal con mejor contraste (fondo oscuro, texto claro).

### Stock e inventario
- Validación de stock también para productos por **peso (kg)**; no se permite vender sin stock suficiente.
- El stock **nunca queda negativo**: se valida antes de vender, ajustar o registrar pérdidas/consumo.
- Al **editar una venta** (cambiar cantidades o quitar ítems), el inventario se reconcilia automáticamente.
- Al **eliminar una venta**, se restaura el stock; al **eliminar una compra**, se revierte el stock que esa compra había sumado.
- Si falla el descuento de stock al crear una venta, la venta se elimina (rollback).
- En **Inventario** hay dos tarjetas: **Valor inventario precio costo** y **Valor inventario precio venta**; ambos se recalculan con los movimientos de stock.

### Otros
- Reportes de rentabilidad usan costo histórico (costo al momento de la venta).
- Validaciones mejoradas: sin sobrepagos, stock validado antes de vender, ajustes que evitan stock negativo.

---

## Requisitos e instalación

- **Requisitos:** Windows 10 o superior, 500 MB de disco. No requiere internet.
- **Ejecutable:** Ejecutar el instalador (por ejemplo `Sistema de Ventas Setup 1.0.0.exe`) y seguir los pasos.
- **Desarrollo:** `npm install` y luego `npm start` (o el script definido en `package.json`).

Credenciales por defecto: usuario `admin`, contraseña `admin123`. **Cambiar en producción.**

---

## Licencia y soporte

Consultar documentación específica del proyecto. Para uso diario y dudas del usuario, ver [README-CLIENTE.md](README-CLIENTE.md).

**Última actualización:** Febrero 2026
