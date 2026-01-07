# ✅ GUÍA DE PRUEBA RÁPIDA - 10 MINUTOS

Esta guía te permitirá probar todas las funcionalidades del sistema en 10 minutos.

---

## ⏱️ MINUTO 1-2: INICIAR EL SISTEMA

### Opción A: Servidor Local (Recomendado)
```powershell
# Abrir PowerShell en la carpeta del proyecto
cd C:\Users\benzo\OneDrive\Desktop\proyecto
python -m http.server 8000
```
Luego abrir navegador: `http://localhost:8000`

### Opción B: Directo
- Doble clic en `index.html`

✅ **Resultado esperado:** Sistema carga correctamente

---

## ⏱️ MINUTO 2-3: IMPORTAR PRODUCTOS

1. Click en **"Productos"** (o presiona `Alt + 2`)
2. Click en **"Importar"**
3. Abrir `productos-ejemplo.json` con Bloc de notas
4. Copiar todo (Ctrl+A, Ctrl+C)
5. Pegar en el cuadro (Ctrl+V)
6. Click **"Importar"**

✅ **Resultado esperado:** "Importación: 25 exitosos, 0 fallidos"

---

## ⏱️ MINUTO 3-4: ABRIR CAJA

1. Click en **"Caja"** (o `Alt + 6`)
2. Ingresar monto inicial: `50000`
3. Click **"Abrir Caja"**

✅ **Resultado esperado:** 
- Mensaje "Caja abierta correctamente"
- Sidebar muestra "Caja Abierta" en verde

---

## ⏱️ MINUTO 4-6: REALIZAR VENTAS

### Venta 1: Producto por Unidad
1. Click **"Punto de Venta"** (o `Alt + 1`)
2. Escribir: `coca`
3. Presionar **Enter**
4. Click **"💵 Efectivo"**

✅ **Resultado:** Venta #1 completada

### Venta 2: Producto por Peso
1. Escribir: `manzana`
2. Presionar **Enter**
3. Ingresar peso: `0.5`
4. Click **"Agregar"**
5. Click **"💳 Tarjeta"**

✅ **Resultado:** Venta #2 completada

### Venta 3: Múltiples Productos
1. Buscar y agregar: `pan` (Enter)
2. Buscar y agregar: `leche` (Enter)
3. Buscar y agregar: `arroz` (Enter)
4. Ajustar cantidad de pan a 3
5. Click **"📱 QR"**

✅ **Resultado:** Venta #3 completada con 3 productos

---

## ⏱️ MINUTO 6-7: GESTIÓN DE CLIENTES

1. Click **"Clientes"** (o `Alt + 3`)
2. Click **"Nuevo Cliente"**
3. Llenar:
   - Nombre: `Juan Pérez`
   - Teléfono: `912345678`
4. Click **"Crear"**

✅ **Resultado:** Cliente creado

**Probar en venta:**
1. Ir a POS (`Alt + 1`)
2. Agregar producto
3. Click **"Seleccionar Cliente"**
4. Seleccionar Juan Pérez
5. Completar venta

✅ **Resultado:** Venta asociada a cliente

---

## ⏱️ MINUTO 7-8: PROVEEDORES Y COMPRAS

1. Click **"Proveedores"** (o `Alt + 4`)
2. Click **"Nuevo Proveedor"**
3. Nombre: `Distribuidora ABC`
4. Guardar

Luego:
1. Click **"Compras"** (o `Alt + 5`)
2. Click **"Nueva Compra"**
3. Seleccionar proveedor
4. Agregar productos de la lista
5. Ajustar cantidades y costos
6. Guardar

✅ **Resultado:** 
- Compra registrada
- Stock aumentado automáticamente

---

## ⏱️ MINUTO 8-9: REPORTES

1. Click **"Reportes"** (o `Alt + 8`)
2. Ver **"Ventas Diarias"** (por defecto)

✅ **Resultado:** 3 ventas mostradas

**Explorar otros reportes:**
- Click **"Ventas por Producto"**
- Click **"Rentabilidad"**
- Click **"Stock"**

✅ **Resultado:** Datos correctos en cada reporte

---

## ⏱️ MINUTO 9: INVENTARIO

1. Click **"Inventario"** (o `Alt + 7`)
2. Ver alertas de stock bajo
3. Click **"Ajuste de Stock"**
4. Seleccionar un producto
5. Tipo: "Ajuste de Inventario"
6. Cantidad: `10`
7. Motivo: "Corrección de inventario"
8. Guardar

✅ **Resultado:** 
- Stock ajustado
- Movimiento registrado

---

## ⏱️ MINUTO 10: CONFIGURACIÓN Y BACKUP

1. Click **"Configuración"** (o `Alt + 9`)
2. Ver estadísticas del sistema

