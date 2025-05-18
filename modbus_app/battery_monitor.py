# modbus_app/battery_monitor.py
import threading
import time
import sys
from . import client
from . import operations
from . import device_info

# Función para escribir directamente en stdout
def log_stdout(message):
    sys.stdout.write(f"{message}\n")
    sys.stdout.flush()

class BatteryMonitor:
    def __init__(self):
        log_stdout(f"MONITOR-DEBUG: Inicializando una nueva instancia de BatteryMonitor (ID: {id(self)})")
        self.battery_cache = {}  # Diccionario para datos de múltiples baterías
        self.last_poll_time = {}  # Timestamp de última consulta por ID
        self.polling_active = False
        self.polling_interval = 8  # segundos
        self.polling_thread = None
        self.monitored_battery_ids = []  # Lista de IDs de baterías a monitorear
        self.lock = threading.Lock()  # Para thread safety
        self.detailed_info_loading = False  # Flag para indicar carga en progreso
        self.detailed_info_progress = {  # Seguimiento del progreso de carga
            "total": 0,
            "completed": 0,
            "current_battery": None
        }
        
    # Método modificado para usar directamente el caché global
    def load_all_detailed_info(self, battery_ids=None):
        """
        Verifica la disponibilidad de información detallada en el caché global.
        """
        # Evitar iniciar múltiples verificaciones simultáneas
        if self.detailed_info_loading:
            log_stdout(f"MONITOR-DEBUG: Ya hay una verificación en progreso - IGNORANDO SOLICITUD")
            return False
            
        # Si no se especifican IDs, obtener las baterías disponibles
        if battery_ids is None:
            from . import config_manager
            available_batteries = config_manager.get_available_batteries()
            battery_ids = available_batteries.get('batteries', [])
            
        if not battery_ids:
            log_stdout(f"MONITOR-DEBUG: No hay baterías disponibles para verificar")
            return False
            
        # Iniciar verificación en segundo plano
        self.detailed_info_loading = True
        self.detailed_info_progress = {
            "total": len(battery_ids),
            "completed": 0,
            "current_battery": None
        }
        
        log_stdout(f"MONITOR-DEBUG: INICIANDO verificación para {len(battery_ids)} baterías: {battery_ids}")
        
        # Iniciar hilo para verificar información
        verification_thread = threading.Thread(
            target=self._verify_detailed_info_worker,
            args=(battery_ids,),
            daemon=True
        )
        verification_thread.start()
        return True
    
    # Nuevo método que reemplaza _load_detailed_info_worker
    def _verify_detailed_info_worker(self, battery_ids):
        """
        Verifica la disponibilidad de información detallada en el caché global.
        """
        log_stdout(f"MONITOR-DEBUG: Hilo de verificación INICIADO para {len(battery_ids)} baterías")
        
        try:
            from modbus_app.device_info.device_cache import get_device_info
            
            for battery_id in battery_ids:
                # Actualizar progreso
                with self.lock:
                    self.detailed_info_progress["current_battery"] = battery_id
                
                log_stdout(f"MONITOR-DEBUG: [{battery_id}] Verificando información detallada...")
                
                # Verificar si hay información en el caché global
                global_info = get_device_info(battery_id)
                
                if global_info and global_info.get("status") == "success":
                    log_stdout(f"MONITOR-DEBUG: [{battery_id}] Información disponible en caché global")
                else:
                    log_stdout(f"MONITOR-DEBUG: [{battery_id}] No se encontró información en caché global")
                
                # Actualizar progreso
                with self.lock:
                    self.detailed_info_progress["completed"] += 1
                
                # Breve pausa para no saturar CPU
                time.sleep(0.1)
                
            log_stdout(f"MONITOR-DEBUG: Verificación completada para todas las baterías")
            
        except Exception as e:
            log_stdout(f"MONITOR-DEBUG: ERROR en verificación: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            # Marcar como completado
            self.detailed_info_loading = False
            log_stdout("MONITOR-DEBUG: Proceso de verificación finalizado")
    
    # Método modificado para usar directamente el caché global
    def get_battery_detailed_info(self, battery_id):
        """
        Obtiene la información detallada de una batería específica desde el caché global.
        """
        log_stdout(f"MONITOR-DEBUG: Solicitando información para batería {battery_id}")
        
        try:
            # Obtener información directamente del caché global
            from modbus_app.device_info.device_cache import get_device_info
            global_info = get_device_info(battery_id)
            
            if not global_info or global_info.get("status") != "success":
                log_stdout(f"MONITOR-DEBUG: NO SE ENCONTRÓ información en caché global para batería {battery_id}")
                return None
            
            log_stdout(f"MONITOR-DEBUG: Información ENCONTRADA en caché global para batería {battery_id}")
            
            # Convertir formato del caché global al formato esperado por el monitor
            detailed_info = {
                "status": "success",
                "timestamp": global_info.get("timestamp", time.time()),
                "info": global_info.get("parsed_info", {}),
                "combined_text": global_info.get("combined_text", "")
            }
            
            return detailed_info
            
        except Exception as e:
            log_stdout(f"MONITOR-DEBUG: Error al obtener información del caché global: {str(e)}")
            return None
    
    # Función para verificar el estado de la carga de información detallada
    def get_detailed_info_loading_status(self):
        """
        Obtiene el estado actual de la verificación de información detallada.
        """
        log_stdout(f"MONITOR-DEBUG: Consultando estado de verificación de información detallada")
        
        with self.lock:
            status = {
                "active": self.detailed_info_loading,
                "progress": self.detailed_info_progress.copy()
            }
            log_stdout(f"MONITOR-DEBUG: Estado de verificación: activo={status['active']}")
            if status["active"]:
                log_stdout(f"MONITOR-DEBUG: Progreso: {status['progress']['completed']}/{status['progress']['total']}")
            return status

    def start_polling(self, battery_ids):
        """Inicia el monitoreo de un conjunto de baterías."""
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
        """Detiene el monitoreo de baterías."""
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
        """Función de trabajo para el polling de baterías."""
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
        """Devuelve el estado de todas las baterías monitoreadas."""
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
        """Devuelve el estado de una batería específica."""
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