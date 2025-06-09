# modbus_app/operations.py
import time
from .huawei_client import get_huawei_client, HuaweiModbusClient
from modbus_app.device_info.device_cache import get_device_info
import logging

logger = logging.getLogger('operations')


def get_client():
    """Devuelve la instancia actual del cliente Huawei desde BatteryInitializer."""
    try:
        from .battery_initializer import BatteryInitializer
        initializer = BatteryInitializer.get_instance()
        return initializer._huawei_client if initializer else None
    except:
        return None

def set_client(client):
    """Ya no es necesaria - el cliente se maneja automáticamente por BatteryInitializer."""
    pass  # Función vacía para compatibilidad

def is_client_connected():
    """Verifica si el cliente Huawei está conectado."""
    try:
        from .battery_initializer import BatteryInitializer
        initializer = BatteryInitializer.get_instance()
        if initializer and initializer._huawei_client:
            return initializer._huawei_client.is_socket_open()
        return False
    except:
        return False
        
def disconnect_client():
    try:
        from modbus_app.battery_initializer import BatteryInitializer
        initializer = BatteryInitializer.get_instance()
        return initializer.disconnect() if initializer else False
    except:
        return False
        
def set_client(client):
    """Ya no es necesaria - el cliente se maneja automáticamente por BatteryInitializer."""  # ← 4 espacios
    pass  # Función vacía para compatibilidad  # ← 4 espacios

def execute_read_operation(slave_id, function, address, count):
    """Ejecuta una operación de lectura Modbus estándar usando HuaweiModbusClient."""
    if not is_client_connected():
        return {"status": "error", "message": "No hay conexión activa"}

    client = get_client()
    result = None
    response_data = None

    try:
        # Ejecutar función según el tipo
        if function == 'holding':
            result = client.read_holding_registers(address=address, count=count, slave=slave_id)
        elif function == 'input':
            result = client.read_input_registers(address=address, count=count, slave=slave_id)
        elif function == 'coil':
            result = client.read_coils(address=address, count=count, slave=slave_id)
        elif function == 'discrete':
            result = client.read_discrete_inputs(address=address, count=count, slave=slave_id)
        else:
            return {"status": "error", "message": f"Función de lectura '{function}' no soportada"}

        # Procesar resultado del HuaweiModbusClient
        if result.isError():
            return {"status": "error", "message": f"Error Modbus: {result.error}"}

        # Extraer datos según el tipo
        if hasattr(result, 'registers') and result.registers:
            response_data = result.registers
        elif hasattr(result, 'bits') and result.bits:
            response_data = result.bits[:count]  # Asegurar el conteo correcto
        else:
            return {"status": "error", "message": "Respuesta inesperada del dispositivo"}

        return {"status": "success", "data": response_data}

    except Exception as e:
        logger.error(f"Excepción durante lectura {function}: {str(e)}")
        return {"status": "error", "message": f"Excepción general durante lectura {function}: {str(e)}"}

def execute_write_operation(slave_id, function, address, values):
    """Ejecuta una operación de escritura Modbus estándar usando HuaweiModbusClient."""
    if not is_client_connected():
        return {"status": "error", "message": "No hay conexión activa"}

    client = get_client()
    result = None

    # Validar y preparar valores
    if not isinstance(values, list):
        if isinstance(values, (int, bool, float, str)):
            values = [values]
        else:
            return {"status": "error", "message": "'values' debe ser una lista o valor único"}
    if len(values) == 0:
        return {"status": "error", "message": "No hay valores para escribir"}

    try:
        if function == 'holding':
            int_values = [int(v) for v in values]
            if len(int_values) == 1:
                result = client.write_register(address, int_values[0], slave=slave_id)
            else:
                result = client.write_registers(address, int_values, slave=slave_id)
        elif function == 'coil':
            bool_values = [str(v).lower() in ('true', '1', 'yes') for v in values]
            if len(bool_values) == 1:
                result = client.write_coil(address, bool_values[0], slave=slave_id)
            else:
                result = client.write_coils(address, bool_values, slave=slave_id)
        else:
            return {"status": "error", "message": f"Función de escritura '{function}' no soportada"}

        # Procesar resultado del HuaweiModbusClient
        if result.isError():
            return {"status": "error", "message": f"Error Modbus en escritura: {result.error}"}

        return {"status": "success", "message": "Escritura realizada correctamente"}

    except Exception as e:
        logger.error(f"Excepción durante escritura {function}: {str(e)}")
        return {"status": "error", "message": f"Excepción general durante escritura {function}: {str(e)}"}

