# modbus_app/routes/auth_routes.py
from flask import request, jsonify
from modbus_app.battery_initializer import BatteryInitializer
from modbus_app.authentication_status import (
    format_all_batteries_status_for_api,
    format_battery_status_for_api,
    reset_battery_status,
    all_batteries_authenticated,
    get_failed_batteries,
    authentication_is_complete
)
from modbus_app.logger_config import log_to_cmd

def register_auth_routes(app):
    """Register authentication-related routes with the Flask app."""
    
    @app.route('/api/auth_status', methods=['GET'])
    def get_auth_status():
        """Endpoint to get authentication status for all batteries."""
        log_to_cmd("API: Solicitud recibida en /api/auth_status", "INFO", "API")
        
        # Obtener estado de autenticación
        result = format_all_batteries_status_for_api()
        
        # Loguear detalles del resultado
        battery_count = result.get('count', 0)
        status = result.get('status', 'desconocido')
        log_to_cmd(f"API: /api/auth_status - Devolviendo estado para {battery_count} baterías, status={status}", "INFO", "API")
        
        # Si no hay baterías, loguear posible problema
        if battery_count == 0:
            log_to_cmd("API: /api/auth_status - ¡ADVERTENCIA! No hay baterías registradas en authentication_status", "WARNING", "API")
        
        # Inspeccionar más profundamente el módulo de autenticación
        from modbus_app.authentication_status import authentication_status
        log_to_cmd(f"API: /api/auth_status - Estado interno de authentication_status: {len(authentication_status)} baterías registradas", "DEBUG", "API")
        
        return jsonify(result)

    @app.route('/api/auth_status/<int:battery_id>', methods=['GET'])
    def get_battery_auth_status(battery_id):
        """Endpoint to get authentication status for a specific battery."""
        log_to_cmd(f"API: Solicitud recibida en /api/auth_status/{battery_id}", "INFO", "API")
        
        # Obtener estado de autenticación para la batería específica
        result = format_battery_status_for_api(battery_id)
        
        # Loguear detalles del resultado
        status = result.get('status', 'desconocido')
        log_to_cmd(f"API: /api/auth_status/{battery_id} - Devolviendo estado, status={status}", "INFO", "API")
        
        return jsonify(result)

    @app.route('/api/auth_status/<int:battery_id>/reset', methods=['POST'])
    def reset_auth_status(battery_id):
        """Endpoint to reset authentication status for a battery."""
        reset_battery_status(battery_id)
        return jsonify({
            "status": "success",
            "message": f"Authentication status for battery {battery_id} reset"
        })
        
    @app.route('/api/retry_initialize_battery/<int:battery_id>', methods=['POST'])
    def retry_initialize_battery_api(battery_id):
        """Endpoint to retry initialization of a specific battery."""
        try:
            # Verify that the initializer exists
            initializer = BatteryInitializer.get_instance()
            
            # Retry initialization
            result = initializer.retry_initialize_battery(battery_id)
            
            # Check general authentication status after retry
            all_auth = all_batteries_authenticated()
            failed_batteries = get_failed_batteries()
            
            # Include additional information in the response
            result.update({
                "all_authenticated": all_auth,
                "failed_batteries": failed_batteries,
                "auth_requires_action": not all_auth
            })
            
            return jsonify(result)
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Error retrying initialization: {str(e)}",
                "all_authenticated": False,
                "auth_requires_action": True
            })
            
    # Low-level connection and initialization routes
    
    @app.route('/api/connect', methods=['POST'])
    def connect_api():
        """Endpoint for direct serial communication connection."""
        data = request.json
        port = data.get('port', 'COM1')
        baudrate = int(data.get('baudrate', 9600))
        parity = data.get('parity', 'N')
        stopbits = int(data.get('stopbits', 1))
        bytesize = int(data.get('bytesize', 8))
        timeout = int(data.get('timeout', 1))
        
       
        try:
            # Create initializer instance
            initializer = BatteryInitializer(
                port=port, 
                baudrate=baudrate, 
                parity=parity, 
                stopbits=stopbits, 
                bytesize=bytesize, 
                timeout=timeout
            )
            
            # Try to establish serial connection
            if not initializer.connect():
                return jsonify({
                    "status": "error", 
                    "message": f"Could not establish serial connection with port {port}"
                })
            
            # Save instance globally
            BatteryInitializer.set_instance(initializer)
            
            return jsonify({
                "status": "success", 
                "message": f"Low-level connection established on {port}"
            })
            
        except Exception as e:
            return jsonify({
                "status": "error", 
                "message": f"Error connecting at low level: {str(e)}"
            })

    @app.route('/api/disconnect', methods=['POST'])
    def low_level_disconnect_api():
        """Endpoint to disconnect direct serial communication."""
        try:
            initializer = BatteryInitializer.get_instance()
            if initializer.disconnect():
                return jsonify({
                    "status": "success", 
                    "message": "Low-level connection closed successfully"
                })
            else:
                return jsonify({
                    "status": "warning", 
                    "message": "No active low-level connection"
                })
        except Exception as e:
            return jsonify({
                "status": "error", 
                "message": f"Error disconnecting: {str(e)}"
            })

    @app.route('/api/initialize', methods=['POST'])
    def low_level_initialize_api():
        """Endpoint to initialize all configured batteries."""
        try:
            # Verify we have an initializer instance
            initializer = BatteryInitializer.get_instance()
            
            # Get available battery IDs
            from modbus_app import config_manager
            battery_info = config_manager.get_available_batteries()
            battery_ids = battery_info.get('batteries', [])
            
            if not battery_ids:
                return jsonify({
                    "status": "error", 
                    "message": "No batteries configured for initialization"
                })
            
            # Initialize all configured batteries
            init_result = initializer.initialize_batteries(battery_ids)
            
            # Check if all authentications are complete and successful
            auth_complete = authentication_is_complete()
            all_auth = all_batteries_authenticated()
            failed_batteries = get_failed_batteries()
            
            # Determine overall status and message
            if init_result["status"] == "error":
                response_status = "error"
                response_message = f"Error initializing batteries: {init_result.get('message', 'Unknown error')}"
            elif init_result["status"] == "partial" or not all_auth:
                response_status = "warning"
                if failed_batteries:
                    battery_list = ", ".join([str(b) for b in failed_batteries])
                    response_message = f"Some batteries failed initialization ({battery_list})"
                else:
                    response_message = "Some batteries did not complete initialization"
            else:
                response_status = "success"
                response_message = "All batteries initialized successfully"
            
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
                "result": init_result  # Include full result for more detail
            })
            
        except RuntimeError as e:
            # Specific error when there's no initializer
            return jsonify({
                "status": "error", 
                "message": f"Error: {str(e)}. Make sure to connect first using /api/low_level/connect."
            })
        except Exception as e:
            return jsonify({
                "status": "error", 
                "message": f"Unexpected error: {str(e)}"
            })

    @app.route('/api/status', methods=['GET'])
    def low_level_status_api():
        """Endpoint to verify low-level connection status."""
        try:
            # Try to get initializer instance
            initializer = BatteryInitializer.get_instance()
            
            # Check if it exists and is connected
            is_connected = False
            if initializer:
                is_connected = initializer._is_connected and initializer._serial and initializer._serial.is_open
                
            return jsonify({
                "connected": is_connected,
                "port": initializer.port if initializer and is_connected else None
            })
        except RuntimeError:
            # Specific exception when no instance is available
            return jsonify({
                "connected": False,
                "error": "No initializer instance available"
            })
        except Exception as e:
            # Any other exception
            return jsonify({
                "connected": False,
                "error": str(e)
            })

    @app.route('/api/retry_battery/<int:battery_id>', methods=['POST'])
    def low_level_retry_battery_api(battery_id):
        """
        Endpoint to retry initialization of a specific battery.
        """
        try:
            # Verify that the initializer exists
            initializer = BatteryInitializer.get_instance()
            
            # Retry initialization
            result = initializer.retry_initialize_battery(battery_id)
            
            # Check general authentication status after retry
            all_auth = all_batteries_authenticated()
            failed_batteries = get_failed_batteries()
            
            # Include additional information in the response
            result.update({
                "all_authenticated": all_auth,
                "failed_batteries": failed_batteries,
                "auth_requires_action": not all_auth
            })
            
            return jsonify(result)
        except RuntimeError as e:
            # Specific error when there's no initializer
            return jsonify({
                "status": "error",
                "message": f"Error: {str(e)}. Make sure to connect first using /api/low_level/connect.",
                "all_authenticated": False,
                "auth_requires_action": True
            })
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Error retrying initialization: {str(e)}",
                "all_authenticated": False,
                "auth_requires_action": True
            })