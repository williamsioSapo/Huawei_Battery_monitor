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
    reset_battery_status
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

@app.route('/api/connect', methods=['POST'])
def connect_api():
    """ Endpoint para conectar al dispositivo Modbus. """
    data = request.json
    port = data.get('port', 'COM1')
    baudrate = int(data.get('baudrate', 9600))
    parity = data.get('parity', 'N')
    stopbits = int(data.get('stopbits', 1))
    bytesize = int(data.get('bytesize', 8))
    timeout = int(data.get('timeout', 1))
    
    # Obtener el ID de esclavo predeterminado en lugar de usar el proporcionado
    from modbus_app import config_manager
    battery_info = config_manager.get_available_batteries()
    
    # 1. Inicialización a bajo nivel primero
    print("Iniciando proceso de inicialización a bajo nivel para baterías...")
    initializer = BatteryInitializer(
        port=port, 
        baudrate=baudrate, 
        parity=parity, 
        stopbits=stopbits, 
        bytesize=bytesize, 
        timeout=timeout
    )
    
    # Guardar instancia globalmente
    BatteryInitializer.set_instance(initializer)
    
    # Obtener todos los IDs de baterías disponibles
    battery_ids = battery_info.get('batteries', [])
    if not battery_ids:
        return jsonify({
            "status": "error", 
            "message": "No hay baterías configuradas para inicializar"
        })
    
    # Inicializar todas las baterías configuradas
    init_result = initializer.initialize_batteries(battery_ids)
    
    if init_result["status"] == "error":
        return jsonify({
            "status": "error",
            "message": f"Error en la inicialización de baterías: {init_result.get('message', 'Error desconocido')}"
        })
    
    # 2. Ahora, conectar con PyModbus para operaciones normales
    print("Inicialización a bajo nivel completada. Conectando cliente PyModbus...")
    success, message = connect_client(port, baudrate, parity, stopbits, bytesize, timeout)
    
    if not success:
        return jsonify({"status": "error", "message": f"Error al conectar PyModbus: {message}"})
    
    # 3. Preparar respuesta combinada
    response_status = "success"
    if init_result["status"] == "partial":
        response_status = "warning"
        response_message = f"{init_result.get('message', '')}. Cliente PyModbus conectado correctamente."
    else:
        response_message = f"Baterías inicializadas y cliente PyModbus conectado correctamente."
    
    # Iniciar carga de información detallada en segundo plano
    print("Iniciando carga de información detallada para todas las baterías...")
    battery_monitor.load_all_detailed_info()
    
    return jsonify({
        "status": response_status, 
        "message": response_message,
        "loading_detailed_info": True,  # Indicar que se está cargando información detallada
        "initialized_batteries": init_result.get("initialized_count", 0),
        "total_batteries": len(battery_ids)
    })
@app.route('/api/disconnect', methods=['POST'])
def disconnect_api():
    """ Endpoint para desconectar del dispositivo Modbus. """
    disconnected = disconnect_client()
    if disconnected:
        return jsonify({"status": "success", "message": "Desconectado correctamente"})
    else:
        # Si disconnect_client devuelve False, significa que no había nada que desconectar
        return jsonify({"status": "warning", "message": "No había conexión activa para desconectar"})

@app.route('/api/status', methods=['GET'])
def status_api():
    """ Endpoint para verificar el estado de la conexión. """
    connected = is_client_connected()
    return jsonify({"connected": connected})

@app.route('/api/read', methods=['POST'])
def read_api():
    """ Endpoint para realizar lecturas Modbus estándar. """
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
    success = battery_monitor.stop_polling()
    return jsonify({
        "status": "success" if success else "warning",
        "message": "Monitoreo de baterías detenido" if success else "No había monitoreo activo"
    })

@app.route('/api/batteries/status', methods=['GET'])
def get_all_batteries_status():
    """Endpoint para obtener el estado de todas las baterías monitorizadas."""
    if not is_client_connected():
        return jsonify({
            "status": "error",
            "message": "No hay conexión activa con el bus Modbus",
            "batteries": []
        })
    
    return jsonify(battery_monitor.get_all_battery_status())

@app.route('/api/batteries/status/<int:battery_id>', methods=['GET'])
def get_battery_status(battery_id):
    """Endpoint para obtener el estado de una batería específica."""
    if not is_client_connected():
        return jsonify({
            "status": "error",
            "message": "No hay conexión activa con el bus Modbus"
        })
    
    return jsonify(battery_monitor.get_battery_status(battery_id))
@app.route('/api/batteries/load_detailed_info', methods=['POST'])
def load_batteries_detailed_info():
    """Endpoint para iniciar la carga de información detallada de todas las baterías."""
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