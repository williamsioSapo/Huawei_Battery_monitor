# modbus_app/device_info/device_communication.py
"""
Módulo para comunicación directa con dispositivos Modbus.
Contiene funciones para autenticación y lectura de datos a bajo nivel.
"""

import time
import datetime
import struct
import serial
import sys

# Parámetros de conexión globales
connection_params = {
    'port': None,
    'baudrate': 9600,
    'parity': 'N',
    'stopbits': 1,
    'bytesize': 8,
    'timeout': 1.0
}
def is_client_connected():
    """Verifica si hay conexión activa."""
    try:
        from modbus_app.battery_initializer import BatteryInitializer
        initializer = BatteryInitializer.get_instance()
        return initializer and initializer._is_connected
    except:
        return False

def disconnect_client():
    """Desconecta el cliente actual."""
    try:
        from modbus_app.battery_initializer import BatteryInitializer
        initializer = BatteryInitializer.get_instance()
        return initializer.disconnect() if initializer else False
    except:
        return False

def connect_client(**kwargs):
    """Reconecta el cliente con los parámetros dados."""
    try:
        from modbus_app.battery_initializer import BatteryInitializer
        
        # Crear nueva instancia con los parámetros
        initializer = BatteryInitializer(**kwargs)
        
        if initializer.connect():
            BatteryInitializer.set_instance(initializer)
            return True, "Reconectado exitosamente"
        else:
            return False, "Fallo al reconectar"
    except Exception as e:
        return False, f"Error al reconectar: {str(e)}"
        
def compute_crc16(data):
    """Calcula el CRC16 para Modbus."""
    crc = 0xFFFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 0x0001:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc >>= 1
    # Retornar como bytes (little endian)
    return struct.pack('<H', crc)

def authenticate_device(slave_id=217):
    """
    Ejecuta la secuencia de autenticación de 3 pasos usando conexión serial directa.
    UTILIZA print() PARA LOGS VISIBLES EN CONSOLA WEB.
    """
    print(f"INFO: Iniciando autenticación de bajo nivel para dispositivo {slave_id}")

    # Verificar que tenemos parámetros de conexión
    if not connection_params['port']:
        print("ERROR: No hay parámetros de conexión disponibles para autenticación directa.")
        return False

    # Usar los parámetros guardados globalmente
    port = connection_params['port']
    baudrate = connection_params['baudrate']
    parity = connection_params['parity']
    stopbits = connection_params['stopbits']
    bytesize = connection_params['bytesize']
    timeout = connection_params['timeout']

    was_connected = is_client_connected()
    try:
        if was_connected:
            disconnect_client()
            print("INFO: Cliente Modbus desconectado temporalmente para autenticación")
            time.sleep(0.5)
    except Exception as e:
        print(f"WARNING: Error al desconectar cliente existente: {str(e)}")

    # Crear una conexión serial directa
    ser = None
    try:
        # Conectar directamente al puerto serial
        print(f"DEBUG: Intentando conexión serial directa a {port} ({baudrate},{bytesize}{parity}{stopbits} T:{timeout}s)")
        ser = serial.Serial(
            port=port,
            baudrate=baudrate,
            parity=parity,
            stopbits=stopbits,
            bytesize=bytesize,
            timeout=timeout
        )
        
        print(f"INFO: Conexión serial directa establecida con {port}")

        # Ejecutar la secuencia de autenticación
        if not authenticate_huawei_device(ser, slave_id):
            ser.close()
            return False
        
        # Leer datos del dispositivo directamente
        device_data = read_device_information(ser, slave_id)
        
        # Cerrar la conexión serial directa
        ser.close()
        print("INFO: Puerto serial directo cerrado después de autenticación y lectura")
        time.sleep(0.5)
        
        # Actualizar caché con la información obtenida
        from .device_cache import update_device_cache  # Esta importación relativa es correcta
        update_device_cache(device_data)

        # Reconectar el cliente Modbus si estaba conectado
        if was_connected:
            port_config = connection_params.copy()
            print(f"INFO: Intentando reconectar cliente pymodbus con config: {port_config}")
            from modbus_app.client import connect_client  # Importación corregida
            success, recon_msg = connect_client(**port_config)
            if not success:
                print(f"WARNING: ¡Fallo al reconectar el cliente PyModbus después de la autenticación! Mensaje: {recon_msg}")

        print("INFO: Retornando True desde authenticate_device.")
        return True

    except Exception as e:
        print(f"ERROR: Excepción CRÍTICA en authenticate_device: {str(e)}")
        if ser and ser.is_open:
            print("WARNING: Cerrando puerto serial debido a excepción.")
            ser.close()
        if port and was_connected:
            print("WARNING: Intentando reconectar cliente PyModbus después de excepción...")
            port_config = connection_params.copy()
            from modbus_app.client import connect_client  # Importación corregida
            connect_client(**port_config)

        print(f"ERROR: Retornando False desde authenticate_device debido a excepción: {e}")
        return False

