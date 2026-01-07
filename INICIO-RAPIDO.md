# 🚀 GUÍA DE INICIO RÁPIDO

## ⚡ En 5 Minutos Tendrás tu Sistema Funcionando

---

## PASO 1: Abrir el Sistema (30 segundos)

### Opción A: Directamente en el Navegador
1. Doble clic en `index.html`
2. Se abre en tu navegador por defecto
3. ✅ ¡Listo!

### Opción B: Con Servidor Local (Recomendado)
```bash
# Si tienes Python instalado:
python -m http.server 8000

# Si tienes Node.js:
npx http-server
```

Luego abre: `http://localhost:8000`

---

## PASO 2: Cargar Productos de Ejemplo (1 minuto)

1. Clic en **"Productos"** en el menú lateral
2. Clic en botón **"Importar"**
3. Abre el archivo `productos-ejemplo.json` con un editor de texto
4. **Copia todo el contenido** (Ctrl+A, Ctrl+C)
5. **Pega** en el cuadro de texto (Ctrl+V)
6. Clic en **"Importar"**
7. ✅ Verás: "Importación: 25 exitosos, 0 fallidos"

---

## PASO 3: Abrir la Caja (30 segundos)

1. Clic en **"Caja"** en el menú lateral
2. Ingresa un monto inicial, por ejemplo: **50000**
3. Clic en **"Abrir Caja"**
4. ✅ Mensaje: "Caja abierta correctamente"

---

## PASO 4: Realizar tu Primera Venta (1 minuto)

1. Clic en **"Punto de Venta"** en el menú
2. En el campo de búsqueda escribe: **coca**
3. Presiona **Enter**
4. El producto se agrega al carrito
5. Clic en **"💵 Efectivo"** para completar la venta
6. ✅ ¡Primera venta realizada!

---

## PASO 5: Ver Reportes (30 segundos)

1. Clic en **"Reportes"** en el menú
2. Ya verás tu primera venta registrada
3. ✅ Explora los diferentes tipos de reportes

---

## 🎉 ¡FELICITACIONES!

Ya tienes el sistema completamente funcional. Ahora puedes:

### 📦 Agregar Más Productos
- Productos → Nuevo Producto
- Completa los datos y guarda

### 👥 Registrar Clientes
- Clientes → Nuevo Cliente
- Usa en ventas desde el POS

### 🚚 Registrar Proveedores
- Proveedores → Nuevo Proveedor
- Luego registra compras en "Compras"

### 📊 Ver tu Inventario
- Inventario → Ver alertas de stock bajo
- Hacer ajustes si es necesario

### 💰 Cerrar la Caja al Final del Día
- Caja → Cerrar Caja
- Ingresa el efectivo real contado
- Ve el resumen del día

---

## 📱 Instalar en Android

1. Abre el sistema en Chrome móvil
2. Menú (⋮) → **"Agregar a pantalla de inicio"**
3. ✅ Aparecerá como una app en tu teléfono

---

## 🎯 Flujo Completo de un Día

```
09:00 → Abrir Caja ($50.000)
09:05 → Primera venta (Coca Cola)
09:30 → Llega compra de proveedor → Registrar en "Compras"
10:00 - 20:00 → Ventas normales
20:00 → Contar efectivo en caja
20:05 → Cerrar Caja
20:10 → Ver reportes del día
```

---

## 💡 Tips Rápidos

### Búsqueda Rápida en POS
- Escribe cualquier parte del nombre
- O escanea el código de barras
- Enter para agregar

### Productos por Peso
- Al buscar (ej: "manzana"), si es por peso:
- Sistema pide ingresar kilogramos
- Ejemplo: 0.5 kg

### Ajustar Cantidades en Carrito
- Cambia el número directamente en la tabla
- Para eliminar: botón "✕"

### Ver Cliente en Venta
- Antes de completar venta
- Clic en "Seleccionar Cliente"
- Busca y selecciona

---

## ❓ Preguntas Frecuentes

**P: ¿Necesito Internet?**  
R: No, funciona 100% offline.

**P: ¿Dónde se guardan los datos?**  
R: En el navegador (IndexedDB). Localmente en tu dispositivo.

**P: ¿Puedo usar lector de códigos de barras?**  
R: Sí, cualquier lector USB funciona como teclado.

**P: ¿Puedo tener varios productos con el mismo nombre?**  
R: Sí, diferéncialos por código de barras.

**P: ¿Qué pasa si cierro el navegador?**  
R: Los datos permanecen. Al volver, todo sigue ahí.

**P: ¿Cómo hago backup?**  
R: Por ahora manual. En futuras versiones habrá exportación.

---

## 🆘 Ayuda Rápida

**No puedo vender:**
→ Verifica que la caja esté abierta (Caja → Abrir Caja)

**App no carga:**
→ Presiona Ctrl+F5 (refresca y limpia cache)

**Productos duplicados:**
→ Elimina duplicados desde Productos

**Stock negativo:**
→ Normal si vendes sin stock. Ajusta en Inventario

---

## 📚 Documentación Completa

Para información detallada, ver:
- **README.md** - Visión general del sistema
- **DOCUMENTACION.md** - Guía completa con todos los detalles

---

## ✨ ¡Disfruta tu Sistema POS!

El sistema está diseñado para ser:
- ⚡ Rápido
- 🎯 Intuitivo
- 💪 Robusto
- 📱 Móvil-friendly

**Próximos pasos sugeridos:**
1. Personaliza tus productos
2. Registra tus proveedores
3. Configura clientes frecuentes
4. Usa el sistema en tu día a día
5. Revisa reportes semanalmente

---

**¿Todo listo?** ¡Comienza a vender! 🎉
