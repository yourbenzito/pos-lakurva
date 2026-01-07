# FUNCIONALIDADES PENDIENTES DE IMPLEMENTACIÓN

## MÓDULO DE COMPRAS

### A. Selección de Proveedor
- [ ] Agregar selector de proveedor en vista de compras
- [ ] Mostrar datos del proveedor seleccionado
- [ ] Validar selección de proveedor antes de guardar compra

### B. Cálculo de IVA
- [ ] Campo para ingresar porcentaje de IVA (ej: 19%)
- [ ] Opción "Con IVA" / "Sin IVA" por compra
- [ ] Cálculo automático: precio_neto = precio_con_iva / (1 + porcentaje/100)
- [ ] Ejemplo: 1190 / 1.19 = 1000
- [ ] Mostrar precio neto y precio con IVA en la interfaz

### C. Búsqueda de Productos
- [ ] Buscador con autocompletado
- [ ] Escaneo de código de barras
- [ ] Selección desde lista de productos

### D. Ingreso de Datos por Producto
- [ ] Campo: Cantidad
- [ ] Campo: Precio (con/sin IVA según selección)
- [ ] Campo: Stock Mínimo
- [ ] Campo: Stock Máximo
- [ ] Checkbox: Producto Fraccionario (sí/no)

### E. Costo Medio (Importante)
Cuando se ingresa mercadería y el producto ya tiene stock:
```javascript
// Ejemplo de cálculo
stock_actual = 10 unidades
costo_actual = $1000 c/u
total_actual = 10 * 1000 = $10,000

ingreso_nuevo = 5 unidades  
costo_nuevo = $1200 c/u
total_nuevo = 5 * 1200 = $6,000

costo_medio = (total_actual + total_nuevo) / (stock_actual + ingreso_nuevo)
costo_medio = (10000 + 6000) / (10 + 5)
costo_medio = 16000 / 15 = $1066.67
```

- [ ] Implementar función `calculateAverageCost()` en Product model
- [ ] Actualizar costo del producto al ingresar compra
- [ ] Registrar historial de costos

### F. Organización por Proveedores
- [ ] Cada compra debe tener supplierId
- [ ] Vista de compras agrupadas por proveedor
- [ ] Detalle de compras por día en cuenta de proveedor

---

## MÓDULO DE CAJA

### A. Apertura con Denominaciones de Billetes/Monedas Chilenos

**Billetes**: 20000, 10000, 5000, 2000, 1000  
**Monedas**: 500, 100, 50, 10

Interfaz propuesta:
```
Cantidad de cada denominación:
$20.000 [ ] x 20000 = $0
$10.000 [ ] x 10000 = $0
$5.000  [ ] x 5000  = $0
$2.000  [ ] x 2000  = $0
$1.000  [ ] x 1000  = $0
$500    [ ] x 500   = $0
$100    [ ] x 100   = $0
$50     [ ] x 50    = $0
$10     [ ] x 10    = $0

Total calculado: $________

--- O ---

Ingreso rápido:
Monto total de apertura: [ ]
```

- [ ] Formulario con campos para cada denominación
- [ ] Cálculo automático del total
- [ ] Opción alternativa: solo monto total
- [ ] Campos opcionales (no obligatorio llenar todos)
- [ ] Guardar detalle de denominaciones en CashRegister

### B. Modelo de Datos
```javascript
{
  openDate: "2024-01-15T08:00:00",
  denominations: {
    bill_20000: 5,  // cantidad
    bill_10000: 10,
    bill_5000: 8,
    bill_2000: 15,
    bill_1000: 20,
    coin_500: 10,
    coin_100: 20,
    coin_50: 10,
    coin_10: 50
  },
  openAmount: 150000,  // calculado o ingresado manualmente
  status: 'open'
}
```

---

## MÓDULO DE INVENTARIO

### A. Reportes de Stock
- [ ] Mostrar cantidad total de productos
- [ ] Lista de productos con bajo stock (stock <= minStock)
- [ ] Alerta visual para productos críticos
- [ ] Cantidad de productos con stock 0

### B. Valor Neto del Inventario
- [ ] Calcular: suma(stock × costo_neto) de todos los productos
- [ ] Mostrar total en dinero
- [ ] Desglose por categoría
- [ ] Gráfico de distribución

### C. Movimientos de Inventario (Nuevo)

#### Opciones:
1. **Pérdida** - Producto dañado, vencido, robado
2. **Consumo Interno** - Producto usado por el negocio
3. **Ajuste de Inventario** - Corrección manual de stock

#### Funcionalidad:
- [ ] Seleccionar tipo de movimiento
- [ ] Buscar y seleccionar productos
- [ ] Ingresar cantidad a descontar
- [ ] Motivo/notas opcionales
- [ ] Cálculo automático de:
  - Valor neto perdido (cantidad × costo)
  - Valor venta perdido (cantidad × precio_venta)
- [ ] Guardar en stockMovements con type: 'loss', 'internal', 'adjustment'

#### Modelo de Datos
```javascript
{
  productId: 123,
  type: 'loss',  // 'internal', 'adjustment'
  quantity: -5,
  cost_value: 5000,   // cantidad * costo
  sale_value: 7500,   // cantidad * precio_venta
  reason: 'Producto vencido',
  date: '2024-01-15T10:30:00'
}
```

