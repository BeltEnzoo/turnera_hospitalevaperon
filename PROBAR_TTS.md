# Probar Google Cloud TTS

## ✅ Configuración Completada

Google Cloud TTS está inicializado y funcionando.

## 🎯 Prueba Final

1. **Abrir el panel médico:**
   - Desde otra PC en la red: `http://10.10.10.147:3000/medico.html`
   - O desde el Pi: `http://localhost:3000/medico.html`

2. **Hacer un llamado:**
   - Seleccionar un turno
   - Clic en "Llamar"

3. **Verificar en el display:**
   - Debería aparecer el nombre del paciente
   - Debería sonar con **voz natural** (no robótica)

4. **Ver logs (opcional):**
   ```bash
   pm2 logs turnera --lines 10
   ```
   - Deberías ver: `✅ Audio generado: tts_xxxxx.mp3`

## 🎉 Si funciona

¡Listo! Ahora tenés voces naturales como en Windows.

## ⚠️ Si sigue sonando robótica

1. Verificar logs para errores
2. Revisar que el display esté usando el audio generado
3. Verificar que el archivo de audio se está creando en `public/audio/`


