# modbus_app/operations.py
from .client import get_client, is_client_connected # Importar desde el mismo paquete
from .custom_requests import ReadDeviceInfoRequest, ReadDeviceInfoResponse # Importar clases personalizadas
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
    """ Ejecuta la operación personalizada FC41 para leer info del dispositivo. """
    if not is_client_connected():
        return {"status": "error", "message": "No hay conexión activa"}

    client = get_client()

    if not (0 <= info_index <= 5): # Validar índice basado en capturas
         return {"status": "error", "message": "Índice inválido (0-5)"}

    try:
        request_obj = ReadDeviceInfoRequest(index=info_index, slave=slave_id)
        result = client.execute(request_obj) # Ejecutar petición personalizada

        # Procesar resultado
        if isinstance(result, ModbusIOException):
             return {"status": "error", "message": f"Error de I/O Modbus (FC41): {str(result)}"}
        if result.isError():
             if hasattr(result, 'exception_code'):
                 error_message = f"Excepción Modbus (FC41): {str(merror(result.exception_code))} (Código: {result.exception_code})"
             else:
                 error_message = f"Error Modbus o resp inesperada (FC41): {result}"
             return {"status": "error", "message": error_message}

        # Verificar que la respuesta es del tipo esperado
        if isinstance(result, ReadDeviceInfoResponse):
            raw_bytes = result.info_data
            try:
                decoded_string = raw_bytes.decode('utf-8', errors='ignore')
                return {
                    "status": "success",
                    "index": info_index,
                    "raw_bytes": list(raw_bytes), # Lista de enteros
                    "ascii_data": decoded_string
                }
            except Exception as decode_err:
                 return {
                    "status": "warning", # Advertencia, datos recibidos pero no decodificados
                    "message": f"Error al decodificar datos: {str(decode_err)}",
                    "index": info_index,
                    "raw_bytes": list(raw_bytes)
                 }
        else:
            return {"status": "error", "message": f"Respuesta inesperada para FC41: {type(result)}"}

    except Exception as e:
        return {"status": "error", "message": f"Excepción general durante FC41: {str(e)}"}