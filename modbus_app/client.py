# modbus_app/client.py
import sys
import logging
from .huawei_client import HuaweiModbusClient, get_huawei_client, set_huawei_client, create_huawei_client

logger = logging.getLogger('client')


def get_client():
    """Devuelve la instancia actual del cliente Huawei desde BatteryInitializer."""
    try:
        from .battery_initializer import BatteryInitializer
        initializer = BatteryInitializer.get_instance()
        return initializer._huawei_client if initializer else None
    except:
        return None


def is_client_connected():
    """Verifica si el cliente está conectado - delegado al BatteryInitializer."""
    try:
        from .battery_initializer import BatteryInitializer
        initializer = BatteryInitializer.get_instance()
        if initializer and initializer._huawei_client:
            return initializer._huawei_client.is_socket_open()
        return False
    except:
        return False


def get_device_info():
    """
    Función para obtener información del dispositivo desde el caché global.
    
    Returns:
        dict: Información del dispositivo o error
    """
    if not is_client_connected():
        return {
            "status": "error",
            "message": "No hay conexión activa con el dispositivo"
        }
        
    try:
        # Obtener ID de batería activo
        from . import config_manager
        slave_id = config_manager.get_default_slave_id()
        
        # Obtener información directamente del caché global
        from .device_info.device_cache import get_device_info as get_cached_device_info
        return get_cached_device_info(slave_id)
    except Exception as e:
        print(f"Error al obtener información del dispositivo: {str(e)}")
        return {
            "status": "error",
            "message": f"Error al obtener información de la batería: {str(e)}"
        }


def authenticate_battery(slave_id):
    """
    Autentica una batería usando el BatteryInitializer.
    
    Args:
        slave_id (int): ID de la batería
        
    Returns:
        bool: True si la autenticación fue exitosa
    """
    if not is_client_connected():
        logger.error("No hay conexión activa para autenticación")
        return False
    
    try:
        from .battery_initializer import BatteryInitializer
        initializer = BatteryInitializer.get_instance()
        if initializer and initializer._huawei_client:
            return initializer._huawei_client.authenticate_battery(slave_id)
        return False
    except Exception as e:
        logger.error(f"Error autenticando batería {slave_id}: {str(e)}")
        return False


def get_authenticated_batteries():
    """
    Obtiene la lista de baterías autenticadas.
    
    Returns:
        set: Conjunto de IDs de baterías autenticadas
    """
    if not is_client_connected():
        return set()
    
    try:
        from .battery_initializer import BatteryInitializer
        initializer = BatteryInitializer.get_instance()
        if initializer and initializer._huawei_client:
            return initializer._huawei_client.get_authenticated_batteries()
        return set()
    except Exception as e:
        logger.error(f"Error obteniendo baterías autenticadas: {str(e)}")
        return set()


def read_device_info_fc41(slave_id, info_index):
    """
    Lee información del dispositivo usando FC41.
    
    Args:
        slave_id (int): ID de la batería
        info_index (int): Índice de información (0-5)
        
    Returns:
        dict: Información del dispositivo
    """
    if not is_client_connected():
        return {"success": False, "error": "No hay conexión activa"}
    
    try:
        from .battery_initializer import BatteryInitializer
        initializer = BatteryInitializer.get_instance()
        if initializer and initializer._huawei_client:
            return initializer._huawei_client.read_device_info(slave_id, info_index)
        return {"success": False, "error": "No hay inicializador disponible"}
    except Exception as e:
        logger.error(f"Error leyendo device info FC41: {str(e)}")
        return {"success": False, "error": str(e)}


def get_connection_info():
    """
    Obtiene información detallada de la conexión actual.
    
    Returns:
        dict: Información de la conexión
    """
    if not is_client_connected():
        return {"connected": False, "error": "No hay conexión activa"}
    
    try:
        from .battery_initializer import BatteryInitializer
        initializer = BatteryInitializer.get_instance()
        if initializer and initializer._huawei_client:
            return initializer._huawei_client.get_connection_info()
        return {"connected": False, "error": "No hay inicializador disponible"}
    except Exception as e:
        logger.error(f"Error obteniendo info de conexión: {str(e)}")
        return {"connected": False, "error": str(e)}