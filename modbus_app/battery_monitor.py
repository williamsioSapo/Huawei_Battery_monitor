# modbus_app/battery_monitor.py

import threading
import time
import json
import sys
from datetime import datetime
from . import client
from . import operations
from . import device_info
from modbus_app.logger_config import log_to_cmd
# Función para escribir directamente en stdout
def log_stdout(message):
    sys.stdout.write(f"{message}\n")
    sys.stdout.flush()

class BatteryMonitor:
    def __init__(self):
        log_stdout(f"MONITOR-DEBUG: Inicializando una nueva instancia de BatteryMonitor (ID: {id(self)})")
        
        # Configuración de monitoreo existente
        self.battery_cache = {}  # Diccionario para datos de múltiples baterías
        self.last_poll_time = {}  # Timestamp de última consulta por ID
        self.polling_active = False
        self.polling_interval = 8  # segundos
        self.polling_thread = None
        self.monitored_battery_ids = []  # Lista de IDs de baterías a monitorear
        self.lock = threading.Lock()  # Para thread safety
        
        # Configuración de información detallada (existente)
        self.detailed_info_loading = False  # Flag para indicar carga en progreso
        self.detailed_info_progress = {  # Seguimiento del progreso de carga
            "total": 0,
            "completed": 0,
            "current_battery": None
        }
        
        # ========== NUEVAS FUNCIONALIDADES DE HISTORIAL ==========
        self.history_enabled = True  # Control principal de historial
        self.history_interval = 120  # Intervalo en segundos (2 minutos)
        self.last_history_save = {}  # Timestamp de última grabación por batería
        self.history_include_cells = True  # Incluir datos de celdas individuales
        self.additional_registers = [
            (0x0042, 2),  # discharge_times - 32-bit
            (0x0044, 2),  # discharge_ah - 32-bit  
            (0x0046, 1),  # hardware_faults
            (0x0049, 1),  # operation_mode
            (0x0048, 1),  # sensor_status
            (0x004A, 1),  # subsystem_status
        ]
        self.register_to_field = {
            0x0042: "discharge_times_total",
            0x0044: "discharge_ah_accumulated", 
            0x0046: "hardware_faults",
            0x0048: "sensor_status",
            0x0049: "operation_mode",
            0x004A: "subsystem_status"
        }
        self.history_active = False  # Estado actual de grabación
        self.history_stats = {  # Estadísticas de grabación
            "total_records_saved": 0,
            "records_today": 0,
            "last_save_time": None,
            "last_error": None,
            "start_time": None
        }
        
        # Cargar configuración de historial desde config.json
        self._load_history_config()
        
        log_stdout(f"MONITOR-DEBUG: BatteryMonitor inicializado con historial {'habilitado' if self.history_enabled else 'deshabilitado'}")
    
    def _load_history_config(self):
        """Carga la configuración de historial desde config.json"""
        try:
            from . import config_manager
            config = config_manager.load_config()
            
            monitoring_config = config.get("monitoring", {})
            self.history_enabled = monitoring_config.get("history_enabled", True)
            self.history_interval = monitoring_config.get("history_interval_minutes", 2) * 60
            self.history_include_cells = monitoring_config.get("history_include_cells", True)
            
            log_stdout(f"MONITOR-DEBUG: Configuración de historial cargada - Intervalo: {self.history_interval}s")
            
        except Exception as e:
            log_stdout(f"MONITOR-DEBUG: Error cargando configuración de historial: {str(e)}, usando valores por defecto")
    
    # ========== FUNCIONES DE HISTORIAL ==========
    
    def start_history_recording(self, battery_ids=None):
        """
        Inicia la grabación de historial para las baterías especificadas.
        
        Args:
            battery_ids (list): Lista de IDs de baterías. Si es None, usa las monitoreadas.
            
        Returns:
            dict: Resultado de la operación
        """
        if not self.history_enabled:
            return {
                "status": "error",
                "message": "Historial deshabilitado en configuración"
            }
        
        if battery_ids is None:
            battery_ids = self.monitored_battery_ids
        
        if not battery_ids:
            return {
                "status": "error", 
                "message": "No hay baterías especificadas para historial"
            }
        
        with self.lock:
            self.history_active = True
            self.history_stats["start_time"] = datetime.now()
            self.history_stats["records_today"] = 0
            
            # Inicializar timestamps por batería
            current_time = time.time()
            for battery_id in battery_ids:
                self.last_history_save[battery_id] = current_time - self.history_interval  # Permitir grabación inmediata
        
        log_stdout(f"MONITOR-DEBUG: Grabación de historial iniciada para baterías: {battery_ids}")
        
        return {
            "status": "success",
            "message": f"Grabación de historial iniciada para {len(battery_ids)} baterías",
            "battery_ids": battery_ids,
            "interval_minutes": self.history_interval // 60
        }
    
    def stop_history_recording(self):
        """Detiene la grabación de historial."""
        with self.lock:
            was_active = self.history_active
            self.history_active = False
            self.last_history_save.clear()
        
        if was_active:
            log_stdout("MONITOR-DEBUG: Grabación de historial detenida")
            return {
                "status": "success",
                "message": "Grabación de historial detenida",
                "records_saved_today": self.history_stats["records_today"]
            }
        else:
            return {
                "status": "warning",
                "message": "La grabación de historial no estaba activa"
            }
    
    def get_history_status(self):
        """
        Obtiene el estado actual del sistema de historial.
        
        Returns:
            dict: Estado completo del historial
        """
        with self.lock:
            return {
                "status": "success",
                "history_enabled": self.history_enabled,
                "history_active": self.history_active,
                "interval_minutes": self.history_interval // 60,
                "include_cells": self.history_include_cells,
                "monitored_batteries": list(self.last_history_save.keys()),
                "stats": self.history_stats.copy(),
                "next_save_in_seconds": self._get_seconds_until_next_save()
            }
    
    def _get_seconds_until_next_save(self):
        """Calcula segundos hasta la próxima grabación."""
        if not self.history_active or not self.last_history_save:
            return None
        
        current_time = time.time()
        next_saves = []
        
        for battery_id, last_save in self.last_history_save.items():
            next_save = last_save + self.history_interval
            if next_save > current_time:
                next_saves.append(next_save - current_time)
        
        return min(next_saves) if next_saves else 0
    
    def _should_save_history(self, battery_id):
        """
        Determina si es momento de guardar historial para una batería.
        
        Args:
            battery_id (int): ID de la batería
            
        Returns:
            bool: True si debe guardar historial
        """
        if not self.history_enabled or not self.history_active:
            return False
        
        if battery_id not in self.last_history_save:
            return False
        
        current_time = time.time()
        last_save = self.last_history_save[battery_id]
        time_diff = current_time - last_save
        
        # ← AGREGAR ESTAS LÍNEAS
        from modbus_app.logger_config import log_to_cmd
        log_to_cmd(f"Historial Check batería {battery_id}: diff={time_diff:.1f}s, interval={self.history_interval}s", "INFO", "HISTORY")
        
        result = time_diff >= self.history_interval
        log_to_cmd(f"Should save? {result} para batería {battery_id}", "INFO", "HISTORY")
        
        return result
    
    
    def _save_to_history(self, battery_id, battery_data):
        """
        Guarda los datos de una batería en el historial CON REGISTROS EXPANDIDOS.
        """
        log_to_cmd(f"NUEVO CÓDIGO EJECUTÁNDOSE para batería {battery_id}", "INFO", "HISTORY")
        try:
            # 1. USAR datos básicos del caché (ya disponibles)
            basic_data = self._format_basic_data_for_history(battery_data)
            
            # 2. LEER REGISTROS ADICIONALES
            log_stdout(f"HISTORY: Leyendo registros expandidos para batería {battery_id}")
            
            for register, count in self.additional_registers:
                try:
                    result = operations.execute_read_operation(
                        slave_id=battery_id,
                        function='holding',
                        address=register,
                        count=count
                    )
                    
                    if result.get("status") == "success":
                        field_name = self.register_to_field.get(register)
                        if field_name:
                            processed_value = self._process_register_value(
                                result["data"], register, count
                            )
                            basic_data[field_name] = processed_value
                            log_stdout(f"HISTORY: {field_name} = {processed_value}")
                            
                except Exception as e:
                    log_stdout(f"HISTORY: Error leyendo 0x{register:04X}: {str(e)}")
            
            # 3. GUARDAR CON AUTO-EXPAND
            record_id = self._save_with_auto_expand(battery_id, datetime.now(), basic_data)
            
            if record_id:
                self.history_stats["total_records_saved"] += 1
                self.history_stats["last_save_time"] = datetime.now()
                self.last_history_save[battery_id] = time.time()
                log_stdout(f"HISTORY: Registro expandido guardado para batería {battery_id}")
                return True
            else:
                return False
                
        except Exception as e:
            log_stdout(f"HISTORY: Error general: {str(e)}")
            return False

    
    def _format_basic_data_for_history(self, battery_data):
        """
        Formatea los datos básicos de batería para el historial.
        
        Args:
            battery_data (dict): Datos del caché de batería
            
        Returns:
            dict: Datos formateados para la base de datos
        """
        return {
            "pack_voltage": battery_data.get("pack_voltage"),
            "battery_current": battery_data.get("current"),
            "soc": battery_data.get("soc"),
            "soh": battery_data.get("soh"),
            "temp_min": None,  # Se calculará desde datos de celdas
            "temp_max": None,  # Se calculará desde datos de celdas
            "discharge_ah_accumulated": None,  # TODO: Implementar si está disponible
            "discharge_times_total": None,     # TODO: Implementar si está disponible
            "charge_cycles_accumulated": None, # TODO: Implementar si está disponible
            "hardware_faults": None,           # TODO: Leer desde registros específicos
            "sensor_status": None,             # TODO: Leer desde registros específicos
            "operation_mode": None,            # TODO: Leer desde registros específicos
            "subsystem_status": None           # TODO: Leer desde registros específicos
        }
    
    def _get_cell_data_for_history(self, battery_id):
        """
        Obtiene datos detallados de celdas para el historial.
        
        Args:
            battery_id (int): ID de la batería
            
        Returns:
            dict: Datos de celdas formateados para historial
        """
        try:
            # Usar el endpoint optimizado para obtener datos de celdas
            import requests
            response = requests.get(f"http://127.0.0.1:5000/api/batteries/cells_data/{battery_id}", timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") in ["success", "partial"]:
                    return self._format_cell_data_for_history(data)
            
            log_stdout(f"MONITOR-WARNING: No se pudieron obtener datos de celdas para batería {battery_id}")
            return {"voltages": [], "temperatures": []}
            
        except Exception as e:
            log_stdout(f"MONITOR-ERROR: Error obteniendo datos de celdas: {str(e)}")
            return {"voltages": [], "temperatures": []}
    
    def _format_cell_data_for_history(self, cell_data):
        """
        Formatea los datos de celdas para el historial.
        
        Args:
            cell_data (dict): Datos del endpoint cells_data
            
        Returns:
            dict: Datos de celdas formateados para historial
        """
        voltages = []
        temperatures = []
        
        try:
            # Procesar voltajes
            for block_name in ["cell_voltages_block1", "cell_voltages_block2"]:
                block_data = cell_data.get("cell_data", {}).get(block_name)
                if block_data and block_data.get("success"):
                    for cell in block_data.get("cells", []):
                        if cell.get("status") == "OK":
                            voltages.append({
                                "cell_number": cell["cell_number"],
                                "voltage": cell["processed_value"],
                                "status": "OK",
                                "raw_value": cell["raw_value"]
                            })
                        else:
                            voltages.append({
                                "cell_number": cell["cell_number"],
                                "voltage": None,
                                "status": "DISCONNECTED",
                                "raw_value": cell["raw_value"]
                            })
            
            # Procesar temperaturas
            for block_name in ["cell_temperatures_block1", "cell_temperatures_block2"]:
                block_data = cell_data.get("cell_data", {}).get(block_name)
                if block_data and block_data.get("success"):
                    for cell in block_data.get("cells", []):
                        if cell.get("status") == "OK":
                            temperatures.append({
                                "cell_number": cell["cell_number"],
                                "temperature": cell["processed_value"],
                                "status": "OK",
                                "raw_value": cell["raw_value"]
                            })
                        else:
                            temperatures.append({
                                "cell_number": cell["cell_number"],
                                "temperature": None,
                                "status": "DISCONNECTED",
                                "raw_value": cell["raw_value"]
                            })
            
        except Exception as e:
            log_stdout(f"MONITOR-ERROR: Error formateando datos de celdas: {str(e)}")
        
        return {"voltages": voltages, "temperatures": temperatures}
    

    def _process_register_value(self, raw_data, register, count):
        """
        Procesa el valor crudo de un registro según su tipo.
        
        Args:
            raw_data: Lista con valores crudos del registro
            register: Dirección del registro (ej: 0x0042)
            count: Número de words leídos (1 para 16-bit, 2 para 32-bit)
        
        Returns:
            Valor procesado para guardar en DB
        """
        try:
            if count == 2:  # Registro de 32-bit
                # Combinar dos words en un valor de 32-bit
                msw = raw_data[0]  # Most Significant Word
                lsw = raw_data[1]  # Least Significant Word
                return (msw << 16) | lsw
            else:  # Registro de 16-bit
                return raw_data[0]
        except Exception as e:
            log_stdout(f"HISTORY: Error procesando registro 0x{register:04X}: {str(e)}")
            return None

    def _save_with_auto_expand(self, battery_id, timestamp, data):
        """
        Guarda datos en DB con auto-expansión de campos faltantes.
        
        Args:
            battery_id: ID de la batería
            timestamp: Timestamp del registro
            data: Diccionario con todos los datos a guardar
            
        Returns:
            ID del registro insertado o None si falla
        """
        try:
            from modbus_app.history.database import get_db
            db = get_db()
            
            # Intentar insertar normalmente
            return db.insert_history_record(
                battery_id=battery_id,
                timestamp=timestamp,
                source="live_monitor",
                basic_data=data
            )
            
        except Exception as e:
            error_msg = str(e).lower()
            if "no such column" in error_msg or "unknown column" in error_msg:
                log_stdout(f"HISTORY: Campo faltante detectado - {str(e)}")
                # TODO: Implementar auto-expand en próximo paso
                return None
            else:
                log_stdout(f"HISTORY: Error de DB: {str(e)}")
                return None

    # ========== FUNCIONES EXISTENTES MODIFICADAS ==========
    
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
        
        # Iniciar grabación de historial automáticamente si está habilitado
        if self.history_enabled:
            self.start_history_recording(battery_ids)
        
        return True

    def stop_polling(self):
        """Detiene el monitoreo de baterías."""
        if not self.polling_active:
            print("WARNING: No hay monitoreo activo para detener")
            return False
        
        print("INFO: Deteniendo monitoreo de baterías")
        self.polling_active = False
        
        # Detener grabación de historial
        if self.history_active:
            self.stop_history_recording()
        
        # Esperar a que el thread termine (con timeout)
        if self.polling_thread and self.polling_thread.is_alive():
            self.polling_thread.join(timeout=2.0)
        
        self.polling_thread = None
        return True

    def _polling_worker(self):
        """Función de trabajo para el polling de baterías - MODIFICADA para incluir historial."""
        log_to_cmd("POLLING WORKER INICIADO", "INFO", "MONITOR")
        
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
                                    
                                    # ========== NUEVA FUNCIONALIDAD: VERIFICAR HISTORIAL ==========
                                    if self._should_save_history(battery_id):
                                        print(f"INFO: Guardando historial para batería {battery_id}")
                                        self._save_to_history(battery_id, self.battery_cache[battery_id])
                                    
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
                polling_interval_remaining = self.polling_interval
                while polling_interval_remaining > 0 and self.polling_active:
                    time.sleep(min(1.0, polling_interval_remaining))
                    polling_interval_remaining -= 1.0
                    
            except Exception as e:
                print(f"ERROR en thread de monitoreo: {str(e)}")
                time.sleep(5.0)  # Pausa más larga en caso de error
        
        print("INFO: Thread de monitoreo finalizado")

    # ========== FUNCIONES EXISTENTES SIN CAMBIOS ==========
    
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
    
    # ========== FUNCIONES EXISTENTES DE INFORMACIÓN DETALLADA (SIN CAMBIOS) ==========
    
    def load_all_detailed_info(self, battery_ids=None):
        """Verifica la disponibilidad de información detallada en el caché global."""
        if self.detailed_info_loading:
            log_stdout(f"MONITOR-DEBUG: Ya hay una verificación en progreso - IGNORANDO SOLICITUD")
            return False
            
        if battery_ids is None:
            from . import config_manager
            available_batteries = config_manager.get_available_batteries()
            battery_ids = available_batteries.get('batteries', [])
            
        if not battery_ids:
            log_stdout(f"MONITOR-DEBUG: No hay baterías disponibles para verificar")
            return False
            
        self.detailed_info_loading = True
        self.detailed_info_progress = {
            "total": len(battery_ids),
            "completed": 0,
            "current_battery": None
        }
        
        log_stdout(f"MONITOR-DEBUG: INICIANDO verificación para {len(battery_ids)} baterías: {battery_ids}")
        
        verification_thread = threading.Thread(
            target=self._verify_detailed_info_worker,
            args=(battery_ids,),
            daemon=True
        )
        verification_thread.start()
        return True
    
    def _verify_detailed_info_worker(self, battery_ids):
        """Verifica la disponibilidad de información detallada en el caché global."""
        log_stdout(f"MONITOR-DEBUG: Hilo de verificación INICIADO para {len(battery_ids)} baterías")
        
        try:
            from modbus_app.device_info.device_cache import get_device_info
            
            for battery_id in battery_ids:
                with self.lock:
                    self.detailed_info_progress["current_battery"] = battery_id
                
                log_stdout(f"MONITOR-DEBUG: [{battery_id}] Verificando información detallada...")
                
                global_info = get_device_info(battery_id)
                
                if global_info and global_info.get("status") == "success":
                    log_stdout(f"MONITOR-DEBUG: [{battery_id}] Información disponible en caché global")
                else:
                    log_stdout(f"MONITOR-DEBUG: [{battery_id}] No se encontró información en caché global")
                
                with self.lock:
                    self.detailed_info_progress["completed"] += 1
                
                time.sleep(0.1)
                
            log_stdout(f"MONITOR-DEBUG: Verificación completada para todas las baterías")
            
        except Exception as e:
            log_stdout(f"MONITOR-DEBUG: ERROR en verificación: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            self.detailed_info_loading = False
            log_stdout("MONITOR-DEBUG: Proceso de verificación finalizado")
    
    def get_battery_detailed_info(self, battery_id):
        """Obtiene la información detallada de una batería específica desde el caché global."""
        log_stdout(f"MONITOR-DEBUG: Solicitando información para batería {battery_id}")
        
        try:
            from modbus_app.device_info.device_cache import get_device_info
            global_info = get_device_info(battery_id)
            
            if not global_info or global_info.get("status") != "success":
                log_stdout(f"MONITOR-DEBUG: NO SE ENCONTRÓ información en caché global para batería {battery_id}")
                return None
            
            log_stdout(f"MONITOR-DEBUG: Información ENCONTRADA en caché global para batería {battery_id}")
            
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
    
    def get_detailed_info_loading_status(self):
        """Obtiene el estado actual de la verificación de información detallada."""
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
    def reset_history_total(self):
        """
        Reset completo del sistema de historial.
        Coordina el reset de la base de datos con el sistema de monitoreo.
        
        Returns:
            dict: Resultado de la operación completa
        """
        log_to_cmd("=== INICIANDO RESET TOTAL DEL SISTEMA DE HISTORIAL ===", "INFO", "MONITOR_RESET")
        
        try:
            with self.lock:
                # Paso 1: Parar grabación de historial si está activa
                log_to_cmd("Paso 1: Parando grabación de historial", "INFO", "MONITOR_RESET")
                
                was_history_active = self.history_active
                monitored_batteries = self.monitored_battery_ids.copy() if self.monitored_battery_ids else []
                
                if was_history_active:
                    stop_result = self.stop_history_recording()
                    log_to_cmd(f"Historial detenido: {stop_result.get('message', 'OK')}", "INFO", "MONITOR_RESET")
                else:
                    log_to_cmd("Historial no estaba activo", "INFO", "MONITOR_RESET")
                
                # Paso 2: Reset de la base de datos (delegado)
                log_to_cmd("Paso 2: Ejecutando reset de base de datos", "INFO", "MONITOR_RESET")
                
                from modbus_app.history.management import reset_total_database
                db_result = reset_total_database()
                
                if db_result["status"] != "success":
                    log_to_cmd(f"Error en reset de DB: {db_result['message']}", "ERROR", "MONITOR_RESET")
                    return {
                        "status": "error",
                        "message": f"Fallo en reset de base de datos: {db_result['message']}",
                        "database_reset": False,
                        "history_restarted": False,
                        "monitoring_restored": False
                    }
                
                log_to_cmd("Reset de base de datos exitoso", "INFO", "MONITOR_RESET")
                
                # Paso 3: Resetear estadísticas internas
                log_to_cmd("Paso 3: Reseteando estadísticas internas", "INFO", "MONITOR_RESET")
                
                self.history_stats = {
                    "total_records_saved": 0,
                    "records_today": 0,
                    "last_save_time": None,
                    "last_error": None,
                    "start_time": None
                }
                
                # Limpiar timestamps de grabación
                self.last_history_save.clear()
                
                log_to_cmd("Estadísticas internas reseteadas", "INFO", "MONITOR_RESET")
                
                # Paso 4: Reiniciar historial si había baterías monitoreadas
                history_restarted = False
                if was_history_active and monitored_batteries and self.history_enabled:
                    log_to_cmd(f"Paso 4: Reiniciando historial para {len(monitored_batteries)} baterías", "INFO", "MONITOR_RESET")
                    
                    try:
                        restart_result = self.start_history_recording(monitored_batteries)
                        
                        if restart_result["status"] == "success":
                            history_restarted = True
                            log_to_cmd("Historial reiniciado exitosamente", "INFO", "MONITOR_RESET")
                        else:
                            log_to_cmd(f"Advertencia al reiniciar historial: {restart_result['message']}", "WARNING", "MONITOR_RESET")
                            
                    except Exception as e:
                        log_to_cmd(f"Error al reiniciar historial: {str(e)}", "ERROR", "MONITOR_RESET")
                else:
                    log_to_cmd("Paso 4: No se reinicia historial (no estaba activo o no hay baterías)", "INFO", "MONITOR_RESET")
            
            # Resultado final exitoso
            log_to_cmd("=== RESET TOTAL DEL SISTEMA COMPLETADO EXITOSAMENTE ===", "INFO", "MONITOR_RESET")
            
            return {
                "status": "success",
                "message": "Reset total del sistema de historial completado exitosamente",
                "database_reset": True,
                "history_restarted": history_restarted,
                "monitoring_restored": bool(monitored_batteries),
                "monitored_batteries": monitored_batteries,
                "timestamp": datetime.now().isoformat(),
                "database_details": db_result.get("details", {}),
                "database_path": db_result.get("file_path", "unknown")
            }
            
        except Exception as e:
            # Error crítico no manejado
            error_msg = f"Error crítico durante reset total del sistema: {str(e)}"
            log_to_cmd(error_msg, "ERROR", "MONITOR_RESET")
            
            return {
                "status": "error",
                "message": error_msg,
                "database_reset": False,
                "history_restarted": False,
                "monitoring_restored": False,
                "timestamp": datetime.now().isoformat()
            }


    def get_history_system_status(self):
        """
        Obtiene el estado completo del sistema de historial.
        Útil para verificar el estado después de un reset.
        
        Returns:
            dict: Estado completo del sistema
        """
        try:
            with self.lock:
                # Estado del monitoreo
                monitor_status = {
                    "polling_active": self.polling_active,
                    "history_active": self.history_active,
                    "history_enabled": self.history_enabled,
                    "monitored_batteries": self.monitored_battery_ids.copy() if self.monitored_battery_ids else [],
                    "history_interval_seconds": self.history_interval,
                    "last_history_saves": self.last_history_save.copy()
                }
                
                # Estado de la base de datos
                from modbus_app.history.management import get_database_info
                db_info = get_database_info()
                
                # Estadísticas del historial
                history_stats = self.history_stats.copy()
                
                return {
                    "status": "success",
                    "monitor_status": monitor_status,
                    "database_info": db_info,
                    "history_stats": history_stats,
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error obteniendo estado del sistema: {str(e)}"
            }