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

# Importar y reexportar elementos de device_info_manager.py
from .device_info_manager import (
    authenticate_and_read_device_info,
    get_default_slave_id,
    analyze_modbus_indices
)

# De este modo, el código que antes hacía:
# from modbus_app import device_info
# device_info.get_cached_device_info()
# seguirá funcionando sin cambios