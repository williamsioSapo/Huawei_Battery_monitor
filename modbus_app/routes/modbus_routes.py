# modbus_app/routes/modbus_routes.py
from flask import request, jsonify
from modbus_app.authentication_status import all_batteries_authenticated, get_failed_batteries
from modbus_app import operations
import sys

def log_stdout(message):
   sys.stdout.write(f"{message}\n")
   sys.stdout.flush()
def verify_authentication_complete():
   """
   Verifies if all batteries are correctly authenticated.
   If not authenticated, prepares an error response.
   
   Returns:
       dict or None: JSON error response or None if authentication is complete
   """
   if not all_batteries_authenticated():
       failed_batteries = get_failed_batteries()
       battery_list = ", ".join([str(b) for b in failed_batteries]) if failed_batteries else "unknown"
       
       return {
           "status": "error",
           "message": f"Operation not allowed: Some batteries are not authenticated ({battery_list})",
           "auth_requires_action": True,
           "failed_batteries": failed_batteries
       }
   
   return None

def register_modbus_routes(app):
   """Register standard Modbus operation routes with the Flask app."""
   
   @app.route('/api/modbus/connect', methods=['POST'])
   def modbus_connect_api():
       """Endpoint para conectar PyModbus client."""
       log_stdout(f"MODBUS-DEBUG: Iniciando /api/modbus/connect")
       
       data = request.json
       port = data.get('port', 'COM1')
       baudrate = int(data.get('baudrate', 9600))
       parity = data.get('parity', 'N')
       stopbits = int(data.get('stopbits', 1))
       bytesize = int(data.get('bytesize', 8))
       timeout = int(data.get('timeout', 1))
       
       # Check if there's a low-level initializer active on the same port
       try:
           from modbus_app.battery_initializer import BatteryInitializer
           initializer = BatteryInitializer.get_instance()
           if initializer and initializer._serial and initializer._serial.is_open and initializer.port == port:
               log_stdout(f"MODBUS-DEBUG: Error: Puerto {port} está siendo usado por bajo nivel")
               return jsonify({
                   "status": "error", 
                   "message": f"Error: Port {port} is being used by low-level connection. Disconnect first."
               })
       except:
           # Si hay una excepción, no hay initializer activo
           log_stdout(f"MODBUS-DEBUG: No se detectó initializer activo")
           pass
       
       # Check if all batteries are correctly initialized
       if not all_batteries_authenticated():
           failed_batteries = get_failed_batteries()
           log_stdout(f"MODBUS-DEBUG: No todas las baterías están autenticadas. Fallidas: {failed_batteries}")
           return jsonify({
               "status": "warning",
               "message": "Not all batteries are correctly initialized. It's recommended to complete initialization first.",
               "all_authenticated": False,
               "failed_batteries": failed_batteries,
               "proceed_anyway": True  # Allow continuing despite warning
           })
       
       # Connect PyModbus client
       log_stdout(f"MODBUS-DEBUG: Conectando cliente PyModbus en {port}")
       from modbus_app.client import connect_client
       success, message = connect_client(port, baudrate, parity, stopbits, bytesize, timeout)
       
       if not success:
           log_stdout(f"MODBUS-DEBUG: Error al conectar: {message}")
           return jsonify({
               "status": "error", 
               "message": f"Error connecting PyModbus: {message}"
           })
       
       # MODIFICADO: Verificar si todas las baterías ya están autenticadas
       if all_batteries_authenticated():
           log_stdout("MODBUS-DEBUG: Todas las baterías ya están autenticadas, omitiendo carga de información detallada")
           return jsonify({
               "status": "success", 
               "message": "PyModbus client connected successfully",
               "loading_detailed_info": False  # Indicar que no se está cargando información
           })
       else:
           # Solo si hay algún problema con la autenticación, intentar cargar información
           log_stdout("MODBUS-DEBUG: No todas las baterías están autenticadas, iniciando carga de información detallada (caso anómalo)")
           
           from modbus_app.routes.battery_routes import battery_monitor as global_battery_monitor
           global_battery_monitor.load_all_detailed_info()
           
           return jsonify({
               "status": "success", 
               "message": "PyModbus client connected successfully, loading detailed information (anomalous case)",
               "loading_detailed_info": True
           })

   @app.route('/api/modbus/disconnect', methods=['POST'])
   def modbus_disconnect_api():
       """Endpoint to disconnect PyModbus client."""
       from modbus_app.client import disconnect_client
       disconnected = disconnect_client()
       if disconnected:
           return jsonify({
               "status": "success", 
               "message": "PyModbus client disconnected successfully"
           })
       else:
           return jsonify({
               "status": "warning", 
               "message": "No active PyModbus connection to disconnect"
           })

   @app.route('/api/status', methods=['GET'])
   def status_api():
       """Endpoint to check connection status."""
       from modbus_app.client import is_client_connected
       connected = is_client_connected()
       return jsonify({"connected": connected})

   @app.route('/api/read', methods=['POST'])
   def read_api():
       """Endpoint for standard Modbus reads."""
       # Verify authentication is complete
       auth_error = verify_authentication_complete()
       if auth_error:
           return jsonify(auth_error)
           
       data = request.json
       slave_id = int(data.get('slaveId', 1))
       function = data.get('function', 'holding')
       address = int(data.get('address', 0))
       count = int(data.get('count', 1))

       result = operations.execute_read_operation(slave_id, function, address, count)
       return jsonify(result)

   @app.route('/api/write', methods=['POST'])
   def write_api():
       """Endpoint for standard Modbus writes."""
       # Verify authentication is complete
       auth_error = verify_authentication_complete()
       if auth_error:
           return jsonify(auth_error)
           
       data = request.json
       slave_id = int(data.get('slaveId', 1))
       function = data.get('function', 'holding')
       address = int(data.get('address', 0))
       values = data.get('values')  # Operation function handles validation

       result = operations.execute_write_operation(slave_id, function, address, values)
       return jsonify(result)
       
   @app.route('/api/verify_cells', methods=['POST'])
   def verify_cells_api():
       """
       Endpoint to verify individual cell data.
       Only prints results to console for diagnostics.
       """
       # Verify authentication is complete
       auth_error = verify_authentication_complete()
       if auth_error:
           return jsonify(auth_error)
           
       from modbus_app.client import is_client_connected
       if not is_client_connected():
           return jsonify({
               "status": "error",
               "message": "No active connection to the device"
           })
       
       data = request.json
       from modbus_app.device_info import get_default_slave_id
       slave_id = int(data.get('slaveId', get_default_slave_id()))
       
       print("\n============ INDIVIDUAL CELL VERIFICATION ============")
       print(f"Starting verification for device {slave_id}")
       
       # Execute verification function (prints results to console)
       result = operations.verify_battery_cell_data(slave_id)
       
       # Return simplified data (full detail is in the console)
       return jsonify({
           "status": result.get("status", "error"),
           "message": "Verification completed. See results in console.",
           "summary": {
               "cells_count": len(result.get("cell_data", [])),
               "has_voltage_data": result.get("cell_voltages_raw") is not None,
               "has_temp_data": result.get("cell_temps_raw") is not None
           }
       })