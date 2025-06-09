# modbus_app/battery_initializer.py
"""
Módulo SIMPLIFICADO para inicialización de baterías Huawei.
Ahora usa HuaweiModbusClient que maneja automáticamente la autenticación.
"""

import time
import logging
from modbus_app.authentication_status import update_phase_status, PHASE_STATES
from modbus_app.device_info.device_cache import update_device_info, get_device_info, reset_device_info
from modbus_app.logger_config import log_to_cmd
from modbus_app.huawei_client import create_huawei_client

# Variable global para almacenar la instancia
_initializer_instance = None

logger = logging.getLogger('battery_initializer')

class BatteryInitializer:
    """
    Clase SIMPLIFICADA para inicialización usando HuaweiModbusClient.
    El HuaweiModbusClient maneja automáticamente la autenticación y FC41.
    """
    
    def __init__(self, port=None, baudrate=9600, parity='N', stopbits=1, bytesize=8, timeout=1.0):
        self.port = port
        self.baudrate = baudrate
        self.parity = parity
        self.stopbits = stopbits
        self.bytesize = bytesize
        self.timeout = timeout
        
        # Usar HuaweiModbusClient directamente
        self._huawei_client = None
        self._is_connected = False
        self.initialized_batteries = set()
        
        log_to_cmd(f"BatteryInitializer: Nueva instancia creada, puerto={port}", "INFO", "INIT")
        
    def connect(self):
        """Establece la conexión usando HuaweiModbusClient."""
        try:
            self._huawei_client = create_huawei_client(
                port=self.port,
                baudrate=self.baudrate,
                parity=self.parity,
                stopbits=self.stopbits,
                bytesize=self.bytesize,
                timeout=self.timeout
            )
            
            if self._huawei_client.connect():
                self._is_connected = True
                logger.info(f"Conexión establecida con {self.port}")
                return True
            else:
                logger.error("Fallo al conectar HuaweiModbusClient")
                return False
                
        except Exception as e:
            logger.error(f"Error al conectar: {str(e)}")
            self._is_connected = False
            self._huawei_client = None
            return False
    
    def disconnect(self):
        """Cierra la conexión."""
        if self._huawei_client:
            try:
                self._huawei_client.close()
                logger.info("Puerto cerrado")
                self._huawei_client = None
                self._is_connected = False
                return True
            except Exception as e:
                logger.error(f"Error al cerrar: {str(e)}")
                return False
        return True
    
    def initialize_batteries(self, battery_ids):
        """
        Inicializa baterías usando HuaweiModbusClient con secuencia CORRECTA de 3 fases.
        
        FASES:
        1. wake_up - Despertar batería (REAL, no cosmético)
        2. authenticate - Autenticación de 3 pasos Huawei
        3. read_info - Leer información del dispositivo
        
        API auth_status recibe updates en tiempo real de cada fase.
        """
        log_to_cmd(f"BatteryInitializer.initialize_batteries: Iniciando con IDs {battery_ids}", "INFO", "INIT")
        
        if not battery_ids:
            return {"status": "error", "message": "No hay baterías para inicializar"}
        
        if not self._is_connected:
            return {"status": "error", "message": "No hay conexión activa"}
        
        # Inicializar tracking para todas las baterías en auth_status
        from modbus_app.authentication_status import initialize_battery_status
        for battery_id in battery_ids:
            initialize_battery_status(battery_id)
            log_to_cmd(f"Estado de autenticación inicializado para batería {battery_id}", "DEBUG", "INIT")
        
        results = {
            "status": "success",
            "batteries": [],
            "initialized_count": 0,
            "failed_count": 0,
            "wake_failures": 0,
            "auth_failures": 0,
            "info_failures": 0
        }
        
        try:
            for battery_id in battery_ids:
                log_to_cmd(f"=== INICIANDO SECUENCIA PARA BATERÍA {battery_id} ===", "INFO", "INIT")
                
                battery_result = {
                    "battery_id": battery_id,
                    "status": "error",
                    "message": "No procesada",
                    "phases_completed": []
                }
                
                # ========== FASE 1: WAKE UP (REAL) ==========
                log_to_cmd(f"Batería {battery_id}: Iniciando Fase 1 - Wake Up", "INFO", "INIT")
                update_phase_status(battery_id, 'wake_up', PHASE_STATES['IN_PROGRESS'], 'Despertando batería...')
                
                try:
                    wake_success = self._huawei_client.wake_up_battery(battery_id, max_attempts=5)
                    
                    if not wake_success:
                        update_phase_status(battery_id, 'wake_up', PHASE_STATES['FAILED'], 'No se pudo despertar la batería')
                        log_to_cmd(f"Batería {battery_id}: FALLO en Fase 1 - Wake Up", "ERROR", "INIT")
                        
                        battery_result.update({
                            "status": "error",
                            "message": "Fallo en fase wake_up - batería no responde",
                            "failed_phase": "wake_up"
                        })
                        results["failed_count"] += 1
                        results["wake_failures"] += 1
                        results["batteries"].append(battery_result)
                        continue  # Saltar a siguiente batería
                    
                    # Wake up exitoso
                    update_phase_status(battery_id, 'wake_up', PHASE_STATES['SUCCESS'], 'Batería despertada exitosamente')
                    log_to_cmd(f"Batería {battery_id}: ÉXITO en Fase 1 - Wake Up", "INFO", "INIT")
                    battery_result["phases_completed"].append("wake_up")
                    
                    # Pequeña pausa entre fases para estabilizar comunicación
                    time.sleep(0.5)
                    
                except Exception as e:
                    update_phase_status(battery_id, 'wake_up', PHASE_STATES['FAILED'], f'Excepción en wake_up: {str(e)}')
                    log_to_cmd(f"Batería {battery_id}: EXCEPCIÓN en Fase 1 - {str(e)}", "ERROR", "INIT")
                    
                    battery_result.update({
                        "status": "error",
                        "message": f"Excepción en wake_up: {str(e)}",
                        "failed_phase": "wake_up"
                    })
                    results["failed_count"] += 1
                    results["wake_failures"] += 1
                    results["batteries"].append(battery_result)
                    continue
                
                # ========== FASE 2: AUTHENTICATE ==========
                log_to_cmd(f"Batería {battery_id}: Iniciando Fase 2 - Authenticate", "INFO", "INIT")
                update_phase_status(battery_id, 'authenticate', PHASE_STATES['IN_PROGRESS'], 'Ejecutando autenticación de 3 pasos...')
                
                try:
                    auth_success = self._huawei_client.authenticate_battery(battery_id)
                    
                    if not auth_success:
                        update_phase_status(battery_id, 'authenticate', PHASE_STATES['FAILED'], 'Fallo en autenticación de 3 pasos')
                        log_to_cmd(f"Batería {battery_id}: FALLO en Fase 2 - Authenticate", "ERROR", "INIT")
                        
                        battery_result.update({
                            "status": "error",
                            "message": "Fallo en autenticación - secuencia de 3 pasos falló",
                            "failed_phase": "authenticate",
                            "phases_completed": battery_result["phases_completed"]
                        })
                        results["failed_count"] += 1
                        results["auth_failures"] += 1
                        results["batteries"].append(battery_result)
                        continue
                    
                    # Autenticación exitosa
                    update_phase_status(battery_id, 'authenticate', PHASE_STATES['SUCCESS'], 'Autenticación de 3 pasos completada')
                    log_to_cmd(f"Batería {battery_id}: ÉXITO en Fase 2 - Authenticate", "INFO", "INIT")
                    battery_result["phases_completed"].append("authenticate")
                    
                    # Pausa entre fases
                    time.sleep(0.8)
                    
                except Exception as e:
                    update_phase_status(battery_id, 'authenticate', PHASE_STATES['FAILED'], f'Excepción en authenticate: {str(e)}')
                    log_to_cmd(f"Batería {battery_id}: EXCEPCIÓN en Fase 2 - {str(e)}", "ERROR", "INIT")
                    
                    battery_result.update({
                        "status": "error",
                        "message": f"Excepción en authenticate: {str(e)}",
                        "failed_phase": "authenticate",
                        "phases_completed": battery_result["phases_completed"]
                    })
                    results["failed_count"] += 1
                    results["auth_failures"] += 1
                    results["batteries"].append(battery_result)
                    continue
                
                # ========== FASE 3: READ INFO ==========
                log_to_cmd(f"Batería {battery_id}: Iniciando Fase 3 - Read Info", "INFO", "INIT")
                update_phase_status(battery_id, 'read_info', PHASE_STATES['IN_PROGRESS'], 'Leyendo información del dispositivo...')
                
                try:
                    device_info = self._read_all_device_info_simplified(battery_id)
                    
                    if not device_info["success"]:
                        update_phase_status(battery_id, 'read_info', PHASE_STATES['FAILED'], 'Error leyendo información del dispositivo')
                        log_to_cmd(f"Batería {battery_id}: FALLO en Fase 3 - Read Info", "ERROR", "INIT")
                        
                        battery_result.update({
                            "status": "error",
                            "message": f"Error leyendo información: {device_info.get('error', 'Error desconocido')}",
                            "failed_phase": "read_info",
                            "phases_completed": battery_result["phases_completed"]
                        })
                        results["failed_count"] += 1
                        results["info_failures"] += 1
                        results["batteries"].append(battery_result)
                        continue
                    
                    # Lectura de información exitosa
                    update_phase_status(battery_id, 'read_info', PHASE_STATES['SUCCESS'], 'Información del dispositivo leída')
                    log_to_cmd(f"Batería {battery_id}: ÉXITO en Fase 3 - Read Info", "INFO", "INIT")
                    battery_result["phases_completed"].append("read_info")
                    
                    # Actualizar caché global con la información obtenida
                    update_device_info(battery_id, {
                        "combined_text": device_info.get("combined_text", ""),
                        "device_id": battery_id
                    })
                    log_to_cmd(f"Batería {battery_id}: Información guardada en caché global", "DEBUG", "INIT")
                    
                    # Marcar como inicializada exitosamente
                    self.initialized_batteries.add(battery_id)
                    results["initialized_count"] += 1
                    
                    battery_result.update({
                        "status": "success",
                        "message": "Inicialización completa - todas las fases exitosas",
                        "phases_completed": battery_result["phases_completed"]
                    })
                    results["batteries"].append(battery_result)
                    
                    log_to_cmd(f"Batería {battery_id}: *** INICIALIZACIÓN COMPLETADA EXITOSAMENTE ***", "INFO", "INIT")
                    
                except Exception as e:
                    update_phase_status(battery_id, 'read_info', PHASE_STATES['FAILED'], f'Excepción en read_info: {str(e)}')
                    log_to_cmd(f"Batería {battery_id}: EXCEPCIÓN en Fase 3 - {str(e)}", "ERROR", "INIT")
                    
                    battery_result.update({
                        "status": "error",
                        "message": f"Excepción en read_info: {str(e)}",
                        "failed_phase": "read_info",
                        "phases_completed": battery_result["phases_completed"]
                    })
                    results["failed_count"] += 1
                    results["info_failures"] += 1
                    results["batteries"].append(battery_result)
                    continue
                
                # Pausa entre baterías para no saturar el bus
                time.sleep(1.0)
            
            # ========== ANÁLISIS FINAL ==========
            total_batteries = len(battery_ids)
            success_count = results["initialized_count"]
            failed_count = results["failed_count"]
            
            if failed_count == 0:
                results["status"] = "success"
                results["message"] = f"Todas las {total_batteries} baterías inicializadas exitosamente"
                log_to_cmd(f"INICIALIZACIÓN COMPLETA: {success_count}/{total_batteries} baterías exitosas", "INFO", "INIT")
            elif success_count > 0:
                results["status"] = "partial"
                results["message"] = f"{success_count} exitosas, {failed_count} fallidas de {total_batteries} baterías"
                log_to_cmd(f"INICIALIZACIÓN PARCIAL: {success_count}/{total_batteries} baterías exitosas", "WARNING", "INIT")
            else:
                results["status"] = "error"
                results["message"] = f"Todas las {total_batteries} baterías fallaron en inicialización"
                log_to_cmd(f"INICIALIZACIÓN FALLIDA: 0/{total_batteries} baterías exitosas", "ERROR", "INIT")
            
            # Log de estadísticas detalladas
            if results["wake_failures"] > 0:
                log_to_cmd(f"Estadísticas: {results['wake_failures']} fallos en wake_up", "INFO", "INIT")
            if results["auth_failures"] > 0:
                log_to_cmd(f"Estadísticas: {results['auth_failures']} fallos en authenticate", "INFO", "INIT")
            if results["info_failures"] > 0:
                log_to_cmd(f"Estadísticas: {results['info_failures']} fallos en read_info", "INFO", "INIT")
                    
        except Exception as e:
            log_to_cmd(f"ERROR CRÍTICO en initialize_batteries: {str(e)}", "ERROR", "INIT")
            results["status"] = "error"
            results["message"] = f"Error crítico durante inicialización: {str(e)}"
        
        return results
    
    def _read_all_device_info_simplified(self, battery_id):
        """Lee información del dispositivo usando HuaweiModbusClient."""
        try:
            combined_text = ""
            
            # Leer información de múltiples índices usando FC41
            for index in range(6):
                info_result = self._huawei_client.read_device_info(battery_id, index)
                
                if info_result.get("success"):
                    ascii_data = info_result.get("ascii_data", "")
                    if ascii_data:
                        combined_text += ascii_data + "\n"
            
            return {
                "success": True,
                "combined_text": combined_text.strip(),
                "device_id": battery_id
            }
            
        except Exception as e:
            logger.error(f"Error leyendo device info: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "device_id": battery_id
            }
    
    # Mantener métodos estáticos para compatibilidad
    @classmethod
    def get_instance(cls):
        global _initializer_instance
        if _initializer_instance is None:
            raise RuntimeError("No hay una instancia del inicializador disponible")
        return _initializer_instance

    @classmethod
    def set_instance(cls, instance):
        global _initializer_instance
        _initializer_instance = instance