def authenticate_huawei_device(ser, slave_id):
    """
    Ejecuta la secuencia completa de tres pasos de autenticación para dispositivos Huawei.
    
    Args:
        ser: Objeto de conexión serial activa
        slave_id: ID del esclavo Modbus
        
    Returns:
        bool: True si la autenticación fue exitosa, False si falló
    """
    print(f"INFO: Iniciando secuencia de autenticación de 3 pasos para dispositivo {slave_id}")
    
    # Paso 1: Comando de desbloqueo especial (FC03)
    print("INFO: Paso 1: Enviando comando de desbloqueo (FC03 especial)")
    message_step1 = bytearray([slave_id, 0x03, 0x01, 0x06, 0x00, 0x01])
    crc = compute_crc16(message_step1)
    request_step1 = message_step1 + crc

    ser.reset_input_buffer()
    ser.reset_output_buffer()
    ser.write(request_step1)
    print(f"DEBUG: Enviado Paso 1: {' '.join([f'{b:02x}' for b in request_step1])}")
    time.sleep(0.2)
    response_step1 = ser.read(7)
    print(f"DEBUG: Paso 1 - Recibido (len={len(response_step1)}): {' '.join([f'{b:02x}' for b in response_step1])}")

    if len(response_step1) != 7:
        print(f"ERROR: Error Paso 1: Longitud inválida. Esperada: 7, Recibida: {len(response_step1)}")
        return False
    if response_step1[0] != slave_id or response_step1[1] != 0x03:
        print(f"ERROR: Error Paso 1: ID/FC inválido. Esperado: {slave_id:02x} 03, Recibido: {response_step1[0]:02x} {response_step1[1]:02x}")
        return False
    if response_step1[2] != 0x02 or response_step1[3] != 0x00:
        print(f"ERROR: Error Paso 1: Formato inesperado. Bytes[2,3] esperados: 02 00, Recibidos: {response_step1[2]:02x} {response_step1[3]:02x}")
        return False
    
    print("INFO: Paso 1 completado exitosamente")
    time.sleep(0.5)

    # Paso 2: Sincronización de fecha/hora (FC10)
    print("INFO: Paso 2: Enviando sincronización de fecha/hora (FC10)")
    now = datetime.datetime.now()
    message_step2 = bytearray([
        slave_id, 0x10, 0x10, 0x00, 0x00, 0x06, 0x0C,
        (now.year >> 8) & 0xFF, now.year & 0xFF,
        0x00, now.month, 0x00, now.day, 0x00, now.hour,
        0x00, now.minute, 0x00, now.second
    ])
    crc = compute_crc16(message_step2)
    request_step2 = message_step2 + crc

    ser.reset_input_buffer()
    ser.reset_output_buffer()
    ser.write(request_step2)
    print(f"DEBUG: Enviado Paso 2: {now.isoformat()} : {' '.join([f'{b:02x}' for b in request_step2])}")
    time.sleep(0.2)
    response_step2 = ser.read(8)
    print(f"DEBUG: Paso 2 - Recibido (len={len(response_step2)}): {' '.join([f'{b:02x}' for b in response_step2])}")

    if len(response_step2) != 8 or response_step2[0] != slave_id or response_step2[1] != 0x10:
        print(f"ERROR: Error Paso 2: Longitud/ID/FC inválido. Esperado: len=8, ID={slave_id:02x}, FC=10")
        return False
    if (response_step2[2] != 0x10 or response_step2[3] != 0x00 or response_step2[4] != 0x00 or response_step2[5] != 0x06):
        print(f"ERROR: Error Paso 2: Formato inesperado. Bytes[2:6] esperados: 10 00 00 06")
        return False
    
    print("INFO: Paso 2 completado exitosamente")
    time.sleep(0.8)

    # Paso 3: Validación de acceso (FC41 inicial)
    print("INFO: Paso 3: Enviando validación de acceso (FC41 inicial)")
    message_step3 = bytearray([slave_id, 0x41, 0x05, 0x01, 0x04])
    crc = compute_crc16(message_step3)
    request_step3 = message_step3 + crc

    ser.reset_input_buffer()
    ser.reset_output_buffer()
    ser.write(request_step3)
    print(f"DEBUG: Enviado Paso 3: {' '.join([f'{b:02x}' for b in request_step3])}")
    time.sleep(0.3)
    response_step3 = ser.read(12)
    print(f"DEBUG: Paso 3 - Recibido (len={len(response_step3)}): {' '.join([f'{b:02x}' for b in response_step3])}")

    if len(response_step3) < 9 or response_step3[0] != slave_id or response_step3[1] != 0x41:
        print(f"ERROR: Error Paso 3: Longitud/ID/FC inválido. Esperado: len>=9, ID={slave_id:02x}, FC=41")
        return False
    if response_step3[2] != 0x05 or response_step3[3] != 0x06:
        print(f"ERROR: Error Paso 3: Formato inesperado. Bytes[2,3] esperados: 05 06")
        return False
    
    print("INFO: Secuencia de autenticación completada exitosamente")
    return True

