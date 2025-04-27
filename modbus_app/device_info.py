# modbus_app/device_info.py
import time
import datetime
# import logging # Comentado/Eliminado ya que usaremos print
import struct
import serial
from . import client # Importar el módulo client del mismo paquete

# Configuración del logging eliminada - Usaremos print() para la consola web

connection_params = {
    'port': None,
    'baudrate': 9600,
    'parity': 'N',
    'stopbits': 1,
    'bytesize': 8,
    'timeout': 1.0
}

# Variable global para almacenar la información del dispositivo
device_info_cache = {
    "is_authenticated": False,
    "fragments": {},
    "parsed_info": {
        "manufacturer": "",
        "model": "",
        "barcode": "",
        "manufactured_date": "",
        "description": "",
        "info_version": "",
        "elabel_version": ""
    },
    "is_huawei": False,
    "timestamp": None
}

def reset_device_info():
    """Reinicia la información del dispositivo a valores predeterminados."""
    global device_info_cache
    device_info_cache = {
        "is_authenticated": False,
        "fragments": {},
        "parsed_info": {
            "manufacturer": "",
            "model": "",
            "barcode": "",
            "manufactured_date": "",
            "description": "",
            "info_version": "",
            "elabel_version": ""
        },
        "is_huawei": False,
        "timestamp": None
    }
    # --- Reemplazo de logger.info ---
    print("INFO: Caché de información del dispositivo reiniciada")

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
    # --- Reemplazo de logger.info ---
    print(f"INFO: Iniciando autenticación de bajo nivel para dispositivo {slave_id}")
    # --- Log de prueba ---
    print("---- PRINT: Entrando en authenticate_device ----")

    # Verificar que tenemos parámetros de conexión
    if not connection_params['port']:
         # --- Reemplazo de logger.error ---
        print("ERROR: No hay parámetros de conexión disponibles para autenticación directa.")
        return False

    # Usar los parámetros guardados globalmente
    port = connection_params['port']
    baudrate = connection_params['baudrate']
    parity = connection_params['parity']
    stopbits = connection_params['stopbits']
    bytesize = connection_params['bytesize']
    timeout = connection_params['timeout']

    # Cerrar temporalmente el cliente actual para liberar el puerto serial
    was_connected = client.is_client_connected() # Verificar si estaba conectado antes
    try:
        if was_connected:
            # Nota: disconnect_client ya usa print()
            client.disconnect_client()
            # --- Reemplazo de logger.info ---
            print("INFO: Cliente Modbus desconectado temporalmente para autenticación")
            time.sleep(0.5) # Pequeña pausa para asegurar liberación del puerto
    except Exception as e:
        # --- Reemplazo de logger.warning ---
        print(f"WARNING: Error al desconectar cliente existente: {str(e)}")

    # Crear una conexión serial directa
    ser = None
    try:
        # Conectar directamente al puerto serial
        # --- Reemplazo de logger.debug ---
        print(f"DEBUG: Intentando conexión serial directa a {port} ({baudrate},{bytesize}{parity}{stopbits} T:{timeout}s)")
        ser = serial.Serial(
            port=port,
            baudrate=baudrate,
            parity=parity,
            stopbits=stopbits,
            bytesize=bytesize,
            timeout=timeout
        )
        # --- Reemplazo de logger.info ---
        print(f"INFO: Conexión serial directa establecida con {port}")

        # Paso 1: Comando de desbloqueo especial (FC03)
        # --- Reemplazo de logger.info ---
        print("INFO: Paso 1: Enviando comando de desbloqueo (FC03 especial)")

        request_step1 = bytearray([
            slave_id, 0x03, 0x01, 0x06, 0x00, 0x01, 0x77, 0x2F
        ])

        ser.reset_input_buffer()
        ser.reset_output_buffer()
        ser.write(request_step1)
        # --- Reemplazo de logger.debug ---
        print(f"DEBUG: Enviado Paso 1: {' '.join([f'{b:02x}' for b in request_step1])}")
        time.sleep(0.2)
        response_step1 = ser.read(7)
        # --- Reemplazo de logger.debug ---
        print(f"DEBUG: Paso 1 - Recibido (len={len(response_step1)}): {' '.join([f'{b:02x}' for b in response_step1])}")

        # --- Reemplazo de logger.debug ---
        print(f"DEBUG: Paso 1 - Validando respuesta...")
        if len(response_step1) != 7:
            # --- Reemplazo de logger.error ---
            print(f"ERROR: Error Paso 1: Longitud inválida. Esperada: 7, Recibida: {len(response_step1)}. Datos: {' '.join([f'{b:02x}' for b in response_step1])}")
            ser.close()
            return False
        if response_step1[0] != slave_id or response_step1[1] != 0x03:
            # --- Reemplazo de logger.error ---
            print(f"ERROR: Error Paso 1: ID/FC inválido. Esperado: {slave_id:02x} 03, Recibido: {response_step1[0]:02x} {response_step1[1]:02x}. Datos: {' '.join([f'{b:02x}' for b in response_step1])}")
            ser.close()
            return False
        if response_step1[2] != 0x02 or response_step1[3] != 0x00:
            # --- Reemplazo de logger.error ---
             print(f"ERROR: Error Paso 1: Formato inesperado. Bytes[2,3] esperados: 02 00, Recibidos: {response_step1[2]:02x} {response_step1[3]:02x}. Datos: {' '.join([f'{b:02x}' for b in response_step1])}")
             ser.close()
             return False
        # --- Reemplazo de logger.info ---
        print("INFO: Paso 1 completado exitosamente")
        time.sleep(0.5)

        # Paso 2: Sincronización de fecha/hora (FC10)
        # --- Reemplazo de logger.info ---
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
        # --- Reemplazo de logger.debug ---
        print(f"DEBUG: Enviado Paso 2: {now.isoformat()} : {' '.join([f'{b:02x}' for b in request_step2])}")
        time.sleep(0.2)
        response_step2 = ser.read(8)
        # --- Reemplazo de logger.debug ---
        print(f"DEBUG: Paso 2 - Recibido (len={len(response_step2)}): {' '.join([f'{b:02x}' for b in response_step2])}")

        # --- Reemplazo de logger.debug ---
        print(f"DEBUG: Paso 2 - Validando respuesta...")
        if len(response_step2) != 8 or response_step2[0] != slave_id or response_step2[1] != 0x10:
            # --- Reemplazo de logger.error ---
            print(f"ERROR: Error Paso 2: Longitud/ID/FC inválido. Esperado: len=8, ID={slave_id:02x}, FC=10. Recibido: len={len(response_step2)}, ID={response_step2[0]:02x}, FC={response_step2[1]:02x}. Datos: {' '.join([f'{b:02x}' for b in response_step2])}")
            ser.close()
            return False
        if (response_step2[2] != 0x10 or response_step2[3] != 0x00 or
            response_step2[4] != 0x00 or response_step2[5] != 0x06):
             # --- Reemplazo de logger.error ---
            print(f"ERROR: Error Paso 2: Formato inesperado. Bytes[2:6] esperados: 10 00 00 06. Recibidos: {' '.join(f'{b:02x}' for b in response_step2[2:6])}. Datos: {' '.join([f'{b:02x}' for b in response_step2])}")
            ser.close()
            return False
        # --- Reemplazo de logger.info ---
        print("INFO: Paso 2 completado exitosamente")
        time.sleep(0.8)

        # Paso 3: Validación de acceso (FC41 inicial)
        # --- Reemplazo de logger.info ---
        print("INFO: Paso 3: Enviando validación de acceso (FC41 inicial)")
        request_step3 = bytearray([
            slave_id, 0x41, 0x05, 0x01, 0x04, 0x3D, 0xBD
        ])

        ser.reset_input_buffer()
        ser.reset_output_buffer()
        ser.write(request_step3)
        # --- Reemplazo de logger.debug ---
        print(f"DEBUG: Enviado Paso 3: {' '.join([f'{b:02x}' for b in request_step3])}")
        time.sleep(0.3)
        response_step3 = ser.read(12)
        # --- Reemplazo de logger.debug ---
        print(f"DEBUG: Paso 3 - Recibido (len={len(response_step3)}): {' '.join([f'{b:02x}' for b in response_step3])}")

        # --- Reemplazo de logger.debug ---
        print(f"DEBUG: Paso 3 - Validando respuesta...")
        if len(response_step3) < 9 or response_step3[0] != slave_id or response_step3[1] != 0x41:
            # --- Reemplazo de logger.error ---
            print(f"ERROR: Error Paso 3: Longitud/ID/FC inválido. Esperado: len>=9, ID={slave_id:02x}, FC=41. Recibido: len={len(response_step3)}, ID={response_step3[0]:02x}, FC={response_step3[1]:02x}. Datos: {' '.join([f'{b:02x}' for b in response_step3])}")
            ser.close()
            return False
        if response_step3[2] != 0x05 or response_step3[3] != 0x06:
            # --- Reemplazo de logger.error ---
            print(f"ERROR: Error Paso 3: Formato inesperado. Bytes[2,3] esperados: 05 06. Recibidos: {response_step3[2]:02x} {response_step3[3]:02x}. Datos: {' '.join([f'{b:02x}' for b in response_step3])}")
            ser.close()
            return False
        # --- Reemplazo de logger.info ---
        print("INFO: Paso 3 completado exitosamente")
        time.sleep(1.0)

        # Leer datos del dispositivo directamente
        # --- Reemplazo de logger.info ---
        print("INFO: Leyendo información del dispositivo tras autenticación (FC41, índices 0-5)")
        fragments = {}
        for index in range(6):
             # --- Reemplazo de logger.info ---
            print(f"INFO: --- Leyendo información, índice {index} ---")
            message = bytearray([
                slave_id, 0x41, 0x06, 0x03, 0x04, 0x00, index
            ])
            crc = compute_crc16(message)
            request = message + crc

            ser.reset_input_buffer()
            ser.reset_output_buffer()
            ser.write(request)
             # --- Reemplazo de logger.debug ---
            print(f"DEBUG: Enviada solicitud FC41 para índice {index}: {' '.join([f'{b:02x}' for b in request])}")
            time.sleep(0.3)
            header = ser.read(7)
            # --- Reemplazo de logger.debug ---
            print(f"DEBUG: FC41 Índice {index} - Cabecera recibida (len={len(header)}): {' '.join([f'{b:02x}' for b in header])}")

            # --- Reemplazo de logger.debug ---
            print(f"DEBUG: FC41 Índice {index} - Validando cabecera...")
            if len(header) < 7:
                # --- Reemplazo de logger.warning ---
                print(f"WARNING: FC41 Índice {index}: Cabecera incompleta. Esperada: >=7, Recibida: {len(header)}. Datos: {' '.join([f'{b:02x}' for b in header])}")
                fragments[f"fragment_{index}"] = f"ERROR: Cabecera incompleta (len={len(header)})"
                time.sleep(0.5)
                continue
            if header[0] != slave_id:
                # --- Reemplazo de logger.warning ---
                print(f"WARNING: FC41 Índice {index}: ID de esclavo incorrecto en cabecera. Esperado: {slave_id:02x}, Recibido: {header[0]:02x}. Cabecera: {' '.join([f'{b:02x}' for b in header])}")
                fragments[f"fragment_{index}"] = f"ERROR: ID incorrecto ({header[0]:02x})"
                time.sleep(0.5)
                continue
            if header[1] == 0xC1:
                error_payload = ser.read(2)
                full_error_response = header + error_payload
                error_code_hex = f"{error_payload[0]:02x}" if error_payload else "N/A"
                # --- Reemplazo de logger.warning ---
                print(f"WARNING: FC41 Índice {index}: Respuesta de error (0xC1). Código: {error_code_hex}. Respuesta completa aprox.: {' '.join([f'{b:02x}' for b in full_error_response])}")
                fragments[f"fragment_{index}"] = f"ERROR: Código {error_code_hex}"
                time.sleep(0.5)
                continue
            if header[1] != 0x41:
                 # --- Reemplazo de logger.warning ---
                print(f"WARNING: FC41 Índice {index}: Código de función inesperado. Esperado: 41, Recibido: {header[1]:02x}. Cabecera: {' '.join([f'{b:02x}' for b in header])}")
                fragments[f"fragment_{index}"] = f"ERROR: FC inesperada ({header[1]:02x})"
                time.sleep(0.5)
                continue

            response_type = header[3]
            additional_data = ser.read(100)
             # --- Reemplazo de logger.debug ---
            print(f"DEBUG: FC41 Índice {index} - Datos adicionales (tipo {response_type:02x}) recibidos (len={len(additional_data)}): {' '.join([f'{b:02x}' for b in additional_data[:30]])}...")

            full_response = header + additional_data
             # --- Reemplazo de logger.debug ---
            print(f"DEBUG: FC41 Índice {index} - Respuesta completa (len={len(full_response)}): {' '.join([f'{b:02x}' for b in full_response])}")

            if len(full_response) > 9:
                data_bytes = full_response[7:-2]
                 # --- Reemplazo de logger.debug ---
                print(f"DEBUG: FC41 Índice {index} - Bytes de datos brutos a decodificar (len={len(data_bytes)}): {' '.join([f'{b:02x}' for b in data_bytes])}")
                try:
                    text_data = data_bytes.decode('utf-8', errors='replace')
                    # --- Reemplazo de logger.debug ---
                    print(f"DEBUG: FC41 Índice {index} - Datos decodificados (UTF-8 replace): '{text_data[:80].replace(chr(13), '').replace(chr(10), '[NL]')}'...")
                    cleaned_text_data = ''.join(c if (ord(c) >= 32 and ord(c) <= 126) or c in ['\n', '\r', '\t'] else '' for c in text_data)
                    fragments[f"fragment_{index}"] = cleaned_text_data
                     # --- Reemplazo de logger.info ---
                    print(f"INFO: Datos índice {index} leídos y decodificados correctamente ({len(data_bytes)} bytes)")
                except Exception as e:
                    # --- Reemplazo de logger.warning ---
                    print(f"WARNING: Error al decodificar/procesar datos índice {index}: {str(e)}. Bytes crudos: {' '.join([f'{b:02x}' for b in data_bytes])}")
                    fragments[f"fragment_{index}"] = f"ERROR DE DECODIFICACIÓN: {str(e)}"
            else:
                 # --- Reemplazo de logger.warning ---
                print(f"WARNING: FC41 Índice {index}: Respuesta sin suficientes datos (len={len(full_response)}). {' '.join([f'{b:02x}' for b in full_response])}")
                fragments[f"fragment_{index}"] = f"ERROR: Respuesta corta (len={len(full_response)})"
            time.sleep(0.5)

        ser.close()
        # --- Reemplazo de logger.info ---
        print("INFO: Puerto serial directo cerrado después de autenticación y lectura")
        time.sleep(0.5)

        parsed_info = parse_device_info(fragments)
        global device_info_cache
        device_info_cache["is_authenticated"] = True
        device_info_cache["fragments"] = fragments
        device_info_cache["parsed_info"] = parsed_info
        device_info_cache["timestamp"] = time.time()
        device_info_cache["is_huawei"] = validate_device_manufacturer(parsed_info)

        port_config = connection_params.copy()
        # --- Reemplazo de logger.info ---
        print(f"INFO: Autenticación y lectura de información completada. Intentando reconectar cliente pymodbus con config: {port_config}")
        success, recon_msg = client.connect_client(**port_config) # connect_client ya usa print
        if not success:
            # --- Reemplazo de logger.warning ---
            # El mensaje ya viene de connect_client via print
            print(f"WARNING: ¡Fallo al reconectar el cliente PyModbus después de la autenticación! Mensaje: {recon_msg}")
        else:
            # --- Reemplazo de logger.info ---
            # El mensaje ya viene de connect_client via print
            # print("INFO: Cliente PyModbus reconectado exitosamente.")
            pass

        # --- Reemplazo de logger.info ---
        print("INFO: Retornando True desde authenticate_device.")
        return True

    except Exception as e:
        # --- Reemplazo de logger.error ---
        print(f"ERROR: Excepción CRÍTICA en authenticate_device: {str(e)}")
        # Imprimir traceback si es posible (solo funciona si sys está importado y se usa sys.exc_info())
        # import sys
        # print(f"ERROR: Traceback: {sys.exc_info()}")
        if ser and ser.is_open:
             # --- Reemplazo de logger.warning ---
            print("WARNING: Cerrando puerto serial debido a excepción.")
            ser.close()
        if port and was_connected:
             # --- Reemplazo de logger.warning ---
            print("WARNING: Intentando reconectar cliente PyModbus después de excepción...")
            port_config = connection_params.copy()
            client.connect_client(**port_config)

        # --- Reemplazo de logger.error ---
        print(f"ERROR: Retornando False desde authenticate_device debido a excepción: {e}")
        return False

