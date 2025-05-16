# app.py
import io
import sys
import threading
import time
from collections import deque
from flask import Flask, render_template, request, jsonify
from modbus_app.battery_monitor import BatteryMonitor
from modbus_app.battery_initializer import BatteryInitializer
from modbus_app.authentication_status import (
    format_all_batteries_status_for_api,
    format_battery_status_for_api,
    reset_battery_status,
    all_batteries_authenticated,
    get_failed_batteries,
    authentication_is_complete
)
# Cola circular para almacenar los últimos mensajes (limitada a 500 mensajes)
console_messages = deque(maxlen=500)
battery_monitor = BatteryMonitor()
# Importar funciones de los módulos separados
from modbus_app.operations import execute_read_operation, execute_write_operation, execute_read_device_info, verify_battery_cell_data
# CORRECCIÓN: Importar correctamente las funciones de client
from modbus_app.client import connect_client, disconnect_client, is_client_connected, get_device_info
# CORRECCIÓN: También importamos device_info para acceder a get_cached_device_info
from modbus_app import device_info

app = Flask(__name__)

# Clase para capturar la salida de print()
class ConsoleCapturer(io.StringIO):
    def write(self, text):
        if text.strip():  # Ignorar líneas vacías
            console_messages.append(text.rstrip())
        return super().write(text)

# Reemplazar sys.stdout para capturar todos los print()
original_stdout = sys.stdout
sys.stdout = ConsoleCapturer()

# Función para verificar si la autenticación está completa
def verify_authentication_complete():
    """
    Verifica si todas las baterías están correctamente autenticadas.
    Si no están autenticadas, prepara una respuesta de error.
    
    Returns:
        dict or None: Respuesta de error JSON o None si la autenticación está completa
    """
    if not all_batteries_authenticated():
        failed_batteries = get_failed_batteries()
        battery_list = ", ".join([str(b) for b in failed_batteries]) if failed_batteries else "desconocidas"
        
        return {
            "status": "error",
            "message": f"Operación no permitida: Algunas baterías no están autenticadas ({battery_list})",
            "auth_requires_action": True,
            "failed_batteries": failed_batteries
        }
    
    return None

# Endpoint para obtener los mensajes de consola
@app.route('/api/console', methods=['GET'])
def get_console_messages():
    # Obtener solo mensajes nuevos desde last_id
    last_id = request.args.get('last_id', '0')
    try:
        last_id = int(last_id)
    except ValueError:
        last_id = 0
    
    # Devolver los mensajes más recientes con sus IDs
    messages = list(console_messages)[last_id:]
    return jsonify({
        "messages": messages,
        "last_id": last_id + len(messages)
    })
    
@app.route('/')
def index():
    """ Sirve la página principal. """
    return render_template('index.html')

@app.route('/api/batteries', methods=['GET'])
def list_batteries_api():
    """Endpoint para obtener las baterías disponibles configuradas."""
    from modbus_app import config_manager  # Nuevo módulo a crear
    return jsonify(config_manager.get_available_batteries())

@app.route('/api/auth_status', methods=['GET'])
def get_auth_status():
    """Endpoint para obtener el estado de autenticación de todas las baterías."""
    return jsonify(format_all_batteries_status_for_api())

@app.route('/api/auth_status/<int:battery_id>', methods=['GET'])
def get_battery_auth_status(battery_id):
    """Endpoint para obtener el estado de autenticación de una batería específica."""
    return jsonify(format_battery_status_for_api(battery_id))

@app.route('/api/auth_status/<int:battery_id>/reset', methods=['POST'])
def reset_auth_status(battery_id):
    """Endpoint para reiniciar el estado de autenticación de una batería."""
    reset_battery_status(battery_id)
    return jsonify({
        "status": "success",
        "message": f"Estado de autenticación para batería {battery_id} reiniciado"
    })


