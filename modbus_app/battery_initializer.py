# modbus_app/battery_initializer.py
"""
Módulo para inicialización a bajo nivel de baterías Huawei.
Maneja la comunicación serial directa para despertar, autenticar y leer información
de las baterías, antes de pasar a operaciones normales con PyModbus.
"""

import time
import datetime
import struct
import serial
import threading
import logging
from modbus_app.authentication_status import update_phase_status, PHASE_STATES
from modbus_app.device_info.device_cache import update_device_info, get_device_info, reset_device_info
from modbus_app.logger_config import log_to_cmd

# Variable global para almacenar la instancia
_initializer_instance = None
log_to_cmd("BatteryInitializer: Módulo cargado, _initializer_instance inicial: None", "DEBUG", "INIT")
# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('battery_initializer')

class BatteryInitializer:
    """
    Clase para manejar la inicialización a bajo nivel de baterías Huawei ESM.
    
    Esta clase implementa la comunicación serial directa para:
    1. Despertar las baterías
    2. Ejecutar la secuencia de autenticación
    3. Leer información detallada
    
    La información recopilada se almacena en el caché global para uso posterior.
    """
    
    def __init__(self, port=None, baudrate=9600, parity='N', stopbits=1, bytesize=8, timeout=1.0):
        """
        Inicializa el inicializador de baterías.
        
        Args:
            port (str): Puerto serial (ej. 'COM8')
            baudrate (int): Velocidad de comunicación
            parity (str): Paridad ('N', 'E', 'O')
            stopbits (int): Bits de parada (1, 2)
            bytesize (int): Bits de datos (7, 8)
            timeout (float): Timeout en segundos
        """
        self.port = port
        self.baudrate = baudrate
        self.parity = parity
        self.stopbits = stopbits
        self.bytesize = bytesize
        self.timeout = timeout
        
        # Para comunicación serial
        self._serial = None
        self._lock = threading.RLock()  # Para thread-safety
        self._is_connected = False  # Nueva bandera para rastrear estado
        
        # Conjunto de baterías inicializadas correctamente
        self.initialized_batteries = set()
        # Log detallado de inicialización
        log_to_cmd(f"BatteryInitializer: Nueva instancia creada con ID {id(self)}, puerto={port}", "INFO", "INIT")
        log_to_cmd(f"BatteryInitializer: Parámetros - baudrate={baudrate}, parity={parity}, stopbits={stopbits}, bytesize={bytesize}, timeout={timeout}", "DEBUG", "INIT")

        
    def connect(self):
        """
        Establece la conexión serial directa.
        
        Returns:
            bool: True si se conectó exitosamente, False en caso contrario
        """
        with self._lock:
            # Si ya está conectado, devolver True inmediatamente
            if self._is_connected and self._serial and self._serial.is_open:
                logger.info("Puerto serial ya está abierto")
                return True
            
            # Si hay un objeto serial pero está cerrado, limpiarlo
            if self._serial and not self._serial.is_open:
                self._serial = None
                self._is_connected = False
                
            try:
                logger.info(f"Conectando a {self.port} ({self.baudrate},{self.bytesize}{self.parity}{self.stopbits})")
                self._serial = serial.Serial(
                    port=self.port,
                    baudrate=self.baudrate,
                    parity=self.parity,
                    stopbits=self.stopbits,
                    bytesize=self.bytesize,
                    timeout=self.timeout
                )
                self._is_connected = True
                logger.info(f"Conexión establecida con {self.port}")
                return True
            except Exception as e:
                logger.error(f"Error al conectar: {str(e)}")
                self._is_connected = False
                self._serial = None
                return False
    
    def disconnect(self):
        """
        Cierra la conexión serial directa.
        
        Returns:
            bool: True si se desconectó exitosamente, False en caso contrario
        """
        with self._lock:
            if self._serial and self._serial.is_open:
                try:
                    self._serial.close()
                    logger.info("Puerto serial cerrado")
                    self._serial = None
                    self._is_connected = False
                    return True
                except Exception as e:
                    logger.error(f"Error al cerrar puerto serial: {str(e)}")
                    return False
            else:
                logger.info("Puerto serial ya está cerrado")
                self._serial = None
                self._is_connected = False
                return True
                
    def _compute_crc16(self, data):
        """
        Calcula el CRC16 para Modbus RTU.
        
        Args:
            data (bytearray): Datos para calcular CRC
            
        Returns:
            bytes: CRC16 calculado (2 bytes, little endian)
        """
        crc = 0xFFFF
        for byte in data:
            crc ^= byte
            for _ in range(8):
                if crc & 0x0001:
                    crc = (crc >> 1) ^ 0xA001
                else:
                    crc >>= 1
        return struct.pack('<H', crc)  # Little endian

    def initialize_batteries(self, battery_ids):
        """
        Inicializa un conjunto de baterías (despierta, autentica y lee información).
        
        Args:
            battery_ids (list): Lista de IDs de baterías a inicializar
            
        Returns:
            dict: Resultado del proceso con estado e información
        """
        log_to_cmd(f"BatteryInitializer.initialize_batteries: Iniciando con IDs {battery_ids}", "INFO", "INIT")
        
        if not battery_ids:
            log_to_cmd("BatteryInitializer.initialize_batteries: ERROR - No se proporcionaron IDs de baterías", "ERROR", "INIT")
            return {"status": "error", "message": "No hay baterías para inicializar"}
        
        # Verificar si hay conexión serial activa
        if not self._is_connected or not self._serial or not self._serial.is_open:
            log_to_cmd("BatteryInitializer.initialize_batteries: ERROR - No hay conexión serial activa", "ERROR", "INIT")
            log_to_cmd(f"BatteryInitializer.initialize_batteries: Estado de conexión - is_connected={self._is_connected}, serial exists={self._serial is not None}, is_open={self._serial.is_open if self._serial else False}", "ERROR", "INIT")
            return {"status": "error", "message": "No hay conexión serial activa"}
        
        log_to_cmd(f"BatteryInitializer.initialize_batteries: Iniciando inicialización para {len(battery_ids)} baterías: {battery_ids}", "INFO", "INIT")
        
        results = {
            "status": "success",
            "batteries": [],
            "initialized_count": 0,
            "failed_count": 0
        }
        
        try:
            # Procesar cada batería
            for i, battery_id in enumerate(battery_ids):
                log_to_cmd(f"BatteryInitializer.initialize_batteries: Procesando batería {i+1}/{len(battery_ids)}: ID={battery_id}", "INFO", "INIT")
                
                battery_result = self._initialize_single_battery(battery_id)
                log_to_cmd(f"BatteryInitializer.initialize_batteries: Resultado para batería {battery_id}: {battery_result['status']}", "INFO", "INIT")
                
                if battery_result["status"] == "success":
                    results["initialized_count"] += 1
                    self.initialized_batteries.add(battery_id)
                    log_to_cmd(f"BatteryInitializer.initialize_batteries: Batería {battery_id} añadida a initialized_batteries, total ahora: {len(self.initialized_batteries)}", "INFO", "INIT")
                else:
                    results["failed_count"] += 1
                    log_to_cmd(f"BatteryInitializer.initialize_batteries: Batería {battery_id} falló inicialización: {battery_result.get('message', 'Sin mensaje')}", "WARNING", "INIT")
                
                results["batteries"].append(battery_result)
                
                # Pausa entre baterías para no saturar el bus
                log_to_cmd(f"BatteryInitializer.initialize_batteries: Pausa de 1 segundo antes de la siguiente batería", "DEBUG", "INIT")
                time.sleep(1.0)
                
            # Actualizar estado general
            if results["failed_count"] > 0 and results["initialized_count"] == 0:
                results["status"] = "error"
                results["message"] = f"No se pudo inicializar ninguna batería"
                log_to_cmd(f"BatteryInitializer.initialize_batteries: ERROR COMPLETO - Ninguna batería inicializada de {len(battery_ids)}", "ERROR", "INIT")
            elif results["failed_count"] > 0:
                results["status"] = "partial"
                results["message"] = f"Se inicializaron {results['initialized_count']} baterías, fallaron {results['failed_count']}"
                log_to_cmd(f"BatteryInitializer.initialize_batteries: ÉXITO PARCIAL - {results['initialized_count']} ok, {results['failed_count']} fallidos", "WARNING", "INIT")
            else:
                results["message"] = f"Se inicializaron exitosamente {results['initialized_count']} baterías"
                log_to_cmd(f"BatteryInitializer.initialize_batteries: ÉXITO COMPLETO - {results['initialized_count']} baterías inicializadas", "INFO", "INIT")
            
            # Logs adicionales para verificar el estado del módulo authentication_status 
            try:
                from modbus_app.authentication_status import get_all_batteries_status, authentication_status
                auth_status = get_all_batteries_status()
                log_to_cmd(f"BatteryInitializer.initialize_batteries: Estado de autenticación - {len(auth_status)} baterías en caché", "INFO", "INIT")
                log_to_cmd(f"BatteryInitializer.initialize_batteries: IDs en authentication_status: {list(authentication_status.keys())}", "DEBUG", "INIT")
            except Exception as e:
                log_to_cmd(f"BatteryInitializer.initialize_batteries: Error al verificar estado de autenticación: {str(e)}", "ERROR", "INIT")
                
        except Exception as e:
            log_to_cmd(f"BatteryInitializer.initialize_batteries: EXCEPCIÓN CRÍTICA: {str(e)}", "ERROR", "INIT")
            import traceback
            log_to_cmd(f"BatteryInitializer.initialize_batteries: Traceback: {traceback.format_exc()}", "ERROR", "INIT")
            
            results["status"] = "error"
            results["message"] = f"Error general: {str(e)}"
        
        log_to_cmd(f"BatteryInitializer.initialize_batteries: Finalizando, estado final: {results['status']}", "INFO", "INIT")
        return results
        
    def _initialize_single_battery(self, battery_id):
        """
        Inicializa una única batería.
        
        Args:
            battery_id (int): ID de la batería a inicializar
            
        Returns:
            dict: Resultado del proceso para esta batería
        """
        result = {
            "battery_id": battery_id,
            "status": "error",
            "timestamp": time.time()
        }
        
        logger.info(f"Inicializando batería ID: {battery_id}")
        
        try:
            # Paso 1: Despertar la batería
            try:
                # Reportar inicio del proceso de despertar
                update_phase_status(
                    battery_id=battery_id,
                    phase='wake_up',
                    state=PHASE_STATES['IN_PROGRESS'],
                    message='Intentando despertar batería'
                )
            except Exception as e:
                logger.error(f"Error al reportar estado de inicio: {str(e)}")
                
            # Intentar despertar la batería
            wake_result = self._wake_up_battery(battery_id)
            if not wake_result:
                try:
                    update_phase_status(
                        battery_id=battery_id,
                        phase='wake_up',
                        state=PHASE_STATES['FAILED'],
                        message=f"No se pudo despertar la batería {battery_id}"
                    )
                except Exception as e:
                    logger.error(f"Error al reportar fallo de despertar: {str(e)}")
                    
                result["message"] = f"No se pudo despertar la batería {battery_id}"
                logger.warning(result["message"])
                return result
                
            # Reportar éxito en despertar
            try:
                update_phase_status(
                    battery_id=battery_id,
                    phase='wake_up',
                    state=PHASE_STATES['SUCCESS'],
                    message='Batería despertada correctamente'
                )
            except Exception as e:
                logger.error(f"Error al reportar éxito de despertar: {str(e)}")
                
            # Paso 2: Autenticar la batería
            try:
                # Reportar inicio de autenticación
                update_phase_status(
                    battery_id=battery_id,
                    phase='authenticate',
                    state=PHASE_STATES['IN_PROGRESS'],
                    message='Iniciando secuencia de autenticación'
                )
            except Exception as e:
                logger.error(f"Error al reportar inicio de autenticación: {str(e)}")
            
            # Intentar autenticar la batería
            auth_result = self._authenticate_battery(battery_id)
            if not auth_result:
                try:
                    update_phase_status(
                        battery_id=battery_id,
                        phase='authenticate',
                        state=PHASE_STATES['FAILED'],
                        message=f"No se pudo autenticar la batería {battery_id}"
                    )
                except Exception as e:
                    logger.error(f"Error al reportar fallo de autenticación: {str(e)}")
                    
                result["message"] = f"No se pudo autenticar la batería {battery_id}"
                logger.warning(result["message"])
                return result
            
            # Reportar éxito en autenticación
            try:
                update_phase_status(
                    battery_id=battery_id,
                    phase='authenticate',
                    state=PHASE_STATES['SUCCESS'],
                    message='Autenticación completada'
                )
            except Exception as e:
                logger.error(f"Error al reportar éxito de autenticación: {str(e)}")
            
            # Paso 3: Leer información de la batería
            try:
                # Reportar inicio de lectura de información
                update_phase_status(
                    battery_id=battery_id,
                    phase='read_info',
                    state=PHASE_STATES['IN_PROGRESS'],
                    message='Leyendo información del dispositivo'
                )
            except Exception as e:
                logger.error(f"Error al reportar inicio de lectura: {str(e)}")
                
            # Intentar leer información de la batería
            device_info = self._read_all_device_info(battery_id)
            if not device_info["combined_text"]:
                try:
                    update_phase_status(
                        battery_id=battery_id,
                        phase='read_info',
                        state=PHASE_STATES['FAILED'],
                        message=f"No se pudo leer información de la batería {battery_id}"
                    )
                except Exception as e:
                    logger.error(f"Error al reportar fallo de lectura: {str(e)}")
                    
                result["message"] = f"No se pudo leer información de la batería {battery_id}"
                logger.warning(result["message"])
                return result
            
            # Reportar éxito en lectura de información
            try:
                update_phase_status(
                    battery_id=battery_id,
                    phase='read_info',
                    state=PHASE_STATES['SUCCESS'],
                    message='Información leída correctamente'
                )
            except Exception as e:
                logger.error(f"Error al reportar éxito de lectura: {str(e)}")
            
            # CAMBIO: Actualizar directamente el caché global
            update_result = update_device_info(battery_id, device_info)
            if not update_result:
                logger.error(f"Error al actualizar caché global para batería {battery_id}")
                result["message"] = f"Error al actualizar caché para batería {battery_id}"
                return result
                
            # Verificar si es un dispositivo Huawei desde el caché global
            device_data = get_device_info(battery_id)
            is_huawei = device_data.get("is_huawei", False)
            if not is_huawei:
                parsed_info = device_data.get("parsed_info", {})
                result["message"] = f"Dispositivo incompatible: {parsed_info.get('manufacturer', 'Desconocido')} {parsed_info.get('model', 'Desconocido')}"
                return result
                
            # Procesamiento exitoso
            result["status"] = "success"
            result["message"] = f"Batería {battery_id} inicializada exitosamente"
            
            # Solo guardar el ID en el conjunto de baterías inicializadas
            self.initialized_batteries.add(battery_id)
            
            # Obtener información parseada desde el caché global para el log
            parsed_info = device_data.get("parsed_info", {})
            logger.info(f"Batería {battery_id} inicializada: {parsed_info.get('manufacturer', 'Desconocido')} {parsed_info.get('model', 'Desconocido')}")
            
        except Exception as e:
            try:
                # Reportar excepción general
                update_phase_status(
                    battery_id=battery_id,
                    phase='wake_up',  # La fase donde estamos o la última conocida
                    state=PHASE_STATES['FAILED'],
                    message=f"Error durante la inicialización: {str(e)}"
                )
            except Exception as report_error:
                logger.error(f"Error al reportar excepción general: {str(report_error)}")
                
            result["message"] = f"Error durante la inicialización: {str(e)}"
            logger.error(f"Excepción al inicializar batería {battery_id}: {str(e)}")
            
        return result
            
    def _wake_up_battery(self, battery_id, max_attempts=3):
        """
        Intenta despertar una batería.
        
        Args:
            battery_id (int): ID de la batería
            max_attempts (int): Número máximo de intentos
            
        Returns:
            bool: True si se despertó exitosamente, False en caso contrario
        """
        logger.info(f"Intentando despertar batería {battery_id}...")
        
        for attempt in range(1, max_attempts + 1):
            try:
                logger.debug(f"Intento {attempt} de despertar batería {battery_id}")
                
                # Leer registro 0 (voltaje)
                message = bytearray([battery_id, 0x03, 0x00, 0x00, 0x00, 0x01])
                crc = self._compute_crc16(message)
                request = message + crc
                
                with self._lock:
                    if not self._serial or not self._serial.is_open:
                        logger.error("Puerto serial no disponible")
                        return False
                        
                    self._serial.reset_input_buffer()
                    self._serial.reset_output_buffer()
                    self._serial.write(request)
                    logger.debug(f"Enviado: {' '.join([f'{b:02x}' for b in request])}")
                    
                    # Esperar respuesta
                    time.sleep(0.2)
                    response = self._serial.read(7)  # 7 bytes esperados
                    
                    logger.debug(f"Recibido ({len(response)}): {' '.join([f'{b:02x}' for b in response])}")
                    
                    if len(response) == 7 and response[0] == battery_id and response[1] == 0x03:
                        # Extraer valor de voltaje
                        voltage_raw = (response[3] << 8) | response[4]
                        voltage = voltage_raw * 0.01
                        logger.info(f"Batería {battery_id} despertada! Voltaje: {voltage:.2f}V")
                        return True
                    else:
                        logger.warning(f"Respuesta inválida al despertar batería {battery_id}")
            
            except Exception as e:
                logger.error(f"Error al despertar batería {battery_id} (intento {attempt}): {str(e)}")
            
            # Aumentar espera entre intentos
            wait_time = attempt * 0.5
            logger.debug(f"Esperando {wait_time:.1f}s antes del siguiente intento...")
            time.sleep(wait_time)
        
        logger.error(f"No se pudo despertar la batería {battery_id} después de {max_attempts} intentos")
        return False
            
    def _authenticate_battery(self, battery_id):
        """
        Ejecuta la secuencia de autenticación para una batería.
        
        Args:
            battery_id (int): ID de la batería
            
        Returns:
            bool: True si la autenticación fue exitosa, False en caso contrario
        """
        logger.info(f"Iniciando secuencia de autenticación para batería {battery_id}")
        
        try:
            # Paso 1: Comando de desbloqueo especial (FC03)
            logger.info("Paso 1: Enviando comando de desbloqueo (FC03 especial)")
            message_step1 = bytearray([battery_id, 0x03, 0x01, 0x06, 0x00, 0x01])
            crc = self._compute_crc16(message_step1)
            request_step1 = message_step1 + crc
            
            with self._lock:
                self._serial.reset_input_buffer()
                self._serial.reset_output_buffer()
                self._serial.write(request_step1)
                logger.debug(f"Enviado Paso 1: {' '.join([f'{b:02x}' for b in request_step1])}")
                time.sleep(0.2)
                response_step1 = self._serial.read(7)
                logger.debug(f"Paso 1 - Recibido ({len(response_step1)}): {' '.join([f'{b:02x}' for b in response_step1])}")
            
            if len(response_step1) != 7 or response_step1[0] != battery_id or response_step1[1] != 0x03:
                logger.error(f"Error Paso 1: Longitud o ID/FC inválido. Recibido: {' '.join([f'{b:02x}' for b in response_step1])}")
                return False
                
            logger.info("Paso 1 completado exitosamente")
            time.sleep(0.5)
            
            # Paso 2: Sincronización de fecha/hora (FC10)
            logger.info("Paso 2: Enviando sincronización de fecha/hora (FC10)")
            now = datetime.datetime.now()
            message_step2 = bytearray([
                battery_id, 0x10, 0x10, 0x00, 0x00, 0x06, 0x0C,
                (now.year >> 8) & 0xFF, now.year & 0xFF,
                0x00, now.month, 0x00, now.day, 0x00, now.hour,
                0x00, now.minute, 0x00, now.second
            ])
            crc = self._compute_crc16(message_step2)
            request_step2 = message_step2 + crc
            
            with self._lock:
                self._serial.reset_input_buffer()
                self._serial.reset_output_buffer()
                self._serial.write(request_step2)
                logger.debug(f"Enviado Paso 2: {now.isoformat()} : {' '.join([f'{b:02x}' for b in request_step2])}")
                time.sleep(0.2)
                response_step2 = self._serial.read(8)
                logger.debug(f"Paso 2 - Recibido ({len(response_step2)}): {' '.join([f'{b:02x}' for b in response_step2])}")
            
            if len(response_step2) != 8 or response_step2[0] != battery_id or response_step2[1] != 0x10:
                logger.error(f"Error Paso 2: Respuesta inválida. Recibido: {' '.join([f'{b:02x}' for b in response_step2])}")
                return False
                
            logger.info("Paso 2 completado exitosamente")
            time.sleep(0.8)
            
            # Paso 3: Validación de acceso (FC41 inicial)
            logger.info("Paso 3: Enviando validación de acceso (FC41 inicial)")
            message_step3 = bytearray([battery_id, 0x41, 0x05, 0x01, 0x04])
            crc = self._compute_crc16(message_step3)
            request_step3 = message_step3 + crc
            
            with self._lock:
                self._serial.reset_input_buffer()
                self._serial.reset_output_buffer()
                self._serial.write(request_step3)
                logger.debug(f"Enviado Paso 3: {' '.join([f'{b:02x}' for b in request_step3])}")
                time.sleep(0.3)
                response_step3 = self._serial.read(12)
                logger.debug(f"Paso 3 - Recibido ({len(response_step3)}): {' '.join([f'{b:02x}' for b in response_step3])}")
                
            if len(response_step3) < 9 or response_step3[0] != battery_id or response_step3[1] != 0x41:
                logger.error(f"Error Paso 3: Respuesta inválida. Recibido: {' '.join([f'{b:02x}' for b in response_step3])}")
                return False
                
            logger.info("Secuencia de autenticación completada exitosamente")
            return True
            
        except Exception as e:
            logger.error(f"Error durante la autenticación: {str(e)}")
            return False
            
    def _read_all_device_info(self, battery_id):
        """
        Lee toda la información del dispositivo.
        
        Args:
            battery_id (int): ID de la batería
            
        Returns:
            dict: Información recolectada
        """
        logger.info(f"Leyendo información completa de la batería {battery_id}")
        
        # Preparar contenedores para almacenar datos
        raw_bytes_all = bytearray()
        fragments = {}
        
        try:
            # Leer los 6 fragmentos de información (índices 0-5)
            for index in range(6):
                logger.info(f"Leyendo información, índice {index}")
                
                # Crear mensaje para leer el fragmento actual
                message = bytearray([battery_id, 0x41, 0x06, 0x03, 0x04, 0x00, index])
                crc = self._compute_crc16(message)
                request = message + crc
                
                with self._lock:
                    # Enviar solicitud y leer respuesta
                    self._serial.reset_input_buffer()
                    self._serial.reset_output_buffer()
                    self._serial.write(request)
                    logger.debug(f"Enviada solicitud FC41 para índice {index}")
                    time.sleep(0.3)
                    
                    # Leer la respuesta (cabecera + datos)
                    header = self._serial.read(7)
                    
                    if len(header) < 7 or header[0] != battery_id or header[1] != 0x41:
                        logger.warning(f"FC41 Índice {index}: Respuesta inválida o incompleta")
                        fragments[f"fragment_{index}"] = f"ERROR: Respuesta inválida"
                        time.sleep(0.5)
                        continue
                        
                    # Leer datos adicionales después de la cabecera
                    additional_data = self._serial.read(100)
                    full_response = header + additional_data
                    
                    # Extraer solo los bytes de datos (ignorando cabecera y CRC)
                    if len(full_response) > 9:
                        data_bytes = full_response[7:-2]
                        raw_bytes_all.extend(data_bytes)
                        logger.info(f"Datos índice {index} leídos ({len(data_bytes)} bytes)")
                        fragments[f"fragment_{index}"] = f"DATOS LEÍDOS ({len(data_bytes)} bytes)"
                    else:
                        logger.warning(f"FC41 Índice {index}: Respuesta sin suficientes datos")
                        fragments[f"fragment_{index}"] = f"ERROR: Respuesta corta"
                
                time.sleep(0.5)
            
            # Decodificar todos los bytes juntos
            all_combined_text = ""
            try:
                all_combined_text = raw_bytes_all.decode('utf-8', errors='replace')
                all_combined_text = ''.join(c if (ord(c) >= 32 and ord(c) <= 126) or c in ['\n', '\r', '\t'] else '' for c in all_combined_text)
                logger.info(f"Todos los bytes combinados decodificados exitosamente ({len(all_combined_text)} caracteres)")
            except Exception as e:
                logger.warning(f"Error al decodificar bytes combinados: {str(e)}")
            
            return {
                "device_id": battery_id,  # Añadir ID para el caché global
                "raw_bytes": raw_bytes_all,
                "combined_text": all_combined_text, 
                "fragments": fragments
            }
                
        except Exception as e:
            logger.error(f"Error al leer información del dispositivo: {str(e)}")
            return {
                "device_id": battery_id,
                "raw_bytes": bytearray(),
                "combined_text": "",
                "fragments": {"error": str(e)}
            }

    def get_battery_info(self, battery_id):
        """
        Obtiene la información de una batería desde el caché global.
        
        Args:
            battery_id (int): ID de la batería
            
        Returns:
            dict: Información de la batería o error si no está inicializada
        """
        if battery_id not in self.initialized_batteries:
            return {
                "status": "error",
                "message": f"Batería {battery_id} no inicializada"
            }
            
        # Obtener información directamente del caché global
        return get_device_info(battery_id)
            
    def get_all_initialized_batteries(self):
        """
        Obtiene la lista de todas las baterías inicializadas.
        
        Returns:
            list: Lista de IDs de baterías inicializadas
        """
        return list(self.initialized_batteries)
    
    # NUEVO: Método para reintentar la inicialización de una batería específica
    def retry_initialize_battery(self, battery_id):
        """
        Reintenta la inicialización de una batería específica.
        
        Args:
            battery_id (int): ID de la batería a reintentar
            
        Returns:
            dict: Resultado del proceso de inicialización
        """
        print(f"Reintentando inicialización para batería ID: {battery_id}")
        
        # Verificar si hay conexión serial activa
        if not self._is_connected or not self._serial or not self._serial.is_open:
            return {"status": "error", "message": "No hay conexión serial activa", "battery_id": battery_id}
        
        # Reiniciar el caché para esta batería
        reset_device_info(battery_id)
        
        results = {
            "status": "success",
            "battery_id": battery_id,
            "message": ""
        }
        
        try:
            # Inicializar la batería específica
            battery_result = self._initialize_single_battery(battery_id)
            
            if battery_result["status"] == "success":
                self.initialized_batteries.add(battery_id)
                results["message"] = f"Batería {battery_id} inicializada exitosamente"
            else:
                results["status"] = "error"
                results["message"] = battery_result.get("message", f"Error al inicializar batería {battery_id}")
                
        except Exception as e:
            results["status"] = "error"
            results["message"] = f"Error durante la inicialización de batería {battery_id}: {str(e)}"
            
        return results
        
    @classmethod
    def get_instance(cls):
        """
        Obtiene la instancia global del inicializador.
        Si no existe, lanza una excepción.
        
        Returns:
            BatteryInitializer: Instancia global
        """
        global _initializer_instance
        
        # Log detallado sobre el estado actual
        instance_id = id(_initializer_instance) if _initializer_instance else "None"
        log_to_cmd(f"BatteryInitializer.get_instance: Valor actual de _initializer_instance: ID {instance_id}", "INFO", "INIT")
        
        if _initializer_instance is None:
            error_msg = "No hay una instancia del inicializador disponible"
            log_to_cmd(f"BatteryInitializer.get_instance: ERROR - {error_msg}", "ERROR", "INIT")
            raise RuntimeError(error_msg)
        
        # Log de éxito
        log_to_cmd(f"BatteryInitializer.get_instance: Devolviendo instancia con ID {instance_id}", "INFO", "INIT")
        return _initializer_instance

    @classmethod
    def set_instance(cls, instance):
        """
        Establece la instancia global del inicializador.
        
        Args:
            instance (BatteryInitializer): Instancia a guardar
        """
        global _initializer_instance
        
        # Log antes de asignación
        old_instance_id = id(_initializer_instance) if _initializer_instance else "None"
        new_instance_id = id(instance) if instance else "None"
        log_to_cmd(f"BatteryInitializer.set_instance: Cambiando _initializer_instance de ID {old_instance_id} a ID {new_instance_id}", "INFO", "INIT")
        
        # Aquí está la posible línea problemática - verificar si no hay asignación
        _initializer_instance = instance
        
        # Log después de asignación para confirmar
        actual_id = id(_initializer_instance) if _initializer_instance else "None"
        log_to_cmd(f"BatteryInitializer.set_instance: Valor _initializer_instance después de asignación: ID {actual_id}", "INFO", "INIT")