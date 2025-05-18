# modbus_app/device_info/device_cache.py
"""
Módulo para gestión de caché y procesamiento de datos de dispositivos.
Contiene funciones para almacenar, recuperar y procesar información de múltiples dispositivos.
"""

import time
import threading

# Variable global para almacenar la información de todos los dispositivos, indexada por ID
device_info_cache = {
    "by_id": {}  # Diccionario con device_id como clave
}

# Lock para acceso thread-safe
cache_lock = threading.RLock()

def get_device_info(device_id):
    """
    Obtiene la información de un dispositivo específico del caché.
    
    Args:
        device_id (int): ID del dispositivo
        
    Returns:
        dict: Información del dispositivo o mensaje de error
    """
    with cache_lock:
        if device_id not in device_info_cache["by_id"]:
            return {
                "status": "error",
                "message": f"No hay información disponible para el dispositivo {device_id}"
            }
        
        device_data = device_info_cache["by_id"][device_id]
        
        # Verificar si el dispositivo está autenticado
        if not device_data.get("is_authenticated", False):
            return {
                "status": "error", 
                "message": f"Dispositivo {device_id} no autenticado",
                "is_authenticated": False,
                "is_huawei": False
            }
        
        # Verificar si el dispositivo es Huawei
        if not device_data.get("is_huawei", False):
            parsed = device_data.get('parsed_info', {})
            mf = parsed.get('manufacturer', 'Desconocido')
            md = parsed.get('model', 'Desconocido')
            message = f"Dispositivo incompatible detectado (Fabricante: {mf}, Modelo: {md}). Solo baterías Huawei ESM son soportadas."
            
            return {
                "status": "error",
                "message": message,
                "fatal": True,
                "is_authenticated": True,
                "is_huawei": False,
                "parsed_info": parsed
            }
        
        # Todo bien, devolver una copia para evitar modificaciones accidentales
        return {
            "status": "success",
            "message": f"Información disponible para dispositivo {device_id}",
            "device_id": device_id,
            "combined_text": device_data.get("combined_text", ""),
            "fragments": device_data.get("fragments", {}),  # Mantener por compatibilidad
            "parsed_info": device_data.get("parsed_info", {}),
            "timestamp": device_data.get("timestamp"),
            "is_authenticated": True,
            "is_huawei": True
        }

def update_device_info(device_id, device_data):
    """
    Actualiza la información de un dispositivo en el caché.
    
    Args:
        device_id (int): ID del dispositivo
        device_data (dict): Información del dispositivo para almacenar
        
    Returns:
        bool: True si la operación fue exitosa
    """
    if not device_id or not isinstance(device_data, dict):
        return False
    
    # Extraer o procesar datos
    combined_text = device_data.get("combined_text", "")
    fragments = device_data.get("fragments", {})
    
    # Analizar el texto combinado
    parsed_info = parse_device_info_from_combined(combined_text)
    
    # Verificar si es un dispositivo Huawei
    is_huawei = validate_device_manufacturer(parsed_info)
    
    with cache_lock:
        # Actualizar caché para este dispositivo
        device_info_cache["by_id"][device_id] = {
            "is_authenticated": True,
            "fragments": fragments,  # Mantener por compatibilidad
            "combined_text": combined_text,
            "parsed_info": parsed_info,
            "timestamp": time.time(),
            "is_huawei": is_huawei
        }
    
    return True

def reset_device_info(device_id=None):
    """
    Reinicia la información del dispositivo.
    
    Args:
        device_id (int, opcional): ID del dispositivo a reiniciar. Si es None, reinicia todos.
        
    Returns:
        bool: True si la operación fue exitosa
    """
    with cache_lock:
        if device_id is None:
            # Reiniciar todo el caché
            device_info_cache["by_id"] = {}
            print("INFO: Caché de información de todos los dispositivos reiniciada")
        elif device_id in device_info_cache["by_id"]:
            # Reiniciar solo el dispositivo especificado
            del device_info_cache["by_id"][device_id]
            print(f"INFO: Caché de información del dispositivo {device_id} reiniciada")
        else:
            # El dispositivo no estaba en caché
            return False
    
    return True

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
    
    if not combined_text:
        return parsed_info
    
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
    
    return parsed_info