def parse_device_info(fragments):
    """
    Procesa los fragmentos para extraer información estructurada.
    """
    parsed_info = {
        "manufacturer": "", "model": "", "barcode": "",
        "manufactured_date": "", "description": "",
        "info_version": "", "elabel_version": ""
    }
    combined_text = ""
    for i in range(6):
        key = f"fragment_{i}"
        if key in fragments and isinstance(fragments[key], str) and not fragments[key].startswith("ERROR"):
             combined_text += fragments[key] + "\n"

    # --- Reemplazo de logger.debug ---
    print(f"DEBUG: Texto combinado para parsear (primeros 200 chars): {combined_text[:200].replace(chr(10), '[NL]')}")

    patterns = {
        "manufacturer": ["VendorName=", "rName="], "model": ["Model=", "BoardType="],
        "barcode": ["BarCode="], "manufactured_date": ["Manufactured="],
        "info_version": ["ArchivesInfoVersion="], "elabel_version": ["ElabelVersion="]
    }

    for key, search_patterns in patterns.items():
        for pattern in search_patterns:
            pattern_pos = combined_text.lower().find(pattern.lower())
            if pattern_pos != -1:
                start_idx = pattern_pos + len(pattern)
                end_idx_lf = combined_text.find("\n", start_idx)
                end_idx_cr = combined_text.find("\r", start_idx)
                if end_idx_lf != -1 and end_idx_cr != -1: end_idx = min(end_idx_lf, end_idx_cr)
                elif end_idx_lf != -1: end_idx = end_idx_lf
                elif end_idx_cr != -1: end_idx = end_idx_cr
                else: end_idx = len(combined_text)
                value = combined_text[start_idx:end_idx].strip()
                value = ''.join(c for c in value if (ord(c) >= 32 and ord(c) <= 126))
                if value:
                    parsed_info[key] = value
                     # --- Reemplazo de logger.debug ---
                    print(f"DEBUG: Parseado: {key} = '{value}' (usando patrón '{pattern}')")
                    break

    desc_pattern = "Description="
    desc_pattern_pos = combined_text.lower().find(desc_pattern.lower())
    if desc_pattern_pos != -1:
        start_idx = desc_pattern_pos + len(desc_pattern)
        remaining_text = combined_text[start_idx:]
        end_markers = ["Manufactured=", "VendorName=", "rName=", "IssueNumber=", "CLEICode=", "BOM=", "Model=", "["]
        end_idx = len(remaining_text)
        for marker in end_markers:
            marker_pos = remaining_text.lower().find(marker.lower())
            if marker_pos != -1: end_idx = min(end_idx, marker_pos)
        description = remaining_text[:end_idx].strip()
        description = ' '.join(description.split())
        description = ''.join(c for c in description if (ord(c) >= 32 and ord(c) <= 126) or c == ' ')
        if description:
             parsed_info["description"] = description
              # --- Reemplazo de logger.debug ---
             print(f"DEBUG: Parseado: description = '{description}'")

    # --- Reemplazo de logger.info ---
    print(f"INFO: Información parseada final: {parsed_info}")
    return parsed_info