# Nuevo endpoint para reintentar baterías específicas
@app.route('/api/retry_initialize_battery/<int:battery_id>', methods=['POST'])
def retry_initialize_battery_api(battery_id):
    """
    Endpoint para reintentar la inicialización de una batería específica.
    """
    try:
        # Verificar que el inicializador existe
        initializer = BatteryInitializer.get_instance()
        
        # Reintentar inicialización
        result = initializer.retry_initialize_battery(battery_id)
        
        # Verificar estado general de autenticación después del reintento
        all_auth = all_batteries_authenticated()
        failed_batteries = get_failed_batteries()
        
        # Incluir información adicional en la respuesta
        result.update({
            "all_authenticated": all_auth,
            "failed_batteries": failed_batteries,
            "auth_requires_action": not all_auth
        })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error al reintentar inicialización: {str(e)}",
            "all_authenticated": False,
            "auth_requires_action": True
        })
# Endpoints para comunicación de bajo nivel
@app.route('/api/low_level/connect', methods=['POST'])
def low_level_connect_api():
    """ Endpoint para conectar a nivel de comunicación serial directa. """
    data = request.json
    port = data.get('port', 'COM1')
    baudrate = int(data.get('baudrate', 9600))
    parity = data.get('parity', 'N')
    stopbits = int(data.get('stopbits', 1))
    bytesize = int(data.get('bytesize', 8))
    timeout = int(data.get('timeout', 1))
    
    # Verificar si hay conexión Modbus activa en el mismo puerto
    from modbus_app.client import is_client_connected, get_client_port
    if is_client_connected() and get_client_port() == port:
        return jsonify({
            "status": "error", 
            "message": f"Error: El puerto {port} está siendo utilizado por PyModbus. Desconecte primero."
        })
    
    try:
        # Crear instancia del inicializador
        initializer = BatteryInitializer(
            port=port, 
            baudrate=baudrate, 
            parity=parity, 
            stopbits=stopbits, 
            bytesize=bytesize, 
            timeout=timeout
        )
        
        # Intentar establecer la conexión serial
        if not initializer.connect():
            return jsonify({
                "status": "error", 
                "message": f"No se pudo establecer conexión serial con el puerto {port}"
            })
        
        # Guardar instancia globalmente
        BatteryInitializer.set_instance(initializer)
        
        return jsonify({
            "status": "success", 
            "message": f"Conexión de bajo nivel establecida en {port}"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error", 
            "message": f"Error al conectar a bajo nivel: {str(e)}"
        })

@app.route('/api/low_level/disconnect', methods=['POST'])
def low_level_disconnect_api():
    """ Endpoint para desconectar la comunicación serial directa. """
    try:
        initializer = BatteryInitializer.get_instance()
        if initializer.disconnect():
            return jsonify({
                "status": "success", 
                "message": "Conexión de bajo nivel cerrada correctamente"
            })
        else:
            return jsonify({
                "status": "warning", 
                "message": "No había conexión de bajo nivel activa"
            })
    except Exception as e:
        return jsonify({
            "status": "error", 
            "message": f"Error al desconectar: {str(e)}"
        })

@app.route('/api/low_level/initialize', methods=['POST'])
def low_level_initialize_api():
    """ Endpoint para inicializar todas las baterías configuradas. """
    try:
        # Verificar que tenemos una instancia del inicializador
        initializer = BatteryInitializer.get_instance()
        
        # Obtener IDs de baterías disponibles
        from modbus_app import config_manager
        battery_info = config_manager.get_available_batteries()
        battery_ids = battery_info.get('batteries', [])
        
        if not battery_ids:
            return jsonify({
                "status": "error", 
                "message": "No hay baterías configuradas para inicializar"
            })
        
        # Inicializar todas las baterías configuradas
        init_result = initializer.initialize_batteries(battery_ids)
        
        # Verificar si todas las autenticaciones están completas y exitosas
        auth_complete = authentication_is_complete()
        all_auth = all_batteries_authenticated()
        failed_batteries = get_failed_batteries()
        
        # Determinar el estado general y mensaje
        if init_result["status"] == "error":
            response_status = "error"
            response_message = f"Error en la inicialización de baterías: {init_result.get('message', 'Error desconocido')}"
        elif init_result["status"] == "partial" or not all_auth:
            response_status = "warning"
            if failed_batteries:
                battery_list = ", ".join([str(b) for b in failed_batteries])
                response_message = f"Algunas baterías fallaron en la inicialización ({battery_list})"
            else:
                response_message = "Algunas baterías no completaron la inicialización"
        else:
            response_status = "success"
            response_message = "Todas las baterías inicializadas correctamente"
        
        return jsonify({
            "status": response_status, 
            "message": response_message,
            "show_auth_monitor": not all_auth,
            "auth_requires_action": not all_auth,
            "auth_complete": auth_complete,
            "all_authenticated": all_auth,
            "failed_batteries": failed_batteries,
            "initialized_batteries": init_result.get("initialized_count", 0),
            "total_batteries": len(battery_ids),
            "result": init_result  # Incluimos el resultado completo para más detalle
        })
        
    except RuntimeError as e:
        # Error específico cuando no hay inicializador
        return jsonify({
            "status": "error", 
            "message": f"Error: {str(e)}. Asegúrese de conectar primero usando /api/low_level/connect."
        })
    except Exception as e:
        return jsonify({
            "status": "error", 
            "message": f"Error inesperado: {str(e)}"
        })