### D. Reportes de Pérdidas y Consumo
- [ ] Reporte mensual de pérdidas (cantidad y valor)
- [ ] Reporte mensual de consumo interno
- [ ] Mostrar en reportes generales
- [ ] Gráficos de tendencia

---

## MÓDULO DE REPORTES

### A. Reportes de Ventas
- [ ] Número total de ventas
- [ ] Total vendido por método de pago
- [ ] Promedio de ventas diarias
- [ ] Ventas por rango de fechas

### B. Reportes Periódicos
- [ ] Reporte diario
- [ ] Reporte semanal
- [ ] Reporte mensual
- [ ] Reporte anual

### C. Reportes por Producto
- [ ] Productos más vendidos
- [ ] Productos menos vendidos
- [ ] Rotación de inventario

### D. Rentabilidad
Cálculo de ganancia:
```javascript
precio_neto = costo
precio_con_markup = costo * (1 + markup_percent)
precio_final = precio_con_markup * (1 + tax_percent)

Ejemplo:
costo = 1000
markup = 40%
tax = 19%

precio_con_markup = 1000 * 1.40 = 1400
precio_final = 1400 * 1.19 = 1666

ganancia_por_unidad = precio_final - costo = 666
margen_porcentaje = (666 / 1666) * 100 = 40%
```

- [ ] Calcular utilidad bruta: ventas - costo_productos
- [ ] Calcular margen de ganancia %
- [ ] Reporte de rentabilidad por producto
- [ ] Reporte de rentabilidad por categoría
- [ ] Tendencia de rentabilidad (gráfico)

### E. Reportes de Compras
- [ ] Total de productos comprados en el mes
- [ ] Valor neto de compras del mes
- [ ] Histórico de meses/años anteriores
- [ ] Comparativa mes a mes

### F. Pérdidas y Consumo Interno
- [ ] Total de pérdidas del período (cantidad y $)
- [ ] Total de consumo interno (cantidad y $)
- [ ] Porcentaje sobre ventas
- [ ] Desglose por producto

---

## MÓDULO DE CONFIGURACIÓN

### A. Datos de Usuario
- [ ] Ver nombre de usuario actual
- [ ] Cambiar contraseña
- [ ] Crear nuevos usuarios (si se implementa multi-usuario)
- [ ] Eliminar usuarios

### B. Exportar/Importar Base de Datos
- [ ] Exportar toda la BD a JSON
- [ ] Exportar toda la BD a Excel (múltiples hojas)
- [ ] Importar BD desde archivo
- [ ] Backup automático

### C. Reparación de Errores
- [ ] Botón "Reparar Base de Datos"
- [ ] Verificar integridad de datos
- [ ] Recalcular stocks
- [ ] Recalcular totales
- [ ] Limpiar datos huérfanos
- [ ] Reindexar base de datos
- [ ] Borrar caché y recargar aplicación

Ejemplo de función de reparación:
```javascript
async function repairDatabase() {
  // 1. Verificar stocks
  const products = await Product.getAll();
  for (const product of products) {
    const movements = await StockMovement.getByProduct(product.id);
    const calculatedStock = movements.reduce((sum, m) => sum + m.quantity, 0);
    if (product.stock !== calculatedStock) {
      await Product.update(product.id, { stock: calculatedStock });
    }
  }
  
  // 2. Verificar ventas pendientes
  const sales = await Sale.getPendingSales();
  for (const sale of sales) {
    const payments = await Payment.getBySale(sale.id);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid >= sale.total) {
      await Sale.update(sale.id, { status: 'completed' });
    }
  }
  
  // 3. Recargar aplicación
  window.location.reload();
}
```

---

## OTRAS MEJORAS GLOBALES

### Redondeo de Precios
- [x] Implementado para productos fraccionados
- [ ] Aplicar también en productos por unidad si es necesario
- [ ] Configuración para habilitar/deshabilitar redondeo

---

## PRIORIDADES DE IMPLEMENTACIÓN

### Alta Prioridad
1. Costo medio en compras
2. Módulo de pérdida/consumo interno
3. Apertura de caja con denominaciones
4. Reportes básicos de ventas

### Media Prioridad
5. Compras con IVA
6. Reportes de rentabilidad
7. Inventario con valores netos

### Baja Prioridad
8. Exportar/importar BD completa
9. Reparación de errores
10. Multi-usuario

---

## NOTAS DE IMPLEMENTACIÓN

### Para Costo Medio
1. Modificar `Purchase.create()` para calcular costo medio
2. Agregar campo `costHistory` en productos para tracking
3. Actualizar `Product.cost` al ingresar compra

### Para Pérdida/Consumo
1. Agregar tipos 'loss', 'internal', 'adjustment' en StockMovement
2. Crear vista InventoryAdjustments
3. Agregar reportes específicos

### Para Reportes
1. Crear `ReportController.js` con métodos de cálculo
2. Agregar gráficos con Chart.js o similar
3. Exportar reportes a PDF/Excel

---

## TESTING RECOMENDADO

- [ ] Probar cálculo de costo medio con diferentes escenarios
- [ ] Verificar redondeo en todos los casos
- [ ] Probar importación con archivo CSV grande (1000+ productos)
- [ ] Verificar pagos parciales y completos
- [ ] Probar con múltiples usuarios
