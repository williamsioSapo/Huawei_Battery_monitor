# modbus_app/operations.py
from .client import get_client, is_client_connected # Importar desde el mismo paquete
from .custom_requests import ReadDeviceInfoRequest, ReadDeviceInfoResponse # Importar clases personalizadas
from modbus_app.device_info.device_cache import get_device_info # Importar el nuevo sistema de caché
from pymodbus.exceptions import ModbusIOException
from pymodbus.pdu import ModbusExceptions as merror

def execute_read_operation(slave_id, function, address, count):
    """ Ejecuta una operación de lectura Modbus estándar. """
    if not is_client_connected():
        return {"status": "error", "message": "No hay conexión activa"}

    client = get_client()
    result = None
    response_data = None

    try:
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

        # Procesar resultado común
        if isinstance(result, ModbusIOException):
             return {"status": "error", "message": f"Error de I/O Modbus: {str(result)}"}
        if result.isError():
             if hasattr(result, 'exception_code'):
                 error_message = f"Excepción Modbus: {str(merror(result.exception_code))} (Código: {result.exception_code})"
             else:
                 error_message = f"Error Modbus desconocido: {result}"
             return {"status": "error", "message": error_message}

        # Extraer datos
        if hasattr(result, 'registers'):
             response_data = result.registers
        elif hasattr(result, 'bits'):
             response_data = result.bits[:count] # Asegurar el conteo correcto
        else:
             return {"status": "error", "message": "Respuesta inesperada del dispositivo"}

        return {"status": "success", "data": response_data}

    except Exception as e:
        return {"status": "error", "message": f"Excepción general durante lectura {function}: {str(e)}"}


def execute_write_operation(slave_id, function, address, values):
    """ Ejecuta una operación de escritura Modbus estándar. """
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

        # Procesar resultado común
        if isinstance(result, ModbusIOException):
             return {"status": "error", "message": f"Error de I/O Modbus en escritura: {str(result)}"}
        if result.isError():
             if hasattr(result, 'exception_code'):
                 error_message = f"Excepción Modbus en escritura: {str(merror(result.exception_code))} (Código: {result.exception_code})"
             else:
                 error_message = f"Error Modbus desconocido en escritura: {result}"
             return {"status": "error", "message": error_message}

        return {"status": "success", "message": "Escritura realizada correctamente"}

    except Exception as e:
        return {"status": "error", "message": f"Excepción general durante escritura {function}: {str(e)}"}


def execute_read_device_info(slave_id, info_index):
    """
    Ejecuta la operación personalizada FC41 para leer info del dispositivo.
    Utiliza el nuevo caché global con diferenciación por ID.
    
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
        # y devolvemos la parte solicitada según el índice
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
        
        # Todo bien, devolver datos
        return {
            "status": "success",
            "index": info_index,
            "ascii_data": section_text,
            "raw_bytes": list(section_text.encode('utf-8', errors='ignore')),
            "cached": True
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error al obtener información: {str(e)}"
        }

# Nueva función para verificar datos de celdas individuales
def verify_battery_cell_data(slave_id=217):
    """
    Función para verificar los datos de celdas individuales de la batería.
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