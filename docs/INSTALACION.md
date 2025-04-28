# Configuración e Instalación

[<- Volver al README principal](../README.md)

Esta guía te ayudará a configurar tu entorno e instalar las dependencias necesarias para ejecutar la aplicación Modbus Web UI.

## Requisitos Previos

*   **Python 3.12.5:** Descargar desde [python.org](https://www.python.org/downloads/release/python-3125/). Asegúrate de añadir Python al PATH durante la instalación.
*   **Git:** Para clonar el repositorio.
*   **Puerto Serie:** Un puerto COM disponible (físico, USB-a-Serie, o virtual a través de convertidor Serie-a-Ethernet) conectado al dispositivo Modbus RTU (Batería Huawei). Consulta la [Guía de Configuración de Hardware](CONFIGURACION_HARDWARE.md).
*   **Sistema Operativo:** Desarrollado principalmente en Windows. Linux/macOS podrían requerir ajustes en la gestión del puerto serie (nombres como `/dev/ttyUSB0` o `/dev/tty.usbserial-XXXX`) y activación del entorno virtual.

## Pasos de Instalación

1.  **Clonar el Repositorio:**
    ```bash
    git clone https://github.com/nestorcal/ModbusReader_SR
    cd ModbusReader_SR # O el nombre de tu directorio
    ```

2.  **Crear Archivo `requirements.txt`:**
    Crea un archivo llamado `requirements.txt` en la raíz del proyecto con el siguiente contenido (ajusta las versiones si es necesario, especialmente `pymodbus`):
    ```txt
    Flask>=2.0
    pymodbus==3.6.7 # Versión específica usada/testeada
    pyserial>=3.5   # Requerido por pymodbus serial
    ```
    *Nota: La versión 3.6.7 de pymodbus fue usada durante el desarrollo y análisis. Otras versiones podrían requerir ajustes en `client.py`.*

3.  **Crear y Activar Entorno Virtual:**
    *   **Windows (cmd/powershell):**
        ```bash
        python -m venv env
        .\env\Scripts\activate
        ```
    *   **Linux/macOS (bash/zsh):**
        ```bash
        python3 -m venv env
        source env/bin/activate
        ```

4.  **Instalar Dependencias:**
    Dentro del entorno virtual activado:
    ```bash
    pip install -r requirements.txt
    ```

5.  **Configurar Puerto Serie por Defecto (Opcional):**
    *   Identifica el puerto COM correcto para tu dispositivo Modbus.
    *   Puedes modificar el valor por defecto del puerto en `app.py` (en la función `connect_api`) o, preferiblemente, considera usar variables de entorno o un archivo de configuración para gestionarlo. El valor por defecto se puede sobrescribir desde la interfaz web al conectar.
    ```python
    # Dentro de app.py, función connect_api
    port = data.get('port', 'COM1') # <-- CAMBIA 'COM1' si quieres otro por defecto
    ```

6.  **Ejecutar la Aplicación:**
    Desde la raíz del proyecto y con el entorno virtual activado:
    ```bash
    python app.py
    ```
    *   Flask iniciará un servidor de desarrollo (usualmente en `http://127.0.0.1:5000` o `http://0.0.0.0:5000`). La salida en la consola indicará la dirección exacta.

[<- Volver al README principal](../README.md)