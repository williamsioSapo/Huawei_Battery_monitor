# modbus_app/huawei_client/authentication.py
"""
Módulo de autenticación específico para baterías Huawei ESM.
Implementa la secuencia de 3 pasos requerida antes de acceder a funciones avanzadas.
"""

import time
import datetime
import struct
import logging
from typing import Dict, Any

logger = logging.getLogger('huawei_client.authentication')

class HuaweiAuthentication:
    """
    Maneja la secuencia de autenticación específica de baterías Huawei.
    
    La autenticación consta de 3 pasos obligatorios:
    1. Comando de desbloqueo especial (FC03)
    2. Sincronización de fecha/hora (FC10)
    3. Validación de acceso (FC41)
    """
    
    def __init__(self):
        self.step_timeouts = {
            'step1': 1.0,
            'step2': 1.0, 
            'step3': 2.0
        }
        
        self.step_delays = {
            'after_step1': 0.5,
            'after_step2': 0.8,
            'after_step3': 0.3
        }
    
    def compute_crc16(self, data: bytes) -> bytes:
        """Calcula CRC16 para Modbus RTU."""
        crc = 0xFFFF
        for byte in data:
            crc ^= byte
            for _ in range(8):
                if crc & 0x0001:
                    crc = (crc >> 1) ^ 0xA001
                else:
                    crc >>= 1
        return struct.pack('<H', crc)
    
    def execute_authentication_sequence(self, serial_conn, slave_id: int) -> bool:
        """
        Ejecuta la secuencia completa de autenticación de 3 pasos.
        
        Args:
            serial_conn: Conexión serial activa
            slave_id: ID de la batería a autenticar
            
        Returns:
            bool: True si la autenticación fue exitosa
        """
        logger.info(f"Iniciando secuencia de autenticación para batería {slave_id}")
        
        try:
            # Paso 1: Comando de desbloqueo especial
            if not self._execute_step1_unlock(serial_conn, slave_id):
                logger.error(f"Fallo en Paso 1 para batería {slave_id}")
                return False
            
            time.sleep(self.step_delays['after_step1'])
            
            # Paso 2: Sincronización de fecha/hora
            if not self._execute_step2_datetime_sync(serial_conn, slave_id):
                logger.error(f"Fallo en Paso 2 para batería {slave_id}")
                return False
            
            time.sleep(self.step_delays['after_step2'])
            
            # Paso 3: Validación de acceso
            if not self._execute_step3_access_validation(serial_conn, slave_id):
                logger.error(f"Fallo en Paso 3 para batería {slave_id}")
                return False
            
            time.sleep(self.step_delays['after_step3'])
            
            logger.info(f"Autenticación exitosa para batería {slave_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error durante autenticación de batería {slave_id}: {str(e)}")
            return False
    
    def _execute_step1_unlock(self, serial_conn, slave_id: int) -> bool:
        """
        Paso 1: Comando de desbloqueo especial (FC03).
        
        Comando: [slave_id] 03 01 06 00 01 [CRC]
        Respuesta esperada: [slave_id] 03 02 00 XX [CRC]
        """
        logger.debug(f"Paso 1: Comando de desbloqueo para batería {slave_id}")
        
        # Construir comando
        message = bytearray([slave_id, 0x03, 0x01, 0x06, 0x00, 0x01])
        crc = self.compute_crc16(message)
        request = message + crc
        
        # Enviar comando
        serial_conn.reset_input_buffer()
        serial_conn.reset_output_buffer()
        serial_conn.write(request)
        
        logger.debug(f"TX Paso 1: {' '.join([f'{b:02X}' for b in request])}")
        
        # Leer respuesta
        time.sleep(0.2)
        response = serial_conn.read(7)
        
        logger.debug(f"RX Paso 1: {' '.join([f'{b:02X}' for b in response])}")
        
        # Validar respuesta
        if len(response) != 7:
            logger.error(f"Paso 1: Longitud incorrecta. Esperada: 7, Recibida: {len(response)}")
            return False
        
        if response[0] != slave_id or response[1] != 0x03:
            logger.error(f"Paso 1: ID/FC incorrecto. Esperado: {slave_id:02X} 03, Recibido: {response[0]:02X} {response[1]:02X}")
            return False
        
        if response[2] != 0x02:
            logger.error(f"Paso 1: Byte count incorrecto. Esperado: 02, Recibido: {response[2]:02X}")
            return False
        
        # Verificar patrón específico (byte 3 debe ser 0x00)
        if response[3] != 0x00:
            logger.warning(f"Paso 1: Patrón inesperado en byte 3: {response[3]:02X}")
        
        logger.info("Paso 1 completado exitosamente")
        return True
    
    def _execute_step2_datetime_sync(self, serial_conn, slave_id: int) -> bool:
        """
        Paso 2: Sincronización de fecha/hora (FC10).
        
        Envía la fecha/hora actual al dispositivo usando FC10 (Write Multiple Registers).
        """
        logger.debug(f"Paso 2: Sincronización de fecha/hora para batería {slave_id}")
        
        # Obtener fecha/hora actual
        now = datetime.datetime.now()
        
        # Construir comando FC10 con fecha/hora
        message = bytearray([
            slave_id,               # ID del esclavo
            0x10,                   # FC10 (Write Multiple Registers)
            0x10, 0x00,            # Dirección inicial (0x1000)
            0x00, 0x06,            # Cantidad de registros (6)
            0x0C,                   # Byte count (12 bytes)
            # Datos de fecha/hora (6 registros = 12 bytes)
            (now.year >> 8) & 0xFF, now.year & 0xFF,        # Año
            0x00, now.month,                                 # Mes
            0x00, now.day,                                   # Día
            0x00, now.hour,                                  # Hora
            0x00, now.minute,                               # Minuto
            0x00, now.second                                # Segundo
        ])
        
        crc = self.compute_crc16(message)
        request = message + crc
        
        # Enviar comando
        serial_conn.reset_input_buffer()
        serial_conn.reset_output_buffer()
        serial_conn.write(request)
        
        logger.debug(f"TX Paso 2 ({now.isoformat()}): {' '.join([f'{b:02X}' for b in request])}")
        
        # Leer respuesta
        time.sleep(0.2)
        response = serial_conn.read(8)
        
        logger.debug(f"RX Paso 2: {' '.join([f'{b:02X}' for b in response])}")
        
        # Validar respuesta
        if len(response) != 8:
            logger.error(f"Paso 2: Longitud incorrecta. Esperada: 8, Recibida: {len(response)}")
            return False
        
        if response[0] != slave_id or response[1] != 0x10:
            logger.error(f"Paso 2: ID/FC incorrecto. Esperado: {slave_id:02X} 10, Recibido: {response[0]:02X} {response[1]:02X}")
            return False
        
        # Verificar echo de dirección y cantidad
        expected_response = [slave_id, 0x10, 0x10, 0x00, 0x00, 0x06]
        if list(response[:6]) != expected_response:
            logger.error(f"Paso 2: Echo incorrecto. Esperado: {expected_response}, Recibido: {list(response[:6])}")
            return False
        
        logger.info("Paso 2 completado exitosamente")
        return True
    
    def _execute_step3_access_validation(self, serial_conn, slave_id: int) -> bool:
        """
        Paso 3: Validación de acceso (FC41 inicial).
        
        Comando: [slave_id] 41 05 01 04 [CRC]
        Este comando habilita el acceso a las funciones FC41 avanzadas.
        """
        logger.debug(f"Paso 3: Validación de acceso para batería {slave_id}")
        
        # Construir comando FC41 de validación
        message = bytearray([slave_id, 0x41, 0x05, 0x01, 0x04])
        crc = self.compute_crc16(message)
        request = message + crc
        
        # Enviar comando
        serial_conn.reset_input_buffer()
        serial_conn.reset_output_buffer()
        serial_conn.write(request)
        
        logger.debug(f"TX Paso 3: {' '.join([f'{b:02X}' for b in request])}")
        
        # Leer respuesta
        time.sleep(0.3)  # FC41 puede necesitar más tiempo
        response = serial_conn.read(12)  # Buffer más grande para FC41
        
        logger.debug(f"RX Paso 3: {' '.join([f'{b:02X}' for b in response])}")
        
        # Validar respuesta
        if len(response) < 9:
            logger.error(f"Paso 3: Respuesta demasiado corta. Mínima: 9, Recibida: {len(response)}")
            return False
        
        if response[0] != slave_id or response[1] != 0x41:
            logger.error(f"Paso 3: ID/FC incorrecto. Esperado: {slave_id:02X} 41, Recibido: {response[0]:02X} {response[1]:02X}")
            return False
        
        # Verificar estructura básica de respuesta FC41
        if response[2] != 0x05:
            logger.warning(f"Paso 3: Byte 2 inesperado: {response[2]:02X}")
        
        if response[3] != 0x06:
            logger.warning(f"Paso 3: Byte 3 inesperado: {response[3]:02X}")
        
        logger.info("Paso 3 completado exitosamente")
        return True
    
    def test_authentication_status(self, serial_conn, slave_id: int) -> Dict[str, Any]:
        """
        Prueba si una batería está correctamente autenticada intentando una operación FC41.
        
        Args:
            serial_conn: Conexión serial activa
            slave_id: ID de la batería
            
        Returns:
            Dict: Resultado de la prueba de autenticación
        """
        logger.debug(f"Probando estado de autenticación para batería {slave_id}")
        
        try:
            # Intentar leer información básica del dispositivo (índice 0)
            message = bytearray([slave_id, 0x41, 0x06, 0x03, 0x04, 0x00, 0x00])
            crc = self.compute_crc16(message)
            request = message + crc
            
            serial_conn.reset_input_buffer()
            serial_conn.reset_output_buffer()
            serial_conn.write(request)
            
            time.sleep(0.3)
            response = serial_conn.read(50)  # Buffer suficiente para respuesta FC41
            
            if len(response) >= 9 and response[0] == slave_id and response[1] == 0x41:
                logger.info(f"Batería {slave_id} está correctamente autenticada")
                return {
                    "authenticated": True,
                    "message": "Autenticación verificada exitosamente",
                    "response_length": len(response)
                }
            else:
                logger.warning(f"Batería {slave_id} no responde correctamente a FC41")
                return {
                    "authenticated": False,
                    "message": "No responde a comandos FC41",
                    "response": list(response) if response else []
                }
                
        except Exception as e:
            logger.error(f"Error probando autenticación: {str(e)}")
            return {
                "authenticated": False,
                "message": f"Error durante prueba: {str(e)}"
            }
    
    def get_authentication_info(self) -> Dict[str, Any]:
        """
        Obtiene información sobre el proceso de autenticación.
        
        Returns:
            Dict: Información del proceso de autenticación
        """
        return {
            "steps": [
                {
                    "step": 1,
                    "name": "Comando de Desbloqueo",
                    "function": "FC03",
                    "description": "Comando especial para desbloquear acceso",
                    "timeout": self.step_timeouts['step1']
                },
                {
                    "step": 2,
                    "name": "Sincronización DateTime",
                    "function": "FC10",
                    "description": "Envía fecha/hora actual al dispositivo",
                    "timeout": self.step_timeouts['step2']
                },
                {
                    "step": 3,
                    "name": "Validación de Acceso",
                    "function": "FC41",
                    "description": "Habilita acceso a funciones FC41 avanzadas",
                    "timeout": self.step_timeouts['step3']
                }
            ],
            "total_duration_estimate": sum(self.step_timeouts.values()) + sum(self.step_delays.values()),
            "requirements": [
                "Conexión serial activa",
                "Batería Huawei ESM",
                "ID de esclavo correcto",
                "Sin interferencias en bus Modbus"
            ]
        }