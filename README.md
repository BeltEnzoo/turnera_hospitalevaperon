# 🏥 Sistema de Turnera para Hospital

Sistema completo de gestión de turnos hospitalarios con display público, panel médico y administración. Diseñado para funcionar en Raspberry Pi 4.

## 📋 Características

- **Panel Administrativo**: Carga de turnos mediante PDF o creación manual
- **Panel Médico**: Visualización de turnos y sistema de llamado
- **Display Público**: Pantalla para TV con llamados visuales y por audio
- **Tiempo Real**: Notificaciones instantáneas mediante WebSockets
- **Text-to-Speech**: Anuncio automático de llamados por parlante
- **Base de Datos SQLite**: Ligera y perfecta para Raspberry Pi

## 🔧 Requisitos

### Hardware
- Raspberry Pi 4 Model B (2GB RAM mínimo, 4GB recomendado)
- Tarjeta microSD (16GB mínimo, Clase 10)
- TV con entrada HDMI (para display público)
- Parlantes conectados al Raspberry Pi
- Red local (WiFi o Ethernet)

### Software
- Raspberry Pi OS (anteriormente Raspbian)
- Node.js 16 o superior
- npm 8 o superior

## 🚀 Instalación en Raspberry Pi

### 1. Preparar el Raspberry Pi

```bash
# Actualizar sistema
sudo apt update
sudo apt upgrade -y

# Instalar Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

### 2. Clonar o copiar el proyecto

```bash
# Si usas Git
git clone <url-del-repositorio>
cd Turnera

# O copiar los archivos directamente al Raspberry Pi
# usando USB, SCP, o SFTP
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Inicializar la base de datos

```bash
npm run init-db
```

Esto creará:
- Usuario admin (username: `admin`, password: `admin123`)
- 3 médicos de ejemplo (username: `dr.garcia`, `dra.lopez`, `dr.martinez`, password: `medico123`)
- Turnos de ejemplo para testing

### 5. Iniciar el servidor

```bash
# Modo producción
npm start

# Modo desarrollo (con nodemon)
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

## 🌐 Configuración de Red

### Obtener IP del Raspberry Pi

```bash
hostname -I
```

Ejemplo: `192.168.1.100`

### Acceder desde otros dispositivos

Una vez que el servidor esté corriendo, puedes acceder desde cualquier dispositivo en la misma red:

- **Desde PC de consultorios**: `http://192.168.1.100:3000/medico.html`
- **Desde PC administrativa**: `http://192.168.1.100:3000/admin.html`
- **Display público (TV)**: `http://192.168.1.100:3000/display.html`

## 📺 Configurar Display Público en TV

### Opción 1: Navegador en pantalla completa

```bash
# Instalar Chromium si no está instalado
sudo apt install -y chromium-browser

# Crear script de inicio
nano ~/start-display.sh
```

Contenido del script:
```bash
#!/bin/bash
sleep 10
chromium-browser --kiosk --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  http://localhost:3000/display.html
```

```bash
# Dar permisos de ejecución
chmod +x ~/start-display.sh

# Agregar al inicio automático
mkdir -p ~/.config/autostart
nano ~/.config/autostart/turnera-display.desktop
```

Contenido del .desktop:
```ini
[Desktop Entry]
Type=Application
Name=Turnera Display
Exec=/home/pi/start-display.sh
```

### Opción 2: Usar un navegador dedicado

Alternativamente, puedes usar Firefox o cualquier navegador en modo kiosko.

## 🔊 Configuración de Audio

Para asegurar que el text-to-speech funcione correctamente:

```bash
# Verificar dispositivos de audio
aplay -l

# Configurar volumen
alsamixer

# Probar audio
speaker-test -t wav -c 2
```

## 🔐 Seguridad

### Cambiar contraseñas por defecto

**IMPORTANTE**: Cambia las contraseñas por defecto antes de usar en producción.

1. Accede al panel administrativo
2. Ve a la sección de usuarios (agregar esta funcionalidad si es necesario)
3. Cambia las contraseñas de todos los usuarios

### Configurar JWT Secret

Edita el archivo `.env` y cambia `JWT_SECRET` por una clave segura:

```env
JWT_SECRET=tu_clave_super_secreta_y_larga_aqui_123456789
```

## 📱 Estructura de URLs

