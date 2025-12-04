# Instalación de Dependencias en Raspberry Pi

Guía paso a paso para instalar las nuevas dependencias (Google Cloud TTS) en el Raspberry Pi.

## 📋 Pasos

### 1. Conectarte al Raspberry Pi

Tienes dos opciones:

**Opción A: SSH (desde terminal)**
```bash
ssh hospitalevaperon@10.10.10.147
```

**Opción B: AnyDesk (escritorio remoto)**
- Abrir AnyDesk en Windows
- Conectar a la IP: `10.10.10.147`
- Ingresar contraseña: `Turnera1234`

---

### 2. Ir a la carpeta del proyecto

Una vez conectado, ejecuta:

```bash
cd ~/turnera_hospitalevaperon
```

Verifica que estás en la carpeta correcta:

```bash
pwd
```

Deberías ver: `/home/hospitalevaperon/turnera_hospitalevaperon`

---

### 3. Actualizar el código desde Git

Primero, obtenemos los últimos cambios del repositorio:

```bash
git pull
```

**Si aparece un mensaje sobre conflictos:**
- Si te pregunta sobre `config/settings.json`, puedes guardar una copia primero:
  ```bash
  cp config/settings.json config/settings.json.backup
  git pull
  ```

**Si te pide usuario/contraseña:**
- Si usas HTTPS, necesitarás tu token de GitHub
- O puedes hacer el pull manualmente copiando los archivos

---

### 4. Instalar las dependencias

Ahora instalamos el nuevo paquete de Google Cloud TTS:

```bash
npm install
```

**⏱️ Esto puede tomar 2-5 minutos** porque:
- Descarga el paquete `@google-cloud/text-to-speech`
- Compila algunas dependencias nativas
- Instala todas las dependencias del proyecto

---

### 5. Verificar la instalación

Verifica que se instaló correctamente:

```bash
npm list @google-cloud/text-to-speech
```

Deberías ver algo como:
```
turnera-hospital@1.0.0
└── @google-cloud/text-to-speech@5.0.0
```

---

### 6. Reiniciar el servidor

Para que los cambios surtan efecto, reinicia el servidor con PM2:

```bash
pm2 restart turnera
```

---

### 7. Verificar que el servidor está corriendo

```bash
pm2 status
```

Deberías ver `turnera` en estado `online` (verde).

---

### 8. Ver logs (opcional)

Para ver si hay errores o confirmar que todo está bien:

```bash
pm2 logs turnera --lines 20
```

Busca mensajes como:
- ✅ "Server running on port 3000"
- ⚠️ "Google Cloud TTS no configurado" (esto es normal, aún no lo configuramos)

---

## ⚠️ Solución de Problemas

### Error: "npm: command not found"

**Solución:**
```bash
source ~/.nvm/nvm.sh
nvm use 18
npm install
```

---

### Error: "Cannot find module" después de npm install

**Solución:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Error de permisos al instalar

**Solución:**
```bash
sudo chown -R hospitalevaperon:hospitalevaperon ~/turnera_hospitalevaperon
npm install
```

---

### El servidor no inicia

**Verificar logs:**
```bash
pm2 logs turnera --lines 50
```

**Reiniciar desde cero:**
```bash
pm2 delete turnera
cd ~/turnera_hospitalevaperon
pm2 start server.js --name turnera
pm2 save
```

---

## ✅ Verificación Final

1. **Servidor corriendo**: `pm2 status` muestra `turnera` online
2. **Puerto 3000 activo**: Acceder desde navegador a `http://10.10.10.147:3000`
3. **No hay errores**: Los logs no muestran errores críticos

---

## 🎯 Próximo Paso

Una vez instaladas las dependencias, puedes:

1. **Probar sin Google Cloud TTS**: El sistema funcionará con voz del navegador (fallback)
2. **Configurar Google Cloud TTS** (opcional): Seguir `CONFIGURACION_GOOGLE_TTS.md` para voces naturales

---

## 📝 Notas Importantes

- ⏱️ La instalación puede tardar 2-5 minutos
- 💾 Necesitas al menos 100MB de espacio libre
- 🔄 El servidor seguirá funcionando durante la instalación
- ✅ Si algo falla, puedes reinstalar: `rm -rf node_modules && npm install`

