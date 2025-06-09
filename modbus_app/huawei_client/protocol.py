# modbus_app/huawei_client/protocol.py
"""
Implementación del protocolo Modbus RTU para funciones estándar y personalizadas Huawei.
Maneja la construcción de tramas, CRC, y decodificación de respuestas.
"""

import struct
import time
import logging
from typing import Dict, List, Union, Any

logger = logging.getLogger('huawei_client.protocol')

class ModbusProtocol:
    """Implementación del protocolo Modbus RTU con extensiones Huawei."""
    
    def __init__(self):
        # Códigos de excepción Modbus
        self.exception_codes = {
            0x01: "Función no soportada",
            0x02: "Dirección no válida", 
            0x03: "Valor no válido",
            0x04: "Error del dispositivo",
            0x05: "Reconocimiento",
            0x06: "Dispositivo ocupado",
            0x07: "Conflicto",
            0x08: "Error de memoria"
        }
    
    # ==================== CRC Y UTILIDADES ====================
    
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
    
    def verify_crc(self, frame: bytes) -> bool:
        """Verifica CRC de una trama recibida."""
        if len(frame) < 3:
            return False
        data = frame[:-2]
        received_crc = frame[-2:]
        calculated_crc = self.compute_crc16(data)
        return received_crc == calculated_crc
    
    def send_command(self, serial_conn, command: bytes) -> bytes:
        """Envía comando y lee respuesta."""
        try:
            serial_conn.reset_input_buffer()
            serial_conn.reset_output_buffer()
            serial_conn.write(command)
            logger.debug(f"TX: {' '.join([f'{b:02X}' for b in command])}")
            response = serial_conn.read(256)
            logger.debug(f"RX: {' '.join([f'{b:02X}' for b in response])}")
            return response
        except Exception as e:
            logger.error(f"Error en comunicación: {str(e)}")
            return b''
    
    # ==================== FUNCIONES MODBUS ESTÁNDAR ====================
    
    def read_holding_registers(self, serial_conn, slave_id: int, address: int, count: int) -> Dict[str, Any]:
        """Lee holding registers (FC03)."""
        command = bytearray([
            slave_id, 0x03,
            (address >> 8) & 0xFF, address & 0xFF,
            (count >> 8) & 0xFF, count & 0xFF
        ])
        crc = self.compute_crc16(command)
        command.extend(crc)
        response = self.send_command(serial_conn, command)
        return self._parse_read_response(response, slave_id, 0x03, count)
    
    def read_input_registers(self, serial_conn, slave_id: int, address: int, count: int) -> Dict[str, Any]:
        """Lee input registers (FC04)."""
        command = bytearray([
            slave_id, 0x04,
            (address >> 8) & 0xFF, address & 0xFF,
            (count >> 8) & 0xFF, count & 0xFF
        ])
        crc = self.compute_crc16(command)
        command.extend(crc)
        response = self.send_command(serial_conn, command)
        return self._parse_read_response(response, slave_id, 0x04, count)
    
    def read_coils(self, serial_conn, slave_id: int, address: int, count: int) -> Dict[str, Any]:
        """Lee coils (FC01)."""
        command = bytearray([
            slave_id, 0x01,
            (address >> 8) & 0xFF, address & 0xFF,
            (count >> 8) & 0xFF, count & 0xFF
        ])
        crc = self.compute_crc16(command)
        command.extend(crc)
        response = self.send_command(serial_conn, command)
        return self._parse_coil_response(response, slave_id, 0x01, count)
    
    def read_discrete_inputs(self, serial_conn, slave_id: int, address: int, count: int) -> Dict[str, Any]:
        """Lee discrete inputs (FC02)."""
        command = bytearray([
            slave_id, 0x02,
            (address >> 8) & 0xFF, address & 0xFF,
            (count >> 8) & 0xFF, count & 0xFF
        ])
        crc = self.compute_crc16(command)
        command.extend(crc)
        response = self.send_command(serial_conn, command)
        return self._parse_coil_response(response, slave_id, 0x02, count)
    
    def write_single_coil(self, serial_conn, slave_id: int, address: int, value: bool) -> Dict[str, Any]:
        """Escribe un coil (FC05)."""
        coil_value = 0xFF00 if value else 0x0000
        command = bytearray([
            slave_id, 0x05,
            (address >> 8) & 0xFF, address & 0xFF,
            (coil_value >> 8) & 0xFF, coil_value & 0xFF
        ])
        crc = self.compute_crc16(command)
        command.extend(crc)
        response = self.send_command(serial_conn, command)
        return self._parse_write_response(response, slave_id, 0x05)
    
    def write_single_register(self, serial_conn, slave_id: int, address: int, value: int) -> Dict[str, Any]:
        """Escribe un registro (FC06)."""
        command = bytearray([
            slave_id, 0x06,
            (address >> 8) & 0xFF, address & 0xFF,
            (value >> 8) & 0xFF, value & 0xFF
        ])
        crc = self.compute_crc16(command)
        command.extend(crc)
        response = self.send_command(serial_conn, command)
        return self._parse_write_response(response, slave_id, 0x06)
    
    def write_multiple_coils(self, serial_conn, slave_id: int, address: int, values: List[bool]) -> Dict[str, Any]:
        """Escribe múltiples coils (FC15)."""
        count = len(values)
        byte_count = (count + 7) // 8
        command = bytearray([
            slave_id, 0x0F,
            (address >> 8) & 0xFF, address & 0xFF,
            (count >> 8) & 0xFF, count & 0xFF,
            byte_count
        ])
        for i in range(0, count, 8):
            byte_val = 0
            for j in range(8):
                if i + j < count and values[i + j]:
                    byte_val |= (1 << j)
            command.append(byte_val)
        crc = self.compute_crc16(command)
        command.extend(crc)
        response = self.send_command(serial_conn, command)
        return self._parse_write_response(response, slave_id, 0x0F)
    
    def write_multiple_registers(self, serial_conn, slave_id: int, address: int, values: List[int]) -> Dict[str, Any]:
        """Escribe múltiples registros (FC16)."""
        count = len(values)
        byte_count = count * 2
        command = bytearray([
            slave_id, 0x10,
            (address >> 8) & 0xFF, address & 0xFF,
            (count >> 8) & 0xFF, count & 0xFF,
            byte_count
        ])
        for value in values:
            command.extend([(value >> 8) & 0xFF, value & 0xFF])
        crc = self.compute_crc16(command)
        command.extend(crc)
        response = self.send_command(serial_conn, command)
        return self._parse_write_response(response, slave_id, 0x10)
        # ==================== FUNCIONES HUAWEI (FC41) ====================
    
    def read_device_info_fc41(self, serial_conn, slave_id: int, info_index: int) -> Dict[str, Any]:
        """Lee información del dispositivo usando FC41."""
        command = bytearray([
            slave_id, 0x41, 0x06, 0x03, 0x04, 0x00, info_index
        ])
        crc = self.compute_crc16(command)
        command.extend(crc)
        response = self.send_command(serial_conn, command)
        return self._parse_fc41_device_info_response(response, slave_id, info_index)
    
    def read_history_record_fc41(self, serial_conn, slave_id: int, record_number: int) -> Dict[str, Any]:
        """Lee un registro del historial usando FC41."""
        command = bytearray([
            slave_id, 0x41, 0x06, 0x03, 0x05,
            (record_number >> 8) & 0xFF, record_number & 0xFF
        ])
        crc = self.compute_crc16(command)
        command.extend(crc)
        response = self.send_command(serial_conn, command)
        return self._parse_fc41_history_response(response, slave_id, record_number)
    
    def initialize_history_session_fc41(self, serial_conn, slave_id: int) -> Dict[str, Any]:
        """Inicializa sesión de lectura de historial."""
        init_command = bytearray([slave_id, 0x41, 0x05, 0x01, 0x05])
        crc = self.compute_crc16(init_command)
        init_command.extend(crc)
        
        for attempt in range(2):
            response = self.send_command(serial_conn, init_command)
            time.sleep(0.5)
            if not self._validate_basic_response(response, slave_id, 0x41):
                if attempt == 1:
                    return {"success": False, "error": "Fallo en inicialización"}
        return {"success": True, "message": "Sesión inicializada"}
    
    def reset_history_pointer_fc41(self, serial_conn, slave_id: int) -> Dict[str, Any]:
        """Reinicia el puntero de lectura del historial."""
        reset_command = bytearray([slave_id, 0x41, 0x06, 0x03, 0x05, 0x00, 0x00])
        crc = self.compute_crc16(reset_command)
        reset_command.extend(crc)
        response = self.send_command(serial_conn, reset_command)
        
        if self._validate_reset_response(response, slave_id):
            return {"success": True, "message": "Puntero reiniciado"}
        else:
            return {"success": False, "error": "Fallo al reiniciar puntero"}
    
    def close_history_session_fc41(self, serial_conn, slave_id: int) -> Dict[str, Any]:
        """Cierra la sesión de lectura de historial."""
        close_command = bytearray([slave_id, 0x41, 0x0C, 0x01, 0x05])
        crc = self.compute_crc16(close_command)
        close_command.extend(crc)
        response = self.send_command(serial_conn, close_command)
        
        if self._validate_basic_response(response, slave_id, 0x41):
            return {"success": True, "message": "Sesión cerrada"}
        else:
            return {"success": False, "error": "Fallo al cerrar sesión"}
    
    # ==================== PARSERS DE RESPUESTA ====================
    
    def _parse_read_response(self, response: bytes, slave_id: int, function_code: int, count: int) -> Dict[str, Any]:
        """Parsea respuesta de lectura de registros."""
        if len(response) < 5:
            return {"success": False, "error": "Respuesta demasiado corta"}
        
        if response[0] != slave_id:
            return {"success": False, "error": f"ID incorrecto: {response[0]} != {slave_id}"}
        
        if response[1] == (function_code | 0x80):
            exc_code = response[2] if len(response) > 2 else 0
            error_msg = self.exception_codes.get(exc_code, f"Excepción: {exc_code}")
            return {"success": False, "error": error_msg}
        
        if response[1] != function_code:
            return {"success": False, "error": f"Función incorrecta: {response[1]}"}
        
        byte_count = response[2]
        expected_bytes = count * 2
        if byte_count != expected_bytes:
            return {"success": False, "error": f"Longitud incorrecta: {byte_count}"}
        
        registers = []
        for i in range(count):
            reg_offset = 3 + (i * 2)
            if reg_offset + 1 < len(response):
                reg_value = (response[reg_offset] << 8) | response[reg_offset + 1]
                registers.append(reg_value)
        
        return {"success": True, "data": registers}
    
    def _parse_coil_response(self, response: bytes, slave_id: int, function_code: int, count: int) -> Dict[str, Any]:
        """Parsea respuesta de lectura de coils/discrete inputs."""
        if len(response) < 4:
            return {"success": False, "error": "Respuesta demasiado corta"}
        
        if response[0] != slave_id or response[1] != function_code:
            return {"success": False, "error": "Respuesta inválida"}
        
        byte_count = response[2]
        bits = []
        
        for i in range(count):
            byte_index = 3 + (i // 8)
            bit_index = i % 8
            if byte_index < len(response):
                bit_value = bool(response[byte_index] & (1 << bit_index))
                bits.append(bit_value)
            else:
                bits.append(False)
        
        return {"success": True, "data": bits}
    
    def _parse_write_response(self, response: bytes, slave_id: int, function_code: int) -> Dict[str, Any]:
        """Parsea respuesta de escritura."""
        if len(response) < 6:
            return {"success": False, "error": "Respuesta demasiado corta"}
        
        if response[0] != slave_id or response[1] != function_code:
            return {"success": False, "error": "Respuesta inválida"}
        
        return {"success": True, "data": []}
    
    def _parse_fc41_device_info_response(self, response: bytes, slave_id: int, info_index: int) -> Dict[str, Any]:
        """Parsea respuesta FC41 de información del dispositivo."""
        if len(response) < 9:
            return {"success": False, "error": "Respuesta FC41 demasiado corta"}
        
        if response[0] != slave_id or response[1] != 0x41:
            return {"success": False, "error": "Respuesta FC41 inválida"}
        
        data_start = 7
        data_end = len(response) - 2
        if data_end <= data_start:
            return {"success": False, "error": "No hay datos en respuesta FC41"}
        
        data_bytes = response[data_start:data_end]
        
        try:
            ascii_text = data_bytes.decode('utf-8', errors='ignore')
            ascii_text = ''.join(c for c in ascii_text if (ord(c) >= 32 and ord(c) <= 126) or c in ['\n', '\r', '\t'])
        except Exception:
            ascii_text = ""
        
        return {
            "success": True,
            "index": info_index,
            "ascii_data": ascii_text,
            "raw_bytes": list(data_bytes)
        }
    
    def _parse_fc41_history_response(self, response: bytes, slave_id: int, record_number: int) -> Dict[str, Any]:
        """Parsea respuesta FC41 de registro histórico."""
        if len(response) < 40:
            return {"success": False, "error": "Respuesta de historial demasiado corta"}
        
        if response[0] != slave_id or response[1] != 0x41:
            return {"success": False, "error": "Respuesta de historial inválida"}
        
        data_start = 7
        data_bytes = response[data_start:data_start + 32]
        
        if all(b == 0xFF for b in data_bytes):
            return {"success": False, "error": "Registro vacío (fin del historial)"}
        
        try:
            decoded_data = self._decode_history_record(data_bytes)
            decoded_data["record_number"] = record_number
            
            return {
                "success": True,
                "data": decoded_data,
                "raw_bytes": list(data_bytes)
            }
        except Exception as e:
            return {"success": False, "error": f"Error decodificando: {str(e)}"}
    
    def _decode_history_record(self, data_bytes: bytes) -> Dict[str, Any]:
        """Decodifica un registro histórico de 32 bytes."""
        if len(data_bytes) != 32:
            raise ValueError(f"Registro debe tener 32 bytes, recibido: {len(data_bytes)}")
        
        return {
            "pack_voltage": ((data_bytes[8] | (data_bytes[9] << 8)) / 100.0),
            "battery_current": self._signed_int16(data_bytes[10], data_bytes[11]) / 100.0,
            "temp_low": data_bytes[16],
            "temp_high": data_bytes[18],
            "soc": data_bytes[20],
            "discharge_ah": data_bytes[24] | (data_bytes[25] << 8),
            "discharge_times": data_bytes[28],
            "battery_voltage": ((data_bytes[30] | (data_bytes[31] << 8)) / 100.0)
        }
    
    def _signed_int16(self, low_byte: int, high_byte: int) -> int:
        """Convierte dos bytes a entero con signo de 16 bits."""
        value = low_byte | (high_byte << 8)
        if value > 32767:
            value -= 65536
        return value
    
    def _validate_basic_response(self, response: bytes, slave_id: int, function_code: int) -> bool:
        """Valida respuesta básica (ID y función)."""
        return (len(response) >= 3 and 
                response[0] == slave_id and 
                response[1] == function_code)
    
    def _validate_reset_response(self, response: bytes, slave_id: int) -> bool:
        """Valida respuesta de reset (debería contener 32 bytes FF)."""
        if not self._validate_basic_response(response, slave_id, 0x41):
            return False
        
        ff_count = 0
        for byte in response[7:]:
            if byte == 0xFF:
                ff_count += 1
            else:
                break
        
        return ff_count >= 32    