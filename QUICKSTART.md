# 🚀 Guía Rápida de Inicio

## Instalación Express (5 minutos)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Inicializar base de datos
```bash
npm run init-db
```

### 3. Iniciar servidor
```bash
npm start
```

### 4. Acceder al sistema
Abre tu navegador en: `http://localhost:3000`

## 🔑 Credenciales por Defecto

### Administrador
- **Usuario**: `admin`
- **Contraseña**: `admin123`
- **URL**: http://localhost:3000/admin.html

### Médicos
- **Usuario**: `dr.garcia` / `dra.lopez` / `dr.martinez`
- **Contraseña**: `medico123`
- **URL**: http://localhost:3000/medico.html

### Display Público (TV)
- **URL**: http://localhost:3000/display.html
- No requiere login

## 📋 Flujo de Uso

1. **Administrador** carga turnos (PDF o manual)
2. **Médico** ve sus turnos y presiona "Llamar"
3. **Display** muestra el nombre + consultorio + audio

## 🌐 Acceso desde Red Local

Obtener IP del equipo:
```bash
# Windows
ipconfig

# Linux/Mac/Raspberry Pi
hostname -I
```

Luego accede desde otros dispositivos:
- `http://TU_IP:3000/medico.html`
- `http://TU_IP:3000/admin.html`
- `http://TU_IP:3000/display.html`

## 🔧 Comandos Útiles

```bash
# Desarrollo con auto-reinicio
npm run dev

# Reiniciar base de datos
npm run init-db

# Ver logs (si usas systemd en Raspberry Pi)
sudo journalctl -u turnera -f
```

## ⚠️ IMPORTANTE

**Cambiar contraseñas por defecto antes de usar en producción**

## 📚 Documentación Completa

Ver `README.md` para instrucciones detalladas de instalación en Raspberry Pi, configuración de red, seguridad, y más.



