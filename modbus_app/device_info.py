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
    "fragments": {},  # Mantener por compatibilidad
    "combined_text": "",  # Añadir texto combinado
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
        "fragments": {},  # Mantener por compatibilidad
        "combined_text": "",  # Añadir texto combinado
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

    # Cerrar temporalmente el cliente actual para liberar el puerto serial
    was_connected = client.is_client_connected()
    try:
        if was_connected:
            client.disconnect_client()
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
        update_device_cache(device_data)

        # Reconectar el cliente Modbus si estaba conectado
        if was_connected:
            port_config = connection_params.copy()
            print(f"INFO: Intentando reconectar cliente pymodbus con config: {port_config}")
            success, recon_msg = client.connect_client(**port_config)
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
            client.connect_client(**port_config)

        print(f"ERROR: Retornando False desde authenticate_device debido a excepción: {e}")
        return False

def parse_device_info(fragments):
    """
    Procesa los fragmentos para extraer información estructurada.
    NOTA: Esta función ahora simplemente combina los fragmentos y
    redirige a parse_device_info_from_combined.
    
    Args:
        fragments (dict): Diccionario con los fragmentos obtenidos del dispositivo
        
    Returns:
        dict: Información estructurada del dispositivo
    """
    # Combinar todos los fragmentos en una sola cadena
    combined_text = ""
    for i in range(6):  # Procesar índices 0-5
        fragment_key = f"fragment_{i}"
        if fragment_key in fragments and isinstance(fragments[fragment_key], str):
            # Ignorar fragmentos que son mensajes de error
            if not fragments[fragment_key].startswith("ERROR"):
                combined_text += fragments[fragment_key] + "\n"
    
    # Redirigir directamente a la función principal de análisis
    # Nota: Eliminamos el parámetro 'fragments' que era redundante
    return parse_device_info_from_combined(combined_text)

def parse_device_info_from_combined(combined_text):
    """
    Procesa el texto combinado de todos los índices ya decodificado.
    
    Args:
        combined_text (str): Texto combinado de todos los índices
        
    Returns:
        dict: Información estructurada del dispositivo
    """
    parsed_info = {
        "manufacturer": "",
        "model": "",
        "barcode": "",
        "manufactured_date": "",
        "description": "",
        "info_version": "",
        "elabel_version": ""
    }
    
    print(f"DEBUG: Analizando texto combinado ({len(combined_text)} caracteres)")
    
    # Definir patrones de búsqueda para cada campo
    patterns = {
        "manufacturer": ["VendorName="],
        "model": ["BoardType=", "Model="],
        "barcode": ["BarCode="],
        "manufactured_date": ["Manufactured="],
        "description": ["Description="],
        "info_version": ["ArchivesInfoVersion="],
        "elabel_version": ["ElabelVersion=", "/$ElabelVersion="]
    }
    
    # Extraer cada campo usando los patrones
    for field, search_patterns in patterns.items():
        for pattern in search_patterns:
            pos = combined_text.find(pattern)
            if pos != -1:
                # Extraer desde el patrón hasta el siguiente salto de línea
                start_pos = pos + len(pattern)
                end_pos = combined_text.find("\n", start_pos)
                if end_pos == -1:
                    end_pos = combined_text.find("\r", start_pos)
                if end_pos == -1:
                    end_pos = len(combined_text)
                
                value = combined_text[start_pos:end_pos].strip()
                
                # Limpiar el valor
                value = ''.join(c for c in value if (ord(c) >= 32 and ord(c) <= 126))
                
                if value:
                    parsed_info[field] = value
                    print(f"DEBUG: {field} = '{value}' (usando patrón '{pattern}')")
                    break
    
    # Normalizar la fecha de fabricación si es necesario
    if parsed_info["manufactured_date"]:
        date_value = parsed_info["manufactured_date"]
        normalized_date = normalize_manufacture_date(date_value)
        if normalized_date != date_value:
            parsed_info["manufactured_date"] = normalized_date
            print(f"DEBUG: Fecha normalizada: '{normalized_date}' (original: '{date_value}')")
    
    # Actualizar el caché global con la información parseada
    device_info_cache["parsed_info"] = parsed_info
    
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
        print("WARNING: Intento de obtener info de caché sin autenticación previa.")
        return {
            "status": "error", "message": "Información no disponible. Se requiere autenticación.",
            "is_authenticated": False, "is_huawei": False
        }
    if not device_info_cache.get("combined_text"):
        print("WARNING: Info de caché solicitada, pero el texto combinado está vacío.")
        return {
            "status": "error", "message": "Información no disponible. No se pudo leer la información del dispositivo durante la autenticación.",
            "is_authenticated": True, "is_huawei": False
        }
    if not device_info_cache.get("is_huawei", False):
        print("ERROR: ERROR FATAL: Dispositivo incompatible detectado en caché.")
        parsed = device_info_cache.get('parsed_info', {})
        mf = parsed.get('manufacturer', 'Desconocido')
        md = parsed.get('model', 'Desconocido')
        message = f"Dispositivo incompatible detectado (Fabricante: {mf}, Modelo: {md}). Solo baterías Huawei ESM son soportadas."
        return {
            "status": "error", "message": message, "fatal": True,
            "is_authenticated": True, "is_huawei": False, "parsed_info": parsed
        }

    print("DEBUG: Devolviendo información del dispositivo desde caché.")
    cache_copy = {
        "status": "success", "message": "Información del dispositivo disponible desde caché",
        "fragments": device_info_cache["fragments"].copy(),  # Mantener por compatibilidad
        "combined_text": device_info_cache["combined_text"],  # Añadir texto combinado
        "parsed_info": device_info_cache["parsed_info"].copy(),
        "timestamp": device_info_cache["timestamp"],
        "is_authenticated": True, "is_huawei": True
    }
    return cache_copy

