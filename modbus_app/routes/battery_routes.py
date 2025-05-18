# modbus_app/routes/battery_routes.py
from flask import request, jsonify
from modbus_app.battery_monitor import BatteryMonitor
from modbus_app.authentication_status import all_batteries_authenticated, get_failed_batteries

# Create a single BatteryMonitor instance to be used by all routes
battery_monitor = BatteryMonitor()

def register_battery_routes(app):
    """Register battery monitoring routes with the Flask app."""
    
    @app.route('/api/batteries', methods=['GET'])
    def list_batteries_api():
        """Endpoint to get configured available batteries."""
        from modbus_app import config_manager
        return jsonify(config_manager.get_available_batteries())
    
    @app.route('/api/batteries/start_monitoring', methods=['POST'])
    def start_battery_monitoring():
        """Endpoint to start monitoring multiple batteries."""
        # Verify authentication is complete
        if not all_batteries_authenticated():
            failed_batteries = get_failed_batteries()
            return jsonify({
                "status": "error",
                "message": "Not all batteries are correctly initialized",
                "failed_batteries": failed_batteries,
                "auth_requires_action": True
            })
            
        # Check if there's an active Modbus connection
        from modbus_app.client import is_client_connected
        if not is_client_connected():
            return jsonify({
                "status": "error",
                "message": "No active connection to the Modbus bus"
            })
        
        data = request.json
        battery_ids = data.get('battery_ids', [])
        
        if not battery_ids:
            # If no IDs specified, get all available
            from modbus_app import config_manager
            battery_info = config_manager.get_available_batteries()
            battery_ids = battery_info.get('batteries', [])
        
        if not battery_ids:
            return jsonify({
                "status": "error",
                "message": "No batteries available to monitor"
            })
        
        # Start monitoring with selected IDs
        success = battery_monitor.start_polling(battery_ids)
        
        return jsonify({
            "status": "success" if success else "error",
            "message": f"Monitoring started for {len(battery_ids)} batteries" if success else "Monitoring is already active",
            "battery_ids": battery_ids
        })

    @app.route('/api/batteries/stop_monitoring', methods=['POST'])
    def stop_battery_monitoring():
        """Endpoint to stop battery monitoring."""
        success = battery_monitor.stop_polling()
        return jsonify({
            "status": "success" if success else "warning",
            "message": "Battery monitoring stopped" if success else "No active monitoring"
        })

    @app.route('/api/batteries/status', methods=['GET'])
    def get_all_batteries_status():
        """Endpoint to get status of all monitored batteries."""
        from modbus_app.client import is_client_connected
        if not is_client_connected():
            return jsonify({
                "status": "error",
                "message": "No active connection to the Modbus bus",
                "batteries": []
            })
        
        # Get battery status
        battery_status = battery_monitor.get_all_battery_status()
        
        # Add device information from config.json
        if battery_status["status"] == "success" and battery_status["batteries"]:
            from modbus_app import config_manager
            config = config_manager.load_config()
            discovered_devices = config.get("application", {}).get("discovered_devices", [])
            
            for battery in battery_status["batteries"]:
                # Look for corresponding device in configuration
                device_info = None
                for device in discovered_devices:
                    if device.get("id") == battery["id"]:
                        device_info = {
                            "manufacturer": "Huawei",  # Assuming Huawei as system is specific
                            "model": device.get("type", "ESM Battery"),
                            "custom_name": device.get("custom_name", f"Battery {battery['id']}"),
                            "discovery_date": device.get("discovery_date", "N/A"),
                            "last_seen": device.get("last_seen", "N/A")
                        }
                        break
                
                # Add device_info to battery object
                battery["device_info"] = device_info
        
        return jsonify(battery_status)

    @app.route('/api/batteries/status/<int:battery_id>', methods=['GET'])
    def get_battery_status(battery_id):
        """Endpoint to get status of a specific battery."""
        from modbus_app.client import is_client_connected
        if not is_client_connected():
            return jsonify({
                "status": "error",
                "message": "No active connection to the Modbus bus"
            })
        
        # Get battery status
        result = battery_monitor.get_battery_status(battery_id)
        
        # Add device information from config.json
        if result["status"] == "success" and result["battery_data"]:
            from modbus_app import config_manager
            config = config_manager.load_config()
            discovered_devices = config.get("application", {}).get("discovered_devices", [])
            
            # Look for corresponding device in configuration
            device_info = None
            for device in discovered_devices:
                if device.get("id") == battery_id:
                    device_info = {
                        "manufacturer": "Huawei",  # Assuming Huawei as system is specific
                        "model": device.get("type", "ESM Battery"),
                        "custom_name": device.get("custom_name", f"Battery {battery_id}"),
                        "discovery_date": device.get("discovery_date", "N/A"),
                        "last_seen": device.get("last_seen", "N/A")
                    }
                    break
            
            # Add device_info to battery object
            result["battery_data"]["device_info"] = device_info
        
        return jsonify(result)
        
    @app.route('/api/batteries/load_detailed_info', methods=['POST'])
    def load_batteries_detailed_info():
        """Endpoint to start loading detailed info for all batteries."""
        # Verify authentication is complete
        if not all_batteries_authenticated():
            failed_batteries = get_failed_batteries()
            return jsonify({
                "status": "error",
                "message": f"Operation not allowed: Some batteries are not authenticated ({failed_batteries})",
                "auth_requires_action": True,
                "failed_batteries": failed_batteries
            })
            
        from modbus_app.client import is_client_connected
        if not is_client_connected():
            return jsonify({
                "status": "error",
                "message": "No active connection to the Modbus bus"
            })
        
        data = request.json
        battery_ids = data.get('battery_ids', [])
        
        # If no IDs specified, load_all_detailed_info will handle it
        if not battery_ids:
            battery_ids = None
        
        # Start background loading
        success = battery_monitor.load_all_detailed_info(battery_ids)
        
        return jsonify({
            "status": "success" if success else "error",
            "message": "Detailed info loading started" if success else "Loading already in progress or no batteries available"
        })

    @app.route('/api/batteries/detailed_info_status', methods=['GET'])
    def get_batteries_detailed_info_status():
        """Endpoint to check detailed info loading status."""
        from modbus_app.client import is_client_connected
        if not is_client_connected():
            return jsonify({
                "status": "error",
                "message": "No active connection to the Modbus bus"
            })
        
        loading_status = battery_monitor.get_detailed_info_loading_status()
        
        return jsonify({
            "status": "success",
            "loading_active": loading_status.get("active", False),
            "progress": loading_status.get("progress", {})
        })

    @app.route('/api/batteries/detailed_info/<int:battery_id>', methods=['GET'])
    def get_battery_detailed_info(battery_id):
        """Endpoint to get detailed info for a specific battery."""
        from modbus_app.client import is_client_connected
        if not is_client_connected():
            return jsonify({
                "status": "error",
                "message": "No active connection to the Modbus bus"
            })
        
        detailed_info = battery_monitor.get_battery_detailed_info(battery_id)
        
        if not detailed_info:
            return jsonify({
                "status": "error",
                "message": f"No detailed info available for battery {battery_id}"
            })
        
        return jsonify({
            "status": "success",
            "battery_id": battery_id,
            "detailed_info": detailed_info
        })