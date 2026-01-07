# SOLUCIÓN DE PROBLEMAS - Sistema POS

## Problema: No puedo iniciar sesión

### Solución 1: Crear tu primer usuario
Si es la primera vez que usas el sistema:

1. En la pantalla de login, simplemente ingresa:
   - **Usuario**: el nombre que quieras (ej: admin, tu nombre, etc.)
   - **Contraseña**: la contraseña que quieras
2. Click en "Iniciar Sesión"
3. El sistema creará automáticamente tu usuario

**El primer usuario que crees será el administrador del sistema.**

### Solución 2: Resetear la base de datos

Si ya creaste un usuario pero olvidaste la contraseña:

1. Presiona **F12** para abrir la consola del navegador
2. Ve a la pestaña **Console**
3. Escribe el siguiente comando y presiona Enter:
   ```javascript
   resetDatabase()
   ```
4. Confirma la eliminación
5. La página se recargará automáticamente
6. Ahora puedes crear un nuevo usuario

### Solución 3: Crear usuario admin manualmente

Si necesitas crear el usuario admin por defecto:

1. Presiona **F12** para abrir la consola del navegador
2. Ve a la pestaña **Console**
3. Escribe:
   ```javascript
   createDefaultUser()
   ```
4. Presiona Enter
5. Esto creará el usuario: **admin** / **admin123**
6. Recarga la página (F5)
7. Inicia sesión con admin/admin123

---

## Problema: Error "Base de datos corrupta"

### Solución:

1. Presiona **F12** → Console
2. Ejecuta:
   ```javascript
   resetDatabase()
   ```
3. Confirma y espera a que recargue
4. Crea un nuevo usuario

---

## Problema: No puedo ver los productos importados

### Solución:

1. Verifica el formato del archivo CSV
2. Debe tener exactamente estas columnas en la primera fila:
   ```
   barcode,name,description,category,price,cost,type,stock,minStock,maxStock
   ```
3. Ejemplo de producto:
   ```
   7790001234567,Coca Cola 1.5L,Bebida gaseosa,Bebidas,1500,1000,unit,50,10,100
   ```

---

## Problema: Los precios no se redondean

### Verificación:

Los precios solo se redondean para:
- Productos vendidos por peso (fraccionados)
- Al modificar cantidades en el carrito

Para verificar:
1. El producto debe ser tipo "Peso (kg)"
2. El redondeo se aplica automáticamente al calcular el total

---

## Problema: No veo el botón de cuenta corriente

### Verificación:

1. Ve a **Clientes**
2. Busca el botón **💳 Cuenta** en cada fila
3. Si no aparece, recarga la página (F5)

---

## Problema: No puedo anotar una venta (fiar)

### Requisitos:

1. Debes tener la **caja abierta**
   - Ve a **Caja** → **Abrir Caja**
   - Ingresa un monto inicial
   - Click en "Abrir Caja"

2. Debes seleccionar un **cliente**
   - En el punto de venta, click en "👤 Seleccionar Cliente"
   - Selecciona un cliente o crea uno nuevo

3. Agrega productos al carrito

4. Click en **📝 Anotar (Fiar)**

---

## Problema: La aplicación no carga

### Solución:

1. Verifica que todos los archivos estén en su lugar
2. Abre la consola del navegador (F12)
3. Busca errores en rojo
4. Si ves errores de "archivo no encontrado", verifica la estructura de carpetas:
   ```
   proyecto/
   ├── index.html
   ├── css/
   ├── js/
   │   ├── models/
   │   ├── controllers/
   │   ├── views/
   │   └── utils/
   └── icons/
   ```

---

## Verificar Estado del Sistema

Para ver información detallada del sistema:

1. Presiona **F12** → Console
2. Ejecuta:
   ```javascript
   checkDatabase()
   ```
3. Verás cuántos usuarios, productos, clientes, etc. hay en el sistema

---

## Comandos Útiles de Consola

Abre la consola (F12 → Console) y ejecuta:

### Ver todos los usuarios
```javascript
User.getAll().then(users => console.table(users))
```

### Ver todos los productos
```javascript
Product.getAll().then(products => console.table(products))
```

### Ver todas las ventas
```javascript
Sale.getAll().then(sales => console.table(sales))
```

### Ver clientes con deuda
```javascript
Sale.getPendingSales().then(sales => console.table(sales))
```

### Limpiar sesión actual
```javascript
sessionStorage.clear()
window.location.reload()
```

---

## Contacto de Soporte

Si ninguna de estas soluciones funciona:

1. Abre la consola del navegador (F12)
2. Copia todos los mensajes de error
3. Toma una captura de pantalla
4. Describe exactamente qué estabas haciendo cuando ocurrió el problema

---

## Prevención de Problemas

### Recomendaciones:

1. **Exporta tus productos regularmente**
   - Ve a Productos → "📥 Exportar Excel"
   - Guarda el archivo CSV como respaldo

2. **Usa siempre el mismo navegador**
   - Los datos se guardan por navegador
   - Chrome, Firefox, Edge tienen bases de datos separadas

3. **No borres los datos del navegador**
   - Esto eliminaría toda la información del sistema
   - Si necesitas limpiar el navegador, exporta primero

4. **Mantén la aplicación actualizada**
   - Guarda siempre la última versión de los archivos
   - No mezcles archivos de versiones diferentes

---

## Navegadores Recomendados

- ✅ Google Chrome (Recomendado)
- ✅ Microsoft Edge
- ✅ Firefox
- ⚠️ Safari (puede tener limitaciones)
- ❌ Internet Explorer (no compatible)

---

## Atajos de Teclado

- **F5** - Recargar página
- **F12** - Abrir consola de desarrollador
- **Ctrl + Shift + Delete** - Borrar datos del navegador (¡cuidado!)

---

**Fecha de última actualización**: 2024-01-15
