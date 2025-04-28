# Guía de Uso de la Interfaz Web

[- Volver al README principal](..README.md)

Una vez que la aplicación esté [instalada](INSTALACION.md) y en ejecución, puedes acceder a la interfaz web desde tu navegador (normalmente `http127.0.0.15000`).

## 1. Conexión al Dispositivo

   Configuración de Conexión
       Introduce el Puerto COM correcto donde está conectado tu adaptador RS485 (ej. `COM3`, `devttyUSB0`).
       Verifica los parámetros seriales (Baudrate 9600, Bytesize 8, Parity N, Stopbits 1 son los típicos para la ESM-48150B1).
       El Timeout (en segundos) define cuánto esperar por una respuesta.
   Botón Conectar
       Haz clic para iniciar la conexión.
       El indicador de estado cambiará (verde si es exitoso, rojo si falla).
       El área de mensajes mostrará información detallada.
       Importante Al conectar, la aplicación intentará automáticamente la secuencia `wake_up_device`, que incluye la autenticación Huawei y una lectura inicial FC41 para obtener información del dispositivo y habilitar el Dashboard.

## 2. Dashboard de Batería (Huawei ESM-48150B1)

   Disponibilidad Este panel solo se activa si la conexión y la autenticación inicial (parte del `wake_up_device`) con la batería Huawei fueron exitosas.
   Visualización Muestra en tiempo real
       Voltaje (V)
       Corriente (A) - Positiva indica carga, negativa indica descarga.
       Estado de Carga (SOC %)
       Estado de Salud (SOH %)
       Estado Operativo (Cargando, Descargando, Inactivo, etc.)
   Controles
       Actualizar Realiza una lectura única de los datos del dashboard.
       Iniciar Monitoreo Comienza a actualizar los datos periódicamente (cada 8 segundos por defecto). El botón cambia a Detener Monitoreo.
       Detener Monitoreo Para las actualizaciones automáticas.

## 3. Lectura Modbus Estándar

   Parámetros
       ID Esclavo El ID Modbus del dispositivo (217 por defecto para la Huawei ESM-48150B1).
       Función Selecciona el tipo de registro a leer (Holding Register, Input Register, Coil, Discrete Input).
       Dirección La dirección Modbus inicial desde donde leer (formato decimal).
       Cantidad El número de registros o coils a leer.
   Botón Leer Registros
       Ejecuta la lectura Modbus seleccionada.
       Los resultados se muestran en
           JSON Crudo La respuesta directa de `pymodbus`.
           Tabla Interpretable Si los registros leídos corresponden a direcciones conocidas de la batería Huawei, se mostrará una tabla con la descripción, valor y unidad.

## 4. Escritura Modbus Estándar

   Parámetros
       ID Esclavo ID del dispositivo (217).
       Función Selecciona el tipo de registro a escribir (Holding Register, Coil).
       Dirección La dirección Modbus inicial donde escribir.
       Valores Los valores a escribir. Para múltiples registroscoils, sepáralos por comas (ej. `10, 20, 0` para registros; `1, 0, 1` para coils donde 1=ON, 0=OFF).
   Botón Escribir Registros
       Ejecuta la escritura Modbus.
       ¡Precaución! La escritura incorrecta de registros puede afectar el funcionamiento de la batería. Úsalo con conocimiento.
       El resultado (éxito o error) se muestra en el área de mensajes.

## 5. Información del Dispositivo (FC41 - Huawei)

   Botón Leer Información
       Muestra la información detallada del dispositivo (Modelo, SN, Fabricante, Fecha Fab., etc.) obtenida mediante la función personalizada FC41.
       Importante Esta acción recupera la información que fue cacheada durante la conexión inicial (cuando se ejecutó `wake_up_device`). No realiza una nueva secuencia de autenticación y lectura FC41 cada vez que se presiona el botón. Para refrescar esta información, deberás desconectar y volver a conectar.
       Los datos parseados se muestran en el área de resultados.

## 6. Consola Web de Depuración

   Botón Mostrar Consola (icono ⚙️ o similar, usualmente en la esquina superior derecha)
       Abre un panel modal que muestra los mensajes `print()` generados por el backend Flask.
       Es útil para ver logs detallados, mensajes de depuración y el flujo de ejecución.
   Controles de la Consola
       PausarReanudar Detiene o continúa la actualización automática de la consola.
       Limpiar Borra todos los mensajes de la consola.
       Cerrar Oculta el panel de la consola.

## 7. Desconexión

   Botón Desconectar
       Cierra la conexión Modbus con el puerto serie.
       El indicador de estado cambiará a rojo.
       El Dashboard y otras funciones que requieren conexión se desactivarán.

[- Volver al README principal](..README.md)