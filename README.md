# ModbusReader_SR

Este proyecto implementa un puente (gateway) Modbus RTU a MQTT utilizando un microcontrolador ESP32 y conexión Ethernet. Lee registros de dispositivos esclavos Modbus conectados a través de RS485 y publica los datos obtenidos en un broker MQTT. La configuración completa del dispositivo, incluyendo la red, MQTT y los parámetros Modbus, se gestiona a través de un archivo `settings.json` almacenado en el sistema de archivos del ESP32.

## Características Principales

*   Maestro Modbus RTU sobre puerto serie.
*   Conectividad de red vía Ethernet (DHCP o IP estática).
*   Cliente MQTT para publicar datos y recibir comandos.
*   Configuración flexible mediante archivo JSON (`settings.json`).
*   Soporte para múltiples esclavos Modbus y múltiples bloques de registros por esclavo.
*   Polling configurable por esclavo.

## Documentación Detallada

Toda la información necesaria para configurar, instalar y utilizar este proyecto se encuentra en la carpeta `docs/`:

*   **[🚀 Instalación y Puesta en Marcha](docs/INSTALLATION.md)**: *(Archivo pendiente)* Pasos para configurar tu entorno, compilar y cargar el firmware en el ESP32.
*   **[⚙️ Configuración (settings.json)](docs/CONFIGURATION.md)**: Explicación detallada de cada parámetro en el archivo `settings.json`.
*   **[🔌 Hardware Requerido y Conexiones](docs/HARDWARE.md)**: Lista de componentes necesarios, recomendaciones y guía básica de conexiones.
*   **[📊 Funcionamiento, MQTT y Comandos](docs/USAGE.md)**: Cómo opera el dispositivo, la estructura de topics MQTT utilizada y los posibles comandos remotos.
*   **[📚 Librerías Utilizadas](docs/LIBRARIES.md)**: Lista de las dependencias de software del proyecto.
*   **[📄 Licencia](LICENSE)**: *(Archivo pendiente)* Información sobre los permisos de uso y distribución.

---

*Si tienes problemas o sugerencias, por favor [abre un Issue](https://github.com/nestorcal/ModbusReader_SR/issues) en el repositorio.*
