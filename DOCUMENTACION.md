# POS MINIMARKET - SISTEMA DE PUNTO DE VENTA
## Manual del Sistema

---

## 📋 ÍNDICE

1. [Introducción](#introducción)
2. [Instalación y Configuración](#instalación-y-configuración)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Módulos del Sistema](#módulos-del-sistema)
5. [Guía de Uso](#guía-de-uso)
6. [Extensión del Sistema](#extensión-del-sistema)
7. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 INTRODUCCIÓN

Sistema completo de Punto de Venta (POS) diseñado específicamente para minimarkets en Chile. Funciona 100% offline, almacena datos localmente y es compatible con dispositivos Android.

### Características Principales

✅ **Gestión de Productos**
- Productos con código de barras
- Precios ajustables manualmente
- Categorización de productos
- Productos por unidad y por peso
- Importación masiva desde JSON

✅ **Sistema de Ventas**
- Interfaz rápida de POS
- Múltiples métodos de pago (Efectivo, Tarjeta, QR, Otro)
- Búsqueda por código de barras o nombre
- Registro interno de todas las ventas

✅ **Gestión de Clientes**
- Registro básico de clientes
- Historial de compras

✅ **Gestión de Proveedores**
- Registro de proveedores
- Control de compras
- Cuentas por pagar
- Historial de compras

✅ **Control de Caja**
- Apertura y cierre de caja
- Resumen por método de pago
- Alertas de diferencias (sobrantes/faltantes)

✅ **Control de Stock**
- Deducción automática en ventas
- Alertas de stock mínimo
- Ajustes de inventario
- Historial de movimientos

✅ **Reportes**
- Ventas diarias, semanales y mensuales
- Ventas por producto
- Análisis de rentabilidad
- Reportes de stock

---

## 🚀 INSTALACIÓN Y CONFIGURACIÓN

### Requisitos

- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Para Android: cualquier navegador móvil moderno
- No requiere conexión a Internet

### Instalación Básica

1. **Descarga todos los archivos** del sistema en una carpeta local

2. **Estructura de archivos requerida:**
```
proyecto/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── db.js
│   ├── utils/
│   │   ├── formatter.js
│   │   └── alerts.js
│   ├── models/
│   │   ├── Product.js
│   │   ├── Sale.js
│   │   ├── Customer.js
│   │   ├── Supplier.js
│   │   ├── Purchase.js
│   │   ├── CashRegister.js
│   │   └── StockMovement.js
│   ├── controllers/
│   │   ├── ProductController.js
│   │   ├── POSController.js
│   │   ├── CustomerController.js
│   │   ├── SupplierController.js
│   │   ├── CashController.js
│   │   └── ReportController.js
│   └── views/
│       ├── pos.js
│       ├── products.js
│       ├── customers.js
│       ├── suppliers.js
│       ├── purchases.js
│       ├── cash.js
│       ├── inventory.js
│       └── reports.js
└── icons/
```

3. **Para usar en computadora:**
   - Abre `index.html` directamente en el navegador, O
   - Usa un servidor local (recomendado para PWA):
     ```bash
     # Con Python 3
     python -m http.server 8000
     
     # Con Node.js (npx)
     npx http-server
     ```
   - Accede a `http://localhost:8000`

4. **Para usar en Android:**
   - Opción 1: Accede desde el navegador móvil a la URL del servidor local
   - Opción 2: Usa "Agregar a pantalla de inicio" para instalarlo como app
   - Opción 3: Copia todos los archivos a la memoria del dispositivo y abre index.html

### Primera Configuración

1. **Abrir la aplicación**
2. **Ir al módulo de Caja**
3. **Abrir la caja** con un monto inicial
4. **Importar productos** (opcional) desde el módulo de Productos

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Patrón de Diseño

El sistema sigue el patrón **MVC (Model-View-Controller)** simplificado:

```
┌─────────────────────────────────┐
│   UI Layer (Views)              │ ← Interfaz de usuario
├─────────────────────────────────┤
│   Controller Layer              │ ← Lógica de negocio
├─────────────────────────────────┤
│   Model Layer (Services)        │ ← Servicios de datos
├─────────────────────────────────┤
│   Data Layer (IndexedDB)        │ ← Almacenamiento local
└─────────────────────────────────┘
```

### Base de Datos (IndexedDB)

**¿Por qué IndexedDB?**
- ✅ Funciona completamente offline
- ✅ Mayor capacidad de almacenamiento que localStorage
- ✅ Soporte para índices y búsquedas rápidas
- ✅ Compatible con todos los navegadores modernos

**Estructura de Datos:**

```javascript
// 1. products - Catálogo de productos
{
  id: 1,
  barcode: "7790001234567",
  name: "Coca Cola 1.5L",
  category: "Bebidas",
  price: 1500,
  cost: 1000,
  type: "unit", // o "weight"
  stock: 50,
  minStock: 10
}

// 2. sales - Registro de ventas
{
  id: 1,
  saleNumber: 1,
  date: "2025-12-25T10:30:00",
  items: [{productId: 1, quantity: 2, unitPrice: 1500, total: 3000}],
  total: 3000,
  paymentMethod: "cash",
  cashRegisterId: 1
}

// 3. cashRegisters - Control de caja
{
  id: 1,
  openDate: "2025-12-25T09:00:00",
  closeDate: null,
  initialAmount: 50000,
  status: "open"
}

// ... (ver db.js para esquemas completos)
```

### Stack Tecnológico

- **Frontend:** HTML5 + CSS3 + JavaScript Vanilla
- **Base de Datos:** IndexedDB
- **PWA:** Service Worker para cache offline
- **Formato de Moneda:** CLP (Peso Chileno)

---

## 📦 MÓDULOS DEL SISTEMA

### 1. Punto de Venta (POS)

**Función:** Interfaz principal para realizar ventas

**Características:**
- Búsqueda rápida por código de barras o nombre
- Carrito de compras
- Soporte para productos por unidad y peso
- Selección de cliente (opcional)
- Múltiples métodos de pago

**Flujo de Venta:**
1. Buscar producto (Enter para agregar)
2. Ajustar cantidades si es necesario
3. Seleccionar método de pago
4. Completar venta
5. Ver comprobante

### 2. Productos

**Función:** Gestión del catálogo de productos

**Operaciones:**
- ➕ Crear producto
- ✏️ Editar producto
- 🗑️ Eliminar producto
- 🔍 Buscar productos
- 📥 Importar productos desde JSON

**Formato de Importación (JSON):**
```json
[
  {
    "name": "Coca Cola 1.5L",
    "barcode": "7790001234567",
    "category": "Bebidas",
    "type": "unit",
    "price": 1500,
    "cost": 1000,
    "stock": 50,
    "minStock": 10
  }
]
```

### 3. Clientes

**Función:** Registro y gestión de clientes

**Campos:**
- Nombre (obligatorio)
- Teléfono (opcional)
- Email (opcional)

### 4. Proveedores

**Función:** Gestión de proveedores

**Campos:**
- Nombre (obligatorio)
- Contacto
- Teléfono
- Email
- Dirección

### 5. Compras

**Función:** Registro de compras a proveedores

**Características:**
- Registro de compras con múltiples productos
- Control de cuentas por pagar
- Registro de pagos parciales
- Incremento automático de stock

### 6. Control de Caja

**Función:** Apertura, seguimiento y cierre de caja

**Proceso de Apertura:**
1. Ingresar monto inicial en efectivo
2. Sistema abre la caja
3. Se habilita el POS para ventas

**Proceso de Cierre:**
1. Contar efectivo físico en caja
2. Ingresar el monto real
3. Sistema calcula diferencias
4. Genera reporte de cierre

**Alertas:**
- ⚠️ Sobrante: Hay más dinero del esperado
- ⚠️ Faltante: Hay menos dinero del esperado

### 7. Inventario

**Función:** Control y movimientos de stock

**Tipos de Movimientos:**
- 📦 Compra (aumenta stock)
- 🛒 Venta (reduce stock)
- 🔧 Ajuste (corrección manual)
- 📉 Pérdida/Merma
- 🏠 Consumo interno

**Alertas:**
- Stock bajo (≤ stock mínimo)
- Sin stock (= 0)

### 8. Reportes

**Tipos de Reportes:**
- 📅 Ventas Diarias
- 📅 Ventas Semanales
- 📅 Ventas Mensuales
- 📊 Ventas por Producto
- 💰 Rentabilidad (Ingresos - Costos)
- 📦 Reporte de Stock

---

## 📖 GUÍA DE USO

### Día a Día - Flujo Típico

#### 1. Inicio del Día

**A. Abrir Caja**
1. Ir a "Caja"
2. Clic en "Abrir Caja"
3. Ingresar monto inicial (ej: $50.000)
4. Confirmar

✅ La caja queda abierta para el día

#### 2. Realizar Ventas

**A. Venta Simple**
1. Ir a "Punto de Venta"
2. Escanear código de barras o buscar producto
3. Presionar Enter
4. Producto se agrega al carrito
5. Seleccionar método de pago (Efectivo/Tarjeta/QR/Otro)
6. Venta completada ✓

**B. Venta con Peso**
1. Buscar producto por peso
2. Sistema muestra ventana para ingresar peso
3. Ingresar peso en kilogramos (ej: 0.500)
4. Clic en "Agregar"
5. Continuar con método de pago

**C. Venta con Cliente**
1. Clic en "Seleccionar Cliente"
2. Buscar y seleccionar cliente
3. Realizar venta normalmente
4. Venta queda asociada al cliente

#### 3. Gestión de Productos

**A. Agregar Producto Nuevo**
1. Ir a "Productos"
2. Clic en "Nuevo Producto"
3. Completar datos:
   - Código de barras
   - Nombre *
   - Categoría
   - Tipo (Unidad/Peso)
   - Precio *
   - Costo
   - Stock inicial
   - Stock mínimo
4. Guardar

**B. Importar Productos**
1. Ir a "Productos"
2. Clic en "Importar"
3. Pegar JSON con productos
4. Clic en "Importar"
5. Sistema muestra resultados

#### 4. Registrar Compra a Proveedor

1. Ir a "Compras"
2. Clic en "Nueva Compra"
3. Seleccionar proveedor
4. Agregar productos uno por uno
5. Ajustar cantidades y costos
6. Ingresar pago inicial (si aplica)
7. Guardar compra

✅ El stock se incrementa automáticamente

#### 5. Ajustar Stock

**Caso: Producto dañado**
1. Ir a "Inventario"
2. Clic en "Ajuste de Stock"
3. Seleccionar producto
4. Tipo: "Pérdida / Merma"
5. Ingresar cantidad
6. Ingresar motivo: "Producto dañado"
7. Guardar

#### 6. Cierre del Día

**A. Cerrar Caja**
1. Ir a "Caja"
2. Contar efectivo físico en caja
3. Clic en "Cerrar Caja"
4. Ingresar monto real contado
5. Sistema muestra diferencia
6. Confirmar cierre

**B. Revisar Reportes**
1. Ir a "Reportes"
2. Seleccionar "Ventas Diarias"
3. Revisar resumen del día
4. Ver "Rentabilidad" para análisis financiero

---

## 🔧 EXTENSIÓN DEL SISTEMA

### Agregar Nuevos Métodos de Pago

**Archivo:** `js/views/pos.js`

```javascript
// Agregar botón en el HTML de POSView.render()
<button class="btn btn-primary btn-lg" onclick="POSView.completeSale('transferencia')">
    🏦 Transferencia
</button>

// Agregar nombre en getPaymentMethodName()
getPaymentMethodName(method) {
    const names = {
        cash: 'Efectivo',
        card: 'Tarjeta',
        qr: 'QR',
        transferencia: 'Transferencia',  // ← NUEVO
        other: 'Otro'
    };
    return names[method] || method;
}
```

### Agregar Nuevas Categorías

**Opción 1: Desde el Código**

**Archivo:** `js/app.js` - método `checkAndInitializeCategories()`

```javascript
const defaultCategories = [
    { name: 'General', color: '#6b7280' },
    { name: 'Snacks', color: '#ec4899' },  // ← NUEVA
    // ... más categorías
];
```

**Opción 2: Dinámicamente (recomendado)**

Crear un módulo de Categorías siguiendo el patrón:
1. Crear `js/models/Category.js`
2. Crear `js/controllers/CategoryController.js`
3. Crear vista para gestión

### Agregar Campo Personalizado a Productos

**Archivo:** `js/models/Product.js`

```javascript
static async create(data) {
    const product = {
        barcode: data.barcode || '',
        name: data.name,
        // ... campos existentes
        brand: data.brand || '',  // ← NUEVO CAMPO
        supplier: data.supplier || '',  // ← NUEVO CAMPO
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    return await db.add('products', product);
}
```

**Archivo:** `js/views/products.js` - Agregar en el formulario

```html
<div class="form-group">
    <label>Marca</label>
    <input type="text" name="brand" class="form-control" value="${product?.brand || ''}">
</div>
```

### Agregar Descuentos o Promociones

**1. Modificar modelo de Sale:**

```javascript
// js/models/Sale.js
const sale = {
    saleNumber: saleNumber,
    date: new Date().toISOString(),
    items: data.items || [],
    subtotal: parseFloat(data.subtotal) || 0,
    discount: parseFloat(data.discount) || 0,  // ← NUEVO
    total: parseFloat(data.total) || 0,
    // ...
};
```

**2. Modificar controlador POS:**

```javascript
// js/controllers/POSController.js
getCartSummary() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.total, 0);
    const discount = this.discount || 0;  // ← NUEVO
    return {
        items: this.cart,
        subtotal: subtotal,
        discount: discount,  // ← NUEVO
        total: subtotal - discount
    };
}
```

### Integrar con Hardware (Lector de Barras, Impresora)

**Lector de Código de Barras USB:**
- Los lectores USB funcionan como teclado
- No requiere código especial
- Simplemente enfoca el input de búsqueda

**Impresora Térmica:**

```javascript
// Ejemplo con Web Bluetooth API (para impresoras Bluetooth)
async function printReceipt(sale) {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }]
        });
        
        const server = await device.gatt.connect();
        // ... código de impresión
    } catch (error) {
        console.error('Bluetooth error:', error);
    }
}
```

### Exportar Datos a Excel/CSV

```javascript
// js/controllers/ReportController.js
static async exportToCSV(sales) {
    const csv = [
        ['Fecha', 'Venta #', 'Items', 'Total', 'Pago'].join(','),
        ...sales.map(s => [
            formatDate(s.date),
            s.saleNumber,
            s.items.length,
            s.total,
            s.paymentMethod
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-${formatDate(new Date())}.csv`;
    a.click();
}
```

### Sincronización con Servidor (cuando hay Internet)

```javascript
// js/sync.js - Nuevo archivo
class SyncManager {
    static async syncSales() {
        const sales = await Sale.getAll();
        const unsynced = sales.filter(s => !s.synced);
        
        for (const sale of unsynced) {
            try {
                await fetch('https://tu-servidor.com/api/sales', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sale)
                });
                
                sale.synced = true;
                await db.put('sales', sale);
            } catch (error) {
                console.error('Sync failed:', error);
            }
        }
    }
}
```

---

## ❓ SOLUCIÓN DE PROBLEMAS

### La aplicación no carga

**Problema:** Pantalla en blanco
**Solución:**
1. Abrir consola del navegador (F12)
2. Verificar errores en la pestaña Console
3. Verificar que todos los archivos JS estén en su lugar
4. Refrescar con Ctrl+F5 (limpia cache)

### Base de datos no se crea

**Problema:** Error "Database initialization failed"
**Solución:**
1. Verificar que el navegador soporte IndexedDB
2. En modo incógnito, IndexedDB puede estar deshabilitado
3. Limpiar datos del sitio en configuración del navegador

### No puedo realizar ventas

**Problema:** Botón "Completar venta" no funciona
**Solución:**
1. Verificar que la caja esté abierta
2. Ir a módulo "Caja" y abrir caja
3. Si ya está abierta, cerrarla y volver a abrir

### Stock negativo después de venta

**Problema:** El stock queda en negativo
**Solución:**
1. El sistema permite stock negativo por diseño
2. Para evitarlo, agregar validación en `POSController.js`:

```javascript
async validateStock(productId, quantity) {
    const product = await Product.getById(productId);
    if (!product) return false;
    
    if (product.type === 'unit' && product.stock < quantity) {
        showNotification('Stock insuficiente', 'warning');
        return false;
    }
    
    return true;
}
```

### Diferencias en cierre de caja

**Problema:** Siempre hay diferencias al cerrar
**Solución:**
1. Verificar que todas las ventas se registren
2. Revisar resumen de pagos antes de cerrar
3. Contar bien el efectivo físico
4. Las diferencias son normales en operación real

### Productos duplicados en búsqueda

**Problema:** Al buscar aparecen productos repetidos
**Solución:**
1. Verificar que no se hayan importado datos duplicados
2. Limpiar base de datos:
```javascript
// En consola del navegador
await db.clear('products');
// Luego reimportar productos
```

---

## 📞 SOPORTE

Para problemas técnicos o consultas:
- Revisar esta documentación
- Verificar consola del navegador para errores
- Revisar el código en GitHub (si está disponible)

---

## 📄 LICENCIA

Sistema desarrollado para uso comercial en minimarkets.

---

## 🎉 ¡LISTO PARA USAR!

El sistema está completamente funcional y listo para:
- ✅ Realizar ventas
- ✅ Gestionar productos
- ✅ Controlar inventario
- ✅ Administrar proveedores
- ✅ Generar reportes
- ✅ Funcionar 100% offline
- ✅ Instalarse en Android como PWA

**Próximos pasos sugeridos:**
1. Importar catálogo de productos
2. Registrar proveedores
3. Abrir caja
4. ¡Comenzar a vender!
