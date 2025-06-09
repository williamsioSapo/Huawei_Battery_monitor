# modbus_app/battery_diagnostics.py
"""
Módulo para realizar diagnóstico detallado de baterías a bajo nivel.
Genera un archivo de log específico para cada batería diagnosticada.
Incluye tráfico Modbus raw para permitir análisis detallado del protocolo.
"""

import os
import time
import datetime
import struct
from modbus_app.logger_config import log_to_cmd

def run_diagnostics(battery_id, serial_connection):
    """
    Ejecuta diagnóstico completo para una batería específica usando conexión serial de bajo nivel.
    
    Args:
        battery_id (int): ID de la batería a diagnosticar
        serial_connection: Objeto de conexión serial ya abierto
        
    Returns:
        bool: True si el diagnóstico se completó, False en caso contrario
    """
    try:
        # Verificar que la conexión serial esté activa
        if not serial_connection or not hasattr(serial_connection, 'is_open') or not serial_connection.is_open:
            log_to_cmd(f"No hay conexión serial disponible para diagnóstico de batería {battery_id}", "ERROR", "DIAGNOSTICS")
            return False
            
        # Verificar si el diagnóstico está habilitado para esta batería
        diagnostics_enabled = check_diagnostics_enabled(battery_id)
        if not diagnostics_enabled:
            log_to_cmd(f"Diagnóstico deshabilitado para batería {battery_id}", "INFO", "DIAGNOSTICS")
            return False
            
        # Crear archivo de log
        log_file = create_log_file(battery_id)
        if not log_file:
            log_to_cmd(f"No se pudo crear archivo de log para diagnóstico de batería {battery_id}", "ERROR", "DIAGNOSTICS")
            return False
            
        # Ejecutar diagnóstico y escribir resultados al log
        log_to_cmd(f"Iniciando diagnóstico para batería {battery_id}", "INFO", "DIAGNOSTICS")
        
        with open(log_file, 'w') as log:
            # Encabezado del log
            timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            log.write(f"DIAGNÓSTICO DE BATERÍA {battery_id} - {timestamp}\n")
            log.write("=" * 50 + "\n\n")
            log.write("TRÁFICO MODBUS RAW INCLUIDO PARA ANÁLISIS DE PROTOCOLO\n")
            log.write("Formato: [TX/RX HEX] -> Interpretación\n\n")
            
            # Ejecutar secuencia de diagnóstico
            diagnose_battery(battery_id, serial_connection, log)
            
            # Pie del log
            log.write("\nDIAGNÓSTICO COMPLETO\n")
            log.write("=" * 50 + "\n")
        
        log_to_cmd(f"Diagnóstico completado para batería {battery_id}. Log: {log_file}", "INFO", "DIAGNOSTICS")
        return True
        
    except Exception as e:
        log_to_cmd(f"Error durante diagnóstico de batería {battery_id}: {str(e)}", "ERROR", "DIAGNOSTICS")
        return False

def check_diagnostics_enabled(battery_id):
    """
    Verifica si el diagnóstico está habilitado para esta batería en la configuración.
    
    Args:
        battery_id (int): ID de la batería
        
    Returns:
        bool: True si está habilitado, False en caso contrario
    """
    try:
        from modbus_app import config_manager
        config = config_manager.load_config()
        
        # Buscar la batería en los dispositivos descubiertos
        discovered_devices = config.get("application", {}).get("discovered_devices", [])
        
        for device in discovered_devices:
            if device.get("id") == battery_id:
                return device.get("diagnostics_enabled", False)
                
        return False
    except Exception as e:
        log_to_cmd(f"Error al verificar configuración de diagnóstico: {str(e)}", "ERROR", "DIAGNOSTICS")
        return False