def authenticate_and_read_device_info(slave_id=217):
    """
    Función completa que realiza la autenticación y lectura de información.
    """
     
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

     
    print("INFO: Autenticación/lectura directa exitosa. Obteniendo info de caché.")
    return get_cached_device_info() # Ya usa print

def get_default_slave_id():
    """Obtiene el ID de esclavo predeterminado de la configuración."""
    from . import config_manager
    return config_manager.get_default_slave_id()

def analyze_modbus_indices(fragments=None):
    """
    Analiza la información del dispositivo almacenada en caché.
    Esta función ahora trabaja directamente con el texto combinado en el caché.
    
    Args:
        fragments (dict, opcional): Para compatibilidad, no se usa
        
    Returns:
        dict: Resumen del análisis para uso programático
    """
    # Obtener texto combinado del caché
    combined_text = device_info_cache.get("combined_text", "")
    if not combined_text:
        print("\n========== ANÁLISIS DE ÍNDICES MODBUS FC41 ==========")
        print("¡AVISO! No hay texto combinado disponible en caché.")
        print("========== FIN DEL ANÁLISIS ==========")
        return {"valid_fragments": 0, "error_fragments": 0, "combined_fields": {}}
    
    # Resultados para devolver
    results = {
        "valid_fragments": 1 if combined_text else 0,
        "error_fragments": 0,
        "combined_fields": {}
    }
    
    print("\n========== ANÁLISIS DE INFORMACIÓN MODBUS FC41 ==========")
    
    # Extraer todos los campos del texto combinado
    extracted_fields = {}
    field_previews = []
    
    if combined_text:
        lines = combined_text.split('\n')
        for line in lines:
            if '=' in line:
                parts = line.split('=', 1)
                key = parts[0].strip()
                value = parts[1].strip()
                extracted_fields[key] = value
                # Preparar vista previa limitada a 40 caracteres
                preview = f"{key}={value[:40]}" + ("..." if len(value) > 40 else "")
                field_previews.append(preview)
    
    results["combined_fields"] = extracted_fields
    
    # Mostrar análisis del contenido combinado
    print("\n----- ANÁLISIS DEL CONTENIDO -----")
    print(f"Total de campos encontrados: {len(extracted_fields)}")
    if field_previews:
        print("\nCampos encontrados:")
        for preview in field_previews:
            print(f"  • {preview}")
    
    # Verificar fecha de fabricación en el texto combinado
    if "Manufactured" in extracted_fields:
        raw_date = extracted_fields["Manufactured"]
        print(f"\n¡IMPORTANTE! Fecha de fabricación:")
        print(f"  • Valor: '{raw_date}'")
        print(f"  • Formato detectado: {detect_date_format(raw_date)}")
        normalized_date = normalize_manufacture_date(raw_date)
        if normalized_date != raw_date:
            print(f"  • Fecha normalizada: '{normalized_date}'")
    else:
        print("\n¡ALERTA! No se encontró 'Manufactured=' en el texto.")
    
    # Mostrar el texto combinado completo para referencia (limitado a 500 caracteres)
    print("\n----- TEXTO COMPLETO (PRIMEROS 500 CARACTERES) -----")
    print(combined_text[:500] + ("..." if len(combined_text) > 500 else ""))
    
    print("\n========== FIN DEL ANÁLISIS ==========")
    return results