@app.route('/api/low_level/status', methods=['GET'])
def low_level_status_api():
    """ Endpoint para verificar el estado de la conexión a bajo nivel. """
    try:
        # Intentar obtener la instancia del inicializador
        initializer = BatteryInitializer.get_instance()
        
        # Verificar si existe y está conectado
        is_connected = False
        if initializer:
            is_connected = initializer._is_connected and initializer._serial and initializer._serial.is_open
            
        return jsonify({
            "connected": is_connected,
            "port": initializer.port if initializer and is_connected else None
        })
    except RuntimeError:
        # Excepción específica cuando no hay instancia disponible
        return jsonify({
            "connected": False,
            "error": "No hay instancia del inicializador disponible"
        })
    except Exception as e:
        # Cualquier otra excepción
        return jsonify({
            "connected": False,
            "error": str(e)
        })

@app.route('/api/low_level/retry_battery/<int:battery_id>', methods=['POST'])
def low_level_retry_battery_api(battery_id):
    """
    Endpoint para reintentar la inicialización de una batería específica.
    """
    try:
        # Verificar que el inicializador existe
        initializer = BatteryInitializer.get_instance()
        
        # Reintentar inicialización
        result = initializer.retry_initialize_battery(battery_id)
        
        # Verificar estado general de autenticación después del reintento
        all_auth = all_batteries_authenticated()
        failed_batteries = get_failed_batteries()
        
        # Incluir información adicional en la respuesta
        result.update({
            "all_authenticated": all_auth,
            "failed_batteries": failed_batteries,
            "auth_requires_action": not all_auth
        })
        
        return jsonify(result)
    except RuntimeError as e:
        # Error específico cuando no hay inicializador
        return jsonify({
            "status": "error",
            "message": f"Error: {str(e)}. Asegúrese de conectar primero usando /api/low_level/connect.",
            "all_authenticated": False,
            "auth_requires_action": True
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error al reintentar inicialización: {str(e)}",
            "all_authenticated": False,
            "auth_requires_action": True
        })

