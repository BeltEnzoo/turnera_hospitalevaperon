# 🔧 Solución de Problemas

## Problemas Comunes y Soluciones

### 1. Error: "Cannot find module..."

**Problema**: Las dependencias no están instaladas.

**Solución**:
```bash
npm install
```

---

### 2. Error: "EADDRINUSE: address already in use"

**Problema**: El puerto 3000 ya está en uso.

**Soluciones**:

**Opción A**: Cambiar el puerto en `.env`:
```env
PORT=3001
```

**Opción B**: Liberar el puerto 3000:

Windows:
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Linux/Mac:
```bash
lsof -ti:3000 | xargs kill -9
```

---

### 3. No se escucha el audio en el display

**Posibles causas y soluciones**:

#### Causa 1: Navegador no soporta Web Speech API
- ✅ **Usar Google Chrome o Chromium** (mejor soporte)
- ❌ Firefox tiene soporte limitado
- ❌ Safari puede tener problemas

#### Causa 2: Permisos de audio bloqueados
1. Hacer clic en el candado/ícono de configuración en la barra de direcciones
2. Permitir reproducción de audio
3. Recargar la página

#### Causa 3: Audio del sistema en mute
```bash
# Raspberry Pi
alsamixer
# Presionar M para unmute
# Subir volumen con flechas

# Verificar dispositivos de audio
aplay -l
```

#### Causa 4: Voces no cargadas
- Esperar unos segundos después de cargar la página
- Las voces se cargan asíncronamente
- Verificar en consola del navegador (F12)

---

### 4. El display no se actualiza en tiempo real

**Diagnóstico**:
```javascript
// Abrir consola del navegador (F12) en display.html
// Deberías ver:
// "Display conectado"
// "Nuevo llamado recibido: ..."
```

**Soluciones**:

#### Causa 1: Socket.IO no conecta
Verificar que el servidor esté corriendo:
```bash
npm start
```

#### Causa 2: Firewall bloqueando WebSockets
```bash
# Raspberry Pi
sudo ufw allow 3000
sudo ufw status
```

#### Causa 3: Problema de CORS
Si accedes desde otra IP, verificar que CORS esté habilitado en `server.js`:
```javascript
cors: {
    origin: "*",  // Permitir todos los orígenes
    methods: ["GET", "POST"]
}
```

---

### 5. Error al subir PDF

**Problema**: "Error procesando PDF"

**Causas y soluciones**:

#### Causa 1: PDF protegido/encriptado
- Abrir el PDF con Adobe Reader
- Guardar como nuevo PDF sin protección
- Volver a subir

#### Causa 2: Formato de PDF no compatible
El parser espera un formato específico. Ver `routes/turnos.js` función `parsearTurnosPDF()`.

**Solución temporal**: Crear turnos manualmente desde el panel admin.

**Solución permanente**: Adaptar la función de parsing según tu formato de PDF.

Ejemplo de formato esperado:
```
T001 Juan Perez 12345678 Consultorio 1 2025-10-07 09:00
```

#### Causa 3: Directorio uploads no existe
```bash
mkdir uploads
chmod 755 uploads
```

---

### 6. Error: "Token inválido" o "No autenticado"

**Problema**: Token JWT expirado o inválido.

**Solución**:
1. Cerrar sesión
2. Volver a iniciar sesión
3. El token se regenera automáticamente

Si persiste:
```bash
# Limpiar localStorage del navegador
# F12 > Console:
localStorage.clear()
# Recargar página
```

---

### 7. Base de datos corrupta o errores

**Síntomas**:
- Errores al leer/escribir
- "Database locked"
- Datos inconsistentes

**Solución**:

#### Opción 1: Backup y restaurar
```bash
# Si tienes backup
cp database/backup_YYYYMMDD.db database/turnera.db
```

#### Opción 2: Reinicializar (PIERDE DATOS)
```bash
rm database/turnera.db
npm run init-db
```

#### Opción 3: Reparar base de datos
```bash
sqlite3 database/turnera.db
sqlite> PRAGMA integrity_check;
sqlite> .exit
```

---

### 8. Panel médico no muestra turnos

**Diagnóstico**:

1. Verificar que el médico tenga turnos asignados
2. Verificar la fecha seleccionada
3. Abrir consola del navegador (F12) para ver errores

**Soluciones**:

#### Verificar en base de datos:
```bash
sqlite3 database/turnera.db
sqlite> SELECT * FROM turnos WHERE medico_id = 2;
sqlite> .exit
```

