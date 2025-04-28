# Guía de Solución de Problemas (Troubleshooting)

[<- Volver al README principal](../README.md)

Aquí se listan algunos problemas comunes y sus posibles soluciones.

*   **Error "Acceso denegado" al Puerto COM (Windows: `PermissionError: [WinError 5] Acceso denegado`, Linux: `Permission denied`)**
    *   **Causa:** Otro programa está usando el puerto COM.
    *   **Solución:** Cierra cualquier otro software que pueda estar usando el puerto (Monitores Seriales, otras aplicaciones Modbus, etc.).
    *   **Causa:** Permisos insuficientes.
    *   **Solución (Linux):** Asegúrate de que tu usuario pertenezca al grupo correcto para acceder a puertos serie (a menudo `dialout` o `tty`). Ejemplo: `sudo usermod -a -G dialout $USER` (puede requerir cerrar sesión y volver a entrar).
    *   **Solución (Windows):** Intenta ejecutar la aplicación como administrador (aunque generalmente no es necesario si ningún otro programa bloquea el puerto).
    *   **Causa:** Nombre de puerto incorrecto.
    *   **Solución:** Verifica el nombre exacto en el Administrador de Dispositivos (Windows) o con `dmesg | grep tty` o `ls /dev/tty*` (Linux).

*   **No se puede conectar / Timeout / No hay respuesta**
    *   **Causa:** Parámetros de comunicación incorrectos (Baudrate, Paridad, Stop bits).
    *   **Solución:** Asegúrate de usar 9600, 8N1 (8 bits de datos, Sin paridad, 1 bit de parada) para la Huawei ESM-48150B1. Verifica en la interfaz web.
    *   **Causa:** Cableado incorrecto o defectuoso.
    *   **Solución:** Revisa las conexiones RS485 (A+ con A+, B- con B-). Prueba con otro cable o adaptador si es posible.
    *   **Causa:** Dispositivo Modbus apagado o no alimentado.
    *   **Solución:** Asegúrate de que la batería o el dispositivo Modbus esté encendido.
    *   **Causa:** ID Esclavo incorrecto.
    *   **Solución:** Confirma que el ID Esclavo es 217 (0xD9) para la batería Huawei. Intenta leer con otro ID si no estás seguro (aunque la autenticación fallará si no es 217).
    *   **Causa (si usas VCOM/Ethernet):** Configuración incorrecta del conversor RS485-Ethernet o del software VCOM.
    *   **Solución:** Verifica la IP, puerto, configuración serial en el conversor y el mapeo en el software VCOM. Asegúrate de que el PC pueda hacer ping a la IP del conversor.

*   **Error "Dispositivo incompatible" o fallo en autenticación al conectar**
    *   **Causa:** No es una batería Huawei ESM-48150B1 o el firmware es muy diferente.
    *   **Solución:** Este software está diseñado específicamente para este modelo. La autenticación fallará en otros dispositivos.
    *   **Causa:** ID Esclavo incorrecto (no es 217).
    *   **Solución:** Asegúrate de que el ID del dispositivo sea 217. La autenticación está codificada para este ID.

*   **Errores Modbus (Exception Response) al leer/escribir**
    *   **Código `01 (Illegal Function)`:** El dispositivo no soporta la función Modbus que intentas usar (ej. escribir en Input Registers).
    *   **Código `02 (Illegal Data Address)`:** Intentas leer/escribir una dirección que no existe o no está permitida en el dispositivo. Verifica los rangos de direcciones válidos para la batería.
    *   **Código `03 (Illegal Data Value)`:** El valor que intentas escribir no es válido para esa dirección (ej. fuera de rango).
    *   **Código `04 (Slave Device Failure)`:** Hubo un error interno en el dispositivo al procesar la solicitud. Puede ser un error transitorio o un problema más serio.
    *   **Código `06 (Slave Device Busy)`:** El dispositivo está ocupado procesando otro comando. Intenta de nuevo más tarde.
    *   **Código `0xC1` (o similar no estándar) al intentar leer FC41:** La secuencia de autenticación no se completó correctamente o no se realizó. Desconecta y vuelve a conectar para reintentar la autenticación.

*   **Dependencias no encontradas / `ModuleNotFoundError`**
    *   **Causa:** No se instalaron las dependencias o no estás en el entorno virtual correcto.
    *   **Solución:**
        1.  Asegúrate de haber activado el entorno virtual (`.\env\Scripts\activate` en Windows, `source env/bin/activate` en Linux/macOS). Verás `(env)` al principio de la línea de comandos.
        2.  Ejecuta `pip install -r requirements.txt` dentro del entorno activado.
        3.  Ejecuta la aplicación con `python app.py` desde el entorno activado.

*   **La interfaz web no se carga o muestra errores**
    *   **Causa:** Problemas con Flask o archivos estáticos.
    *   **Solución:** Revisa la consola donde ejecutaste `python app.py` para ver si hay errores de Python/Flask. Asegúrate de que los archivos en `static/` y `templates/` no estén corruptos o faltantes. Limpia la caché del navegador.

[<- Volver al README principal](../README.md)