def validate_device_manufacturer(parsed_info):
    """
    Verifica que el dispositivo sea una batería Huawei.
    """
    manufacturer = parsed_info.get("manufacturer", "").lower()
    model = parsed_info.get("model", "").lower()

    if not manufacturer and not model:
         # --- Reemplazo de logger.warning ---
        print("WARNING: No se pudo determinar el fabricante ni el modelo del dispositivo desde la información parseada.")
        raw_fragments_text = " ".join(device_info_cache.get("fragments", {}).values()).lower()
        if "huawei" in raw_fragments_text:
              # --- Reemplazo de logger.warning ---
             print("WARNING: Se encontró 'huawei' en fragmentos crudos, asumiendo compatibilidad.")
             return True
        return False

    is_huawei_manufacturer = "huawei" in manufacturer
    is_huawei_model = model.startswith("esm")

    if is_huawei_manufacturer or is_huawei_model:
         # --- Reemplazo de logger.info ---
        print(f"INFO: Dispositivo compatible detectado (Fabricante: '{manufacturer}', Modelo: '{model}')")
        return True
    else:
        # --- Reemplazo de logger.error ---
        print(f"ERROR: Dispositivo incompatible detectado. Fabricante: '{manufacturer}', Modelo: '{model}'")
        return False

def get_cached_device_info():
    """
    Devuelve la información del dispositivo almacenada en caché.
    """
    global device_info_cache

    if not device_info_cache.get("is_authenticated", False):
        # --- Reemplazo de logger.warning ---
        print("WARNING: Intento de obtener info de caché sin autenticación previa.")
        return {
            "status": "error", "message": "Información no disponible. Se requiere autenticación.",
            "is_authenticated": False, "is_huawei": False
        }
    if not device_info_cache.get("fragments"):
         # --- Reemplazo de logger.warning ---
        print("WARNING: Info de caché solicitada, pero los fragmentos están vacíos.")
        return {
            "status": "error", "message": "Información no disponible. No se pudo leer la información del dispositivo durante la autenticación.",
            "is_authenticated": True, "is_huawei": False
        }
    if not device_info_cache.get("is_huawei", False):
        # --- Reemplazo de logger.error ---
        print("ERROR: ERROR FATAL: Dispositivo incompatible detectado en caché.")
        parsed = device_info_cache.get('parsed_info', {})
        mf = parsed.get('manufacturer', 'Desconocido')
        md = parsed.get('model', 'Desconocido')
        message = f"Dispositivo incompatible detectado (Fabricante: {mf}, Modelo: {md}). Solo baterías Huawei ESM son soportadas."
        return {
            "status": "error", "message": message, "fatal": True,
            "is_authenticated": True, "is_huawei": False, "parsed_info": parsed
        }

     # --- Reemplazo de logger.debug ---
    print("DEBUG: Devolviendo información del dispositivo desde caché.")
    cache_copy = {
        "status": "success", "message": "Información del dispositivo disponible desde caché",
        "fragments": device_info_cache["fragments"].copy(),
        "parsed_info": device_info_cache["parsed_info"].copy(),
        "timestamp": device_info_cache["timestamp"],
        "is_authenticated": True, "is_huawei": True
    }
    return cache_copy

def authenticate_and_read_device_info(slave_id=217):
    """
    Función completa que realiza la autenticación y lectura de información.
    """
     # --- Reemplazo de logger.info ---
    print(f"INFO: Iniciando proceso completo de autenticación y lectura para slave {slave_id}")
    reset_device_info() # Ya usa print
    auth_success = authenticate_device(slave_id) # Ya usa print

    if not auth_success:
         # --- Reemplazo de logger.error ---
        print("ERROR: Fallo en la secuencia de autenticación/lectura directa.")
        return {
            "status": "error", "message": "Fallo en la autenticación o lectura inicial del dispositivo.",
            "is_authenticated": False, "is_huawei": False
        }

     # --- Reemplazo de logger.info ---
    print("INFO: Autenticación/lectura directa exitosa. Obteniendo info de caché.")
    return get_cached_device_info() # Ya usa print