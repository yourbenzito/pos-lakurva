#!/bin/bash

# 🚀 Script de Despliegue - CajaFácil POS Cloud
# Optimizado para: Ubuntu 22.04+ (VPS SolucionHost)

echo "---------------------------------------------------"
echo "🛠️  Iniciando Configuración de CajaFácil Cloud..."
echo "---------------------------------------------------"

# 1. Actualizar sistema e instalar Node.js 20
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs build-essential
else
    echo "✅ Node.js ya está instalado ($(node -v))"
fi

# 2. Instalar PM2 globalmente
if ! command -v pm2 &> /dev/null; then
    echo "⚙️  Instalando PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 ya está instalado"
fi

# 3. Moverse a la carpeta del proyecto
# Si los archivos se descomprimieron en una subcarpeta, intentamos entrar en ella
if [ -d "sistema de ventas diseño 1" ]; then
    cd "sistema de ventas diseño 1"
fi

echo "📂 Directorio actual: $(pwd)"

# 4. Instalar dependencias
echo "📥 Instalando dependencias necesarias (esto puede tardar)..."
npm install --omit=dev --no-fund --no-audit

# 5. Configurar Firewall (Abrir puerto 3000)
echo "🛡️  Configurando Firewall (Puerto 3000)..."
sudo ufw allow 3000/tcp
sudo ufw --force enable

# 6. Iniciar o Reiniciar el servidor con PM2
echo "🔥 Lanzando servidor en segundo plano..."
pm2 delete "cajafacil-server" &> /dev/null
pm2 start backend/server.js --name "cajafacil-server" -- --max-old-space-size=4096

# 7. Configurar persistencia (para que inicie solo tras un reinicio del VPS)
echo "💾 Configurando inicio automático..."
pm2 startup | tail -n 1 | bash
pm2 save

echo "---------------------------------------------------"
echo "✅ ¡TODO LISTO!"
echo "---------------------------------------------------"
echo "🌍 Accede desde tu Celular o PC en:"
echo "👉 http://186.64.121.32:3000"
echo ""
echo "📱 RECUERDA: Abre ese link en tu móvil e instálalo"
echo "   con la opción 'Agregar a pantalla de inicio'."
echo "---------------------------------------------------"
