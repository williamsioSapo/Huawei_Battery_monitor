# modbus_app/battery_monitor.py
import threading
import time
from . import client
from . import operations
from . import device_info

class BatteryMonitor:
    def __init__(self):
        self.battery_cache = {}  # Diccionario para datos de múltiples baterías
        self.last_poll_time = {}  # Timestamp de última consulta por ID
        self.battery_detailed_info = {}  # Nuevo: Caché para información detallada de dispositivos
        self.polling_active = False
        self.polling_interval = 8  # segundos
        self.polling_thread = None
        self.monitored_battery_ids = []  # Lista de IDs de baterías a monitorear
        self.lock = threading.Lock()  # Para thread safety
        self.detailed_info_loading = False  # Nuevo: Flag para indicar carga en progreso
        self.detailed_info_progress = {  # Nuevo: Seguimiento del progreso de carga
            "total": 0,
            "completed": 0,
            "current_battery": None
        }
        
    # Añadir método para cargar información detallada de todas las baterías
    def load_all_detailed_info(self, battery_ids=None):
        """
        Carga información detallada de todas las baterías en segundo plano.
        
        Args:
            battery_ids: Lista opcional de IDs de baterías a cargar. Si es None,
                         se utilizan todas las baterías disponibles.
        
        Returns:
            bool: True si se inició la carga, False si ya hay una carga en progreso
        """
        # Evitar iniciar múltiples cargas simultáneas
        if self.detailed_info_loading:
            print("WARNING: Ya hay una carga de información detallada en progreso.")
            return False
            
        # Si no se especifican IDs, obtener las baterías disponibles
        if battery_ids is None:
            from . import config_manager
            available_batteries = config_manager.get_available_batteries()
            battery_ids = available_batteries.get('batteries', [])
            
        if not battery_ids:
            print("WARNING: No hay baterías disponibles para cargar información detallada.")
            return False
            
        # Iniciar hilo para cargar información
        self.detailed_info_loading = True
        self.detailed_info_progress = {
            "total": len(battery_ids),
            "completed": 0,
            "current_battery": None
        }
        
        loading_thread = threading.Thread(
            target=self._load_detailed_info_worker,
            args=(battery_ids,),
            daemon=True
        )
        loading_thread.start()
        print(f"INFO: Iniciado proceso de carga de información detallada para {len(battery_ids)} baterías")
        return True
        
    def _load_detailed_info_worker(self, battery_ids):
        """
        Función de trabajo para cargar información detallada de cada batería.
        Ejecutada en un hilo separado.
        
        Args:
            battery_ids: Lista de IDs de baterías a cargar
        """
        from . import device_info
        
        try:
            for battery_id in battery_ids:
                # Actualizar progreso
                with self.lock:
                    self.detailed_info_progress["current_battery"] = battery_id
                
                print(f"INFO: Cargando información detallada para batería {battery_id}...")
                
                # Ejecutar la secuencia de autenticación y lectura
                result = device_info.authenticate_and_read_device_info(battery_id)
                
                # Almacenar en caché si fue exitoso
                if result.get("status") == "success" and result.get("parsed_info"):
                    with self.lock:
                        self.battery_detailed_info[battery_id] = {
                            "status": "success",
                            "timestamp": time.time(),
                            "info": result.get("parsed_info"),
                            "combined_text": result.get("combined_text", "")
                        }
                    print(f"INFO: Información detallada para batería {battery_id} cargada correctamente")
                else:
                    with self.lock:
                        self.battery_detailed_info[battery_id] = {
                            "status": "error",
                            "timestamp": time.time(),
                            "error": result.get("message", "Error desconocido")
                        }
                    print(f"WARNING: Error al cargar información de batería {battery_id}: {result.get('message', 'Error desconocido')}")
                
                # Actualizar progreso
                with self.lock:
                    self.detailed_info_progress["completed"] += 1
                
                # Breve pausa para no saturar el bus
                time.sleep(1)
                
        except Exception as e:
            print(f"ERROR: Excepción en la carga de información detallada: {str(e)}")
        finally:
            # Marcar como completado
            self.detailed_info_loading = False
            print("INFO: Proceso de carga de información detallada completado")
    
    # Añadir método para obtener información detallada de una batería
    def get_battery_detailed_info(self, battery_id):
        """
        Obtiene la información detallada de una batería específica.
        
        Args:
            battery_id: ID de la batería
            
        Returns:
            dict: Información detallada de la batería o None si no está disponible
        """
        with self.lock:
            return self.battery_detailed_info.get(battery_id)
    
    # Añadir método para obtener estado de la carga de información detallada
    def get_detailed_info_loading_status(self):
        """
        Obtiene el estado actual de la carga de información detallada.
        
        Returns:
            dict: Estado de la carga, incluyendo si está activa y el progreso
        """
        with self.lock:
            return {
                "active": self.detailed_info_loading,
                "progress": self.detailed_info_progress.copy()
            }
            
    def start_polling(self, battery_ids):
        """
        Inicia el monitoreo de un conjunto de baterías.
        
        Args:
            battery_ids: Lista de IDs de baterías a monitorear
            
        Returns:
            bool: True si se inició el monitoreo, False si ya estaba activo
        """
        # Verificar si ya hay polling activo
        if self.polling_active:
            print("WARNING: El monitoreo ya está activo")
            return False
        
        # Guardar la lista de baterías a monitorear
        self.monitored_battery_ids = battery_ids
        print(f"INFO: Iniciando monitoreo para {len(battery_ids)} baterías: {battery_ids}")
        
        # Iniciar thread de polling
        self.polling_active = True
        self.polling_thread = threading.Thread(
            target=self._polling_worker,
            daemon=True
        )
        self.polling_thread.start()
        
        return True

    def stop_polling(self):
        """
        Detiene el monitoreo de baterías.
        
        Returns:
            bool: True si se detuvo el monitoreo, False si no estaba activo
        """
        if not self.polling_active:
            print("WARNING: No hay monitoreo activo para detener")
            return False
        
        print("INFO: Deteniendo monitoreo de baterías")
        self.polling_active = False
        
        # Esperar a que el thread termine (con timeout)
        if self.polling_thread and self.polling_thread.is_alive():
            self.polling_thread.join(timeout=2.0)
        
        self.polling_thread = None
        return True

    def _polling_worker(self):
        """
        Función de trabajo para el polling de baterías.
        Esta función se ejecuta en un thread separado.
        """
        print("INFO: Thread de monitoreo iniciado")
        
        while self.polling_active:
            try:
                # Importación tardía para evitar ciclos
                from . import operations
                
                # Para cada batería, actualizar su estado
                for battery_id in self.monitored_battery_ids:
                    try:
                        # Leer registros básicos (0-6)
                        result = operations.execute_read_operation(
                            slave_id=battery_id,
                            function='holding',
                            address=0,
                            count=7
                        )
                        
                        # Actualizar caché con los nuevos datos
                        with self.lock:
                            if result.get("status") == "success":
                                # Convertir datos crudos a valores interpretados
                                raw_data = result.get("data", [])
                                
                                if len(raw_data) >= 5:
                                    # Crear/actualizar entrada en caché
                                    if battery_id not in self.battery_cache:
                                        self.battery_cache[battery_id] = {}
                                    
                                    # Actualizar valores
                                    self.battery_cache[battery_id].update({
                                        "id": battery_id,
                                        "voltage": raw_data[0] * 0.01 if raw_data[0] is not None else None,
                                        "pack_voltage": raw_data[1] * 0.01 if raw_data[1] is not None else None,
                                        "current": self._convert_current(raw_data[2]) if raw_data[2] is not None else None,
                                        "soc": raw_data[3] if raw_data[3] is not None else None,
                                        "soh": raw_data[4] if raw_data[4] is not None else None,
                                        "raw_values": raw_data,
                                        "last_updated": time.time(),
                                        "status": self._determine_status(raw_data[2]) if raw_data[2] is not None else "Desconocido"
                                    })
                                    
                                    print(f"INFO: Actualizada batería {battery_id}: V={self.battery_cache[battery_id]['voltage']:.2f}V, SOC={self.battery_cache[battery_id]['soc']}%")
                                else:
                                    print(f"WARNING: Datos insuficientes para batería {battery_id}")
                                    self.battery_cache[battery_id] = {
                                        "id": battery_id,
                                        "error": "Datos insuficientes",
                                        "last_updated": time.time()
                                    }
                            else:
                                print(f"WARNING: Error al leer batería {battery_id}: {result.get('message', 'Error desconocido')}")
                                self.battery_cache[battery_id] = {
                                    "id": battery_id,
                                    "error": result.get("message", "Error de lectura"),
                                    "last_updated": time.time()
                                }
                            
                            # Actualizar timestamp
                            self.last_poll_time[battery_id] = time.time()
                    
                    except Exception as e:
                        print(f"ERROR: Excepción al procesar batería {battery_id}: {str(e)}")
                        with self.lock:
                            self.battery_cache[battery_id] = {
                                "id": battery_id,
                                "error": f"Excepción: {str(e)}",
                                "last_updated": time.time()
                            }
                    
                    # Pequeña pausa entre lecturas para no saturar el bus
                    time.sleep(0.5)
                
                # Esperar el intervalo configurado antes de la siguiente ronda
                # Usar sleep más corto para poder detener rápidamente si es necesario
                polling_interval_remaining = self.polling_interval
                while polling_interval_remaining > 0 and self.polling_active:
                    time.sleep(min(1.0, polling_interval_remaining))
                    polling_interval_remaining -= 1.0
                    
            except Exception as e:
                print(f"ERROR en thread de monitoreo: {str(e)}")
                time.sleep(5.0)  # Pausa más larga en caso de error
        
        print("INFO: Thread de monitoreo finalizado")

    def _convert_current(self, raw_current):
        """Convierte el valor crudo de corriente a valor real con signo."""
        if raw_current > 32767:  # Valor negativo en complemento a 2
            return (raw_current - 65536) * 0.01
        return raw_current * 0.01

    def _determine_status(self, raw_current):
        """Determina el estado de la batería basado en la corriente."""
        current = self._convert_current(raw_current)
        if current > 0.05:
            return "Cargando"
        elif current < -0.05:
            return "Descargando"
        else:
            return "Inactivo"

    def get_all_battery_status(self):
        """
        Devuelve el estado de todas las baterías monitoreadas.
        
        Returns:
            dict: Estado de todas las baterías
        """
        with self.lock:
            # Devolver una copia para evitar problemas de concurrencia
            batteries_list = []
            for battery_id, data in self.battery_cache.items():
                batteries_list.append(data.copy())
            
            return {
                "status": "success",
                "batteries": batteries_list,
                "last_updated": time.time()
            }

    def get_battery_status(self, battery_id):
        """
        Devuelve el estado de una batería específica.
        
        Args:
            battery_id: ID de la batería
            
        Returns:
            dict: Estado de la batería o error
        """
        with self.lock:
            if battery_id in self.battery_cache:
                return {
                    "status": "success",
                    "battery_data": self.battery_cache[battery_id].copy()
                }
            else:
                return {
                    "status": "error",
                    "message": f"Batería {battery_id} no está siendo monitoreada"
                }