def validate_device_manufacturer(parsed_info):
    """
    Verifica que el dispositivo sea una batería Huawei.
    
    Args:
        parsed_info (dict): Información parseada del dispositivo
        
    Returns:
        bool: True si es un dispositivo Huawei compatible
    """
    manufacturer = parsed_info.get("manufacturer", "").lower()
    model = parsed_info.get("model", "").lower()

    if not manufacturer and not model:
        print("WARNING: No se pudo determinar el fabricante ni el modelo del dispositivo desde la información parseada.")
        return False

    is_huawei_manufacturer = "huawei" in manufacturer
    is_huawei_model = model.startswith("esm")

    if is_huawei_manufacturer or is_huawei_model:
        print(f"INFO: Dispositivo compatible detectado (Fabricante: '{manufacturer}', Modelo: '{model}')")
        return True
    else:
        print(f"ERROR: Dispositivo incompatible detectado. Fabricante: '{manufacturer}', Modelo: '{model}'")
        return False

def get_all_devices_info():
    """
    Obtiene información de todos los dispositivos en caché.
    
    Returns:
        dict: Información de todos los dispositivos indexada por ID
    """
    with cache_lock:
        # Devolver una copia para evitar modificaciones accidentales
        return {
            device_id: {
                "is_authenticated": data.get("is_authenticated", False),
                "is_huawei": data.get("is_huawei", False),
                "parsed_info": data.get("parsed_info", {}).copy(),
                "timestamp": data.get("timestamp")
            }
            for device_id, data in device_info_cache["by_id"].items()
        }

# Funciones auxiliares mantenidas para compatibilidad
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

# Funciones mantenidas para compatibilidad con código existente
def get_cached_device_info():
    """
    DEPRECATED: Use get_device_info(device_id) instead.
    Función mantenida para compatibilidad con código antiguo.
    """
    print("WARNING: Llamada a función obsoleta get_cached_device_info(). Use get_device_info(device_id) en su lugar.")
    with cache_lock:
        if not device_info_cache["by_id"]:
            return {
                "status": "error",
                "message": "No hay información de dispositivos en caché"
            }
        
        # Devolver información del primer dispositivo encontrado
        device_id = next(iter(device_info_cache["by_id"]))
        return get_device_info(device_id)

def parse_device_info(fragments):
    """
    DEPRECATED: Use parse_device_info_from_combined() instead.
    Procesa los fragmentos para extraer información estructurada.
    Mantenida para compatibilidad con código existente.
    
    Args:
        fragments (dict): Diccionario con los fragmentos obtenidos del dispositivo
        
    Returns:
        dict: Información estructurada del dispositivo
    """
    print("WARNING: Llamada a función obsoleta parse_device_info(). Use parse_device_info_from_combined() en su lugar.")
    
    # Combinar todos los fragmentos en una sola cadena
    combined_text = ""
    for i in range(6):  # Procesar índices 0-5
        fragment_key = f"fragment_{i}"
        if fragment_key in fragments and isinstance(fragments[fragment_key], str):
            # Ignorar fragmentos que son mensajes de error
            if not fragments[fragment_key].startswith("ERROR"):
                combined_text += fragments[fragment_key] + "\n"
    
    # Redirigir directamente a la función principal de análisis
    return parse_device_info_from_combined(combined_text)

def update_device_cache(device_data):
    """
    DEPRECATED: Use update_device_info(device_id, device_data) instead.
    Mantener para compatibilidad con código existente.
    
    Args:
        device_data: Diccionario con la información del dispositivo
        
    Returns:
        bool: True si la operación fue exitosa
    """
    print("WARNING: Llamada a función obsoleta update_device_cache(). Use update_device_info(device_id, device_data) en su lugar.")
    
    # Extraer ID del dispositivo desde los datos si es posible
    device_id = None
    if isinstance(device_data, dict) and "device_id" in device_data:
        device_id = device_data.get("device_id")
    
    if device_id is None:
        # Si no hay ID, tratar de usar el primer ID disponible o crear uno nuevo
        with cache_lock:
            if device_info_cache["by_id"]:
                device_id = next(iter(device_info_cache["by_id"]))
            else:
                device_id = 217  # ID por defecto
    
    # Actualizar usando la nueva función
    return update_device_info(device_id, device_data)