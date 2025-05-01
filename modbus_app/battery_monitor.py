# modbus_app/battery_monitor.py
import threading
import time
from . import client
from . import operations
from . import device_info

class BatteryMonitor:
    """
    Clase para monitorear múltiples baterías en el bus Modbus.
    Utiliza un hilo separado para consultar secuencialmente cada batería
    y almacena los datos en caché para acceso rápido.
    """
    
    def __init__(self):
        self.battery_cache = {}  # Diccionario para datos de múltiples baterías
        self.last_poll_time = {}  # Timestamp de última consulta por ID
        self.polling_active = False
        self.polling_interval = 8  # segundos
        self.polling_thread = None
        self.lock = threading.Lock()  # Para thread safety
    
    def start_polling(self, battery_ids):
        """
        Inicia el polling periódico de múltiples baterías.
        
        Args:
            battery_ids: Lista de IDs de baterías a monitorear
            
        Returns:
            bool: True si se inició correctamente, False si ya estaba activo
        """
        if self.polling_active:
            print("WARNING: Ya hay un monitoreo de baterías activo.")
            return False
            
        self.polling_active = True
        self.polling_thread = threading.Thread(
            target=self._polling_worker,
            args=(battery_ids,),
            daemon=True
        )
        self.polling_thread.start()
        print(f"INFO: Iniciado monitoreo de {len(battery_ids)} baterías: {battery_ids}")
        return True
    
    def _polling_worker(self, battery_ids):
        """
        Función de trabajo para consultar secuencialmente cada batería.
        Ejecutada en un hilo separado.
        
        Args:
            battery_ids: Lista de IDs de baterías a monitorear
        """
        while self.polling_active:
            for battery_id in battery_ids:
                if not self.polling_active:
                    break
                self._poll_single_battery(battery_id)
                # Pequeña pausa entre consultas para no saturar el bus
                time.sleep(0.5)
            
            # Esperar hasta el siguiente ciclo completo
            sleep_time = max(0.1, self.polling_interval - (0.5 * len(battery_ids)))
            print(f"DEBUG: Esperando {sleep_time:.1f}s hasta el siguiente ciclo de monitoreo")
            # Esperar en pequeños incrementos para poder terminar antes si es necesario
            for _ in range(int(sleep_time * 10)):
                if not self.polling_active:
                    break
                time.sleep(0.1)
    
    def _poll_single_battery(self, battery_id):
        """
        Consulta una sola batería y actualiza la caché.
        
        Args:
            battery_id: ID de la batería a consultar
        """
        try:
            # Verificar si hay conexión activa
            if not client.is_client_connected():
                print(f"WARNING: No hay conexión Modbus activa para consultar batería {battery_id}")
                return
                
            # Realizar la lectura Modbus para esta batería
            result = operations.execute_read_operation(
                slave_id=battery_id,
                function='holding',
                address=0,
                count=7
            )
            
            if result["status"] == "success" and result["data"]:
                # Procesar los datos
                processed_data = self._process_battery_data(result["data"], battery_id)
                
                # Actualizar la caché con thread safety
                with self.lock:
                    self.battery_cache[battery_id] = processed_data
                    self.last_poll_time[battery_id] = time.time()
                
                print(f"INFO: Actualizada caché para batería {battery_id} - Voltaje: {processed_data.get('voltage', 'N/A')}V, SOC: {processed_data.get('soc', 'N/A')}%")
            else:
                print(f"WARNING: No se pudo leer la batería {battery_id}: {result.get('message', 'Error desconocido')}")
                
                # Actualizar caché con error
                with self.lock:
                    self.battery_cache[battery_id] = {
                        "id": battery_id,
                        "timestamp": time.time(),
                        "error": result.get('message', 'Lectura fallida'),
                        "status": "Error"
                    }
                    self.last_poll_time[battery_id] = time.time()
                
        except Exception as e:
            print(f"ERROR: Excepción al consultar batería {battery_id}: {str(e)}")
            # Actualizar caché con excepción
            with self.lock:
                self.battery_cache[battery_id] = {
                    "id": battery_id,
                    "timestamp": time.time(),
                    "error": f"Excepción: {str(e)}",
                    "status": "Error"
                }
                self.last_poll_time[battery_id] = time.time()
    
    def _process_battery_data(self, raw_data, battery_id):
        """
        Procesa datos crudos de una batería en información útil.
        
        Args:
            raw_data: Lista de valores crudos leídos de los registros
            battery_id: ID de la batería
            
        Returns:
            dict: Datos procesados de la batería
        """
        # Convertir valores según factores de escala
        try:
            voltage = raw_data[0] * 0.01 if len(raw_data) > 0 else None
            pack_voltage = raw_data[1] * 0.01 if len(raw_data) > 1 else None
            
            # Manejar corriente (puede ser negativa)
            current_raw = raw_data[2] if len(raw_data) > 2 else None
            if current_raw is not None and current_raw > 32767:
                current_raw -= 65536
            current = current_raw * 0.01 if current_raw is not None else None
            
            soc = raw_data[3] if len(raw_data) > 3 else None
            soh = raw_data[4] if len(raw_data) > 4 else None
            
            # Determinar estado basado en la corriente
            status = "Inactivo"
            if current is not None:
                if current > 0.05:
                    status = "Cargando"
                elif current < -0.05:
                    status = "Descargando"
            
            # Obtener información adicional del dispositivo si está disponible
            device_info_dict = self._get_device_info(battery_id)
            
            return {
                "id": battery_id,
                "timestamp": time.time(),
                "voltage": voltage,
                "pack_voltage": pack_voltage,
                "current": current,
                "soc": soc,
                "soh": soh,
                "status": status,
                "device_info": device_info_dict,
                "raw_values": raw_data
            }
        except Exception as e:
            print(f"ERROR: Excepción al procesar datos de batería {battery_id}: {str(e)}")
            return {
                "id": battery_id,
                "timestamp": time.time(),
                "error": str(e),
                "status": "Error",
                "raw_values": raw_data
            }
    
    def _get_device_info(self, battery_id):
        """
        Obtiene información del dispositivo desde la configuración o caché.
        
        Args:
            battery_id: ID de la batería
            
        Returns:
            dict: Información del dispositivo
        """
        # Buscar en la configuración para evitar consultas adicionales Modbus
        from . import config_manager
        config = config_manager.load_config()
        devices = config.get("application", {}).get("discovered_devices", [])
        
        for device in devices:
            if device.get("id") == battery_id:
                return {
                    "manufacturer": "Huawei",  # Asumimos Huawei por el contexto
                    "model": "ESM-48150B1",    # Modelo por defecto
                    "custom_name": device.get("custom_name", f"Batería {battery_id}"),
                    "discovery_date": device.get("discovery_date", "Desconocida")
                }
        
        return {
            "manufacturer": "Desconocido",
            "model": "Desconocido",
            "custom_name": f"Batería {battery_id}",
            "discovery_date": "Desconocida"
        }
    
    def stop_polling(self):
        """
        Detiene el polling de baterías.
        
        Returns:
            bool: True si se detuvo correctamente, False si no estaba activo
        """
        if not self.polling_active:
            print("WARNING: No hay monitoreo de baterías activo para detener.")
            return False
            
        print("INFO: Deteniendo monitoreo de baterías...")
        self.polling_active = False
        
        if self.polling_thread:
            self.polling_thread.join(timeout=2)
            if self.polling_thread.is_alive():
                print("WARNING: El hilo de monitoreo no terminó correctamente.")
            self.polling_thread = None
        
        print("INFO: Monitoreo de baterías detenido.")
        return True
    
    def get_all_battery_status(self):
        """
        Obtiene el estado actual de todas las baterías en caché.
        
        Returns:
            dict: Estado actual de todas las baterías
        """
        with self.lock:
            return {
                "timestamp": time.time(),
                "batteries": [
                    {**data, "last_updated": self.last_poll_time.get(battery_id, 0)}
                    for battery_id, data in self.battery_cache.items()
                ]
            }
    
    def get_battery_status(self, battery_id):
        """
        Obtiene el estado de una batería específica.
        
        Args:
            battery_id: ID de la batería
            
        Returns:
            dict: Estado de la batería especificada
        """
        with self.lock:
            data = self.battery_cache.get(battery_id)
            if not data:
                return {"status": "error", "message": f"No hay datos para la batería {battery_id}"}
            
            return {
                "status": "success",
                "timestamp": time.time(),
                "last_updated": self.last_poll_time.get(battery_id, 0),
                "battery_data": data
            }