# Endpoints para comunicación PyModbus
@app.route('/api/modbus/connect', methods=['POST'])
def modbus_connect_api():
    """ Endpoint para conectar cliente PyModbus. """
    data = request.json
    port = data.get('port', 'COM1')
    baudrate = int(data.get('baudrate', 9600))
    parity = data.get('parity', 'N')
    stopbits = int(data.get('stopbits', 1))
    bytesize = int(data.get('bytesize', 8))
    timeout = int(data.get('timeout', 1))
    
    # Verificar si hay inicializador de bajo nivel activo en el mismo puerto
    try:
        initializer = BatteryInitializer.get_instance()
        if initializer and initializer._serial and initializer._serial.is_open and initializer.port == port:
            return jsonify({
                "status": "error", 
                "message": f"Error: El puerto {port} está siendo utilizado por la conexión de bajo nivel. Desconecte primero."
            })
    except:
        # Si hay excepción, no hay inicializador activo
        pass
    
    # Verificar si todas las baterías están inicializadas correctamente
    if not all_batteries_authenticated():
        failed_batteries = get_failed_batteries()
        return jsonify({
            "status": "warning",
            "message": "No todas las baterías están correctamente inicializadas. Se recomienda completar la inicialización primero.",
            "all_authenticated": False,
            "failed_batteries": failed_batteries,
            "proceed_anyway": True  # Permitimos continuar a pesar de la advertencia
        })
    
    # Conectar cliente PyModbus
    success, message = connect_client(port, baudrate, parity, stopbits, bytesize, timeout)
    
    if not success:
        return jsonify({
            "status": "error", 
            "message": f"Error al conectar PyModbus: {message}"
        })
    
    # Iniciar carga de información detallada en segundo plano
    print("Iniciando carga de información detallada para todas las baterías...")
    battery_monitor.load_all_detailed_info()
    
    return jsonify({
        "status": "success", 
        "message": "Cliente PyModbus conectado correctamente",
        "loading_detailed_info": True
    })

@app.route('/api/modbus/disconnect', methods=['POST'])
def modbus_disconnect_api():
    """ Endpoint para desconectar cliente PyModbus. """
    disconnected = disconnect_client()
    if disconnected:
        return jsonify({
            "status": "success", 
            "message": "Cliente PyModbus desconectado correctamente"
        })
    else:
        return jsonify({
            "status": "warning", 
            "message": "No había conexión PyModbus activa para desconectar"
        })

@app.route('/api/status', methods=['GET'])
def status_api():
    """ Endpoint para verificar el estado de la conexión. """
    connected = is_client_connected()
    return jsonify({"connected": connected})

@app.route('/api/read', methods=['POST'])
def read_api():
    """ Endpoint para realizar lecturas Modbus estándar. """
    # Verificar autenticación completa
    auth_error = verify_authentication_complete()
    if auth_error:
        return jsonify(auth_error)
        
    data = request.json
    slave_id = int(data.get('slaveId', 1))
    function = data.get('function', 'holding')
    address = int(data.get('address', 0))
    count = int(data.get('count', 1))

    result = execute_read_operation(slave_id, function, address, count)
    return jsonify(result)

@app.route('/api/write', methods=['POST'])
def write_api():
    """ Endpoint para realizar escrituras Modbus estándar. """
    # Verificar autenticación completa
    auth_error = verify_authentication_complete()
    if auth_error:
        return jsonify(auth_error)
        
    data = request.json
    slave_id = int(data.get('slaveId', 1))
    function = data.get('function', 'holding')
    address = int(data.get('address', 0))
    values = data.get('values') # La función de operación maneja la validación

    result = execute_write_operation(slave_id, function, address, values)
    return jsonify(result)

@app.route('/api/read_device_info', methods=['POST'])
def read_device_info_api():
    """ Endpoint para leer información del dispositivo usando FC41. """
    # Verificar autenticación completa
    auth_error = verify_authentication_complete()
    if auth_error:
        return jsonify(auth_error)
        
    data = request.json
    slave_id = int(data.get('slaveId', 217))  # CORRECCIÓN: valor por defecto 217
    info_index = int(data.get('index', 0))

    result = execute_read_device_info(slave_id, info_index)
    return jsonify(result)
    
@app.route('/api/device_info', methods=['GET'])
def device_info_api():
    """Endpoint para obtener la información del dispositivo en caché."""
    if not is_client_connected():
        return jsonify({
            "status": "error", 
            "message": "No hay conexión activa con el dispositivo"
        })
    
    # CORRECCIÓN: Llamar a get_device_info correctamente
    result = get_device_info()
    return jsonify(result)

