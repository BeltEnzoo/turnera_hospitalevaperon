# Configuración de Google Cloud Text-to-Speech

Este documento explica cómo configurar Google Cloud TTS para obtener voces naturales en los anuncios del sistema.

## ¿Por qué Google Cloud TTS?

- ✅ Voces naturales (mucho mejor que espeak-ng)
- ✅ Acento argentino disponible
- ✅ Funciona en cualquier dispositivo
- ✅ Plan gratuito suficiente para hospitales
- ✅ Se activa automáticamente cuando está configurado

## Pasos para Configurar

### 1. Crear Proyecto en Google Cloud

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear un nuevo proyecto (o usar uno existente)
3. Anotar el **Project ID**

### 2. Habilitar Text-to-Speech API

1. En el menú lateral, ir a **APIs & Services** > **Library**
2. Buscar "Text-to-Speech API"
3. Clic en **Enable**

### 3. Crear Credenciales

1. Ir a **APIs & Services** > **Credentials**
2. Clic en **Create Credentials** > **Service Account**
3. Dar un nombre (ej: "turnera-tts")
4. Clic en **Create and Continue**
5. Asignar rol: **Text-to-Speech User** o **Editor**
6. Clic en **Done**

### 4. Descargar Credenciales JSON

1. En la lista de Service Accounts, buscar la cuenta creada
2. Clic en ella y ir a la pestaña **Keys**
3. Clic en **Add Key** > **Create new key**
4. Seleccionar **JSON** y clic en **Create**
5. Se descargará un archivo JSON (ej: `turnera-tts-xxxxx.json`)

### 5. Configurar en el Servidor (Raspberry Pi)

#### Opción A: Usando archivo de credenciales (Recomendado)

1. Copiar el archivo JSON descargado al servidor:
   ```bash
   # Desde tu PC, copiar el archivo al Pi
   scp turnera-tts-xxxxx.json hospitalevaperon@10.10.10.147:~/turnera_hospitalevaperon/
   ```

2. Editar el archivo `.env` en el proyecto:
   ```bash
   cd ~/turnera_hospitalevaperon
   nano .env
   ```

3. Agregar estas líneas:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/home/hospitalevaperon/turnera_hospitalevaperon/turnera-tts-xxxxx.json
   GOOGLE_CLOUD_PROJECT_ID=tu-project-id-aqui
   ```

4. Guardar y salir (Ctrl+O, Enter, Ctrl+X)

5. Reiniciar el servidor:
   ```bash
   pm2 restart turnera
   ```

#### Opción B: Usando autenticación por defecto

Si ya tienes `gcloud` configurado en el servidor, puedes usar:

```bash
gcloud auth application-default login
```

### 6. Verificar que Funciona

1. Hacer un llamado desde el panel médico
2. Revisar los logs del servidor:
   ```bash
   pm2 logs turnera
   ```
3. Deberías ver: `✅ Audio generado: tts_xxxxx.mp3`
4. En el display debería sonar con voz natural

## Límites del Plan Gratuito

- **4 millones de caracteres por mes** (gratis)
- Después: $4 USD por 1 millón de caracteres adicionales

**Estimación para hospital:**
- ~100 pacientes/día
- ~50 caracteres por anuncio
- = ~5,000 caracteres/día
- = ~150,000 caracteres/mes
- **✅ Muy por debajo del límite gratuito**

## Fallback Automático

Si Google Cloud TTS no está configurado o falla:
- El sistema automáticamente usa la voz del navegador (fallback)
- No interrumpe el funcionamiento del sistema
- Los anuncios siguen funcionando normalmente

## Solución de Problemas

### Error: "No se pudo generar el audio"

1. Verificar que el archivo JSON existe:
   ```bash
   ls -la ~/turnera_hospitalevaperon/turnera-tts-xxxxx.json
   ```

2. Verificar que la ruta en `.env` es correcta (ruta absoluta)

3. Verificar permisos del archivo:
   ```bash
   chmod 600 ~/turnera_hospitalevaperon/turnera-tts-xxxxx.json
   ```

4. Verificar logs:
   ```bash
   pm2 logs turnera --lines 50
   ```

### El audio no se reproduce

1. Verificar que el directorio `public/audio` existe:
   ```bash
   ls -la ~/turnera_hospitalevaperon/public/audio/
   ```

2. Verificar permisos del directorio:
   ```bash
   chmod 755 ~/turnera_hospitalevaperon/public/audio/
   ```

### Cambiar de Voz

Puedes cambiar la voz editando `services/ttsService.js`:

- `es-AR-Wavenet-A` - Voz femenina argentina (por defecto)
- `es-AR-Wavenet-B` - Voz masculina argentina
- `es-AR-Neural2-A` - Voz neural femenina argentina (requiere facturación)

Más voces disponibles: https://cloud.google.com/text-to-speech/docs/voices

## Desactivar Google Cloud TTS

Si quieres volver a usar solo la voz del navegador:

1. Comentar o eliminar las líneas del `.env`:
   ```
   # GOOGLE_APPLICATION_CREDENTIALS=...
   # GOOGLE_CLOUD_PROJECT_ID=...
   ```

2. Reiniciar el servidor:
   ```bash
   pm2 restart turnera
   ```

El sistema automáticamente usará el fallback.
