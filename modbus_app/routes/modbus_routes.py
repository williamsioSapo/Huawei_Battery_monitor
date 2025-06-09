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