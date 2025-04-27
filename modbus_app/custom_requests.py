# modbus_app/custom_requests.py
from pymodbus.pdu import ModbusRequest, ModbusResponse

CUSTOM_FUNC_CODE = 0x41

class ReadDeviceInfoRequest(ModbusRequest):
    """
    Petición Modbus personalizada para leer información del dispositivo (FC41).
    Nota: Esta clase existe principalmente por compatibilidad, ya que la lectura
    real se hace a bajo nivel durante la autenticación.
    """
    function_code = CUSTOM_FUNC_CODE

    def __init__(self, index=0, **kwargs):
        ModbusRequest.__init__(self, **kwargs)
        self.index = index # El índice del fragmento de información a leer (0-5)

    def encode(self):
        """ Codifica el payload de la petición. """
        payload = bytearray([0x06, 0x03, 0x04, 0x00, self.index])
        return payload

    def decode(self, data):
        """ No necesita decodificar la respuesta de la petición. """
        pass

    def __str__(self):
        """ Representación legible de la petición. """
        return
    def __str__(self):
        """ Representación legible de la petición. """
        return f"ReadDeviceInfoRequest(FC={self.function_code}, Index={self.index})"


class ReadDeviceInfoResponse(ModbusResponse):
    """
    Respuesta Modbus personalizada para la información del dispositivo (FC41).
    Nota: Esta clase existe principalmente por compatibilidad, ya que la lectura
    real se hace a bajo nivel durante la autenticación.
    """
    function_code = CUSTOM_FUNC_CODE

    def __init__(self, info_data=b'', **kwargs):
        ModbusResponse.__init__(self, **kwargs)
        self.info_data = info_data # Los datos ASCII crudos
        self.response_type = None  # Para almacenar el tipo de respuesta (0x43 o 0x1F)

    def decode(self, data):
        """
        Decodifica los datos de la respuesta.
        Nota: Esta función es principalmente por compatibilidad.
        """
        if len(data) < 4:
            self.info_data = b'' # No hay datos suficientes
            return
            
        # Detectar tipo de respuesta (0x43 o 0x1F)
        self.response_type = data[2] if len(data) > 2 else None
        
        # Determinar cabecera según el tipo de respuesta
        if self.response_type == 0x43:
            # Formato normal: d9 41 06 43 04 00 XX [DATOS]
            header_length = 7  # Longitud cabecera
        elif self.response_type == 0x1F:
            # Formato alternativo: d9 41 06 1F 04 00 XX [DATOS]
            header_length = 7  # Longitud cabecera
        else:
            # Valor por defecto
            header_length = 7
        
        # Extraer datos después de la cabecera
        if len(data) > header_length:
            self.info_data = data[header_length:]
        else:
            self.info_data = b''

    def encode(self):
        """ No necesita codificar una petición. """
        pass

    def __str__(self):
        """ Representación legible de la respuesta. """
        preview = self.info_data[:30].decode('utf-8', errors='ignore') + ('...' if len(self.info_data) > 30 else '')
        return f"ReadDeviceInfoResponse(FC={self.function_code}, Type={self.response_type}, Data='{preview}')"

# Podrías añadir más clases aquí si descubres otras funciones personalizadas.