def create_log_file(battery_id):
    """
    Crea el archivo de log para el diagnóstico.
    
    Args:
        battery_id (int): ID de la batería
        
    Returns:
        str: Ruta del archivo de log o None si hay error
    """
    try:
        # Obtener directorio de logs de configuración o usar directorio actual
        from modbus_app import config_manager
        config = config_manager.load_config()
        log_dir = config.get("logging", {}).get("diagnostics_log_directory", "logs")
        
        # Crear directorio si no existe
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
            
        # Crear ruta del archivo de log con timestamp para evitar sobrescritura
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        log_file = os.path.join(log_dir, f"Diagnostico_Bateria_{battery_id}_{timestamp}.txt")
        
        return log_file
    except Exception as e:
        log_to_cmd(f"Error al crear archivo de log: {str(e)}", "ERROR", "DIAGNOSTICS")
        return None

def diagnose_battery(battery_id, serial_connection, log):
    """
    Ejecuta la secuencia completa de diagnóstico en una batería y escribe los resultados al log.
    Esta función mantiene el orden original de lecturas pero añade el tráfico raw.
    
    Args:
        battery_id (int): ID de la batería
        serial_connection: Objeto de conexión serial ya abierto
        log: Archivo de log abierto para escritura
    """
    try:
        # 1. Lectura de registros básicos de estado
        log.write("REGISTROS BÁSICOS DE ESTADO:\n")
        basic_registers = [
            {"addr": 0x0046, "name": "Estado Alarmas", "count": 1},
            {"addr": 0x0047, "name": "SOC Alternativo", "count": 1},
            {"addr": 0x0048, "name": "SOH Alternativo", "count": 1},
            {"addr": 0x0049, "name": "Corriente Alt", "count": 1},
            {"addr": 0x004A, "name": "Info Descarga", "count": 1},
            {"addr": 0x000A, "name": "Contador Alarmas", "count": 1}
        ]
        
        for reg in basic_registers:
            try:
                # Realizar la lectura con registro del tráfico raw
                result = read_register_detailed(serial_connection, battery_id, reg["addr"], reg["count"], log)
                if result["success"]:
                    values = result["data"]
                    log.write(f"  0x{reg['addr']:04X} {reg['name']}: {[hex(x) for x in values]} (dec: {values})\n")
                else:
                    log.write(f"  0x{reg['addr']:04X} {reg['name']}: Error - {result['error']}\n")
            except Exception as e:
                log.write(f"  Error al leer 0x{reg['addr']:04X} {reg['name']}: {str(e)}\n")
            
            # Separador entre registros para mejor legibilidad
            log.write("\n")
        
        # 2. Registros de estado general
        try:
            log.write("\nESTADO GENERAL:\n")
            result = read_register_detailed(serial_connection, battery_id, 0x0000, 7, log)
            if result["success"]:
                values = result["data"]
                log.write(f"  Voltaje: {values[0]/100:.2f}V\n")
                log.write(f"  Voltaje Pack: {values[1]/100:.2f}V\n")
                log.write(f"  Corriente: {(values[2] if values[2] < 32768 else values[2]-65536)/100:.2f}A\n")
                log.write(f"  SOC: {values[3]}%\n")
                log.write(f"  SOH: {values[4]}%\n")
                log.write(f"  Estado: 0x{values[5]:04X}\n")
                log.write(f"  Reservado: 0x{values[6]:04X}\n")
            else:
                log.write(f"  Error leyendo estado general: {result['error']}\n")
        except Exception as e:
            log.write(f"  Error en lectura estado general: {str(e)}\n")
            
        log.write("\n")
            
        # 3. Lecturas de temperatura (0x1200-0x1232)
        log.write("\nTEMPERATURAS DE SENSORES:\n")
        try:
            # Primer bloque de temperaturas
            log.write("Bloque de temperaturas 1:\n")
            temps1 = read_register_detailed(serial_connection, battery_id, 0x1200, 16, log)
            if temps1["success"]:
                for i, temp in enumerate(temps1["data"]):
                    # Convertir según factor 0.1
                    if temp == 0x7FFF:  # Valor especial para sensores desconectados
                        temp_c = "DESCONECTADO"
                    else:
                        temp_c = f"{temp/10:.1f}°C"
                    log.write(f"  Sensor {i+1}: {temp_c} (0x{temp:04X})\n")
            else:
                log.write(f"  Error leyendo temperaturas 1: {temps1['error']}\n")
                
            log.write("\n")
                
            # Segundo bloque de temperaturas
            log.write("Bloque de temperaturas 2:\n")
            temps2 = read_register_detailed(serial_connection, battery_id, 0x1210, 16, log)
            if temps2["success"]:
                for i, temp in enumerate(temps2["data"]):
                    # Convertir según factor 0.1
                    if temp == 0x7FFF:  # Valor especial para sensores desconectados
                        temp_c = "DESCONECTADO"
                    else:
                        temp_c = f"{temp/10:.1f}°C"
                    log.write(f"  Sensor {i+17}: {temp_c} (0x{temp:04X})\n")
            else:
                log.write(f"  Error leyendo temperaturas 2: {temps2['error']}\n")
        except Exception as e:
            log.write(f"  Error en lectura de temperaturas: {str(e)}\n")
            
        log.write("\n")
            
        # 4. Registros de diagnóstico (0x12F0-0x12F5)
        log.write("\nREGISTROS DE DIAGNÓSTICO:\n")
        diag_registers = [
            {"addr": 0x12F0, "name": "Diagnóstico 1", "count": 1},
            {"addr": 0x12F1, "name": "Diagnóstico 2", "count": 1},
            {"addr": 0x12F2, "name": "Temp MOSFET 1", "count": 1},
            {"addr": 0x12F3, "name": "Temp MOSFET 2", "count": 1},
            {"addr": 0x12F4, "name": "Diagnóstico 3", "count": 1},
            {"addr": 0x12F5, "name": "Diagnóstico 4", "count": 1}
        ]
        
        for reg in diag_registers:
            try:
                result = read_register_detailed(serial_connection, battery_id, reg["addr"], reg["count"], log)
                if result["success"]:
                    values = result["data"]
                    
                    # Formato especial para temperaturas MOSFET
                    if reg["addr"] in [0x12F2, 0x12F3]:
                        temp_value = values[0]/10 if values[0] != 0x7FFF else "DESCONECTADO"
                        log.write(f"  0x{reg['addr']:04X} {reg['name']}: {temp_value}°C (0x{values[0]:04X})\n")
                    # Formato para registros de diagnóstico (mostrar bits)
                    elif reg["addr"] in [0x12F0, 0x12F1]:
                        bin_value = format(values[0], '016b')
                        log.write(f"  0x{reg['addr']:04X} {reg['name']}: 0x{values[0]:04X} (bin: {bin_value})\n")
                    else:
                        log.write(f"  0x{reg['addr']:04X} {reg['name']}: 0x{values[0]:04X}\n")
                else:
                    log.write(f"  0x{reg['addr']:04X} {reg['name']}: Error - {result['error']}\n")
            except Exception as e:
                log.write(f"  Error al leer 0x{reg['addr']:04X} {reg['name']}: {str(e)}\n")
                
            log.write("\n")
                
        # 5. Registros de histórico
        log.write("\nREGISTROS HISTÓRICOS:\n")
        hist_registers = [
            {"addr": 0x1144, "name": "Descarga Acumulada (Ah)", "count": 1},
            {"addr": 0x1145, "name": "Carga Acumulada (Ah)", "count": 1},
            {"addr": 0x1146, "name": "Tiempo Operación (h)", "count": 1},
            {"addr": 0x1149, "name": "Eventos Descarga", "count": 1},
            {"addr": 0x114A, "name": "Eventos Carga", "count": 1},
            {"addr": 0x001A, "name": "Ciclos de Descarga", "count": 1}
        ]
        
        for reg in hist_registers:
            try:
                result = read_register_detailed(serial_connection, battery_id, reg["addr"], reg["count"], log)
                if result["success"]:
                    values = result["data"]
                    log.write(f"  0x{reg['addr']:04X} {reg['name']}: {values[0]}\n")
                else:
                    log.write(f"  0x{reg['addr']:04X} {reg['name']}: Error - {result['error']}\n")
            except Exception as e:
                log.write(f"  Error al leer 0x{reg['addr']:04X} {reg['name']}: {str(e)}\n")
                
            log.write("\n")
        
        # 6. Añadir exploración adicional para diagnosticar registros de celdas
        log.write("\nDIAGNÓSTICO DE CELDAS:\n")
        cell_ranges = [
            {"start": 0x0022, "count": 15, "name": "Posibles voltajes de celdas 1"},
            {"start": 0x0032, "count": 15, "name": "Posibles voltajes de celdas 2"},
            {"start": 0x0012, "count": 15, "name": "Posibles temperaturas de celdas 1"},
            {"start": 0x0022, "count": 15, "name": "Posibles temperaturas de celdas 2"}
        ]
        
        for range_info in cell_ranges:
            try:
                log.write(f"\n{range_info['name']} (0x{range_info['start']:04X} - 0x{range_info['start']+range_info['count']-1:04X}):\n")
                result = read_register_detailed(serial_connection, battery_id, range_info["start"], range_info["count"], log)
                if result["success"]:
                    for i, val in enumerate(result["data"]):
                        addr = range_info["start"] + i
                        log.write(f"  Registro 0x{addr:04X}: 0x{val:04X} (Dec: {val})\n")
                else:
                    log.write(f"  Error leyendo rango: {result['error']}\n")
            except Exception as e:
                log.write(f"  Error al leer rango: {str(e)}\n")
                
            log.write("\n")
        
        return True
    except Exception as e:
        log.write(f"Error general en diagnóstico: {str(e)}\n")
        return False

