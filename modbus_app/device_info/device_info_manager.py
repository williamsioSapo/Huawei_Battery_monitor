# modbus_app/device_info/device_info_manager.py
"""
Módulo coordinador para operaciones con dispositivos.
Proporciona una API de alto nivel que utiliza los otros módulos.
"""
import time
import logging
from modbus_app.device_info.device_cache import get_device_info, update_device_info, reset_device_info

# Configurar logger para este módulo
logger = logging.getLogger('device_info_manager')

def authenticate_and_read_device_info(slave_id=217):
    """
    Función completa que realiza la autenticación y lectura de información.
    Adaptada para usar el nuevo sistema de caché con diferenciación por ID.
    
    Args:
        slave_id (int): ID del dispositivo a autenticar
        
    Returns:
        dict: Resultado de la operación con la información del dispositivo
    """
    logger.info(f"[Batería {slave_id}] Iniciando authenticate_and_read_device_info")
    
    # Importación retrasada para evitar ciclo
    from modbus_app.client import get_client
    client = get_client()
    
    # Ya no es necesario preservar el estado original del caché,
    # ya que cada dispositivo tiene su propia entrada en el caché global
    
    # Limpiar el caché específico para este dispositivo
    reset_device_info(slave_id)
    logger.info(f"[Batería {slave_id}] Caché reiniciado para nueva lectura")
    
    # Realizar autenticación
    from .device_communication import authenticate_device
    logger.info(f"[Batería {slave_id}] Iniciando autenticación")
    auth_success = authenticate_device(slave_id)
    logger.info(f"[Batería {slave_id}] Resultado de autenticación: {'ÉXITO' if auth_success else 'FALLO'}")
    
    if not auth_success:
        logger.error(f"[Batería {slave_id}] Fallo en la autenticación")
        return {
            "status": "error", 
            "message": f"Fallo en la autenticación de la batería {slave_id}.",
            "device_id": slave_id,
            "is_authenticated": False, 
            "is_huawei": False
        }
    
    # Obtener información del caché global
    logger.info(f"[Batería {slave_id}] Obteniendo información del caché")
    result = get_device_info(slave_id)
    
    if result["status"] != "success":
        logger.error(f"[Batería {slave_id}] No hay información disponible en el caché: {result.get('message')}")
        return result
    
    logger.info(f"[Batería {slave_id}] Información obtenida exitosamente")
    logger.debug(f"[Batería {slave_id}] Detalles: {result.get('parsed_info')}")
    
    return result

def get_default_slave_id():
    """Obtiene el ID de esclavo predeterminado de la configuración."""
    from modbus_app.config_manager import get_default_slave_id as get_config_default_slave_id
    return get_config_default_slave_id()

def analyze_modbus_indices(slave_id=None):
    """
    Analiza la información del dispositivo almacenada en caché.
    Actualizada para usar el nuevo caché por ID.
    
    Args:
        slave_id (int, opcional): ID del dispositivo a analizar. Si es None, usa el valor predeterminado.
        
    Returns:
        dict: Resumen del análisis para uso programático
    """
    # Si no se especifica ID, usar el predeterminado
    if slave_id is None:
        slave_id = get_default_slave_id()
    
    # Obtener información del dispositivo
    device_data = get_device_info(slave_id)
    if device_data["status"] != "success":
        logger.warning(f"No hay información disponible para el dispositivo {slave_id}")
        print(f"\n========== ANÁLISIS DE ÍNDICES MODBUS FC41 ==========")
        print(f"¡AVISO! No hay información disponible para el dispositivo {slave_id}")
        print("========== FIN DEL ANÁLISIS ==========")
        return {"valid_fragments": 0, "error_fragments": 0, "combined_fields": {}}
    
    # Obtener texto combinado
    combined_text = device_data.get("combined_text", "")
    if not combined_text:
        logger.warning(f"No hay texto combinado disponible para el dispositivo {slave_id}")
        print("\n========== ANÁLISIS DE ÍNDICES MODBUS FC41 ==========")
        print(f"¡AVISO! No hay texto combinado disponible para el dispositivo {slave_id}")
        print("========== FIN DEL ANÁLISIS ==========")
        return {"valid_fragments": 0, "error_fragments": 0, "combined_fields": {}}
    
    # Resultados para devolver
    results = {
        "valid_fragments": 1 if combined_text else 0,
        "error_fragments": 0,
        "combined_fields": {}
    }
    
    print(f"\n========== ANÁLISIS DE INFORMACIÓN MODBUS FC41 (Dispositivo {slave_id}) ==========")
    logger.info(f"Iniciando análisis de información Modbus FC41 para dispositivo {slave_id}")
    
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
    logger.info(f"Total de campos encontrados para dispositivo {slave_id}: {len(extracted_fields)}")
    
    if field_previews:
        print("\nCampos encontrados:")
        for preview in field_previews:
            print(f"  • {preview}")
            logger.debug(f"Campo para dispositivo {slave_id}: {preview}")
    
    # Verificar fecha de fabricación en el texto combinado
    if "Manufactured" in extracted_fields:
        raw_date = extracted_fields["Manufactured"]
        print(f"\n¡IMPORTANTE! Fecha de fabricación:")
        print(f"  • Valor: '{raw_date}'")
        
        from .device_cache import detect_date_format
        date_format = detect_date_format(raw_date)
        print(f"  • Formato detectado: {date_format}")
        
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