# modbus_app/huawei_client/__init__.py
"""
Cliente Modbus personalizado para baterías Huawei ESM.
Reemplaza PyModbus con implementación nativa optimizada.
"""

from .core import HuaweiModbusClient, ModbusResponse
from .protocol import ModbusProtocol
from .authentication import HuaweiAuthentication

# Instancia global del cliente (para compatibilidad con código existente)
_global_client = None

def get_huawei_client():
    """Obtiene la instancia global del cliente Huawei."""
    global _global_client
    return _global_client

def set_huawei_client(client):
    """Establece la instancia global del cliente Huawei."""
    global _global_client
    _global_client = client

def create_huawei_client(port, baudrate=9600, parity='N', stopbits=1, bytesize=8, timeout=1.0):
    """
    Crea y configura una nueva instancia del cliente Huawei.
    
    Args:
        port: Puerto serial
        baudrate: Velocidad de comunicación
        parity: Paridad
        stopbits: Bits de parada
        bytesize: Bits de datos
        timeout: Timeout base
        
    Returns:
        HuaweiModbusClient: Nueva instancia del cliente
    """
    return HuaweiModbusClient(
        port=port,
        baudrate=baudrate,
        parity=parity,
        stopbits=stopbits,
        bytesize=bytesize,
        timeout=timeout
    )

# Exportar elementos principales
__all__ = [
    'HuaweiModbusClient',
    'ModbusResponse', 
    'ModbusProtocol',
    'HuaweiAuthentication',
    'get_huawei_client',
    'set_huawei_client',
    'create_huawei_client'
]