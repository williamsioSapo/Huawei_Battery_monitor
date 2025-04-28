# Configuración de Hardware para Huawei ESM-48150B1

[<- Volver al README principal](../README.md) | [Ir a Instalación](INSTALACION.md)

Para comunicarte con la batería Huawei ESM-48150B1 usando este proyecto, necesitarás un método para conectar tu PC al bus RS485 de la batería.

## 1. Adaptadores USB/Seriales Compatibles

Necesitarás un **adaptador USB-a-RS485** compatible con Modbus RTU.

✨ **Adaptador Recomendado (Enlace Afiliado):** ✨
> Este es un ejemplo del tipo de adaptador que funciona. Puedes encontrar opciones similares.
>
> [![Adaptador USB a RS485/RS232](https://ae01.alicdn.com/kf/S91b6d16c642f496183774623f877ff00N.jpg_140x140.jpg)](https://s.click.aliexpress.com/e/_olRVIXb)
>
> **[🛒 Ver Adaptador USB a RS485 en AliExpress](https://s.click.aliexpress.com/e/_olRVIXb)**

*Conecta los terminales A+ y B- del adaptador a los pines correspondientes del puerto RS485 de la batería Huawei.*

## 2. Configuración Usada para Ingeniería Inversa (Ejemplo Avanzado)

En el desarrollo de este proyecto, se utilizó una configuración específica para capturar tráfico Modbus RTU con Wireshark, lo que implicó un **conversor RS485-Ethernet** y un **puerto COM virtual**. *Esta configuración no es estrictamente necesaria para usar la aplicación, pero se documenta como referencia.*

### a) Adaptador RS485-Ethernet (USR-TCP232-304)

*   **Propósito:** Convertir la señal RS485 de la batería a paquetes TCP/IP para análisis en red.
*   **Enlace Afiliado:**

    ✨ **Conversor RS485-Ethernet (Modelo Similar):** ✨
    > Este tipo de dispositivo permite acceder a dispositivos seriales a través de una red Ethernet.
    >
    > [![Adaptador de ethernet a RS485](https://ae01.alicdn.com/kf/HTB198uGE29TBuNjy0Fcq6zeiFXaL.jpg_140x140.jpg)](https://s.click.aliexpress.com/e/_olRVIXb)
    >
    > **[🛒 Ver Conversor RS485-Ethernet en AliExpress](https://s.click.aliexpress.com/e/_olRVIXb)**

*   **Configuración Ejemplo:**
    *   Modo: TCP Server (o similar)
    *   Dirección IP: Asignada en la red local.
    *   Puerto: Puerto TCP para la conexión (ej. 502).
    *   Parámetros Seriales: **9600 baud, 8 bits de datos, Sin paridad, 1 bit de parada (8N1)** - *¡Estos deben coincidir con la configuración de la batería!*

    <div style="text-align: center; margin: 15px 0;">
      <img src="../static/images/usr_config_1.jpg" alt="Configuración Web Conversor Ethernet-RS485" style="width: 80%; max-width: 500px; border: 1px solid #ddd; border-radius: 8px;">
      <p style="font-size: 0.9em; color: #666;">Ejemplo: Interfaz web de configuración (Baudrate: 9600, 8N1)</p>
    </div>

### b) Virtualización de Puerto COM (Software VCOM)

*   **Propósito:** Mapear el puerto COM virtual (ej. `COM8`) en Windows a la dirección IP y puerto del conversor RS485-Ethernet. Esto permite que `pymodbus` (y otras aplicaciones seriales) se comuniquen con el dispositivo Ethernet como si fuera un puerto serie local.
*   **Verificación:**
    *   El puerto COM virtual debe aparecer en el Administrador de Dispositivos de Windows.
    *   La aplicación (como este proyecto Flask) puede conectarse usando el nombre del puerto virtual (ej. `COM8`).

<div style="display: flex; justify-content: space-around; align-items: flex-start; flex-wrap: wrap; gap: 20px; margin: 20px 0;">
  <div style="flex: 1; min-width: 250px; text-align: center;">
    <img src="../static/images/vcom_config_2.jpg" alt="Configuración VCOM" style="width: 80%; max-width: 300px; border: 1px solid #ddd; border-radius: 8px;">
    <p style="font-size: 0.9em; color: #666;">Aplicativo VCOM mapeando COM8 a IP:Puerto del conversor.</p>
  </div>
  <div style="flex: 1; min-width: 250px; text-align: center;">
    <img src="../static/images/adm_dispo_1.jpg" alt="Administrador de Dispositivos" style="width: 80%; max-width: 400px; border: 1px solid #ddd; border-radius: 8px;">
    <p style="font-size: 0.9em; color: #666;">COM8 visible en el Administrador de Dispositivos.</p>
  </div>
</div>

## 3. Arquitectura de Comunicación (Enfoque Híbrido)

La configuración de ingeniería inversa demuestra un flujo Modbus RTU sobre Ethernet:

*   **Capa física:** Modbus RTU sobre RS485 (Batería <-> Conversor)
*   **Transporte:** Modbus TCP (Conversor <-> PC/Red)
*   **Virtualización:** Puerto COM virtual (Software VCOM en PC)
*   **Aplicación:** `pymodbus` interactuando con el puerto COM virtual.

**Flujo:**
`[Aplicación Flask]` ← (`COM8 Virtual`) ← `[Software VCOM]` ← (`TCP/IP`) ← `[Conversor ETH-RS485]` ← (`RS485`) ← `[Batería Huawei]`

**Para uso normal con un adaptador USB-a-RS485 directo, el flujo es más simple:**
`[Aplicación Flask]` ← (`Puerto COM Físico/USB`) ← `[Adaptador USB-RS485]` ← (`RS485`) ← `[Batería Huawei]`

[<- Volver al README principal](../README.md) | [Ir a Instalación](INSTALACION.md)