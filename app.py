# app.py
import io
import sys
import threading
import time
from collections import deque
from flask import Flask, render_template, request, jsonify
from modbus_app.battery_monitor import BatteryMonitor
# Cola circular para almacenar los últimos mensajes (limitada a 500 mensajes)
console_messages = deque(maxlen=500)
battery_monitor = BatteryMonitor()
# Importar funciones de los módulos separados
from modbus_app.operations import execute_read_operation, execute_write_operation, execute_read_device_info, verify_battery_cell_data
# CORRECCIÓN: Importar correctamente las funciones de client
from modbus_app.client import connect_client, disconnect_client, is_client_connected, wake_up_device, get_device_info
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
    slave_id = int(data.get('slaveId', device_info.get_default_slave_id()))

    # Paso 1: Conectar al puerto serial
    success, message = connect_client(port, baudrate, parity, stopbits, bytesize, timeout)
    if not success:
        return jsonify({"status": "error", "message": message})
    
    # Paso 2: Despertar dispositivo
    if not wake_up_device(slave_id=slave_id):
        disconnect_client()  # Desconectar antes de devolver error
        return jsonify({
            "status": "warning", 
            "message": "Conectado, pero el dispositivo no responde o no ha despertado"
        })
    
    # Paso 3: Autenticar para acceso a FC41 (incluye lectura de información)
    print("Iniciando autenticación para acceso a funciones avanzadas...")
    auth_result = device_info.authenticate_and_read_device_info(slave_id)
    
    if auth_result.get("status") == "success":
        status = "success"
        message = "Conectado y autenticado correctamente. Información del dispositivo cargada."
    else:
        status = "warning"
        message = auth_result.get("message", "Conectado pero la autenticación falló.")
    
    return jsonify({"status": status, "message": message})
    
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