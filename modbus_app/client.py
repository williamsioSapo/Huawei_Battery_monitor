# modbus_app/client.py
import sys
from pymodbus.client import ModbusSerialClient
import importlib

# Variable global para mantener la instancia del cliente
modbus_client_instance = None
_is_connected = False  # Variable auxiliar para rastrear el estado de conexión

# Definición propia de connection_params para evitar dependencia circular
connection_params = {
    'port': None,
    'baudrate': 9600,
    'parity': 'N',
    'stopbits': 1,
    'bytesize': 8,
    'timeout': 1.0
}

# Determinar la versión de pymodbus
def get_pymodbus_version():
    try:
        import pymodbus
        return pymodbus.__version__
    except (ImportError, AttributeError):
        return "unknown"

PYMODBUS_VERSION = get_pymodbus_version()
print(f"Versión de pymodbus detectada: {PYMODBUS_VERSION}")

def get_client():
    """ Devuelve la instancia actual del cliente Modbus. """
    return modbus_client_instance

def connect_client(port, baudrate, parity, stopbits, bytesize, timeout):
    """ Crea y conecta un cliente Modbus Serial RTU. Cierra la conexión anterior si existe. """
    global modbus_client_instance, _is_connected, connection_params
    
    # Guardar parámetros para uso futuro
    connection_params['port'] = port
    connection_params['baudrate'] = baudrate
    connection_params['parity'] = parity
    connection_params['stopbits'] = stopbits
    connection_params['bytesize'] = bytesize
    connection_params['timeout'] = timeout
    
    # Cerrar conexión previa si existe
    if is_client_connected():
        disconnect_client()

    print(f"Intentando conectar a {port} ({baudrate},{bytesize}{parity}{stopbits} T:{timeout}s)") # Log
    try:
        modbus_client_instance = ModbusSerialClient(
            port=port,
            baudrate=baudrate,
            parity=parity,
            stopbits=stopbits,
            bytesize=bytesize,
            timeout=timeout,
            framer='rtu' # Especificar RTU
        )

        # Intentar la conexión
        connect_result = modbus_client_instance.connect()
        
        # En pymodbus 3.6.7, connect() puede devolver True/False o el propio cliente
        if connect_result is True or (connect_result and hasattr(connect_result, 'connect')):
            _is_connected = True
            print("Conexión Modbus establecida.") # Log
            return True, "Conexión establecida"
        else:
            _is_connected = False
            print("Fallo al conectar (connect() devolvió False).") # Log
            # Importante limpiar la instancia si connect() falla
            modbus_client_instance = None
            return False, "No se pudo conectar (connect() devolvió False)"
    except Exception as e:
        _is_connected = False
        print(f"Excepción al conectar: {e}") # Log
        modbus_client_instance = None # Limpiar en caso de excepción
        return False, f"Excepción al conectar: {str(e)}"
        
    
def disconnect_client():
    """ Cierra la conexión Modbus si está activa. """
    global modbus_client_instance, _is_connected

    if modbus_client_instance:
        try:
            modbus_client_instance.close()
            print("Cliente Modbus desconectado.") # Log
        except Exception as e:
            print(f"Error al desconectar: {e}")
        finally:
            # Importación retrasada para evitar ciclo
            from modbus_app.device_info.device_cache import reset_device_info
            # reset_device_info()  # Limpiar caché de información retirado no es nesesario.
            modbus_client_instance = None
            _is_connected = False
            return True
    else:
        print("No había conexión Modbus activa para desconectar.") # Log
        _is_connected = False
        return False # Indica que no se realizó ninguna desconexión

def is_client_connected():
    """ Verifica si el cliente Modbus está conectado (optimizado para v3.6.7). """
    global modbus_client_instance, _is_connected
    
    client = get_client()
    print(f"DEBUG: is_client_connected - Verificando conexión para: {client}")

    if client is None:
        print("DEBUG: is_client_connected - Cliente es None.")
        _is_connected = False
        return False

    # Para versión 3.6.7 específicamente
    try:
        # Estrategia 1: Verificar nuestro estado interno
        if _is_connected:
            print("DEBUG: is_client_connected - Usando estado interno _is_connected = True")
            
            # Verificación adicional: intentar ver si podemos acceder al transporte
            if hasattr(client, 'transport') and client.transport:
                print("DEBUG: is_client_connected - Transporte existe")
                
                # Si es un cliente serial, verificar el puerto serie
                if hasattr(client.transport, 'serial') and client.transport.serial:
                    if hasattr(client.transport.serial, 'is_open'):
                        port_open = client.transport.serial.is_open
                        print(f"DEBUG: is_client_connected - Puerto serie is_open = {port_open}")
                        _is_connected = port_open  # Actualizar nuestro estado
                        return port_open
            
            # Si llegamos aquí, no pudimos verificar el transporte, confiamos en nuestro estado
            return True
        
        # Estrategia 2: Intentar con los atributos específicos de la versión 3.6.7
        if hasattr(client, 'transport') and client.transport:
            if hasattr(client.transport, 'serial') and client.transport.serial:
                if hasattr(client.transport.serial, 'is_open'):
                    port_open = client.transport.serial.is_open
                    print(f"DEBUG: is_client_connected - Verificando puerto serie is_open = {port_open}")
                    _is_connected = port_open  # Actualizar estado interno
                    return port_open
        
        # Estrategia 3: La última opción es intentar el atributo is_connected
        if hasattr(client, 'is_connected'):
            if isinstance(client.is_connected, bool):
                print(f"DEBUG: is_client_connected - client.is_connected = {client.is_connected}")
                _is_connected = client.is_connected
                return client.is_connected
            # Si es una propiedad o método
            elif callable(getattr(client, 'is_connected', None)):
                try:
                    is_conn = client.is_connected()
                    print(f"DEBUG: is_client_connected - client.is_connected() = {is_conn}")
                    _is_connected = is_conn
                    return is_conn
                except:
                    pass
    
        # Estrategia 4: Intentar con el método de versiones anteriores
        if hasattr(client, 'is_socket_open') and callable(client.is_socket_open):
            try:
                socket_open = client.is_socket_open()
                print(f"DEBUG: is_client_connected - client.is_socket_open() = {socket_open}")
                _is_connected = socket_open
                return socket_open
            except:
                pass
            
        # Si llegamos aquí, no pudimos determinar el estado
        print("DEBUG: is_client_connected - No se pudo determinar el estado de conexión")
        return False
        
    except Exception as e:
        print(f"ERROR INESPERADO al verificar conexión: {e}", file=sys.stderr)
        _is_connected = False
        return False
    
def get_client_port():
    """ 
    Devuelve el puerto de la conexión actual o None si no hay conexión.
    """
    global connection_params
    return connection_params.get('port') if is_client_connected() else None

# Función para obtener información del dispositivo desde caché
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
        from modbus_app import config_manager
        slave_id = config_manager.get_default_slave_id()
        
        # Obtener información directamente del caché global
        from modbus_app.device_info.device_cache import get_device_info as get_cached_device_info
        return get_cached_device_info(slave_id)
    except Exception as e:
        print(f"Error al obtener información del dispositivo: {str(e)}")
        return {
            "status": "error",
            "message": f"Error al obtener información de la batería: {str(e)}"
        }