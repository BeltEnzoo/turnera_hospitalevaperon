# Solución cuando git pull falla por conectividad

## Opción 1: Verificar conectividad (rápido)

Ejecutar en el Pi:
```bash
ping -c 3 google.com
```

Si funciona, probar:
```bash
ping -c 3 github.com
```

Si ping a google.com funciona pero github.com no, es problema de DNS.

---

## Opción 2: Copiar archivo manualmente (más rápido)

Como git pull no funciona, podemos copiar el archivo modificado directamente desde Windows al Pi.

### Desde Windows (AnyDesk):
1. Abrir AnyDesk
2. Conectar al Pi
3. Abrir la carpeta del proyecto en el Pi: `/home/hospitalevaperon/turnera_hospitalevaperon/services/`
4. Desde Windows, copiar el archivo `services/ttsService.js` del proyecto
5. Pegarlo en la carpeta `services/` del Pi (reemplazar el existente)

---

## Opción 3: Usar SCP desde Windows

Si tienes conectividad SSH desde Windows:
```powershell
scp C:\Users\Usuario\Desktop\Projects\Turnera\services\ttsService.js hospitalevaperon@10.10.10.147:~/turnera_hospitalevaperon/services/
```