# Nuevo endpoint para verificar datos de celdas
@app.route('/api/verify_cells', methods=['POST'])
def verify_cells_api():
    """
    Endpoint para verificar datos de celdas individuales.
    Solo imprime los resultados en la consola para diagnóstico.
    """
    # Verificar autenticación completa
    auth_error = verify_authentication_complete()
    if auth_error:
        return jsonify(auth_error)
        
    if not is_client_connected():
        return jsonify({
            "status": "error",
            "message": "No hay conexión activa con el dispositivo"
        })
    
    data = request.json
    slave_id = int(data.get('slaveId', device_info.get_default_slave_id()))
    
    print("\n============ VERIFICACIÓN DE CELDAS INDIVIDUALES ============")
    print(f"Iniciando verificación para dispositivo {slave_id}")
    
    # Ejecutar la función de verificación (imprime resultados en consola)
    result = verify_battery_cell_data(slave_id)
    
    # Devolver datos simplificados (el detalle completo está en la consola)
    return jsonify({
        "status": result.get("status", "error"),
        "message": "Verificación completada. Ver resultados en la consola.",
        "summary": {
            "cells_count": len(result.get("cell_data", [])),
            "has_voltage_data": result.get("cell_voltages_raw") is not None,
            "has_temp_data": result.get("cell_temps_raw") is not None
        }
    })
@app.route('/api/batteries/start_monitoring', methods=['POST'])
def start_battery_monitoring():
    """Endpoint para iniciar el monitoreo de múltiples baterías."""
    # Verificar autenticación completa
    auth_error = verify_authentication_complete()
    if auth_error:
        return jsonify(auth_error)
        
    if not is_client_connected():
        return jsonify({
            "status": "error",
            "message": "No hay conexión activa con el bus Modbus"
        })
    
    data = request.json
    battery_ids = data.get('battery_ids', [])
    
    if not battery_ids:
        # Si no se especifican IDs, obtener todas las disponibles
        from modbus_app import config_manager
        battery_info = config_manager.get_available_batteries()
        battery_ids = battery_info.get('batteries', [])
    
    if not battery_ids:
        return jsonify({
            "status": "error",
            "message": "No hay baterías disponibles para monitorizar"
        })
    
    # Iniciar monitoreo con los IDs seleccionados
    success = battery_monitor.start_polling(battery_ids)
    
    return jsonify({
        "status": "success" if success else "error",
        "message": f"Monitoreo iniciado para {len(battery_ids)} baterías" if success else "El monitoreo ya está activo",
        "battery_ids": battery_ids
    })

@app.route('/api/batteries/stop_monitoring', methods=['POST'])
def stop_battery_monitoring():
    """Endpoint para detener el monitoreo de baterías."""
    # Verificar autenticación completa
    auth_error = verify_authentication_complete()
    if auth_error:
        return jsonify(auth_error)
        
    success = battery_monitor.stop_polling()
    return jsonify({
        "status": "success" if success else "warning",
        "message": "Monitoreo de baterías detenido" if success else "No había monitoreo activo"
    })

@app.route('/api/batteries/status', methods=['GET'])
def get_all_batteries_status():
    """Endpoint para obtener el estado de todas las baterías monitoreadas."""
    if not is_client_connected():
        return jsonify({
            "status": "error",
            "message": "No hay conexión activa con el bus Modbus",
            "batteries": []
        })
    
    # Obtener el estado de las baterías
    battery_status = battery_monitor.get_all_battery_status()
    
    # Añadir información del dispositivo desde config.json
    if battery_status["status"] == "success" and battery_status["batteries"]:
        from modbus_app import config_manager
        config = config_manager.load_config()
        discovered_devices = config.get("application", {}).get("discovered_devices", [])
        
        for battery in battery_status["batteries"]:
            # Buscar el dispositivo correspondiente en la configuración
            device_info = None
            for device in discovered_devices:
                if device.get("id") == battery["id"]:
                    device_info = {
                        "manufacturer": "Huawei",  # Asumimos Huawei ya que el sistema es específico
                        "model": device.get("type", "ESM Battery"),
                        "custom_name": device.get("custom_name", f"Batería {battery['id']}"),
                        "discovery_date": device.get("discovery_date", "N/A"),
                        "last_seen": device.get("last_seen", "N/A")
                    }
                    break
            
            # Añadir device_info al objeto de batería
            battery["device_info"] = device_info
    
    return jsonify(battery_status)

