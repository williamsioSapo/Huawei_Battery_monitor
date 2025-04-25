# app.py
from flask import Flask, render_template, request, jsonify
# Importar funciones de los módulos separados
from modbus_app.client import connect_client, disconnect_client, is_client_connected
from modbus_app.operations import execute_read_operation, execute_write_operation, execute_read_device_info

app = Flask(__name__)

@app.route('/')
def index():
    """ Sirve la página principal. """
    return render_template('index.html')

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

    success, message = connect_client(port, baudrate, parity, stopbits, bytesize, timeout)
    status = "success" if success else "error"
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
    slave_id = int(data.get('slaveId', 1))
    info_index = int(data.get('index', 0))

    result = execute_read_device_info(slave_id, info_index)
    return jsonify(result)

if __name__ == '__main__':
    # Asegúrate de que la ruta a tus plantillas y archivos estáticos es correcta
    # Flask busca 'templates' y 'static' en el mismo nivel que app.py por defecto
    app.run(host='0.0.0.0', port=5000, debug=True) # debug=False para producción