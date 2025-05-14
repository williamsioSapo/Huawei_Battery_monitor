# modbus_app/device_info/__init__.py
"""
Paquete para gestión de información de dispositivos Modbus.
Este módulo mantiene compatibilidad con el código que importa desde device_info.
"""

# Importar y reexportar elementos de device_cache.py
from .device_cache import (
    device_info_cache,
    reset_device_info,
    get_cached_device_info,
    update_device_cache,
    parse_device_info,
    parse_device_info_from_combined,
    validate_device_manufacturer,
    detect_date_format,
    normalize_manufacture_date
)

# Importar y reexportar elementos de device_communication.py
from .device_communication import (
    connection_params,
    compute_crc16,
    authenticate_device,
    authenticate_huawei_device,
    read_device_information
)

# Importar y reexportar elementos de device_info_manager.py usando try/except
# para evitar problemas si hay dependencias circulares
try:
    from .device_info_manager import (
        authenticate_and_read_device_info,
        get_default_slave_id,
        analyze_modbus_indices
    )
except ImportError:
    print("Advertencia: Algunas funciones de device_info_manager no pudieron importarse")
    # Proporcionar stubs vacíos para las funciones que no se pudieron importar
    def authenticate_and_read_device_info(slave_id=217):
        raise NotImplementedError("Función no disponible debido a error de importación")
        
    def get_default_slave_id():
        from modbus_app.config_manager import get_default_slave_id as get_config_default_slave_id
        return get_config_default_slave_id()
        
    def analyze_modbus_indices(fragments=None):
        raise NotImplementedError("Función no disponible debido a error de importación")