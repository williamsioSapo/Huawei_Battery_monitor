# modbus_app/device_info/device_info_manager.py
"""
Módulo coordinador para operaciones con dispositivos.
Proporciona una API de alto nivel que utiliza los otros módulos.
"""

import time
from .device_cache import get_cached_device_info, reset_device_info, device_info_cache
from .device_communication import authenticate_device

# Mantener una referencia al cliente para uso dentro del módulo
client = None

def authenticate_and_read_device_info(slave_id=217):
    """
    Función completa que realiza la autenticación y lectura de información.
    
    Modificada para trabajar con diferentes IDs de batería sin interferir con la conexión principal.
    """
    # Importación retrasada para evitar ciclo
    from modbus_app.client import get_client
    client = get_client()
    
    print(f"INFO: Iniciando proceso completo de autenticación y lectura para slave {slave_id}")
    
    # Importación retrasada para evitar ciclo
    from .device_cache import device_info_cache as current_cache
    from .device_cache import reset_device_info, get_cached_device_info
    
    # Guardar el estado actual antes de modificar
    original_cache = current_cache.copy()
    
    # Resetear para esta lectura específica
    reset_device_info()
    
    # Realizar autenticación y lectura para este ID específico
    from .device_communication import authenticate_device
    auth_success = authenticate_device(slave_id)

    if not auth_success:
        print("ERROR: Fallo en la secuencia de autenticación/lectura directa.")
        
        # Restaurar el estado original
        from .device_cache import device_info_cache
        # Restaurar el estado original completo
        for key, value in original_cache.items():
            device_info_cache[key] = value
        
        return {
            "status": "error", 
            "message": f"Fallo en la autenticación o lectura inicial de la batería {slave_id}.",
            "is_authenticated": False, 
            "is_huawei": False
        }

    print("INFO: Autenticación/lectura directa exitosa. Obteniendo info de caché.")
    result = get_cached_device_info()
    
    # Restaurar el estado original después de obtener la información
    from .device_cache import device_info_cache
    # Restaurar el estado original completo
    for key, value in original_cache.items():
        device_info_cache[key] = value
    
    return result

def get_default_slave_id():
    """Obtiene el ID de esclavo predeterminado de la configuración."""
    from modbus_app.config_manager import get_default_slave_id as get_config_default_slave_id
    return get_config_default_slave_id()

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
    from .device_cache import device_info_cache
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
        from .device_cache import detect_date_format
        print(f"  • Formato detectado: {detect_date_format(raw_date)}")
        from .device_cache import normalize_manufacture_date
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