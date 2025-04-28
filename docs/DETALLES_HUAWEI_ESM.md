# Detalles Específicos: Huawei ESM-48150B1

[<- Volver al README principal](../README.md)

La comunicación con la batería Huawei ESM-48150B1 va más allá del protocolo Modbus RTU estándar, especialmente para acceder a información detallada del dispositivo.

## Dispositivo Objetivo

Este proyecto está diseñado y probado específicamente para:

*   **Fabricante:** Huawei
*   **Modelo:** ESM-48150B1
*   **ID Esclavo Modbus Típico:** 217 (0xD9)

*Aunque las funciones Modbus estándar (FC03, FC04, FC01, FC02, FC16, FC05) podrían funcionar con otros dispositivos, las características avanzadas están hechas a medida.*

## Secuencia de Autenticación y FC41

Para leer información extendida como el número de serie, fabricante, fecha de fabricación, etc., se requieren dos pasos específicos de Huawei:

1.  **Secuencia de Autenticación:** Un intercambio de 3 pasos utilizando escrituras y lecturas de Holding Registers (FC16 y FC03) en direcciones específicas (37500, 37501). Sin esta autenticación previa, cualquier intento de usar FC41 fallará.
2.  **Función Personalizada FC41 (Read Device Identification):** Huawei utiliza el código de función 41 (no estándar en Modbus RTU, aunque similar al concepto de MEI - Modbus Encapsulated Interface) para solicitar bloques de información del dispositivo. Cada bloque se solicita con un índice específico (0, 1, 2, etc.).

### Implementación

*   La lógica de autenticación y el manejo de FC41 se implementan principalmente en `modbus_app/device_info.py`.
*   Se definen clases Pymodbus personalizadas para FC41 en `modbus_app/custom_requests.py`.
*   La función `wake_up_device` en `modbus_app/client.py` orquesta esta secuencia al conectar.
*   La información obtenida con FC41 se **cachea** después de una autenticación exitosa para evitar repetirla constantemente.

### Importancia

*   Sin la **autenticación**, el dispositivo responde con un error Modbus (`0xC1` - Gateway Path Unavailable o similar, interpretado como fallo) a las solicitudes FC41.
*   Sin usar **FC41**, no se puede acceder a datos como el Número de Serie, Versión de Software/Hardware, Fecha de Fabricación, etc., que no están disponibles en los registros Modbus estándar.

### Análisis de Ingeniería Inversa

La lógica fue desarrollada basándose en el análisis del tráfico Modbus real capturado entre el software oficial y la batería. Los archivos de referencia en el repositorio (`trafico Fase 1.txt`, `loguin.py`, `informe1.html`, `informe2.html`) documentan este proceso.

[<- Volver al README principal](../README.md)