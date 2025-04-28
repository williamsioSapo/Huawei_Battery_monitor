# 🔎 Configuración y Escaneo de Dispositivos

[<< Volver al README principal](../README.md) | [Ir a Guía de Uso >>](USO.md)

El sistema incluye herramientas para configurar la comunicación y descubrir dispositivos Modbus en la red, especialmente diseñadas para identificar baterías Huawei ESM-48150B1.

## Archivo de Configuración

El sistema utiliza un archivo `config.json` en la raíz del proyecto para almacenar todos los parámetros de configuración y mantener información sobre los dispositivos descubiertos.

```json
{
  "serial": {
    "port": "COM8",
    "baudrate": 9600,
    "parity": "N",
    "stopbits": 1,
    "bytesize": 8,
    "timeout": 1.0
  },
  "scanning": {
    "start_id": 214,
    "end_id": 231,
    "max_attempts": 3,
    "progressive_wait": true,
    "scan_timeout": 0.5
  },
  "application": {
    "auto_connect": true,
    "last_connected_id": 214,
    "discovered_devices": [
      // Aquí se almacenan los dispositivos encontrados...
    ]
  },
  "device_types": {
    "huawei_battery": {
      // Definición de parámetros específicos del tipo de dispositivo...
    }
  }
}
```

### Estructura de config.json

| Sección | Descripción |
|---------|-------------|
| `serial` | Configuración del puerto serie (puerto COM, baudrate, paridad, etc.) |
| `scanning` | Parámetros para el escaneo de dispositivos (rango de IDs, intentos, etc.) |
| `application` | Configuración de la aplicación y lista de dispositivos descubiertos |
| `device_types` | Definición de tipos de dispositivos y sus características |

## Herramienta de Escaneo

El script `scan_modbus_devices.py` permite descubrir automáticamente dispositivos Modbus RTU en el bus, identificando especialmente baterías Huawei.

<div align="center">
  <img src="../static/images/scan_example.png" alt="Ejemplo de escaneo" style="width: 80%; max-width: 600px; border: 2px solid #ddd; border-radius: 8px;">
  <p><i>Ejemplo: Resultado de escaneo con dispositivos encontrados</i></p>
</div>

> ⚠️ **Nota**: Si la imagen anterior no aparece, debes capturar una pantalla del proceso de escaneo y guardarla como `static/images/scan_example.png`

### Características del Escáner

- **Escaneo inteligente**: Busca dispositivos en un rango de IDs configurable
- **Identificación automática**: Detecta baterías Huawei basándose en patrones de respuesta
- **Reintentos adaptativos**: Implementa reintentos con espera progresiva para dispositivos lentos
- **Registro completo**: Captura datos clave como voltaje, corriente, SOC y SOH
- **Actualización de configuración**: Guarda automáticamente los dispositivos encontrados

### Uso del Escáner

```bash
# Ejecutar escaneo de dispositivos
python scan_modbus_devices.py
```

Durante el escaneo:
1. Se conectará al puerto configurado en `config.json`
2. Buscará dispositivos en el rango de IDs especificado
3. Identificará automáticamente los dispositivos encontrados
4. Actualizará el archivo `config.json` con la información obtenida

> ⚠️ **ATENCIÓN**: El escaneo reemplazará la lista actual de dispositivos descubiertos en la configuración.

### Parámetros de Escaneo

El comportamiento del escáner se puede personalizar modificando los siguientes parámetros en la sección `scanning` del archivo `config.json`:

| Parámetro | Descripción |
|-----------|-------------|
| `start_id` | ID inicial para el rango de escaneo (por defecto: 214) |
| `end_id` | ID final para el rango de escaneo (por defecto: 231) |
| `max_attempts` | Número máximo de intentos por dispositivo (por defecto: 3) |
| `progressive_wait` | Si es `true`, aumenta el tiempo de espera progresivamente entre intentos |
| `scan_timeout` | Tiempo de espera (en segundos) para cada intento de escaneo (por defecto: 0.5) |

### Salida del Escaneo

Para cada dispositivo encontrado, se registra:

- **ID**: Identificador Modbus del dispositivo
- **Tipo**: "huawei_battery" o "unknown_device"
- **Voltaje**: Valor del voltaje de la batería (V)
- **Corriente**: Valor de la corriente (A)
- **Estado de Carga (SOC)**: Porcentaje de carga
- **Estado de Salud (SOH)**: Indicador de salud de la batería

## Estructura de Datos de Dispositivos

Cada dispositivo descubierto se guarda con la siguiente estructura en el archivo `config.json`:

```json
{
  "id": 214,
  "register_0": 5222,
  "discovery_date": "2025-04-27T11:17:05",
  "last_seen": "2025-04-27T11:17:05",
  "custom_name": "Batería Huawei 214",
  "registers": {
    "battery_voltage": 52.22,
    "pack_voltage": 51.92,
    "current": 11.23,
    "soc": 12,
    "soh": 94
  },
  "raw_values": [5222, 5192, 1123, 12, 94],
  "type": "huawei_battery"
}
```

### Campos de datos de dispositivo

| Campo | Descripción |
|-------|-------------|
| `id` | ID del esclavo Modbus |
| `register_0` | Valor crudo del primer registro (útil para identificación) |
| `discovery_date` | Fecha y hora del primer descubrimiento |
| `last_seen` | Última vez que se vio el dispositivo |
| `custom_name` | Nombre personalizable para el dispositivo |
| `registers` | Valores procesados de los registros principales |
| `raw_values` | Valores crudos de los registros (para depuración) |
| `type` | Tipo de dispositivo identificado |

## Identificación de Baterías Huawei

El sistema identifica automáticamente las baterías Huawei ESM-48150B1 basándose en:

1. **Patrones de voltaje**: Valores típicos entre 30V y 60V
2. **Estructura de registros**: Disposición específica de los registros de datos
3. **Respuesta a comandos**: Comportamiento ante solicitudes de lectura

Las baterías correctamente identificadas se etiquetan como `huawei_battery` en la configuración, mientras que otros dispositivos se marcan como `unknown_device`.

## Uso Programático

El módulo puede ser importado y utilizado en código Python personalizado:

```python
from modbus_app.client import connect_client, disconnect_client, get_client
import json

# Cargar configuración
with open('config.json', 'r') as f:
    config = json.load(f)

# Conectar al cliente
serial_config = config["serial"]
connect_client(serial_config["port"], serial_config["baudrate"])

# Obtener cliente para operaciones personalizadas
client = get_client()

# Realizar operaciones...

# Desconectar al finalizar
disconnect_client()
```

### Ejemplo: Escaneo programático de un dispositivo específico

```python
from modbus_app.client import connect_client, disconnect_client, get_client
from datetime import datetime

# Conectar al puerto serial
connect_client("COM8", 9600)
client = get_client()

# Obtener información básica de la batería (ID 217)
slave_id = 217
result = client.read_holding_registers(address=0, count=5, slave=slave_id)

if not result.isError() and hasattr(result, 'registers'):
    voltage = result.registers[0] * 0.01
    current = result.registers[2] * 0.01
    soc = result.registers[3]
    soh = result.registers[4]
    
    print(f"Batería ID {slave_id}:")
    print(f"  Voltaje: {voltage:.2f} V")
    print(f"  Corriente: {current:.2f} A")
    print(f"  SOC: {soc} %")
    print(f"  SOH: {soh} %")

# Desconectar al finalizar
disconnect_client()
```

## Solución de Problemas

Si experimentas dificultades con el escaneo:

- **Verificar conexión física**: Asegúrate de que el adaptador USB-RS485 esté correctamente conectado
- **Comprobar configuración serial**: Confirma que baudrate, paridad y bits coincidan con la batería
- **Ajustar timeout**: Para redes lentas, aumenta `scan_timeout` en `config.json`
- **Revisar rango de IDs**: Verifica que el rango incluya el ID de tus dispositivos (típicamente 217 para baterías Huawei)
- **Aumentar intentos**: Para dispositivos que tardan en "despertar", aumenta `max_attempts`

### Problemas comunes:

1. **No se encuentra ningún dispositivo**:
   - Verifica las conexiones físicas
   - Confirma que los parámetros seriales (`baudrate`, `parity`, etc.) coincidan con la configuración de la batería
   - Prueba diferentes rangos de ID (las baterías Huawei típicamente usan ID 217)

2. **Dispositivo identificado como "unknown_device"**:
   - La batería puede estar en modo de suspensión profunda
   - Los valores leídos pueden estar fuera de rangos esperados
   - Intenta realizar una operación de "despertar" antes del escaneo

3. **Error de timeout durante el escaneo**:
   - Aumenta el valor de `scan_timeout` en la configuración
   - Habilita `progressive_wait` para dar más tiempo en reintentos
   - Aumenta `max_attempts` para dispositivos de respuesta lenta

Para un análisis más detallado de problemas de comunicación, consulta la sección [Solución de Problemas](SOLUCION_PROBLEMAS.md).

---

[<< Volver al README principal](../README.md) | [Ir a Guía de Uso >>](USO.md)