@app.route('/api/batteries/status/<int:battery_id>', methods=['GET'])
def get_battery_status(battery_id):
    """Endpoint para obtener el estado de una batería específica."""
    if not is_client_connected():
        return jsonify({
            "status": "error",
            "message": "No hay conexión activa con el bus Modbus"
        })
    
    # Obtener el estado de la batería
    result = battery_monitor.get_battery_status(battery_id)
    
    # Añadir información del dispositivo desde config.json
    if result["status"] == "success" and result["battery_data"]:
        from modbus_app import config_manager
        config = config_manager.load_config()
        discovered_devices = config.get("application", {}).get("discovered_devices", [])
        
        # Buscar el dispositivo correspondiente en la configuración
        device_info = None
        for device in discovered_devices:
            if device.get("id") == battery_id:
                device_info = {
                    "manufacturer": "Huawei",  # Asumimos Huawei ya que el sistema es específico
                    "model": device.get("type", "ESM Battery"),
                    "custom_name": device.get("custom_name", f"Batería {battery_id}"),
                    "discovery_date": device.get("discovery_date", "N/A"),
                    "last_seen": device.get("last_seen", "N/A")
                }
                break
        
        # Añadir device_info al objeto de batería
        result["battery_data"]["device_info"] = device_info
    
    return jsonify(result)
    
@app.route('/api/batteries/load_detailed_info', methods=['POST'])
def load_batteries_detailed_info():
    """Endpoint para iniciar la carga de información detallada de todas las baterías."""
    # Verificar autenticación completa
    auth_error = verify_authentication_complete()
    if auth_error:
        return jsonify(auth_error)
        
    if not is_client_connected():
        return jsonify({
            "status": "error",
            "message": "No hay conexión activa con el bus Modbus"
        })
    
    data = request.json
    battery_ids = data.get('battery_ids', [])
    
    # Si no se especifican IDs, obtener todas las disponibles
    if not battery_ids:
        battery_ids = None  # El método load_all_detailed_info lo manejará
    
    # Iniciar carga en segundo plano
    success = battery_monitor.load_all_detailed_info(battery_ids)
    
    return jsonify({
        "status": "success" if success else "error",
        "message": "Carga de información detallada iniciada" if success else "La carga ya está en progreso o no hay baterías disponibles"
    })

@app.route('/api/batteries/detailed_info_status', methods=['GET'])
def get_batteries_detailed_info_status():
    """Endpoint para verificar el estado de la carga de información detallada."""
    if not is_client_connected():
        return jsonify({
            "status": "error",
            "message": "No hay conexión activa con el bus Modbus"
        })
    
    loading_status = battery_monitor.get_detailed_info_loading_status()
    
    return jsonify({
        "status": "success",
        "loading_active": loading_status.get("active", False),
        "progress": loading_status.get("progress", {})
    })

@app.route('/api/batteries/detailed_info/<int:battery_id>', methods=['GET'])
def get_battery_detailed_info(battery_id):
    """Endpoint para obtener la información detallada de una batería específica."""
    if not is_client_connected():
        return jsonify({
            "status": "error",
            "message": "No hay conexión activa con el bus Modbus"
        })
    
    detailed_info = battery_monitor.get_battery_detailed_info(battery_id)
    
    if not detailed_info:
        return jsonify({
            "status": "error",
            "message": f"No hay información detallada disponible para la batería {battery_id}"
        })
    
    return jsonify({
        "status": "success",
        "battery_id": battery_id,
        "detailed_info": detailed_info
    })
# CORRECCIÓN: Implementar get_device_info
def get_device_info():
    """
    Devuelve la información del dispositivo almacenada en caché.
    Returns:
        dict: Información del dispositivo o mensaje de error
    """
    return device_info.get_cached_device_info()



if __name__ == '__main__':
    # Asegúrate de que la ruta a tus plantillas y archivos estáticos es correcta
    # Flask busca 'templates' y 'static' en el mismo nivel que app.py por defecto
    app.run(host='0.0.0.0', port=5000, debug=True) # debug=False para producción