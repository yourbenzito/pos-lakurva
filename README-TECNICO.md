# Documentación Técnica – Sistema de Ventas La Kurva

Documentación para desarrolladores: arquitectura, módulos, base de datos y mejoras implementadas.

**Versión:** 1.2.0

---

## Índice

1. [Stack y entorno](#stack-y-entorno)
2. [Arquitectura](#arquitectura)
3. [Base de datos (IndexedDB)](#base-de-datos-indexeddb)
4. [Estructura del código](#estructura-del-código)
5. [Flujo de datos](#flujo-de-datos)
6. [Mejoras implementadas (v1.1.0)](#mejoras-implementadas-v110)
7. [Mejoras de auditoría (v1.2.0)](#mejoras-de-auditoría-v120)
8. [Scripts y utilidades](#scripts-y-utilidades)

---

## Stack y entorno

- **Runtime:** Electron (app desktop).
- **Frontend:** HTML, CSS, JavaScript vanilla (sin frameworks).
- **Base de datos:** IndexedDB (almacenamiento local).
- **PWA:** Service Worker, `manifest.json` (instalable).
- **Moneda:** CLP (Peso Chileno) en formateo y reportes.

---

## Arquitectura

El sistema sigue un flujo **Vista → Controlador → Servicio → Modelo → Repositorio → IndexedDB**.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌───────────┐     ┌──────────────┐
│   Views     │ ──► │ Controllers   │ ──► │  Services   │ ──► │  Models    │ ──► │ Repositories  │
│ (cash.js,   │     │ (CashCtrl,    │     │ (SaleSvc,   │     │ (Sale,     │     │ (SaleRepo,    │
│  pos.js…)   │     │  POSCtrl…)    │     │  StockSvc)  │     │  Product)  │     │  ProductRepo) │
└─────────────┘     └──────────────┘     └─────────────┘     └───────────┘     └──────┬───────┘
                                                                                        │
                                                                                        ▼
                                                                               ┌──────────────┐
                                                                               │  IndexedDB    │
                                                                               │ (db.js)       │
                                                                               └──────────────┘
```

- **Views:** Renderizado y eventos de UI (Caja, POS, Productos, Clientes, etc.).
- **Controllers:** Orquestan vista y servicios (validación de entrada, llamadas a servicios).
- **Services:** Lógica de negocio (SaleService, StockService, PaymentService, AccountService).
- **Models:** Entidades y métodos de dominio (Sale, Product, CashRegister, etc.); usan repositorios.
- **Repositories:** Acceso a datos (CRUD, consultas por índice).
- **Validators:** ProductValidator, SaleValidator, PaymentValidator (validación de stock, montos, etc.).

---

## Base de datos (IndexedDB)

- **Nombre:** `POSMinimarket`
- **Versión actual:** 13 (en `js/db.js`; índice `expiryDate` en products)

**Stores principales:** `products`, `sales`, `customers`, `suppliers`, `purchases`, `cashRegisters`, `cashMovements`, `payments`, `stockMovements`, `expenses`, `users`, `passwordResets`, `categories`.

Índices usados para búsquedas (por ejemplo: `barcode`, `name`, `date`, `customerId`, `supplierId`, `cashRegisterId`).

---

## Estructura del código

```
js/
├── app.js              # Inicialización, rutas, carga de vistas
├── auth.js             # Login, sesión, recuperación de contraseña
├── db.js               # Apertura y esquema de IndexedDB
├── controllers/        # CashController, POSController, ProductController, etc.
├── models/             # Sale, Product, CashRegister, Customer, Payment, etc.
├── repositories/       # SaleRepository, ProductRepository, BaseRepository, etc.
├── services/           # SaleService, StockService, PaymentService, AccountService, ProductService
├── validators/         # ProductValidator, SaleValidator, PaymentValidator
├── views/              # cash.js, pos.js, products.js, customers.js, etc.
└── utils/              # formatter, alerts, backup, keyboard, validator, db-utilities
```

---

## Flujo de datos

- **Crear venta:** Vista POS → POSController → SaleService.createSale → Sale (model) + StockService.processSaleStock; si falla stock, se elimina la venta (rollback).
- **Cerrar caja:** Vista Caja → CashController → CashRegister.close(); resumen por método de pago vía SaleRepository.getTotalByPaymentMethod; cuadratura solo con efectivo contado.
- **Editar venta:** Vista Ventas → Controller → Sale.updateSale (reconciliación de ítems) → StockService.restoreSaleStock / processSaleStock según diferencias de cantidad.
- **Eliminar compra:** Purchase.delete → StockService.revertPurchaseStock → luego borrado en BD.

---

## Mejoras implementadas (v1.1.0)

### Caja (cuadratura y consistencia)

| Archivo | Cambio |
|---------|--------|
| `js/models/CashRegister.js` | En `close()` y `getSummary()` se eliminó la suma duplicada de pagos de deuda; se usa solo el resumen de ventas por método de pago (`salesPaymentSummary`). Corrección de bug donde `salesPaymentSummary` no estaba definido en `close()`. |
| `js/views/cash.js` | El valor enviado al cerrar caja es solo el **efectivo contado** (no la suma de todos los medios). Botón «Historial de esta caja» usa el `id` de la caja correctamente. Modal del historial con fondo oscuro y texto claro para mejor contraste. |
| `js/repositories/SaleRepository.js` | En `getTotalByPaymentMethod()`: para ventas `pending`/`partial` sin `paymentDetails`, se evita doble conteo con registros de `Payment`; si no hay Payment y hay `paidAmount`, se atribuye al método de la venta o efectivo. |

### Stock e inventario

| Archivo | Cambio |
|---------|--------|
| `js/validators/ProductValidator.js` | Validación de stock para tipo `weight`; uso de `parseFloat` y validación de cantidad. |
| `js/models/Product.js` | `updateStock()` usa `parseFloat` y lanza error si la resta dejaría stock negativo. |
| `js/models/Sale.js` | En `updateSale()`: reconciliación de stock al cambiar ítems (por `productId`). Si `newQty < oldQty` → `StockService.restoreSaleStock`; si `newQty > oldQty` → validar y `StockService.processSaleStock`. |
| `js/models/Purchase.js` | En `delete()`: se llama a `StockService.revertPurchaseStock()` antes de eliminar la compra. |
| `js/services/SaleService.js` | En `createSale()`: si `StockService.processSaleStock()` falla después de crear la venta, se elimina la venta (`Sale._repository.delete(saleId)`). |
| `js/services/StockService.js` | `processSaleStock()` valida stock con `ProductValidator.validateStock()` antes de restar. `createAdjustment()`: si cantidad es negativa, valida stock suficiente; si es 0, no hace nada. |
| `js/repositories/ProductRepository.js` | `findLowStock()` usa `parseFloat` y trata `minStock` indefinido como 0. |
| `js/views/inventory.js` | Tarjeta «Valor Inventario» renombrada a «Valor Inventario Precio Costo». Nueva tarjeta «Valor Inventario Precio Venta». Ambos calculados con datos actuales de productos (stock × costo / stock × precio). |

---

## Mejoras de auditoría (v1.2.0)

Implementación de las 8 correcciones derivadas de la auditoría del sistema (ver [CHANGELOG.md](CHANGELOG.md)).

| # | Área | Cambio técnico |
|---|------|----------------|
| 1 | Validación | ProductValidator en ProductController e importación; SaleValidator rechaza total ≠ suma ítems; unicidad barcode. |
| 2 | Preload (Electron) | Whitelist getPath; validación tipo/tamaño/JSON en backup. |
| 3 | Inventario | Campo `expiryDate` en Product (índice en DB); columna y filtro «Próx. a vencer» en Productos e Inventario. |
| 4 | Clientes | Campo `creditLimit` en Customer; SaleService valida deuda + venta ≤ límite antes de crear venta fiada. |
| 5 | Transacciones | SaleService.createSale usa una transacción IndexedDB sobre sales + products + stockMovements (rollback automático). |
| 6 | Backup | Rotación (últimos 30 archivos); verificación post-escritura (tamaño y contenido JSON). |
| 7 | Servicios | ProductService (createProduct/updateProduct) con validación centralizada; controller e importación lo usan. |
| 8 | UX | updateCashRegister6, deleteCashRegister y generación de código de recuperación usan modal `confirm(message, callback)`. |

**Archivos nuevos:** `js/services/ProductService.js`.  
**DB:** versión 13 (índice `expiryDate` en products).

---

## Scripts y utilidades

- **Backup/restauración:** `js/utils/backup.js` (export/import JSON).
- **Utilidades de BD:** `js/utils/db-utilities.js`.
- **Migraciones/ajustes de caja:** `js/utils/createHistoricalCashRegister.js`, `updateCashRegister6.js`, `fixCashMovementsSync.js`, `verifyCashRegister.js`, `deleteCashRegister.js`.
- **Coste histórico:** `js/utils/migrateHistoricalCost.js`.
- **Teclado:** `js/utils/keyboard.js` (atajos globales).
- **Formateo:** `js/utils/formatter.js` (CLP, fechas, etc.).

Para ejecutar la app en desarrollo: `npm start` (o el script definido en `package.json`). En producción se usa el ejecutable Electron empaquetado.

---

**Última actualización:** Febrero 2026