def read_register_detailed(serial_connection, slave_id, address, count, log):
    """
    Lee registros usando comunicación serial de bajo nivel (Modbus RTU) y registra el tráfico raw.
    
    Args:
        serial_connection: Objeto de conexión serial ya abierto
        slave_id (int): ID del esclavo Modbus
        address (int): Dirección del registro a leer
        count (int): Cantidad de registros a leer
        log: Archivo de log para registro detallado
        
    Returns:
        dict: Resultado de la operación con datos o error
    """
    try:
        # Crear comando Modbus RTU para leer registros (función 03 - Read Holding Registers)
        command = bytearray([
            slave_id,      # ID del esclavo
            0x03,          # Función 03 (Read Holding Registers)
            address >> 8,  # Dirección MSB
            address & 0xFF, # Dirección LSB
            0x00,          # Cantidad MSB
            count          # Cantidad LSB
        ])
        
        # Calcular CRC-16
        crc = compute_crc16(command)
        command += crc
        
        # Registrar comando en formato hexadecimal
        log.write(f"  TX: [{' '.join([f'{b:02X}' for b in command])}] -> Lectura 0x{address:04X}, {count} registros\n")
        
        # Limpiar buffers
        serial_connection.reset_input_buffer()
        serial_connection.reset_output_buffer()
        
        # Enviar comando
        serial_connection.write(command)
        
        # Esperar respuesta
        time.sleep(0.2)
        
        # La respuesta esperada tiene el formato:
        # [slave_id][func_code][byte_count][data...][crc_lo][crc_hi]
        # Byte count = count * 2 (2 bytes por registro)
        # Total = 1 + 1 + 1 + (count * 2) + 2 = 5 + (count * 2)
        expected_length = 5 + (count * 2)
        
        # Leer respuesta (intentar leer un poco más para capturar posibles bytes adicionales)
        response = serial_connection.read(expected_length + 10)
        
        # Registrar respuesta en formato hexadecimal
        log.write(f"  RX: [{' '.join([f'{b:02X}' for b in response])}]")
        
        # Verificar respuesta
        if len(response) < expected_length:
            log.write(f" -> Respuesta incompleta ({len(response)}/{expected_length} bytes)\n")
            return {"success": False, "error": f"Respuesta incompleta: {len(response)}/{expected_length} bytes"}
            
        # Verificar ID y código de función
        if response[0] != slave_id:
            log.write(f" -> ID incorrecto (recibido: {response[0]}, esperado: {slave_id})\n")
            return {"success": False, "error": f"ID incorrecto: {response[0]} != {slave_id}"}
            
        if response[1] != 0x03:
            # Si hay código de excepción
            if response[1] == 0x83:
                exception_code = response[2] if len(response) > 2 else 0
                exception_msg = get_exception_meaning(exception_code)
                log.write(f" -> Excepción: 0x{exception_code:02X} ({exception_msg})\n")
                return {"success": False, "error": f"Excepción: {exception_msg} (0x{exception_code:02X})"}
            else:
                log.write(f" -> Función incorrecta (recibido: 0x{response[1]:02X}, esperado: 0x03)\n")
                return {"success": False, "error": f"Función incorrecta: 0x{response[1]:02X} != 0x03"}
        
        # Verificar longitud de datos
        byte_count = response[2]
        if byte_count != count * 2:
            log.write(f" -> Longitud de datos incorrecta (recibido: {byte_count}, esperado: {count*2})\n")
            return {"success": False, "error": f"Longitud incorrecta: {byte_count} != {count * 2}"}
            
        # Extraer datos
        data = []
        for i in range(count):
            # Cada registro es 2 bytes, empiezan después del byte_count
            # Los datos están en big-endian (MSB primero)
            reg_value = (response[3 + i*2] << 8) | response[3 + i*2 + 1]
            data.append(reg_value)
        
        # Verificar CRC si hay suficientes bytes
        if len(response) >= expected_length:
            received_crc = response[3 + byte_count:3 + byte_count + 2]
            calculated_crc = compute_crc16(response[:3 + byte_count])
            
            # Si hay discrepancia en CRC, registrarlo pero continuar procesando
            if received_crc != calculated_crc:
                log.write(f" -> CRC incorrecto, Recibido: {received_crc.hex()}, Calculado: {calculated_crc.hex()}\n")
            else:
                log.write(" -> Lectura correcta\n")
        else:
            log.write(" -> No se puede verificar CRC (respuesta demasiado corta)\n")
            
        return {"success": True, "data": data}
    except Exception as e:
        log.write(f" -> Error: {str(e)}\n")
        return {"success": False, "error": str(e)}

def compute_crc16(data):
    """
    Calcula el CRC16 para Modbus RTU.
    
    Args:
        data (bytearray): Datos para calcular CRC
        
    Returns:
        bytearray: CRC16 calculado (2 bytes, little endian)
    """
    crc = 0xFFFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 0x0001:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc >>= 1
    return bytearray([crc & 0xFF, (crc >> 8) & 0xFF])  # Little endian

def get_exception_meaning(exception_code):
    """
    Obtiene una descripción para un código de excepción Modbus.
    
    Args:
        exception_code (int): Código de excepción
        
    Returns:
        str: Descripción del código de excepción
    """
    exception_meanings = {
        0x01: "Función no soportada",
        0x02: "Dirección no válida",
        0x03: "Valor no válido",
        0x04: "Error del dispositivo",
        0x05: "Reconocimiento",
        0x06: "Dispositivo ocupado",
        0x07: "Conflicto",
        0x08: "Error de memoria",
        0x0A: "Puerta de enlace no disponible",
        0x0B: "Dispositivo destino no responde"
    }
    
    return exception_meanings.get(exception_code, "Excepción desconocida")