**Crear Backup:**
1. Click **"Exportar Todo (JSON)"**
2. Archivo se descarga automáticamente

✅ **Resultado:** Archivo `pos-backup-FECHA.json` descargado

**Probar Exportación CSV:**
1. Click **"Exportar Ventas (CSV)"**
2. Archivo se descarga
3. Abrir en Excel (opcional)

✅ **Resultado:** CSV con las 3 ventas

---

## ⏱️ BONUS: ATAJOS DE TECLADO

Click en **"⌨️ Atajos de Teclado"** en el sidebar

**Prueba:**
1. Presionar `Alt + 1` → Va a POS
2. Presionar `Alt + 2` → Va a Productos
3. Presionar `Alt + 6` → Va a Caja
4. Presionar `Ctrl + K` → Focus en búsqueda (si estás en POS)

✅ **Resultado:** Navegación instantánea

---

## ⏱️ CIERRE: CERRAR CAJA

1. Ir a **"Caja"** (`Alt + 6`)
2. Click **"Cerrar Caja"**
3. Contar efectivo teórico mostrado
4. Ingresar mismo monto (o diferente para probar alertas)
5. Confirmar

✅ **Resultado:** 
- Resumen de caja mostrado
- Diferencia calculada (si la hay)
- Caja cerrada

---

## 📊 CHECKLIST DE PRUEBA

Marca cada funcionalidad probada:

### Básicas
- [ ] Sistema inicia correctamente
- [ ] Productos importados (25)
- [ ] Caja abierta
- [ ] Venta por unidad realizada
- [ ] Venta por peso realizada
- [ ] Venta múltiple realizada

### Gestión
- [ ] Cliente creado
- [ ] Venta con cliente
- [ ] Proveedor creado
- [ ] Compra registrada
- [ ] Stock incrementado automáticamente

### Reportes e Inventario
- [ ] Reportes diarios funcionan
- [ ] Reporte de rentabilidad
- [ ] Reporte de stock
- [ ] Ajuste de inventario
- [ ] Movimientos registrados

### Configuración
- [ ] Estadísticas del sistema
- [ ] Backup exportado
- [ ] CSV exportado
- [ ] Atajos de teclado funcionan

### Cierre
- [ ] Caja cerrada correctamente
- [ ] Resumen de caja generado

---

## 🎯 RESULTADOS ESPERADOS

Al finalizar estas pruebas debes tener:

✅ **En la Base de Datos:**
- 25 productos
- 3+ ventas
- 1+ cliente
- 1+ proveedor
- 1+ compra
- 1 caja cerrada
- Varios movimientos de stock

✅ **En tu Computadora:**
- 1 archivo de backup JSON
- 1 archivo CSV de ventas

✅ **Experiencia:**
- Sistema funcional al 100%
- Navegación fluida
- Datos persistentes (refresca y verás que todo sigue ahí)

---

## 🔄 LIMPIAR Y EMPEZAR DE NUEVO

Si quieres empezar desde cero:

1. Ir a **Configuración**
2. Scroll hasta **"Zona Peligrosa"**
3. Click **"Eliminar Todos los Datos"**
4. Confirmar (2 veces)
5. Sistema se reinicia limpio

---

## 🐛 ¿ALGO NO FUNCIONA?

### El sistema no carga
- Presiona `F12` para abrir consola
- Revisa errores en rojo
- Asegúrate de que todos los archivos estén en su lugar

### No puedo realizar ventas
- Verifica que la caja esté abierta
- Revisa el indicador en el sidebar

### Los productos no aparecen
- Asegúrate de haber importado correctamente
- Ve a Productos para verificar

### Los datos desaparecen al cerrar
- No uses modo incógnito
- Verifica que IndexedDB esté habilitado

---

## 📱 PRÓXIMO PASO: INSTALAR COMO APP

Si estás en **Android:**
1. Abrir en Chrome móvil
2. Menú (⋮) → "Agregar a pantalla de inicio"
3. ¡Listo! App instalada

Si estás en **Desktop:**
1. Buscar icono de instalación en barra de direcciones
2. Click en "Instalar"
3. App se abre en ventana independiente

---

## 🎉 ¡PRUEBA COMPLETADA!

Si completaste todos los pasos, ahora sabes que:

✅ El sistema funciona perfectamente
✅ Todos los módulos están operativos
✅ Los datos persisten correctamente
✅ El backup funciona
✅ Estás listo para usar en producción

---

**Tiempo total:** 10 minutos
**Funcionalidades probadas:** Todas las principales
**Estado del sistema:** ✅ Verificado y funcional

**¡Ahora puedes comenzar a usar el sistema en tu minimarket!** 🛒✨
