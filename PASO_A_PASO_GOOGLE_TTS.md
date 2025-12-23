# Pasos para Configurar Google Cloud TTS

## ✅ Paso 1: Crear Proyecto (ESTÁS AQUÍ)

1. **Nombre del proyecto**: `Turnera Hospital` (o el que prefieras)
2. **ID del proyecto**: Dejar el generado o cambiar a algo simple como `turnera-hospital`
3. **Ubicación**: Dejar "Sin organización"
4. **Clic en "Crear"** (botón azul)

⏳ Esperar unos segundos a que se cree el proyecto.

---

## 📝 Paso 2: Habilitar Text-to-Speech API

Después de crear el proyecto:

1. En el menú lateral izquierdo, buscar: **"APIs y servicios"** o **"APIs & Services"**
2. Clic en **"Biblioteca"** o **"Library"**
3. En el buscador, escribir: **"Text-to-Speech API"**
4. Clic en el resultado que aparezca
5. Clic en el botón azul **"Habilitar"** o **"Enable"**

⏳ Esperar a que se habilite (puede tardar 10-30 segundos).

---

## 🔑 Paso 3: Crear Credenciales (Service Account)

1. En el menú lateral, buscar: **"APIs y servicios"** > **"Credenciales"** o **"APIs & Services"** > **"Credentials"**
2. Clic en el botón **"Crear credenciales"** o **"Create Credentials"**
3. Seleccionar: **"Cuenta de servicio"** o **"Service Account"**
4. **Nombre**: `turnera-tts`
5. Clic en **"Crear y continuar"** o **"Create and Continue"**
6. **Rol**: Buscar y seleccionar **"Text-to-Speech User"** (o **"Editor"** si no aparece el otro)
7. Clic en **"Continuar"** o **"Continue"**
8. Dejar todo como está y clic en **"Listo"** o **"Done"**

---

## 📥 Paso 4: Descargar Archivo JSON

1. En la lista de cuentas de servicio, buscar y clic en: `turnera-tts@exalted-entry-480215-u6.iam.gserviceaccount.com` (o el ID que te haya salido)
2. Ir a la pestaña **"Claves"** o **"Keys"**
3. Clic en **"Agregar clave"** > **"Crear clave nueva"** o **"Add Key"** > **"Create new key"**
4. Seleccionar: **JSON**
5. Clic en **"Crear"** o **"Create"**
6. Se descargará automáticamente un archivo JSON (ej: `exalted-entry-480215-u6-xxxxx.json`)

⚠️ **IMPORTANTE**: Guardá este archivo en un lugar seguro. Lo necesitaremos para el siguiente paso.

---

## 🚀 Paso 5: Subir Archivo al Raspberry Pi

### Opción A: Usando AnyDesk (Más fácil)

1. Abrir AnyDesk
2. Conectar al Pi (IP: `10.10.10.147`, contraseña: `Turnera1234`)
3. En AnyDesk, usar la opción de **transferir archivos** o arrastrar el archivo JSON desde Windows al escritorio del Pi

### Opción B: Usando SCP (desde PowerShell de Windows)

```powershell
scp C:\Users\Usuario\Downloads\exalted-entry-480215-u6-xxxxx.json hospitalevaperon@10.10.10.147:~/turnera_hospitalevaperon/
```

---

## ⚙️ Paso 6: Configurar en el Pi

En el terminal del Pi, ejecutar:

```bash
cd ~/turnera_hospitalevaperon
nano .env
```

Agregar al final del archivo (reemplazar con el nombre real de tu archivo):

```
GOOGLE_APPLICATION_CREDENTIALS=/home/hospitalevaperon/turnera_hospitalevaperon/exalted-entry-480215-u6-xxxxx.json
GOOGLE_CLOUD_PROJECT_ID=exalted-entry-480215-u6
```

**Guardar**: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## 🔄 Paso 7: Reiniciar Servidor

```bash
pm2 restart turnera
```

---

## ✅ Paso 8: Verificar Logs

```bash
pm2 logs turnera --lines 10
```

Deberías ver: `✅ Google Cloud TTS inicializado correctamente`

---

## 🎯 Paso 9: Probar

1. Hacer un llamado desde el panel médico
2. El display debería sonar con **voz natural** 🎉