def execute_read_device_info(slave_id, info_index):
    """
    Ejecuta la operación personalizada FC41 para leer info del dispositivo usando HuaweiModbusClient.
    
    Args:
        slave_id (int): ID del esclavo
        info_index (int): Índice de la información (0-5)
        
    Returns:
        dict: Resultado de la operación
    """
    if not is_client_connected():
        return {"status": "error", "message": "No hay conexión activa"}

    try:
        # Obtener información desde el caché global
        device_data = get_device_info(slave_id)
        
        if device_data["status"] != "success":
            return {
                "status": "error", 
                "message": device_data.get("message", "Información no disponible")
            }
        
        # Obtener el texto combinado
        combined_text = device_data.get("combined_text", "")
        if not combined_text:
            return {
                "status": "error",
                "message": "Información del dispositivo no disponible en caché"
            }
        
        # Para mantener compatibilidad, dividimos el texto combinado en partes
        lines = combined_text.split('\n')
        section_size = max(1, len(lines) // 6)  # Aproximadamente 6 secciones
        
        start_idx = info_index * section_size
        end_idx = min(start_idx + section_size, len(lines))
        
        if start_idx >= len(lines):
            return {
                "status": "error",
                "message": f"Índice {info_index} fuera de rango"
            }
        
        # Extraer la sección solicitada
        section_text = '\n'.join(lines[start_idx:end_idx])
        
        return {
            "status": "success",
            "index": info_index,
            "ascii_data": section_text,
            "raw_bytes": list(section_text.encode('utf-8', errors='ignore')),
            "cached": True
        }
    except Exception as e:
        logger.error(f"Error al obtener información: {str(e)}")
        return {
            "status": "error",
            "message": f"Error al obtener información: {str(e)}"
        }
def verify_battery_cell_data(slave_id=217):
    """
    Función para verificar los datos de celdas individuales de la batería usando HuaweiModbusClient.
    Lee los registros de voltajes y temperaturas de celdas y devuelve
    un resultado formateado para análisis.
    
    Args:
        slave_id (int): ID del esclavo Modbus (por defecto 217)
        
    Returns:
        dict: Resultados con estado y datos de celdas si están disponibles
    """
    if not is_client_connected():
        return {"status": "error", "message": "No hay conexión activa"}
    
    print("Iniciando verificación de datos de celdas individuales...")
    
    # Constantes para direcciones de registros (basadas en código C#)
    CELL_VOLTAGES_START = 0x22  # 34 decimal
    CELL_TEMPS_START = 0x12     # 18 decimal
    NUM_CELLS = 15
    
    client = get_client()
    
    # Paso 1: Leer voltajes de celdas individuales
    print(f"Leyendo voltajes de celdas (registros {CELL_VOLTAGES_START}-{CELL_VOLTAGES_START+NUM_CELLS-1})...")
    voltage_result = execute_read_operation(
        slave_id=slave_id,
        function='holding',
        address=CELL_VOLTAGES_START,
        count=NUM_CELLS
    )
    
    # Paso 2: Leer temperaturas de celdas individuales
    print(f"Leyendo temperaturas de celdas (registros {CELL_TEMPS_START}-{CELL_TEMPS_START+NUM_CELLS-1})...")
    temp_result = execute_read_operation(
        slave_id=slave_id,
        function='holding',
        address=CELL_TEMPS_START,
        count=NUM_CELLS
    )

    # Leer voltajes extendidos (posibles celdas 12-22)
    print(f"Leyendo voltajes de celdas extendidos (registros 0x32-0x3D)...")
    extended_voltage_result = execute_read_operation(
        slave_id=slave_id,
        function='holding',
        address=0x32,  # 50 decimal
        count=12       # Hasta 12 celdas adicionales
    )
    
    # Leer temperaturas extendidas (posibles celdas 12-22)
    print(f"Leyendo temperaturas de celdas extendidas (registros 0x22-0x2D)...")
    extended_temp_result = execute_read_operation(
        slave_id=slave_id,
        function='holding',
        address=0x22,  # 34 decimal
        count=12       # Hasta 12 celdas adicionales
    )
    
    # Verificar resultados y procesar datos
    result = {
        "status": "error",
        "message": "Error al leer datos de celdas",
        "cell_voltages_raw": None,
        "cell_temps_raw": None,
        "cell_data": None
    }
    
    # Procesar voltajes
    if voltage_result.get("status") == "success" and voltage_result.get("data"):
        result["status"] = "partial"
        result["cell_voltages_raw"] = voltage_result["data"]
        
        # Convertir valores usando factor 0.001V (según código C#)
        voltages = [round(value * 0.001, 3) for value in voltage_result["data"]]
        min_v = min(voltages)
        max_v = max(voltages)
        avg_v = round(sum(voltages) / len(voltages), 3)
        
        print("Voltajes de celdas procesados correctamente:")
        print(f"  Valores brutos: {voltage_result['data']}")
        print(f"  Voltajes (V): {voltages}")
        print(f"  Mínimo: {min_v}V, Máximo: {max_v}V, Promedio: {avg_v}V, Diferencia: {round(max_v - min_v, 3)}V")
    else:
        print(f"Error al leer voltajes: {voltage_result.get('message', 'Error desconocido')}")
    
    # Procesar temperaturas
    if temp_result.get("status") == "success" and temp_result.get("data"):
        result["status"] = "partial" if result["status"] == "error" else "success"
        result["cell_temps_raw"] = temp_result["data"]
        
        # Las temperaturas parecen ser valores directos en °C (según código C#)
        temperatures = temp_result["data"]
        min_t = min(temperatures)
        max_t = max(temperatures)
        avg_t = round(sum(temperatures) / len(temperatures), 1)
        
        print("Temperaturas de celdas procesadas correctamente:")
        print(f"  Valores brutos: {temperatures}")
        print(f"  Mínima: {min_t}°C, Máxima: {max_t}°C, Promedio: {avg_t}°C, Diferencia: {max_t - min_t}°C")
    else:
        print(f"Error al leer temperaturas: {temp_result.get('message', 'Error desconocido')}")
    
    # Si tenemos ambos conjuntos de datos, crear estructura completa
    if (result["status"] == "success" or result["status"] == "partial") and \
       result["cell_voltages_raw"] and result["cell_temps_raw"]:
        
        # Combinar datos en una estructura clara para análisis
        cell_data = []
        for i in range(NUM_CELLS):
            voltage = round(result["cell_voltages_raw"][i] * 0.001, 3) if i < len(result["cell_voltages_raw"]) else None
            temp = result["cell_temps_raw"][i] if i < len(result["cell_temps_raw"]) else None
            
            cell_data.append({
                "cell_number": i + 1,
                "voltage": voltage,
                "temperature": temp
            })
        
        result["cell_data"] = cell_data
        
        # Mostrar datos tabulados para mejor visualización
        print("\nResumen de datos de celdas:")
        print("-" * 40)
        print("| Celda | Voltaje (V) | Temperatura (°C) |")
        print("-" * 40)
        
        for cell in cell_data:
            print(f"| {cell['cell_number']:^5} | {cell['voltage']:^11.3f} | {cell['temperature']:^16} |")
        
        print("-" * 40)
    
    return result
# Mapa de registros Huawei revisado (mantenido igual para compatibilidad)
HUAWEI_REGISTER_MAP_REVISED = {
    # === REGISTROS BÁSICOS CONFIRMADOS ===
    0x0000: {"name": "Voltaje de Batería", "factor": 0.01, "unit": "V", "json_field": "battery_voltage", "certainty": "CONFIRMADO"},
    0x0001: {"name": "Voltaje del Pack", "factor": 0.01, "unit": "V", "json_field": "pack_voltage", "certainty": "CONFIRMADO"},
    0x0002: {"name": "Corriente de Batería", "factor": 0.01, "unit": "A", "signed": True, "json_field": "battery_current", "certainty": "CONFIRMADO"},
    0x0003: {"name": "Estado de Carga (SOC)", "factor": 1, "unit": "%", "json_field": "battery_soc", "certainty": "CONFIRMADO"},
    0x0004: {"name": "Estado de Salud (SOH)", "factor": 1, "unit": "%", "json_field": "battery_soh", "certainty": "CONFIRMADO"},
    0x0005: {"name": "Temperatura Máxima Celda", "factor": 1, "unit": "°C", "json_field": "highest_cell_temp", "certainty": "CONFIRMADO"},
    0x0006: {"name": "Temperatura Mínima Celda", "factor": 1, "unit": "°C", "json_field": "lowest_cell_temp", "certainty": "CONFIRMADO"},

    # === SISTEMA DE IDENTIFICACIÓN ===
    0x0101: {"name": "Versión de Software", "factor": 1, "unit": "-", "json_field": "software_version", "decode_sw_version": True, "certainty": "CONFIRMADO"},
    0x010F: {"name": "Número de Celdas", "factor": 1, "unit": "celdas", "json_field": "cell_count", "certainty": "CONFIRMADO"},

    # === SISTEMA DE DIAGNÓSTICO Y ALARMAS ===
    0x000A: {
        "name": "Estado General (Bits de Control)", 
        "factor": 1, 
        "unit": "-", 
        "json_field": "general_status_bits",
        "certainty": "PROBABLE",
        "notes": "Valor constante 0x0003 observado, posible máscara de bits de estado base"
    },
    
    0x0046: {
        "name": "Indicador de Fallas Hardware", 
        "factor": 1, 
        "unit": "-", 
        "json_field": "hardware_fault_indicator",
        "certainty": "PROBABLE",
        "notes": "0x0000=OK, 0x0006=Sensores desconectados. NO refleja alarmas de estado (SOC/SOH)",
        "bit_interpretation": {
            0x0000: "Hardware funcionando correctamente",
            0x0006: "Múltiples sensores desconectados (análisis pendiente de bits específicos)"
        }
    },
    
    0x0047: {
        "name": "Reservado/Estado Auxiliar 1", 
        "factor": 1, 
        "unit": "-", 
        "json_field": "auxiliary_status_1",
        "certainty": "DESCONOCIDO",
        "notes": "Siempre 0x0000 en todos los casos observados. Función por determinar"
    },
    
    0x0048: {
        "name": "Estado de Sensores Principales", 
        "factor": 1, 
        "unit": "-", 
        "json_field": "main_sensors_status",
        "certainty": "PROBABLE",
        "notes": "0x0000=Sensores OK, 0x2000=Sensores críticos desconectados",
        "bit_interpretation": {
            0x0000: "Sensores principales funcionando",
            0x2000: "Bit 13 activo - posible falla de sensores críticos"
        }
    },
    
    0x0049: {
        "name": "Modo de Operación Batería", 
        "factor": 1, 
        "unit": "-", 
        "json_field": "operation_mode",
        "certainty": "CONFIRMADO",
        "notes": "Indicador confiable del estado operativo de la batería",
        "bit_interpretation": {
            0x0000: "Modo desconocido/error",
            0x0080: "Modo standby/flotación (bit 7)",
            0x0800: "Modo descarga activa (bit 11)"
        }
    },
    
    0x004A: {
        "name": "Estado de Subsistemas", 
        "factor": 1, 
        "unit": "-", 
        "json_field": "subsystem_status",
        "certainty": "EXPERIMENTAL",
        "notes": "0x0000=OK, 0x0004=Posible falla en subsistema (bit 2)",
        "bit_interpretation": {
            0x0000: "Subsistemas funcionando correctamente",
            0x0004: "Bit 2 activo - función por determinar"
        }
    },

    # === ESTADÍSTICAS Y CONTADORES ===
    0x0042: {"name": "Tiempos de Descarga", "factor": 1, "unit": "veces", "is_32bit": True, "json_field": "discharge_times", "certainty": "CONFIRMADO"},
    0x0044: {"name": "Descarga AH Acumulada", "factor": 1, "unit": "AH", "is_32bit": True, "json_field": "discharge_ah", "certainty": "CONFIRMADO"},
    0x7D6B: {"name": "Ciclos Acumulados", "factor": 1, "unit": "ciclos", "is_32bit": True, "json_field": "accumulated_cycle_times", "certainty": "CONFIRMADO"},

    # === LÍMITES DE OPERACIÓN ===
    0x100B: {"name": "Límite Corriente de Descarga", "factor": 0.001, "unit": "C", "json_field": "discharge_current_limit", "certainty": "CONFIRMADO"},
    0x100D: {"name": "Límite Corriente de Carga", "factor": 0.001, "unit": "C", "json_field": "charge_current_limit", "certainty": "CONFIRMADO"},

    # === REGISTROS EXPERIMENTALES/EN INVESTIGACIÓN ===
    0x0106: {"name": "Parámetro Sistema 0x0106", "factor": 1, "unit": "-", "experimental": True, "certainty": "DESCONOCIDO"},
    0x0107: {"name": "Parámetro Sistema 0x0107", "factor": 1, "unit": "-", "experimental": True, "certainty": "DESCONOCIDO"},
    0x0206: {"name": "Estado Detallado Sistema", "factor": 1, "unit": "-", "experimental": True, "certainty": "DESCONOCIDO"},
    0x0320: {"name": "Registro de Control 0x0320", "factor": 1, "unit": "-", "experimental": True, "certainty": "DESCONOCIDO"},
    0x100F: {"name": "Configuración 0x100F", "factor": 1, "unit": "-", "experimental": True, "certainty": "DESCONOCIDO"},
    0x1010: {"name": "Configuración 0x1010", "factor": 1, "unit": "-", "experimental": True, "certainty": "DESCONOCIDO"},
    0x101B: {"name": "Configuración 0x101B", "factor": 1, "unit": "-", "experimental": True, "certainty": "DESCONOCIDO"},
    0x1118: {"name": "Info Dispositivo 0x1118", "factor": 1, "unit": "-", "experimental": True, "certainty": "DESCONOCIDO"},
    0x1119: {"name": "Info Dispositivo 0x1119", "factor": 1, "unit": "-", "experimental": True, "certainty": "DESCONOCIDO"},
}

# Definición de arrays de celdas - CONFIRMADOS
CELL_ARRAYS = {
    "cell_temperatures_block1": {
        "start_address": 0x0012,
        "count": 16,
        "factor": 1,
        "unit": "°C",
        "description": "Temperaturas Celdas 1-16",
        "certainty": "CONFIRMADO",
        "special_values": {
            0x7FFF: "Sensor desconectado",
            0xFC19: "Sensor fuera de rango"
        }
    },
    "cell_voltages_block1": {
        "start_address": 0x0022,
        "count": 16,
        "factor": 0.001,
        "unit": "V",
        "description": "Voltajes Celdas 1-16",
        "certainty": "CONFIRMADO",
        "special_values": {
            0xFFFF: "Sensor desconectado"
        }
    },
    "cell_temperatures_block2": {
        "start_address": 0x0300,
        "count": 8,
        "factor": 1,
        "unit": "°C",
        "description": "Temperaturas Celdas 17-24",
        "certainty": "EXPERIMENTAL"
    },
    "cell_voltages_block2": {
        "start_address": 0x0310,
        "count": 8,
        "factor": 0.001,
        "unit": "V",
        "description": "Voltajes Celdas 17-24",
        "certainty": "EXPERIMENTAL"
    }
}

# Definición de strings ASCII - CONFIRMADOS
ASCII_STRINGS = {
    "battery_bar_code": {
        "start_address": 0x010A,
        "length": 10,
        "description": "Código de Barras/Serial",
        "certainty": "CONFIRMADO"
    },
    "battery_model": {
        "start_address": 0x0332,
        "length": 12,
        "description": "Modelo de Batería",
        "certainty": "CONFIRMADO"
    }
}

# Excepciones conocidas por dispositivo (basado en observaciones reales)
DEVICE_SPECIFIC_EXCEPTIONS = {
    "214": [0x0347, 0x020B],  # Batería con sensores desconectados
    "215": [],                # Batería con SOC=0%
    "216": [],                # Batería descargando
    "217": [],                # Batería descargando
    "218": []                 # Estado normal
}

# === FUNCIONES DE UTILIDAD PARA INTERPRETACIÓN ===

def interpret_operation_mode(value):
    """Interpreta el modo de operación de la batería (0x0049)"""
    modes = {
        0x0000: {"mode": "Desconocido/Error", "status": "CRITICAL"},
        0x0080: {"mode": "Standby/Flotación", "status": "NORMAL"},
        0x0800: {"mode": "Descarga Activa", "status": "ACTIVE"}
    }
    return modes.get(value, {"mode": f"No documentado (0x{value:04X})", "status": "UNKNOWN"})

def interpret_hardware_faults(value):
    """Interpreta el indicador de fallas de hardware (0x0046)"""
    faults = {
        0x0000: {"description": "Hardware OK", "severity": "NORMAL"},
        0x0006: {"description": "Sensores desconectados", "severity": "CRITICAL"}
    }
    return faults.get(value, {"description": f"Falla no documentada (0x{value:04X})", "severity": "UNKNOWN"})

def interpret_sensor_status(value):
    """Interpreta el estado de sensores principales (0x0048)"""
    status = {
        0x0000: {"description": "Sensores funcionando", "status": "OK"},
        0x2000: {"description": "Sensores críticos desconectados", "status": "FAULT"}
    }
    return status.get(value, {"description": f"Estado no documentado (0x{value:04X})", "status": "UNKNOWN"})

def read_all_mapped_registers(slave_id):
    """
    Lee todos los registros mapeados con el nuevo formato estructurado usando HuaweiModbusClient.
    
    Args:
        slave_id (int): ID del esclavo Modbus
        
    Returns:
        dict: Resultado con datos organizados por categorías
    """
    print(f"Iniciando lectura completa para batería {slave_id}")
    
    result = {
        "status": "success",
        "battery_id": slave_id,
        "timestamp": time.time(),
        "summary": {
            "total_registers": 0,
            "successful_reads": 0,
            "failed_reads": 0,
            "skipped_exceptions": 0
        },
        "basic_registers": {},
        "cell_data": {},
        "ascii_strings": {},
        "experimental_registers": {},
        "errors": []
    }
    
    device_key = str(slave_id)
    known_exceptions = DEVICE_SPECIFIC_EXCEPTIONS.get(device_key, [])
    
    # 1. Leer registros básicos individuales
    print("Leyendo registros básicos...")
    for address, reg_info in sorted(HUAWEI_REGISTER_MAP_REVISED.items()):
        # Saltar registros con excepciones conocidas
        if address in known_exceptions:
            print(f"Saltando registro 0x{address:04X} - excepción conocida")
            result["summary"]["skipped_exceptions"] += 1
            continue
        
        try:
            register_result = _read_single_register(slave_id, address, reg_info)
            result["summary"]["total_registers"] += 1
            
            if register_result["success"]:
                result["summary"]["successful_reads"] += 1
                
                # Organizar por categoría
                key = f"0x{address:04X}"
                register_data = {
                    "name": reg_info["name"],
                    "raw_value": register_result["raw_value"],
                    "processed_value": register_result["processed_value"],
                    "unit": reg_info["unit"],
                    "json_field": reg_info.get("json_field"),
                    "address": address
                }
                
                if reg_info.get("is_32bit"):
                    register_data.update({
                        "msw": register_result["msw"],
                        "lsw": register_result["lsw"],
                        "is_32bit": True
                    })
                
                if reg_info.get("experimental", False):
                    result["experimental_registers"][key] = register_data
                else:
                    result["basic_registers"][key] = register_data
                    
            else:
                result["summary"]["failed_reads"] += 1
                result["errors"].append({
                    "address": f"0x{address:04X}",
                    "name": reg_info["name"],
                    "error": register_result["error"]
                })
                
        except Exception as e:
            print(f"Excepción al leer registro 0x{address:04X}: {str(e)}")
            result["summary"]["failed_reads"] += 1
            result["errors"].append({
                "address": f"0x{address:04X}",
                "error": f"Excepción: {str(e)}"
            })
        
        
    
    # 2. Leer arrays de celdas
    print("Leyendo arrays de celdas...")
    for array_name, array_info in CELL_ARRAYS.items():
        try:
            cell_array_result = _read_cell_array(slave_id, array_name, array_info)
            result["cell_data"][array_name] = cell_array_result
            result["summary"]["total_registers"] += array_info["count"]
            
            if cell_array_result["success"]:
                result["summary"]["successful_reads"] += cell_array_result["successful_count"]
                result["summary"]["failed_reads"] += cell_array_result["failed_count"]
            else:
                result["summary"]["failed_reads"] += array_info["count"]
                result["errors"].append({
                    "array": array_name,
                    "error": cell_array_result.get("error", "Error desconocido")
                })
                
        except Exception as e:
            print(f"Error al leer array {array_name}: {str(e)}")
            result["errors"].append({
                "array": array_name,
                "error": f"Excepción: {str(e)}"
            })
            result["summary"]["failed_reads"] += array_info["count"]
    
    # 3. Leer strings ASCII
    print("Leyendo strings ASCII...")
    for string_name, string_info in ASCII_STRINGS.items():
        try:
            string_result = _read_ascii_string(slave_id, string_name, string_info)
            result["ascii_strings"][string_name] = string_result
            result["summary"]["total_registers"] += string_info["length"]
            
            if string_result["success"]:
                result["summary"]["successful_reads"] += string_info["length"]
            else:
                result["summary"]["failed_reads"] += string_info["length"]
                result["errors"].append({
                    "string": string_name,
                    "error": string_result.get("error", "Error desconocido")
                })
                
        except Exception as e:
            print(f"Error al leer string {string_name}: {str(e)}")
            result["errors"].append({
                "string": string_name,
                "error": f"Excepción: {str(e)}"
            })
            result["summary"]["failed_reads"] += string_info["length"]
    
    # Determinar estado final
    total_failed = result["summary"]["failed_reads"]
    total_success = result["summary"]["successful_reads"]
    
    if total_failed == 0:
        result["status"] = "success"
        result["message"] = f"Todos los {total_success} registros leídos exitosamente"
    elif total_success > 0:
        result["status"] = "partial"
        result["message"] = f"{total_success} registros OK, {total_failed} errores"
    else:
        result["status"] = "error"
        result["message"] = f"No se pudo leer ningún registro. {total_failed} errores"
    
    print(f"Lectura finalizada: {result['message']}")
    return result

def _read_single_register(slave_id, address, reg_info):
    """Lee un registro individual con procesamiento según su tipo usando HuaweiModbusClient."""
    is_32bit = reg_info.get("is_32bit", False)
    
    try:
        if is_32bit:
            # Leer valor de 32 bits (MSW en address, LSW en address+1)
            result_msw = execute_read_operation(slave_id, 'holding', address, 1)
            result_lsw = execute_read_operation(slave_id, 'holding', address + 1, 1)
            
            if result_msw.get("status") == "success" and result_lsw.get("status") == "success":
                msw = result_msw["data"][0]
                lsw = result_lsw["data"][0]
                raw_value = (msw << 16) | lsw
                processed_value = raw_value * reg_info.get("factor", 1)
                
                return {
                    "success": True,
                    "raw_value": raw_value,
                    "processed_value": processed_value,
                    "msw": msw,
                    "lsw": lsw
                }
            else:
                return {
                    "success": False,
                    "error": f"Error leyendo 32-bit: MSW={result_msw.get('status')}, LSW={result_lsw.get('status')}"
                }
        else:
            # Leer registro normal
            result = execute_read_operation(slave_id, 'holding', address, 1)
            
            if result.get("status") == "success":
                raw_value = result["data"][0]
                
                # Procesar valor con signo si es necesario
                if reg_info.get("signed", False) and raw_value > 32767:
                    signed_value = raw_value - 65536
                    processed_value = signed_value * reg_info.get("factor", 1)
                else:
                    processed_value = raw_value * reg_info.get("factor", 1)
                
                # Decodificación especial para versión de software
                if reg_info.get("decode_sw_version", False):
                    processed_value = f"V{raw_value - 156}" if raw_value >= 156 else f"V{raw_value}"
                
                return {
                    "success": True,
                    "raw_value": raw_value,
                    "processed_value": processed_value
                }
            else:
                return {
                    "success": False,
                    "error": result.get("message", "Error desconocido")
                }
                
    except Exception as e:
        return {
            "success": False,
            "error": f"Excepción: {str(e)}"
        }

def _read_cell_array(slave_id, array_name, array_info):
    """Lee un array completo de celdas usando HuaweiModbusClient."""
    start_address = array_info["start_address"]
    count = array_info["count"]
    factor = array_info["factor"]
    
    try:
        # Leer todo el bloque
        result = execute_read_operation(slave_id, 'holding', start_address, count)
        
        if result.get("status") == "success":
            raw_registers = result["data"]
            cells = []
            successful_count = 0
            failed_count = 0
            
            for i, raw_value in enumerate(raw_registers):
                cell_number = i + 1
                if array_name.endswith("_block2"):
                    cell_number += 16
                
                # Detectar valores especiales según tipo
                if array_info["unit"] == "V" and raw_value == 0xFFFF:
                    status = "N/A"
                    processed_value = None
                    failed_count += 1
                elif array_info["unit"] == "°C" and raw_value == 0xFC19:  # 64537
                    status = "N/A" 
                    processed_value = None
                    failed_count += 1
                else:
                    status = "OK"
                    processed_value = raw_value * factor
                    successful_count += 1
                
                cells.append({
                    "cell_number": cell_number,
                    "raw_value": raw_value,
                    "processed_value": processed_value,
                    "status": status
                })
            
            return {
                "success": True,
                "description": array_info["description"],
                "start_address": f"0x{start_address:04X}",
                "count": count,
                "unit": array_info["unit"],
                "factor": factor,
                "cells": cells,
                "successful_count": successful_count,
                "failed_count": failed_count
            }
        else:
            return {
                "success": False,
                "error": result.get("message", "Error al leer array"),
                "description": array_info["description"]
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Excepción: {str(e)}",
            "description": array_info["description"]
        }

def _read_ascii_string(slave_id, string_name, string_info):
    """Lee y decodifica un string ASCII usando HuaweiModbusClient."""
    start_address = string_info["start_address"]
    length = string_info["length"]
    
    try:
        # Leer todos los registros
        result = execute_read_operation(slave_id, 'holding', start_address, length)
        
        if result.get("status") == "success":
            raw_data = result["data"]
            
            # Convertir registros a bytes (cada registro = 2 bytes, big endian)
            byte_data = bytearray()
            for register_value in raw_data:
                byte_data.extend([(register_value >> 8) & 0xFF, register_value & 0xFF])
            
            # Decodificar como ASCII
            try:
                ascii_string = byte_data.decode('ascii', errors='ignore')
                cleaned_string = ''.join(c for c in ascii_string if c.isprintable()).strip()
                
                return {
                    "success": True,
                    "description": string_info["description"],
                    "start_address": f"0x{start_address:04X}",
                    "length": length,
                    "ascii_string": cleaned_string,
                    "raw_registers": raw_data
                }
            except Exception as decode_error:
                return {
                    "success": False,
                    "error": f"Error decodificando ASCII: {str(decode_error)}",
                    "raw_registers": raw_data
                }
        else:
            return {
                "success": False,
                "error": result.get("message", "Error al leer string"),
                "description": string_info["description"]
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Excepción: {str(e)}",
            "description": string_info["description"]
        }