- `/` - Página principal con selector de interfaces
- `/admin.html` - Panel administrativo
- `/medico.html` - Panel médico
- `/display.html` - Display público para TV

## 🗄️ Base de Datos

La base de datos SQLite se guarda en `database/turnera.db`

### Backup de la base de datos

```bash
# Crear backup
cp database/turnera.db database/backup_$(date +%Y%m%d).db

# Restaurar backup
cp database/backup_20251007.db database/turnera.db
```

## 📄 Formato del PDF de Turnos

El sistema intenta parsear automáticamente los PDFs. El formato esperado es:

```
T001 Juan Perez 12345678 Consultorio 1 2025-10-07 09:00
T002 Maria Lopez 23456789 Consultorio 2 2025-10-07 09:30
```

**Nota**: Puede ser necesario adaptar la función `parsearTurnosPDF()` en `routes/turnos.js` según el formato específico de los PDFs de tu hospital.

## 🔄 Inicio Automático

Para que el servidor inicie automáticamente al encender el Raspberry Pi:

### Usando systemd

```bash
# Crear servicio
sudo nano /etc/systemd/system/turnera.service
```

Contenido:
```ini
[Unit]
Description=Sistema de Turnera Hospital
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Turnera
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Habilitar e iniciar servicio
sudo systemctl enable turnera
sudo systemctl start turnera

# Ver estado
sudo systemctl status turnera

# Ver logs
sudo journalctl -u turnera -f
```

## 🛠️ Mantenimiento

### Limpiar turnos antiguos

Puedes crear un script para limpiar turnos de hace más de 30 días:

```sql
DELETE FROM turnos WHERE fecha < date('now', '-30 days');
DELETE FROM historial_llamados WHERE llamado_at < datetime('now', '-30 days');
```

### Monitorear recursos

```bash
# CPU y memoria
htop

# Espacio en disco
df -h

# Temperatura del Raspberry Pi
vcgencmd measure_temp
```

## 📊 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/verify` - Verificar token

### Turnos
- `GET /api/turnos` - Listar todos los turnos (admin)
- `GET /api/turnos/mis-turnos` - Turnos del médico
- `POST /api/turnos` - Crear turno manualmente
- `POST /api/turnos/upload-pdf` - Cargar PDF con turnos
- `POST /api/turnos/:id/llamar` - Llamar a un paciente
- `PATCH /api/turnos/:id/estado` - Actualizar estado

### Médicos
- `GET /api/medicos` - Listar médicos
- `GET /api/medicos/estadisticas` - Estadísticas del médico

### Display
- `GET /api/display/ultimos-llamados` - Últimos llamados
- `GET /api/display/info-dia` - Información del día

## 🐛 Solución de Problemas

### El servidor no inicia
```bash
# Verificar que el puerto 3000 esté disponible
sudo netstat -tuln | grep 3000

# Ver logs de error
npm start
```

### No se escucha el audio
- Verificar que los parlantes estén conectados
- Verificar volumen del sistema
- Probar en otro navegador (Chrome/Chromium recomendado)
- Verificar permisos de audio en el navegador

### El display no se actualiza en tiempo real
- Verificar que Socket.IO esté funcionando
- Revisar la consola del navegador (F12)
- Verificar conexión de red

### El PDF no se procesa correctamente
- Verificar que el PDF no esté protegido/encriptado
- Adaptar la función `parsearTurnosPDF()` según tu formato
- Considerar crear turnos manualmente como alternativa

## 👥 Usuarios por Defecto

Después de inicializar la base de datos:

| Usuario | Contraseña | Rol | Consultorio |
|---------|-----------|-----|-------------|
| admin | admin123 | Administrador | - |
| dr.garcia | medico123 | Médico | Consultorio 1 |
| dra.lopez | medico123 | Médico | Consultorio 2 |
| dr.martinez | medico123 | Médico | Consultorio 3 |

**⚠️ CAMBIAR ESTAS CONTRASEÑAS INMEDIATAMENTE EN PRODUCCIÓN**

## 📞 Soporte

Para problemas o consultas, contactar al administrador del sistema.

## 📝 Licencia

Este proyecto fue creado para uso interno del hospital.

---

**Desarrollado con ❤️ para mejorar la experiencia de pacientes y personal médico**