# Esta función ya la habíamos definido antes, se incluye por completitud

def detect_date_format(date_str):
    """
    Detecta el formato de una cadena de fecha y devuelve una descripción.
    
    Args:
        date_str (str): Cadena de fecha a analizar
        
    Returns:
        str: Descripción del formato detectado
    """
    if not date_str:
        return "VACÍO"
        
    if date_str.isdigit():
        if len(date_str) == 2:
            return f"Año corto (20{date_str})"
        elif len(date_str) == 4:
            return f"Año completo ({date_str})"
        elif len(date_str) >= 8:
            return "Posible timestamp numérico"
    
    if "-" in date_str:
        parts = date_str.split("-")
        if len(parts) == 3:
            return f"Fecha ISO (YYYY-MM-DD)"
    
    if "/" in date_str:
        return "Fecha con separador /"
    
    return "Formato desconocido"

def normalize_manufacture_date(date_str):
    """
    Normaliza el formato de la fecha de fabricación.
    
    Args:
        date_str (str): Fecha en formato original
        
    Returns:
        str: Fecha normalizada o la original si no se pudo normalizar
    """
    # Si está vacía, devolver vacío
    if not date_str:
        return ""
    
    # Si es solo un año corto (ej: "20")
    if date_str.isdigit() and len(date_str) == 2:
        return f"20{date_str}"  # Asumir 2000s (ej: "2020")
    
    # Si es solo un año completo (ej: "2020")
    if date_str.isdigit() and len(date_str) == 4:
        return date_str
    
    # Si ya tiene formato YYYY-MM-DD, dejarlo como está
    if len(date_str) == 10 and date_str[4] == '-' and date_str[7] == '-':
        return date_str
    
    # Si tiene formato YY-MM-DD, convertir a YYYY-MM-DD
    if len(date_str) == 8 and date_str[2] == '-' and date_str[5] == '-':
        year_part = date_str[0:2]
        rest_part = date_str[2:]
        return f"20{year_part}{rest_part}"
    
    # Para cualquier otro formato, devolver el original
    return date_str

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
def update_device_cache(device_data):
    """
    Actualiza la caché con la información del dispositivo.
    
    Args:
        device_data: Diccionario con la información del dispositivo
        
    Returns:
        None
    """
    # Extraer datos
    fragments = device_data.get("fragments", {})
    combined_text = device_data.get("combined_text", "")
    
    # Analizar el texto combinado
    parsed_info = parse_device_info_from_combined(combined_text)
    
    # Actualizar caché global
    global device_info_cache
    device_info_cache["is_authenticated"] = True
    device_info_cache["fragments"] = fragments  # Mantener por compatibilidad
    device_info_cache["combined_text"] = combined_text
    device_info_cache["parsed_info"] = parsed_info
    device_info_cache["timestamp"] = time.time()
    device_info_cache["is_huawei"] = validate_device_manufacturer(parsed_info)