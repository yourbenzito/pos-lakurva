# GUÍA DE DESPLIEGUE - POS MINIMARKET

Esta guía te ayudará a desplegar el sistema POS en diferentes entornos.

---

## 📦 OPCIÓN 1: USO LOCAL (SIN SERVIDOR)

### Windows
1. Doble clic en `index.html`
2. El sistema se abre en tu navegador por defecto
3. ¡Listo para usar!

### Limitaciones del modo local:
- El Service Worker no funcionará completamente
- PWA no se podrá instalar
- Algunas funciones offline avanzadas no estarán disponibles

---

## 🌐 OPCIÓN 2: SERVIDOR LOCAL (RECOMENDADO)

### Con Python (ya instalado en Windows 10/11)

```bash
# Abrir PowerShell en la carpeta del proyecto
cd C:\Users\benzo\OneDrive\Desktop\proyecto

# Iniciar servidor
python -m http.server 8000

# Acceder desde:
# http://localhost:8000
```

### Con Node.js (si está instalado)

```bash
# Opción 1: usando npx (incluido con Node.js)
npx http-server -p 8000

# Opción 2: usando serve
npx serve -p 8000
```

### Con PHP (si está instalado)

```bash
php -S localhost:8000
```

---

## ☁️ OPCIÓN 3: HOSTING WEB

### A. GitHub Pages (GRATIS)

1. **Crear repositorio en GitHub**
   - Ir a github.com
   - New Repository
   - Nombre: `pos-minimarket`

2. **Subir archivos**
   ```bash
   cd C:\Users\benzo\OneDrive\Desktop\proyecto
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/pos-minimarket.git
   git push -u origin main
   ```

3. **Activar GitHub Pages**
   - Settings → Pages
   - Source: main branch
   - Save
   - Tu sitio estará en: `https://TU-USUARIO.github.io/pos-minimarket`

### B. Netlify (GRATIS)

1. Ir a [netlify.com](https://netlify.com)
2. Registrarse/Login
3. Arrastrar la carpeta del proyecto
4. ¡Listo! Obtienes una URL automática

### C. Vercel (GRATIS)

1. Ir a [vercel.com](https://vercel.com)
2. Registrarse/Login
3. Import Project
4. Seleccionar carpeta
5. Deploy

---

## 📱 OPCIÓN 4: ACCESO EN RED LOCAL

Para que otros dispositivos en tu red local accedan:

1. **Iniciar servidor local** (Python/Node/PHP)

2. **Obtener tu IP local:**
   ```bash
   # En PowerShell
   ipconfig
   # Buscar: IPv4 Address (ej: 192.168.1.100)
   ```

3. **Acceder desde otros dispositivos:**
   - En el navegador: `http://192.168.1.100:8000`
   - Funciona en PC, tablets, smartphones en la misma red

---

## 🔒 OPCIÓN 5: SERVIDOR WINDOWS (IIS)

### Requisitos:
- Windows 10 Pro o Windows Server
- IIS habilitado

### Pasos:

1. **Habilitar IIS:**
   - Panel de Control → Programas → Activar características de Windows
   - Marcar "Internet Information Services"
   - Aceptar

2. **Configurar sitio:**
   - Abrir IIS Manager
   - Clic derecho en "Sites" → Add Website
   - Site name: `POS-Minimarket`
   - Physical path: `C:\Users\benzo\OneDrive\Desktop\proyecto`
   - Port: `8080`
   - Start Website Immediately: ✓

3. **Acceder:**
   - Local: `http://localhost:8080`
   - Red local: `http://TU-IP:8080`

---

## 🐧 OPCIÓN 6: SERVIDOR LINUX

### Con Apache

```bash
# Instalar Apache
sudo apt update
sudo apt install apache2

# Copiar archivos
sudo cp -r /ruta/proyecto/* /var/www/html/pos/

# Configurar permisos
sudo chown -R www-data:www-data /var/www/html/pos
sudo chmod -R 755 /var/www/html/pos

# Reiniciar Apache
sudo systemctl restart apache2

# Acceder: http://servidor-ip/pos
```

### Con Nginx

```bash
# Instalar Nginx
sudo apt install nginx

# Crear archivo de configuración
sudo nano /etc/nginx/sites-available/pos

# Contenido:
server {
    listen 80;
    server_name tu-dominio.com;
    root /var/www/pos;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Activar sitio
sudo ln -s /etc/nginx/sites-available/pos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔐 HTTPS (Para producción)

### Con Let's Encrypt (GRATIS)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com

# Auto-renovación (ya configurada)
sudo certbot renew --dry-run
```

---

## 📊 RENDIMIENTO

### Optimizaciones recomendadas:

1. **Comprimir archivos estáticos**
   ```nginx
   # En nginx.conf
   gzip on;
   gzip_types text/css application/javascript application/json;
   ```

2. **Cache de navegador**
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

---

## 🔄 ACTUALIZACIÓN DEL SISTEMA

### Método 1: Reemplazo manual
1. Hacer backup de la base de datos (Configuración → Exportar Todo)
2. Reemplazar archivos
3. Refrescar navegador (Ctrl+F5)

### Método 2: Git
```bash
git pull origin main
# Limpiar cache del navegador
```

---

## 🛡️ SEGURIDAD

### Para producción:

1. **Protección con contraseña (Nginx):**
   ```bash
   sudo apt install apache2-utils
   sudo htpasswd -c /etc/nginx/.htpasswd admin
   ```
   
   En nginx.conf:
   ```nginx
   auth_basic "Área Restringida";
   auth_basic_user_file /etc/nginx/.htpasswd;
   ```

2. **Firewall:**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

---

## 📱 INSTALACIÓN PWA

Una vez desplegado con servidor:

### En Android:
1. Abrir en Chrome
2. Menú → "Agregar a pantalla de inicio"
3. Confirmar

### En iOS:
1. Abrir en Safari
2. Compartir → "Añadir a pantalla de inicio"
3. Confirmar

### En Windows/Mac:
1. Abrir en Chrome/Edge
2. Icono de instalación en barra de direcciones
3. "Instalar"

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Service Worker no se registra:
- Verificar que estés usando HTTPS o localhost
- Revisar consola del navegador (F12)

### La PWA no se puede instalar:
- Verificar que manifest.json sea accesible
- Verificar que estés usando HTTPS
- Verificar los iconos existan

### Base de datos no persiste:
- Verificar que IndexedDB esté habilitado
- No usar modo incógnito
- Verificar espacio en disco

---

## 📞 CONTACTO Y SOPORTE

Para problemas técnicos:
1. Revisar consola del navegador (F12)
2. Verificar permisos de archivos
3. Revisar logs del servidor

---

## ✅ CHECKLIST DE DESPLIEGUE

- [ ] Servidor configurado
- [ ] Archivos copiados
- [ ] Permisos correctos
- [ ] HTTPS configurado (producción)
- [ ] PWA instalable
- [ ] Service Worker funcionando
- [ ] Backup automático configurado
- [ ] Acceso desde red local verificado
- [ ] Documentación accesible

---

**¡Sistema listo para producción!** 🎉
