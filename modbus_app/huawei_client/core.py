# modbus_app/huawei_client/core.py
"""
Cliente Modbus personalizado para baterías Huawei ESM.
Reemplaza PyModbus con implementación nativa que soporta funciones personalizadas.
"""

import time
import threading
import serial
import logging
from typing import Dict, List, Optional, Union, Any
from datetime import datetime

from .protocol import ModbusProtocol
from .authentication import HuaweiAuthentication

# Configurar logger
logger = logging.getLogger('huawei_client.core')

class HuaweiModbusClient:
    """
    Cliente Modbus personalizado optimizado para baterías Huawei.
    
    Características:
    - Soporte completo para funciones estándar (FC01-FC06, FC15-FC16)
    - Soporte nativo para FC41 (funciones Huawei personalizadas)
    - Autenticación automática de baterías Huawei
    - Thread-safe
    - API compatible con PyModbus para migración fácil
    """
    
    def __init__(self, port: str = None, baudrate: int = 9600, parity: str = 'N', 
                 stopbits: int = 1, bytesize: int = 8, timeout: float = 1.0):
        """
        Inicializa el cliente Modbus Huawei.
        
        Args:
            port: Puerto serial (ej. 'COM8')
            baudrate: Velocidad de comunicación
            parity: Paridad ('N', 'E', 'O')
            stopbits: Bits de parada (1, 2)
            bytesize: Bits de datos (7, 8)
            timeout: Timeout base en segundos
        """
        # Parámetros de conexión
        self.port = port
        self.baudrate = baudrate
        self.parity = parity
        self.stopbits = stopbits
        self.bytesize = bytesize
        self.timeout = timeout
        
        # Estado de conexión
        self._serial = None
        self._is_connected = False
        self._lock = threading.RLock()
        
        # Componentes del cliente
        self.protocol = ModbusProtocol()
        self.auth = HuaweiAuthentication()
        
        # Estados de autenticación por batería
        self._authenticated_batteries = set()
        
        # Configuraciones de timeout por función
        self._timeouts = {
            'FC01': 0.2,    # Read Coils
            'FC02': 0.2,    # Read Discrete Inputs
            'FC03': 0.2,    # Read Holding Registers
            'FC04': 0.2,    # Read Input Registers
            'FC05': 0.2,    # Write Single Coil
            'FC06': 0.2,    # Write Single Register
            'FC15': 0.4,    # Write Multiple Coils
            'FC16': 0.4,    # Write Multiple Registers
            'FC41': 0.6,    # Read Device Info (Huawei)
            'AUTH': 1     # Authentication sequence
        }
        
        logger.info(f"HuaweiModbusClient inicializado para puerto {port}")
    
    # ==================== CONEXIÓN Y DESCONEXIÓN ====================
    
    def connect(self) -> bool:
        """
        Establece conexión serial.
        
        Returns:
            bool: True si conecta exitosamente
        """
        with self._lock:
            if self._is_connected and self._serial and self._serial.is_open:
                logger.info("Cliente ya está conectado")
                return True
            
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
    
    def close(self):
        """Cierra la conexión serial."""
        with self._lock:
            if self._serial and self._serial.is_open:
                try:
                    self._serial.close()
                    logger.info("Conexión serial cerrada")
                except Exception as e:
                    logger.error(f"Error al cerrar conexión: {str(e)}")
                finally:
                    self._serial = None
                    self._is_connected = False
                    self._authenticated_batteries.clear()
    
    def is_socket_open(self) -> bool:
        """
        Verifica si la conexión está abierta.
        Mantiene compatibilidad con PyModbus.
        
        Returns:
            bool: True si está conectado
        """
        with self._lock:
            return (self._is_connected and 
                   self._serial is not None and 
                   self._serial.is_open)
    
    # ==================== FUNCIONES MODBUS ESTÁNDAR ====================
    
    def read_coils(self, address: int, count: int, slave: int = 1) -> 'ModbusResponse':
        """
        Lee coils (FC01).
        
        Args:
            address: Dirección inicial
            count: Número de coils a leer
            slave: ID del esclavo
            
        Returns:
            ModbusResponse: Resultado de la operación
        """
        return self._execute_standard_function('FC01', slave, address, count)
    
    def read_discrete_inputs(self, address: int, count: int, slave: int = 1) -> 'ModbusResponse':
        """Lee discrete inputs (FC02)."""
        return self._execute_standard_function('FC02', slave, address, count)
    
    def read_holding_registers(self, address: int, count: int, slave: int = 1) -> 'ModbusResponse':
        """Lee holding registers (FC03)."""
        return self._execute_standard_function('FC03', slave, address, count)
    
    def read_input_registers(self, address: int, count: int, slave: int = 1) -> 'ModbusResponse':
        """Lee input registers (FC04)."""
        return self._execute_standard_function('FC04', slave, address, count)
    
    def write_coil(self, address: int, value: bool, slave: int = 1) -> 'ModbusResponse':
        """
        Escribe un coil (FC05).
        
        Args:
            address: Dirección del coil
            value: Valor a escribir
            slave: ID del esclavo
            
        Returns:
            ModbusResponse: Resultado de la operación
        """
        return self._execute_write_function('FC05', slave, address, [value])
    
    def write_register(self, address: int, value: int, slave: int = 1) -> 'ModbusResponse':
        """Escribe un registro (FC06)."""
        return self._execute_write_function('FC06', slave, address, [value])
    
    def write_coils(self, address: int, values: List[bool], slave: int = 1) -> 'ModbusResponse':
        """Escribe múltiples coils (FC15)."""
        return self._execute_write_function('FC15', slave, address, values)
    
    def write_registers(self, address: int, values: List[int], slave: int = 1) -> 'ModbusResponse':
        """Escribe múltiples registros (FC16)."""
        return self._execute_write_function('FC16', slave, address, values)
    
    # ==================== FUNCIONES HUAWEI PERSONALIZADAS ====================
    
    def authenticate_battery(self, slave_id: int) -> bool:
        """
        Ejecuta la secuencia completa de autenticación Huawei.
        
        Args:
            slave_id: ID de la batería
            
        Returns:
            bool: True si la autenticación fue exitosa
        """
        if not self.is_socket_open():
            logger.error("No hay conexión activa para autenticación")
            return False
        
        if slave_id in self._authenticated_batteries:
            logger.info(f"Batería {slave_id} ya está autenticada")
            return True
        
        with self._lock:
            try:
                logger.info(f"Iniciando autenticación para batería {slave_id}")
                
                # Usar timeout especial para autenticación
                old_timeout = self._serial.timeout
                self._serial.timeout = self._timeouts['AUTH']
                
                success = self.auth.execute_authentication_sequence(self._serial, slave_id)
                
                if success:
                    self._authenticated_batteries.add(slave_id)
                    logger.info(f"Autenticación exitosa para batería {slave_id}")
                else:
                    logger.error(f"Fallo en autenticación de batería {slave_id}")
                
                # Restaurar timeout
                self._serial.timeout = old_timeout
                
                return success
                
            except Exception as e:
                logger.error(f"Error durante autenticación de batería {slave_id}: {str(e)}")
                return False
                
    def wake_up_battery(self, slave_id: int, max_attempts: int = 5) -> bool:
        """
        Despierta una batería Huawei con reintentos progresivos.
        
        Las baterías Huawei pueden estar en modo de ahorro de energía y necesitan
        ser "despertadas" antes de poder realizar operaciones avanzadas como autenticación.
        
        Args:
            slave_id: ID de la batería a despertar
            max_attempts: Número máximo de intentos (default: 5)
            
        Returns:
            bool: True si la batería respondió exitosamente, False si falló
        """
        if not self.is_socket_open():
            logger.error("No hay conexión activa para despertar batería")
            return False
        
        logger.info(f"Iniciando secuencia de despertar para batería {slave_id}")
        
        with self._lock:
            try:
                # Configurar timeout específico para wake_up (más corto que autenticación)
                old_timeout = self._serial.timeout if self._serial else self.timeout
                wake_timeout = 0.8  # Timeout corto para cada intento individual
                
                if self._serial:
                    self._serial.timeout = wake_timeout
                
                for attempt in range(1, max_attempts + 1):
                    logger.debug(f"Intento {attempt}/{max_attempts} de despertar batería {slave_id}")
                    
                    try:
                        # Intentar leer registro básico 0 (voltaje de batería)
                        # Esta es la operación más básica y menos intrusiva
                        result = self._execute_standard_function('FC03', slave_id, 0, 1)
                        
                        if not result.isError() and result.data:
                            voltage_raw = result.data[0]
                            voltage = voltage_raw * 0.01  # Factor de conversión estándar
                            
                            logger.info(f"¡Batería {slave_id} despertada exitosamente en intento {attempt}!")
                            logger.info(f"Voltaje detectado: {voltage:.2f}V (raw: {voltage_raw})")
                            
                            # Restaurar timeout original
                            if self._serial:
                                self._serial.timeout = old_timeout
                            
                            return True
                        else:
                            error_msg = result.error if result.isError() else "Sin datos válidos"
                            logger.warning(f"Intento {attempt} falló: {error_msg}")
                            
                    except Exception as e:
                        logger.warning(f"Excepción en intento {attempt}: {str(e)}")
                    
                    # Si no es el último intento, esperar con progresión exponencial
                    if attempt < max_attempts:
                        wait_time = 2 ** (attempt - 1)  # 1s, 2s, 4s, 8s, 16s
                        logger.debug(f"Esperando {wait_time}s antes del siguiente intento...")
                        
                        # Liberar el lock temporalmente durante la espera para no bloquear otras operaciones
                        self._lock.release()
                        try:
                            time.sleep(wait_time)
                        finally:
                            self._lock.acquire()
                
                # Restaurar timeout original si llegamos aquí
                if self._serial:
                    self._serial.timeout = old_timeout
                
                logger.error(f"No se pudo despertar batería {slave_id} después de {max_attempts} intentos")
                return False
                
            except Exception as e:
                # Restaurar timeout en caso de excepción
                if self._serial:
                    self._serial.timeout = old_timeout
                logger.error(f"Error crítico despertando batería {slave_id}: {str(e)}")
                return False
    
    
    def read_device_info(self, slave_id: int, info_index: int = 0) -> Dict[str, Any]:
        """
        Lee información del dispositivo usando FC41.
        
        Args:
            slave_id: ID de la batería
            info_index: Índice de información (0-5)
            
        Returns:
            Dict: Información del dispositivo
        """
        if not self.is_socket_open():
            return {"success": False, "error": "No hay conexión activa"}
        
        # Verificar autenticación
        if slave_id not in self._authenticated_batteries:
            logger.warning(f"Batería {slave_id} no está autenticada, intentando autenticar...")
            if not self.authenticate_battery(slave_id):
                return {"success": False, "error": "Fallo en autenticación"}
        
        with self._lock:
            try:
                # Usar timeout especial para FC41
                old_timeout = self._serial.timeout
                self._serial.timeout = self._timeouts['FC41']
                
                result = self.protocol.read_device_info_fc41(
                    self._serial, slave_id, info_index
                )
                
                # Restaurar timeout
                self._serial.timeout = old_timeout
                
                return result
                
            except Exception as e:
                logger.error(f"Error leyendo device info: {str(e)}")
                return {"success": False, "error": str(e)}
    
    def read_history_record(self, slave_id: int, record_number: int) -> Dict[str, Any]:
        """
        Lee un registro específico del historial usando FC41.
        
        Args:
            slave_id: ID de la batería
            record_number: Número de registro a leer
            
        Returns:
            Dict: Datos del registro histórico
        """
        if not self.is_socket_open():
            return {"success": False, "error": "No hay conexión activa"}
        
        # Verificar autenticación
        if slave_id not in self._authenticated_batteries:
            if not self.authenticate_battery(slave_id):
                return {"success": False, "error": "Fallo en autenticación"}
        
        with self._lock:
            try:
                old_timeout = self._serial.timeout
                self._serial.timeout = self._timeouts['FC41']
                
                result = self.protocol.read_history_record_fc41(
                    self._serial, slave_id, record_number
                )
                
                self._serial.timeout = old_timeout
                return result
                
            except Exception as e:
                logger.error(f"Error leyendo registro histórico: {str(e)}")
                return {"success": False, "error": str(e)}
    
    # ==================== MÉTODOS INTERNOS ====================
    
    def _execute_standard_function(self, function_code: str, slave_id: int, 
                                 address: int, count: int) -> 'ModbusResponse':
        """Ejecuta una función Modbus estándar."""
        if not self.is_socket_open():
            return ModbusResponse(success=False, error="No hay conexión activa")
        
        with self._lock:
            try:
                # Configurar timeout específico
                old_timeout = self._serial.timeout
                self._serial.timeout = self._timeouts.get(function_code, 1.0)
                
                # Ejecutar función según el código
                if function_code == 'FC01':
                    result = self.protocol.read_coils(self._serial, slave_id, address, count)
                elif function_code == 'FC02':
                    result = self.protocol.read_discrete_inputs(self._serial, slave_id, address, count)
                elif function_code == 'FC03':
                    result = self.protocol.read_holding_registers(self._serial, slave_id, address, count)
                elif function_code == 'FC04':
                    result = self.protocol.read_input_registers(self._serial, slave_id, address, count)
                else:
                    result = {"success": False, "error": f"Función {function_code} no implementada"}
                
                # Restaurar timeout
                self._serial.timeout = old_timeout
                
                # Convertir a formato PyModbus compatible
                return ModbusResponse.from_huawei_result(result)
                
            except Exception as e:
                logger.error(f"Error ejecutando {function_code}: {str(e)}")
                return ModbusResponse(success=False, error=str(e))
    
    def _execute_write_function(self, function_code: str, slave_id: int, 
                              address: int, values: List[Union[bool, int]]) -> 'ModbusResponse':
        """Ejecuta una función de escritura Modbus."""
        if not self.is_socket_open():
            return ModbusResponse(success=False, error="No hay conexión activa")
        
        with self._lock:
            try:
                old_timeout = self._serial.timeout
                self._serial.timeout = self._timeouts.get(function_code, 1.0)
                
                if function_code == 'FC05':
                    result = self.protocol.write_single_coil(self._serial, slave_id, address, values[0])
                elif function_code == 'FC06':
                    result = self.protocol.write_single_register(self._serial, slave_id, address, values[0])
                elif function_code == 'FC15':
                    result = self.protocol.write_multiple_coils(self._serial, slave_id, address, values)
                elif function_code == 'FC16':
                    result = self.protocol.write_multiple_registers(self._serial, slave_id, address, values)
                else:
                    result = {"success": False, "error": f"Función {function_code} no implementada"}
                
                self._serial.timeout = old_timeout
                return ModbusResponse.from_huawei_result(result)
                
            except Exception as e:
                logger.error(f"Error ejecutando {function_code}: {str(e)}")
                return ModbusResponse(success=False, error=str(e))
    
    # ==================== UTILIDADES ====================
    
    def get_authenticated_batteries(self) -> set:
        """Obtiene el conjunto de baterías autenticadas."""
        return self._authenticated_batteries.copy()
    
    def reset_authentication(self, slave_id: int = None):
        """
        Reinicia el estado de autenticación.
        
        Args:
            slave_id: ID específico a reiniciar, o None para todos
        """
        with self._lock:
            if slave_id is None:
                self._authenticated_batteries.clear()
                logger.info("Estado de autenticación reiniciado para todas las baterías")
            elif slave_id in self._authenticated_batteries:
                self._authenticated_batteries.remove(slave_id)
                logger.info(f"Estado de autenticación reiniciado para batería {slave_id}")
    
    def set_timeout(self, function_code: str, timeout: float):
        """
        Configura timeout personalizado para una función.
        
        Args:
            function_code: Código de función (ej. 'FC03', 'FC41')
            timeout: Timeout en segundos
        """
        self._timeouts[function_code] = timeout
        logger.debug(f"Timeout para {function_code} configurado a {timeout}s")
    
    def get_connection_info(self) -> Dict[str, Any]:
        """Obtiene información de la conexión actual."""
        return {
            "port": self.port,
            "baudrate": self.baudrate,
            "parity": self.parity,
            "stopbits": self.stopbits,
            "bytesize": self.bytesize,
            "timeout": self.timeout,
            "is_connected": self.is_socket_open(),
            "authenticated_batteries": list(self._authenticated_batteries)
        }


class ModbusResponse:
    """
    Clase de respuesta compatible con PyModbus.
    Permite migración fácil del código existente.
    """
    
    def __init__(self, success: bool = True, data: List = None, error: str = None):
        self.success = success
        self.data = data or []
        self.error = error
        
        # Propiedades compatibles con PyModbus
        self.registers = data if success and data else []
        self.bits = data if success and data else []
    
    def isError(self) -> bool:
        """Compatibilidad con PyModbus."""
        return not self.success
    
    @classmethod
    def from_huawei_result(cls, result: Dict[str, Any]) -> 'ModbusResponse':
        """Crea ModbusResponse desde resultado de protocolo Huawei."""
        if result.get("success", False):
            return cls(success=True, data=result.get("data", []))
        else:
            return cls(success=False, error=result.get("error", "Error desconocido"))
    
    def __str__(self):
        if self.success:
            return f"ModbusResponse(success=True, data_count={len(self.data)})"
        else:
            return f"ModbusResponse(success=False, error='{self.error}')"