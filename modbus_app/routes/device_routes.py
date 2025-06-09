# modbus_app/routes/device_routes.py
from flask import request, jsonify
from modbus_app.authentication_status import all_batteries_authenticated, get_failed_batteries
from modbus_app import operations

def is_client_connected():
    """Verifica si hay conexión activa."""
    try:
        from modbus_app.battery_initializer import BatteryInitializer
        initializer = BatteryInitializer.get_instance()
        return initializer and initializer._is_connected
    except:
        return False
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

def register_device_routes(app):
    """Register device information related routes with the Flask app."""
    
    @app.route('/api/device_info', methods=['GET'])
    def device_info_api():
        """Endpoint to get cached device information."""
        if not is_client_connected():  # Usa la función local
            return jsonify({
                "status": "error", 
                "message": "No active connection to the device"
            })
        
        # Obtener ID de batería activo
        from modbus_app import config_manager
        slave_id = config_manager.get_default_slave_id()
        
        # Usar directamente la función del caché global
        from modbus_app.device_info.device_cache import get_device_info
        result = get_device_info(slave_id)
        
        return jsonify(result)
        
  