#### Crear turno de prueba:
Ir al panel admin → Crear Turno → Asignar al médico → Guardar

---

### 9. Raspberry Pi se queda sin espacio

**Problema**: Base de datos crece con el tiempo.

**Verificar espacio**:
```bash
df -h
du -sh database/
```

**Soluciones**:

#### Limpiar turnos antiguos:
```bash
sqlite3 database/turnera.db
sqlite> DELETE FROM turnos WHERE fecha < date('now', '-60 days');
sqlite> DELETE FROM historial_llamados WHERE llamado_at < datetime('now', '-60 days');
sqlite> VACUUM;
sqlite> .exit
```

#### Limpiar logs:
```bash
sudo journalctl --vacuum-time=7d
```

---

### 10. Rendimiento lento en Raspberry Pi

**Síntomas**:
- Interfaz lenta
- Respuestas tardías
- CPU al 100%

**Diagnóstico**:
```bash
# Verificar uso de recursos
htop

# Verificar temperatura
vcgencmd measure_temp
```

**Soluciones**:

#### Si temperatura > 70°C:
- Agregar disipador de calor
- Mejorar ventilación
- Usar ventilador

#### Optimizaciones:
```bash
# Reducir servicios innecesarios
sudo systemctl disable bluetooth
sudo systemctl disable cups

# Optimizar SQLite
sqlite3 database/turnera.db
sqlite> PRAGMA optimize;
sqlite> VACUUM;
sqlite> .exit
```

---

### 11. Display en TV no se ve en pantalla completa

**Solución para Chromium**:
```bash
# Modo kiosko
chromium-browser --kiosk http://localhost:3000/display.html
```

**Solución para Firefox**:
1. Presionar F11 para pantalla completa
2. Configurar en about:config:
   - `full-screen-api.allow-trusted-requests-only = false`

---

### 12. Error al instalar dependencias en Raspberry Pi

**Problema**: Error compilando módulos nativos (sqlite3).

**Solución**:
```bash
# Instalar herramientas de compilación
sudo apt install -y build-essential python3

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

---

### 13. No puedo acceder desde otra computadora

**Problema**: "Connection refused" o "Cannot reach server"

**Verificar**:

1. Servidor corriendo:
```bash
ps aux | grep node
```

2. IP correcta:
```bash
hostname -I
# Usar primera IP: 192.168.x.x
```

3. Firewall:
```bash
sudo ufw allow 3000
```

4. Mismo router/red:
- Todos los dispositivos deben estar en la misma red local

---

### 14. Pantalla se apaga/screensaver

**Solución en Raspberry Pi**:

```bash
# Editar config
sudo nano /etc/xdg/lxsession/LXDE-pi/autostart

# Agregar al final:
@xset s off
@xset -dpms
@xset s noblank

# Guardar y reiniciar
sudo reboot
```

**Alternativa con Wake Lock API** (ya implementado en display.js):
- Funciona automáticamente en navegadores modernos
- Mantiene pantalla activa mientras está en display.html

---

### 15. Cambiar contraseñas de usuarios

**Vía código**:
```bash
node
```

```javascript
const bcrypt = require('bcryptjs');
const nuevaPassword = 'mi_nueva_password';
bcrypt.hash(nuevaPassword, 10, (err, hash) => {
    console.log('Hash:', hash);
    // Copiar este hash
});
```

```bash
sqlite3 database/turnera.db
sqlite> UPDATE usuarios SET password='HASH_AQUI' WHERE username='admin';
sqlite> .exit
```

---

## Logs y Debugging

### Ver logs del servidor

**Si corre directo con npm**:
```bash
npm start
# Ver output en consola
```

**Si corre con systemd**:
```bash
sudo journalctl -u turnera -f
```

### Ver logs del navegador

1. Abrir DevTools: F12 o Ctrl+Shift+I
2. Pestaña "Console"
3. Ver errores en rojo
4. Ver mensajes de conexión Socket.IO

### Modo debug en Node.js

```bash
NODE_DEBUG=* npm start
```

---

## Contacto y Soporte

Si ninguna de estas soluciones funciona:

1. Revisar logs completos
2. Documentar el error exacto
3. Indicar:
   - Sistema operativo
   - Versión de Node.js (`node --version`)
   - Pasos para reproducir el error

---

## Recursos Adicionales

- [Documentación Node.js](https://nodejs.org/docs/)
- [Documentación Express](https://expressjs.com/)
- [Documentación Socket.IO](https://socket.io/docs/)
- [Raspberry Pi Forums](https://forums.raspberrypi.com/)
- [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)



