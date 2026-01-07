# 🛒 POS MINIMARKET - Sistema de Punto de Venta

Sistema completo de Punto de Venta diseñado para minimarkets en Chile. **100% offline**, con soporte para Android.

## ✨ Características Principales

- 🏪 **Punto de Venta rápido** - Búsqueda por código de barras o nombre
- 💰 **Control de Caja** - Apertura, cierre y alertas de diferencias
- 📦 **Gestión de Productos** - Catálogo completo con stock automático
- 👥 **Clientes y Proveedores** - Registro y seguimiento
- 🚚 **Control de Compras** - Cuentas por pagar y stock
- 📊 **Inventario** - Alertas de stock bajo y movimientos
- 📈 **Reportes** - Ventas, rentabilidad y análisis
- 📱 **PWA** - Instala como app en Android
- 💵 **Moneda: CLP** - Pesos Chilenos

## 🚀 Inicio Rápido

### 1. Abrir la Aplicación
- Abre el archivo `index.html` en tu navegador (Chrome recomendado)
- O usa un servidor local:
  ```bash
  python -m http.server 8000
  # Luego abre: http://localhost:8000
  ```

### 2. 🔐 Crear tu Usuario (Primera Vez)
**IMPORTANTE**: Si es la primera vez que usas el sistema:

1. En la pantalla de login, ingresa:
   - **Usuario**: el nombre que quieras (ej: admin, tu_nombre, etc.)
   - **Contraseña**: la contraseña que desees
2. Click en "Iniciar Sesión"
3. **El sistema creará automáticamente tu usuario**

**¡El primer usuario que crees será el administrador!**

### 3. Configuración Inicial

1. **Importar Productos** (recomendado)
   - Ir a Productos → 📤 Importar Excel
   - Seleccionar archivo CSV con tus productos
   - Ver formato en [SOLUCION-PROBLEMAS.md](SOLUCION-PROBLEMAS.md)
   
2. **Abrir Caja**
   - Ir a Caja → Abrir Caja
   - Ingresar monto inicial
   - Click en "Abrir Caja"

3. **¡Listo para vender!**
   - Ve al Punto de Venta
   - Busca o escanea productos
   - ¡Empieza a vender!

---

## 📚 Documentación Importante

- **[SOLUCION-PROBLEMAS.md](SOLUCION-PROBLEMAS.md)** - ⚠️ LEE ESTO SI TIENES PROBLEMAS
- **[MEJORAS-IMPLEMENTADAS.md](MEJORAS-IMPLEMENTADAS.md)** - Funcionalidades del sistema
- **[FUNCIONALIDADES-PENDIENTES.md](FUNCIONALIDADES-PENDIENTES.md)** - Próximas mejoras

---

## 📋 Formato de Importación de Productos

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

**Campos:**
- `name` (obligatorio) - Nombre del producto
- `price` (obligatorio) - Precio de venta
- `barcode` (opcional) - Código de barras
- `category` (opcional) - Categoría
- `type` (opcional) - `"unit"` o `"weight"` (por kg)
- `cost` (opcional) - Costo del producto
- `stock` (opcional) - Stock inicial
- `minStock` (opcional) - Stock mínimo para alertas

## 📱 Instalación en Android

1. Abre la app en Chrome/Firefox móvil
2. Menú → "Agregar a pantalla de inicio"
3. ¡Listo! Funciona como app nativa

## 🏗️ Arquitectura

```
├── index.html          # Aplicación principal
├── manifest.json       # Configuración PWA
├── service-worker.js   # Cache offline
├── css/
│   └── styles.css     # Estilos
└── js/
    ├── app.js         # Inicialización
    ├── db.js          # IndexedDB manager
    ├── models/        # Modelos de datos
    ├── controllers/   # Lógica de negocio
    ├── views/         # Vistas del sistema
    └── utils/         # Utilidades
```

## 📖 Módulos del Sistema

### 1️⃣ Punto de Venta (POS)
- Búsqueda rápida de productos
- Carrito de compras
- Productos por unidad y peso
- Métodos de pago: Efectivo, Tarjeta, QR, Otro

### 2️⃣ Productos
- CRUD completo
- Importación masiva JSON
- Categorización
- Control de stock

### 3️⃣ Clientes
- Registro básico
- Historial de compras

### 4️⃣ Proveedores y Compras
- Gestión de proveedores
- Registro de compras
- Cuentas por pagar
- Incremento automático de stock

### 5️⃣ Control de Caja
- Apertura con monto inicial
- Seguimiento en tiempo real
- Cierre con resumen
- Alertas de diferencias

### 6️⃣ Inventario
- Stock automático
- Alertas de stock bajo
- Ajustes manuales
- Historial de movimientos

### 7️⃣ Reportes
- Ventas diarias/semanales/mensuales
- Ventas por producto
- Análisis de rentabilidad
- Reporte de stock

## 🔧 Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript Vanilla
- **Base de Datos:** IndexedDB (100% offline)
- **PWA:** Service Worker
- **Sin dependencias externas**

## 📚 Documentación Completa

Ver [DOCUMENTACION.md](./DOCUMENTACION.md) para:
- Guía detallada de uso
- Ejemplos de extensión
- Solución de problemas
- Mejores prácticas

## 🎯 Casos de Uso

### Flujo Típico Diario

1. **9:00 AM** - Abrir caja con monto inicial
2. **9:00 AM - 8:00 PM** - Realizar ventas
3. **Durante el día** - Recibir compras de proveedores
4. **8:00 PM** - Cerrar caja y ver reportes

### Venta Simple

```
1. Escanear código de barras (o buscar)
2. Presionar Enter
3. Seleccionar método de pago
4. ¡Listo!
```

### Venta con Peso

```
1. Buscar producto (ej: "manzana")
2. Ingresar peso en kg (ej: 0.5)
3. Agregar al carrito
4. Completar venta
```

## 🚧 Extensiones Futuras (Sugeridas)

- [ ] Impresión de tickets
- [ ] Integración con balanza digital
- [ ] Sincronización con servidor en la nube
- [ ] Gestión de múltiples usuarios/cajeros
- [ ] Descuentos y promociones
- [ ] Facturación electrónica SII Chile
- [ ] Integración con pasarelas de pago
- [ ] App móvil nativa

## ⚠️ Notas Importantes

- **Backup:** Los datos se almacenan localmente. Realiza backups periódicos.
- **Compatibilidad:** Funciona en Chrome, Firefox, Edge, Safari (moderno).
- **Modo Incógnito:** IndexedDB puede estar deshabilitado.
- **Internet:** No requiere conexión. Todo funciona offline.

## 🐛 Solución Rápida de Problemas

**App no carga:**
- Presiona Ctrl+F5 para refrescar
- Verifica consola del navegador (F12)

**No puedo vender:**
- Verifica que la caja esté abierta
- Ve a Caja → Abrir Caja

**Stock negativo:**
- Es normal si vendes sin stock
- Ajusta en Inventario → Ajuste de Stock

## 📄 Licencia

Desarrollado para uso comercial en minimarkets.

---

## 🎉 ¡El sistema está listo!

Completamente funcional y preparado para:
- ✅ Ventas offline
- ✅ Control total de inventario
- ✅ Gestión de caja
- ✅ Reportes de negocio
- ✅ Instalación en Android

**¿Necesitas ayuda?** Revisa la [documentación completa](./DOCUMENTACION.md).
