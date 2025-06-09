# modbus_app/routes/battery_routes.py
from flask import request, jsonify
import time
from modbus_app.battery_monitor import BatteryMonitor
from modbus_app.authentication_status import all_batteries_authenticated, get_failed_batteries
from modbus_app.routes.device_routes import verify_authentication_complete
# Create a single BatteryMonitor instance to be used by all routes
battery_monitor = BatteryMonitor()

def register_battery_routes(app):
    """Register battery monitoring routes with the Flask app."""

    @app.route('/api/batteries/history/reset_total', methods=['POST'])
    def reset_total_history():
        """
        Endpoint para reset total del sistema de historial.
        Elimina toda la base de datos y la recrea con esquema básico.
        """
        # Verificar autenticación
        auth_error = verify_authentication_complete()
        if auth_error:
            return jsonify(auth_error)
        
        # Verificar conexión
        from modbus_app.client import is_client_connected
        if not is_client_connected():
            return jsonify({
                "status": "error",
                "message": "No hay conexión activa con el dispositivo"
            })
        
        try:
            # Ejecutar reset total
            result = battery_monitor.reset_history_total()
            
            # Log del resultado
            if result["status"] == "success":
                from modbus_app.logger_config import log_to_cmd
                log_to_cmd(f"API: Reset total ejecutado exitosamente", "INFO", "API")
            else:
                from modbus_app.logger_config import log_to_cmd
                log_to_cmd(f"API: Error en reset total: {result['message']}", "ERROR", "API")
            
            return jsonify(result)
            
        except Exception as e:
            from modbus_app.logger_config import log_to_cmd
            log_to_cmd(f"API: Excepción en reset total: {str(e)}", "ERROR", "API")
            
            return jsonify({
                "status": "error",
                "message": f"Error ejecutando reset total: {str(e)}"
            })
    @app.route('/api/batteries/history/status', methods=['GET']) 
    def get_history_system_status():
        """
        Endpoint para obtener el estado completo del sistema de historial.
        """
        # Verificar autenticación
        auth_error = verify_authentication_complete()
        if auth_error:
            return jsonify(auth_error)
        
        try:
            # Obtener estado del sistema
            status = battery_monitor.get_history_system_status()
            return jsonify(status)
            
        except Exception as e:
            return jsonify({
                "status": "error", 
                "message": f"Error obteniendo estado del sistema: {str(e)}"
            })
    @app.route('/api/batteries/history/database_info', methods=['GET'])
    def get_database_info_api():
        """
        Endpoint para obtener información detallada de la base de datos.
        """
        # Verificar autenticación  
        auth_error = verify_authentication_complete()
        if auth_error:
            return jsonify(auth_error)
        
        try:
            from modbus_app.history.management import get_database_info
            info = get_database_info()
            return jsonify(info)
            
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Error obteniendo información de base de datos: {str(e)}"
            })
    @app.route('/api/batteries/history/create_backup', methods=['POST'])
    def create_database_backup():
        """
        Endpoint para crear backup de la base de datos.
        """
        # Verificar autenticación
        auth_error = verify_authentication_complete()
        if auth_error:
            return jsonify(auth_error)
        
        try:
            data = request.json or {}
            backup_name = data.get('backup_name', None)
            
            from modbus_app.history.management import create_backup
            result = create_backup(backup_name)
            return jsonify(result)
            
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Error creando backup: {str(e)}"
            })        
    @app.route('/api/batteries', methods=['GET'])
    def list_batteries_api():
        """Endpoint to get configured available batteries."""
        from modbus_app import config_manager
        return jsonify(config_manager.get_available_batteries())
    
    @app.route('/api/batteries/mapped_registers/<int:battery_id>', methods=['GET'])
    def get_all_mapped_registers(battery_id):
        """
        Endpoint para obtener todos los registros mapeados de una batería específica.
        Lee todos los registros del informe 6.txt usando Modbus estándar para validación.
        """
        # Verificar autenticación
        auth_error = verify_authentication_complete()
        if auth_error:
            return jsonify(auth_error)
        
        # Verificar conexión
        from modbus_app.client import is_client_connected
        if not is_client_connected():
            return jsonify({
                "status": "error",
                "message": "No hay conexión activa con el dispositivo"
            })
        
        try:
            # Importar la nueva función
            from modbus_app.operations import read_all_mapped_registers
            
            # Ejecutar lectura completa
            result = read_all_mapped_registers(battery_id)
            
            return jsonify(result)
            
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Error al leer registros: {str(e)}"
            })
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
    
    @app.route('/api/batteries/cells_data/<int:battery_id>', methods=['GET'])
    def get_battery_cells_data(battery_id):
        """
        Endpoint OPTIMIZADO para obtener solo los datos necesarios para la pestaña de celdas.
        Mucho más rápido que mapped_registers completo.
        """
        # Verificar autenticación
        auth_error = verify_authentication_complete()
        if auth_error:
            return jsonify(auth_error)
        
        # Verificar conexión
        from modbus_app.client import is_client_connected
        if not is_client_connected():
            return jsonify({
                "status": "error",
                "message": "No hay conexión activa con el dispositivo"
            })
        
        try:
            from modbus_app.operations import execute_read_operation
            
            result = {
                "status": "success",
                "battery_id": battery_id,
                "timestamp": time.time(),
                "basic_data": {},
                "cell_data": {},
                "summary": {
                    "total_operations": 0,
                    "successful_operations": 0,
                    "failed_operations": 0
                }
            }
            
            # ========== 1. LEER REGISTROS BÁSICOS NECESARIOS (1 OPERACIÓN) ==========
            print(f"Leyendo registros básicos para batería {battery_id}...")
            
            # Leer registros 0x0000-0x0006 + 0x010F en operaciones agrupadas
            basic_result = execute_read_operation(battery_id, 'holding', 0x0000, 7)
            cell_count_result = execute_read_operation(battery_id, 'holding', 0x010F, 1)
            
            result["summary"]["total_operations"] += 2
            
            if basic_result.get("status") == "success":
                data = basic_result["data"]
                result["basic_data"] = {
                    "battery_voltage": data[0] * 0.01 if len(data) > 0 else None,
                    "pack_voltage": data[1] * 0.01 if len(data) > 1 else None, 
                    "current": _convert_signed_current(data[2]) if len(data) > 2 else None,
                    "soc": data[3] if len(data) > 3 else None,
                    "soh": data[4] if len(data) > 4 else None,
                    "max_cell_temp": data[5] if len(data) > 5 else None,
                    "min_cell_temp": data[6] if len(data) > 6 else None
                }
                result["summary"]["successful_operations"] += 1
            else:
                result["summary"]["failed_operations"] += 1
                
            if cell_count_result.get("status") == "success":
                result["basic_data"]["cell_count"] = cell_count_result["data"][0]
                result["summary"]["successful_operations"] += 1
            else:
                result["basic_data"]["cell_count"] = 16  # Valor por defecto
                result["summary"]["failed_operations"] += 1
            
            # ========== 2. LEER DATOS DE CELDAS (4 OPERACIONES) ==========
            print(f"Leyendo datos de celdas para batería {battery_id}...")
            
            # Arrays de celdas definidos para lectura rápida
            cell_arrays = {
                "cell_voltages_block1": {"start": 0x0022, "count": 16, "factor": 0.001, "unit": "V"},
                "cell_voltages_block2": {"start": 0x0310, "count": 8, "factor": 0.001, "unit": "V"},
                "cell_temperatures_block1": {"start": 0x0012, "count": 16, "factor": 1, "unit": "°C"},
                "cell_temperatures_block2": {"start": 0x0300, "count": 8, "factor": 1, "unit": "°C"}
            }
            
            for array_name, array_config in cell_arrays.items():
                array_result = execute_read_operation(
                    battery_id, 'holding', 
                    array_config["start"], 
                    array_config["count"]
                )
                
                result["summary"]["total_operations"] += 1
                
                if array_result.get("status") == "success":
                    # Procesar datos del array
                    processed_cells = []
                    raw_data = array_result["data"]
                    
                    for i, raw_value in enumerate(raw_data):
                        cell_number = i + 1
                        if "block2" in array_name:
                            cell_number += 16
                        
                        # Detectar valores especiales
                        if array_config["unit"] == "V" and raw_value == 0xFFFF:
                            status = "DISCONNECTED"
                            processed_value = None
                        elif array_config["unit"] == "°C" and raw_value in [0xFC19, 0x7FFF]:
                            status = "DISCONNECTED" 
                            processed_value = None
                        else:
                            status = "OK"
                            processed_value = raw_value * array_config["factor"]
                        
                        processed_cells.append({
                            "cell_number": cell_number,
                            "raw_value": raw_value,
                            "processed_value": processed_value,
                            "status": status
                        })
                    
                    result["cell_data"][array_name] = {
                        "success": True,
                        "start_address": f"0x{array_config['start']:04X}",
                        "count": array_config["count"],
                        "unit": array_config["unit"],
                        "factor": array_config["factor"],
                        "cells": processed_cells
                    }
                    
                    result["summary"]["successful_operations"] += 1
                    
                else:
                    result["cell_data"][array_name] = {
                        "success": False,
                        "error": array_result.get("message", "Error desconocido")
                    }
                    result["summary"]["failed_operations"] += 1
            
            # ========== 3. DETERMINAR ESTADO FINAL ==========
            if result["summary"]["failed_operations"] == 0:
                result["status"] = "success"
                result["message"] = f"Datos de celdas leídos exitosamente ({result['summary']['total_operations']} operaciones)"
            elif result["summary"]["successful_operations"] > 0:
                result["status"] = "partial"
                result["message"] = f"Datos parciales: {result['summary']['successful_operations']}/{result['summary']['total_operations']} operaciones exitosas"
            else:
                result["status"] = "error"
                result["message"] = "No se pudieron leer los datos de celdas"
            
            print(f"Lectura de celdas completada: {result['message']}")
            return jsonify(result)
            
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Error al leer datos de celdas: {str(e)}"
            })

    def _convert_signed_current(raw_current):
        """Convierte corriente raw a valor con signo."""
        if raw_current > 32767:
            return (raw_current - 65536) * 0.01
        return raw_current * 0.01