def read_device_information(ser, slave_id):
    """
    Lee la información del dispositivo (FC41, índices 0-5).
    
    Args:
        ser: Objeto de conexión serial autenticado
        slave_id: ID del esclavo Modbus
        
    Returns:
        dict: Información del dispositivo obtenida
    """
    print("INFO: Leyendo información del dispositivo tras autenticación (FC41, índices 0-5)")
    
    # Preparar contenedores para almacenar datos
    raw_bytes_all = bytearray()
    fragments = {}
    
    # Leer los 6 fragmentos de información (índices 0-5)
    for index in range(6):
        print(f"INFO: Leyendo información, índice {index}")
        
        # Crear mensaje para leer el fragmento actual
        message = bytearray([slave_id, 0x41, 0x06, 0x03, 0x04, 0x00, index])
        crc = compute_crc16(message)
        request = message + crc

        # Enviar solicitud y leer respuesta
        ser.reset_input_buffer()
        ser.reset_output_buffer()
        ser.write(request)
        print(f"DEBUG: Enviada solicitud FC41 para índice {index}")
        time.sleep(0.3)
        
        # Leer la respuesta (cabecera + datos)
        header = ser.read(7)
        if len(header) < 7 or header[0] != slave_id or header[1] != 0x41:
            print(f"WARNING: FC41 Índice {index}: Respuesta inválida o incompleta")
            fragments[f"fragment_{index}"] = f"ERROR: Respuesta inválida"
            time.sleep(0.5)
            continue
            
        # Leer datos adicionales después de la cabecera
        additional_data = ser.read(100)
        full_response = header + additional_data
        
        # Extraer solo los bytes de datos (ignorando cabecera y CRC)
        if len(full_response) > 9:
            data_bytes = full_response[7:-2]
            raw_bytes_all.extend(data_bytes)
            print(f"INFO: Datos índice {index} leídos ({len(data_bytes)} bytes)")
            fragments[f"fragment_{index}"] = f"DATOS LEÍDOS ({len(data_bytes)} bytes)"
        else:
            print(f"WARNING: FC41 Índice {index}: Respuesta sin suficientes datos")
            fragments[f"fragment_{index}"] = f"ERROR: Respuesta corta"
        
        time.sleep(0.5)
    
    # Decodificar todos los bytes juntos
    all_combined_text = ""
    try:
        all_combined_text = raw_bytes_all.decode('utf-8', errors='replace')
        all_combined_text = ''.join(c if (ord(c) >= 32 and ord(c) <= 126) or c in ['\n', '\r', '\t'] else '' for c in all_combined_text)
        print(f"INFO: Todos los bytes combinados decodificados exitosamente ({len(all_combined_text)} caracteres)")
    except Exception as e:
        print(f"WARNING: Error al decodificar todos los bytes combinados: {str(e)}")
    
    # Devolver la información obtenida
    return {
        "raw_bytes": raw_bytes_all,
        "combined_text": all_combined_text, 
        "fragments": fragments  # Para compatibilidad
    }