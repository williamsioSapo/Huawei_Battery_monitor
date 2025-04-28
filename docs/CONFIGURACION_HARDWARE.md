# 🔌 Configuración de Hardware para Huawei ESM-48150B1

[<< Volver al README principal](../README.md) | [Ir a Instalación >>](INSTALACION.md)

Para comunicarte con la batería Huawei ESM-48150B1 usando este proyecto, necesitarás un método para conectar tu PC al bus RS485 de la batería.

## 1. 🛒 Adaptadores USB/Seriales Compatibles

Necesitarás un **adaptador USB-a-RS485** compatible con Modbus RTU.

<div align="center">
  <h3>🔍 ADAPTADOR RECOMENDADO 🔍</h3>
  <a href="https://s.click.aliexpress.com/e/_olRVIXb" target="_blank">
    <img src="https://ae01.alicdn.com/kf/S91b6d16c642f496183774623f877ff00N.jpg" alt="Adaptador USB a RS485/RS232" width="300" style="border-radius: 10px; border: 2px solid #0066cc;"/>
  </a>
  <br>
  <a href="https://s.click.aliexpress.com/e/_olRVIXb" target="_blank">
    <strong>📌 COMPRAR ADAPTADOR USB a RS485 EN ALIEXPRESS 📌</strong>
  </a>
  <p><i>Este es un ejemplo del tipo de adaptador que funciona perfectamente con esta aplicación</i></p>
</div>

> **Instrucciones de conexión:** Conecta los terminales A+ y B- del adaptador a los pines correspondientes del puerto RS485 de la batería Huawei.

---

## 2. 🔧 Configuración Usada para Ingeniería Inversa (Ejemplo Avanzado)

En el desarrollo de este proyecto, se utilizó una configuración específica para capturar tráfico Modbus RTU con Wireshark, lo que implicó un **conversor RS485-Ethernet** y un **puerto COM virtual**. *Esta configuración no es estrictamente necesaria para usar la aplicación, pero se documenta como referencia.*

### a) Adaptador RS485-Ethernet (USR-TCP232-304)

* **Propósito:** Convertir la señal RS485 de la batería a paquetes TCP/IP para análisis en red.

<div align="center">
  <h3>🔍 CONVERSOR RS485-ETHERNET RECOMENDADO 🔍</h3>
  <a href="https://s.click.aliexpress.com/e/_olRVIXb" target="_blank">
    <img src="https://ae01.alicdn.com/kf/HTB198uGE29TBuNjy0Fcq6zeiFXaL.jpg" alt="Adaptador de ethernet a RS485" width="300" style="border-radius: 10px; border: 2px solid #0066cc;"/>
  </a>
  <br>
  <a href="https://s.click.aliexpress.com/e/_olRVIXb" target="_blank">
    <strong>📌 COMPRAR CONVERSOR RS485-ETHERNET EN ALIEXPRESS 📌</strong>
  </a>
  <p><i>Este tipo de dispositivo permite acceder a dispositivos seriales a través de una red Ethernet</i></p>
</div>

* **Configuración Ejemplo:**
  * **Modo:** TCP Server (o similar)
  * **Dirección IP:** Asignada en la red local
  * **Puerto:** Puerto TCP para la conexión (ej. 502)
  * **Parámetros Seriales:** 
    * **Baudrate:** 9600 baud
    * **Bits de datos:** 8
    * **Paridad:** Ninguna
    * **Bits de parada:** 1 (configuración 8N1)
    
> ⚠️ **IMPORTANTE:** ¡Estos parámetros deben coincidir con la configuración de la batería!

<div align="center">
  <img src="../static/images/usr_config_1.jpg" alt="Configuración Web Conversor Ethernet-RS485" style="width: 80%; max-width: 500px; border: 2px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
  <p><i>Ejemplo: Interfaz web de configuración (Baudrate: 9600, 8N1)</i></p>
</div>

### b) Virtualización de Puerto COM (Software VCOM)

* **Propósito:** Mapear el puerto COM virtual (ej. `COM8`) en Windows a la dirección IP y puerto del conversor RS485-Ethernet. Esto permite que `pymodbus` (y otras aplicaciones seriales) se comuniquen con el dispositivo Ethernet como si fuera un puerto serie local.

* **Verificación:**
  * El puerto COM virtual debe aparecer en el Administrador de Dispositivos de Windows
  * La aplicación (como este proyecto Flask) puede conectarse usando el nombre del puerto virtual (ej. `COM8`)

<div align="center" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin: 20px 0;">
  <div style="flex: 1; min-width: 300px; max-width: 450px;">
    <img src="../static/images/vcom_config_2.jpg" alt="Configuración VCOM" style="width: 100%; border: 2px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
    <p><i>Aplicativo VCOM mapeando COM8 a IP:Puerto del conversor</i></p>
  </div>
  <div style="flex: 1; min-width: 300px; max-width: 450px;">
    <img src="../static/images/adm_dispo_1.jpg" alt="Administrador de Dispositivos" style="width: 100%; border: 2px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
    <p><i>COM8 visible en el Administrador de Dispositivos</i></p>
  </div>
</div>

---

## 3. 📊 Arquitectura de Comunicación

### Configuración Avanzada (Enfoque Híbrido)

La configuración de ingeniería inversa demuestra un flujo Modbus RTU sobre Ethernet:

* **Capa física:** Modbus RTU sobre RS485 (Batería <-> Conversor)
* **Transporte:** Modbus TCP (Conversor <-> PC/Red)
* **Virtualización:** Puerto COM virtual (Software VCOM en PC)
* **Aplicación:** `pymodbus` interactuando con el puerto COM virtual

**Flujo completo:**

```
[Aplicación Flask] ←→ (COM8 Virtual) ←→ [Software VCOM] ←→ (TCP/IP) ←→ [Conversor ETH-RS485] ←→ (RS485) ←→ [Batería Huawei]
```

### Configuración Simple (Recomendada)

**Para uso normal con un adaptador USB-a-RS485 directo, el flujo es más simple:**

```
[Aplicación Flask] ←→ (Puerto COM Físico/USB) ←→ [Adaptador USB-RS485] ←→ (RS485) ←→ [Batería Huawei]
```

<div align="center">
  <h3>📢 ¿NECESITAS AYUDA CON LA CONFIGURACIÓN? 📢</h3>
  <p>Si tienes problemas para configurar la conexión hardware, consulta la <a href="SOLUCION_PROBLEMAS.md">guía de solución de problemas</a> o abre un issue en el repositorio.</p>
</div>

---

[<< Volver al README principal](../README.md) | [Ir a Instalación >>](INSTALACION.md)
