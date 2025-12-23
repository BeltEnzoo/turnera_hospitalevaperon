# Guía Rápida: Configurar Google Cloud TTS

## ✅ Paso 1: CREADO
- Proyecto: "Turnera hospital"
- ID: "turnera-hospital"

## 📍 Paso 2: Habilitar Text-to-Speech API (ESTÁS AQUÍ)

### Método rápido:
1. Buscar en la barra superior: `Text-to-Speech API`
2. Clic en el resultado
3. Clic en botón azul **"Habilitar"**

### O desde el menú:
1. Menú lateral izquierdo: **"APIs y servicios"** > **"Biblioteca"**
2. Buscar: `Text-to-Speech API`
3. Clic en **"Habilitar"**

⏳ Esperar 10-30 segundos a que se habilite.

---

## 🔑 Paso 3: Crear Service Account

1. Menú: **"APIs y servicios"** > **"Credenciales"**
2. Botón: **"Crear credenciales"** > **"Cuenta de servicio"**
3. Nombre: `turnera-tts`
4. Clic en **"Crear y continuar"**
5. Rol: **"Text-to-Speech User"**
6. Clic en **"Listo"**

---

## 📥 Paso 4: Descargar JSON

1. En la lista, clic en: `turnera-tts@turnera-hospital.iam.gserviceaccount.com`
2. Pestaña: **"Claves"**
3. **"Agregar clave"** > **"Crear clave nueva"**
4. Tipo: **JSON**
5. **"Crear"** → Se descarga el archivo

---

## 🚀 Paso 5: Subir al Pi

1. Conectar con AnyDesk al Pi
2. Arrastrar el archivo JSON al Pi (o usar SCP)
3. Anotar la ruta completa del archivo

---

## ⚙️ Paso 6: Configurar .env en el Pi

```bash
cd ~/turnera_hospitalevaperon
nano .env
```

Agregar:
```
GOOGLE_APPLICATION_CREDENTIALS=/home/hospitalevaperon/turnera_hospitalevaperon/NOMBRE_DEL_ARCHIVO.json
GOOGLE_CLOUD_PROJECT_ID=turnera-hospital
```

Guardar: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## 🔄 Paso 7: Reiniciar

```bash
pm2 restart turnera
pm2 logs turnera --lines 10
```

---

## ✅ Paso 8: Probar

Hacer un llamado → Debería sonar con voz natural 🎉

