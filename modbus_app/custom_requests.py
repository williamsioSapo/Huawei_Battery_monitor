# modbus_app/custom_requests.py
from pymodbus.pdu import ModbusRequest, ModbusResponse
import struct

CUSTOM_FUNC_CODE = 0x41
# Podríamos hacer el prefijo más flexible si es necesario,
# pero por ahora lo dejamos como en las capturas.
FIXED_REQUEST_PREFIX = b'\x06\x03\x04\x00'

class ReadDeviceInfoRequest(ModbusRequest):
    """
    Petición Modbus personalizada para leer información del dispositivo (FC41).
    Asume que el payload de la petición consiste en un prefijo fijo
    seguido de un índice de 1 byte.
    """
    function_code = CUSTOM_FUNC_CODE

    def __init__(self, index=0, **kwargs):
        ModbusRequest.__init__(self, **kwargs)
        self.index = index # El índice del fragmento de información a leer (0-5)

    def encode(self):
        """ Codifica el payload de la petición. """
        # Payload = Prefijo Fijo + Índice (1 byte)
        payload = FIXED_REQUEST_PREFIX + struct.pack('>B', self.index)
        return payload

    def decode(self, data):
        """ No necesita decodificar la respuesta de la petición. """
        pass

    # No se necesita 'execute' en la petición del lado del cliente.

    def __str__(self):
        """ Representación legible de la petición. """
        return f"ReadDeviceInfoRequest(FC={self.function_code}, Index={self.index})"


class ReadDeviceInfoResponse(ModbusResponse):
    """
    Respuesta Modbus personalizada para la información del dispositivo (FC41).
    Intenta extraer los datos ASCII crudos de la respuesta.
    """
    function_code = CUSTOM_FUNC_CODE

    def __init__(self, info_data=b'', **kwargs):
        ModbusResponse.__init__(self, **kwargs)
        self.info_data = info_data # Los datos ASCII crudos

    def decode(self, data):
        """
        Decodifica los datos de la respuesta.
        Asume que los primeros 6 bytes después del FC son cabecera.
        ¡Esto podría necesitar ajuste basado en el formato real!
        """
        # El byte 'data[0]' ya es el function_code (quitado por Pymodbus antes de llamar a decode)
        # Por lo tanto, la 'cabecera' empieza desde data[0] en este contexto.
        header_length = 6 # Asumimos 6 bytes de cabecera (ej: 06 43 04 00 0X)
        if len(data) > header_length:
            self.info_data = data[header_length:]
        else:
            self.info_data = b'' # No hay datos suficientes

    def encode(self):
        """ No necesita codificar una petición. """
        pass

    def __str__(self):
        """ Representación legible de la respuesta. """
        # Devuelve solo una porción para evitar imprimir mucho texto
        preview = self.info_data[:30].decode('utf-8', errors='ignore') + ('...' if len(self.info_data) > 30 else '')
        return f"ReadDeviceInfoResponse(FC={self.function_code}, Data='{preview}')"

# Podrías añadir más clases aquí si descubres otras funciones personalizadas.