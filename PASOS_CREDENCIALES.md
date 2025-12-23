# Pasos para Crear Credenciales

## ✅ Ya completado:
1. ✅ Proyecto creado: "Turnera hospital"
2. ✅ API habilitada: Cloud Text-to-Speech API
3. ✅ Facturación habilitada

## 🔑 Paso 3: Crear Service Account

### Opción 1: Desde la página actual
1. Clic en el botón azul **"Crear credenciales"** (que está en la página)
2. Continuar con los pasos abajo

### Opción 2: Desde el menú
1. Menú lateral izquierdo: **"APIs y servicios"** > **"Credenciales"**
2. Clic en **"Crear credenciales"** (botón azul arriba)
3. Seleccionar: **"Cuenta de servicio"** o **"Service Account"**

---

## 📝 Formulario de Service Account

1. **Nombre de la cuenta de servicio**: 
   - Escribir: `turnera-tts`
   - Clic en **"Crear y continuar"**

2. **Rol (Opcional)**:
   - Buscar y seleccionar: **"Text-to-Speech User"** o **"Usuario de Text-to-Speech"**
   - Si no aparece, usar: **"Editor"**
   - Clic en **"Continuar"**

3. **Conceder acceso a usuarios (Opcional)**:
   - Dejar vacío (no necesario)
   - Clic en **"Listo"**

---

## 📥 Paso 4: Descargar JSON

1. En la lista de "Cuentas de servicio", buscar: `turnera-tts@turnera-hospital.iam.gserviceaccount.com`
2. Clic en esa cuenta
3. Ir a la pestaña **"Claves"** o **"Keys"** (arriba)
4. Clic en **"Agregar clave"** > **"Crear clave nueva"**
5. Tipo: Seleccionar **"JSON"**
6. Clic en **"Crear"**
7. Se descargará automáticamente un archivo JSON

⚠️ **IMPORTANTE**: Guardar este archivo. Lo necesitaremos para el Pi.

---

## 🚀 Siguiente: Subir al Pi

Una vez descargado el archivo JSON, seguir con los pasos para configurarlo en el Raspberry Pi.

