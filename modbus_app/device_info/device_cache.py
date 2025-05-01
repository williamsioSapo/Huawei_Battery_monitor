# modbus_app/device_info/device_cache.py
"""
Módulo para gestión de caché y procesamiento de datos de dispositivos.
Contiene funciones para almacenar, recuperar y procesar información de dispositivos.
"""

import time

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