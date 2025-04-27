import serial
import time
import struct
import datetime
import logging
import sys

# Configurar logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class ModbusRTUClient:
    def __init__(self, port="COM8", baudrate=9600, parity="N", stopbits=1, bytesize=8, timeout=1.0):
        """Inicializa el cliente Modbus RTU."""
        self.ser = None
        self.port = port
        self.baudrate = baudrate
        self.parity = parity
        self.stopbits = stopbits
        self.bytesize = bytesize
        self.timeout = timeout
        
    def connect(self):
        """Conecta al dispositivo Modbus."""
        try:
            self.ser = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                parity=self.parity,
                stopbits=self.stopbits,
                bytesize=self.bytesize,
                timeout=self.timeout
            )
            logger.info(f"Conexión establecida con {self.port} a {self.baudrate} baudios")
            return True
        except Exception as e:
            logger.error(f"Error al conectar: {str(e)}")
            return False
            
    def disconnect(self):
        """Cierra la conexión serial."""
        if self.ser and self.ser.is_open:
            self.ser.close()
            logger.info("Conexión cerrada")
            return True
        return False
        
    def is_connected(self):
        """Verifica si hay una conexión activa."""
        return self.ser is not None and self.ser.is_open
        
    def compute_crc(self, data):
        """Calcula el CRC16 para Modbus."""
        crc = 0xFFFF
        for byte in data:
            crc ^= byte
            for _ in range(8):
                if crc & 0x0001:
                    crc = (crc >> 1) ^ 0xA001
                else:
                    crc >>= 1
        # Invertir bytes para formato Modbus (little endian)
        return struct.pack('<H', crc)
        
    def send_receive(self, request, expected_length=None, timeout=1.0):
        """
        Envía una solicitud y recibe la respuesta.
        
        Args:
            request: Bytes con la solicitud
            expected_length: Longitud esperada de la respuesta. Si es None,
                             se leerá hasta timeout.
            timeout: Timeout en segundos para esperar la respuesta
        
        Returns:
            bytearray con la respuesta o None si hay error
        """
        if not self.is_connected():
            logger.error("No hay conexión activa")
            return None
            
        try:
            # Limpiar buffer antes de enviar
            self.ser.reset_input_buffer()
            
            # Enviar solicitud
            self.ser.write(request)
            logger.debug(f"Enviado: {' '.join([f'{b:02x}' for b in request])}")
            
            # Esperar respuesta
            time.sleep(0.1)  # Pequeña pausa para dar tiempo a la respuesta
            
            # Si sabemos la longitud exacta esperada
            if expected_length is not None:
                response = self.ser.read(expected_length)
                if len(response) != expected_length:
                    logger.warning(f"Respuesta incompleta: esperados {expected_length} bytes, recibidos {len(response)} bytes")
            else:
                # Leer con timeout
                start_time = time.time()
                response = bytearray()
                
                while (time.time() - start_time) < timeout:
                    if self.ser.in_waiting > 0:
                        new_data = self.ser.read(self.ser.in_waiting)
                        response.extend(new_data)
                        # Pausa breve para dar tiempo a que lleguen más datos
                        time.sleep(0.05)
                    else:
                        # Si no hay más datos después de un breve período, asumimos que es todo
                        if len(response) > 0:
                            time.sleep(0.05)
                            if self.ser.in_waiting == 0:
                                break
                
            if response:
                logger.debug(f"Respuesta recibida: {' '.join([f'{b:02x}' for b in response])}")
                return response
            else:
                logger.warning("No se recibió respuesta")
                return None
                
        except Exception as e:
            logger.error(f"Error en comunicación: {str(e)}")
            return None
            
class HuaweiBatteryTest:
    def __init__(self, port="COM8"):
        """Inicializa prueba para batería Huawei."""
        self.client = ModbusRTUClient(port=port)
        self.slave_id = 0xD9  # 217 decimal - ID estándar para baterías Huawei
        self.device_info = {}  # Almacena la información del dispositivo
        self.is_authenticated = False
        self.last_responses = {}  # Almacena las respuestas crudas por índice
        
    def run_test(self, start_index=0, end_index=10):
        """
        Ejecuta la prueba completa explorando los índices especificados.
        
        Args:
            start_index: Índice inicial a explorar
            end_index: Índice final a explorar
        """
        try:
            # Conectar
            if not self.client.connect():
                return False
                
            # Autenticar
            if not self.authenticate():
                logger.error("Fallo en la secuencia de autenticación")
                self.client.disconnect()
                return False
                
            # Leer información del dispositivo
            logger.info("¡Autenticación exitosa! Procediendo a leer información...")
            
            # Leer todos los índices en el rango especificado
            all_text_data = []
            for index in range(start_index, end_index + 1):
                time.sleep(1.5)  # Pausa entre lecturas
                logger.info(f"--- Leyendo información, índice {index} ---")
                text_data, raw_data = self.read_device_info(index)
                
                if text_data:
                    all_text_data.append((index, text_data))
                    self.last_responses[index] = raw_data
                    
            # Procesar la información para los índices estándar (0-5)
            standard_data = [text for idx, text in all_text_data if 0 <= idx <= 5]
            self.process_device_info(standard_data)
            
            # Mostrar resumen de información estándar
            self.show_summary()
            
            # Mostrar datos en hexadecimal y ASCII para todos los índices
            self.show_hex_and_ascii_dump()
            
            # Desconectar
            self.client.disconnect()
            logger.info("Prueba finalizada")
            return True
            
        except Exception as e:
            logger.error(f"Error en prueba: {str(e)}")
            if self.client.is_connected():
                self.client.disconnect()
            return False
            
    def authenticate(self):
        """Ejecuta la secuencia de autenticación de 3 pasos."""
        logger.info("Iniciando secuencia de autenticación...")
        
        # Paso 1: Comando de desbloqueo especial (FC03)
        if not self.auth_step1_unlock():
            return False
            
        # Paso 2: Sincronización de fecha/hora (FC10)
        if not self.auth_step2_time_sync():
            return False
            
        # Paso 3: Validación de acceso (FC41 inicial)
        if not self.auth_step3_validation():
            return False
            
        logger.info("¡Secuencia de autenticación completada exitosamente!")
        self.is_authenticated = True
        return True
        
    def auth_step1_unlock(self):
        """Ejecuta el paso 1: Comando de desbloqueo especial (FC03)."""
        try:
            logger.info("Ejecutando paso 1: Comando de desbloqueo especial (FC03)")
            
            # Construir mensaje: d9 03 01 06 00 01 77 2f
            request = bytearray([
                self.slave_id,  # ID esclavo (0xD9)
                0x03,           # Función 03
                0x01,           # Primer byte personalizado
                0x06,           # Segundo byte personalizado
                0x00,           # Tercer byte personalizado
                0x01,           # Cuarto byte personalizado
                0x77, 0x2F      # CRC precomputado
            ])
            
            logger.debug(f"Enviando Paso 1 - Comando Desbloqueo: {' '.join([f'{b:02x}' for b in request])}")
            
            # Enviar y recibir
            response = self.client.send_receive(request, expected_length=7)
            
            # Verificar respuesta esperada: d9 03 02 00 cb d9 c0
            if response and len(response) == 7 and response[0] == self.slave_id and response[1] == 0x03 and response[2] == 0x02:
                logger.info("Paso 1 completado exitosamente")
                return True
            else:
                if response:
                    logger.error(f"Respuesta inesperada en paso 1: {' '.join([f'{b:02x}' for b in response])}")
                else:
                    logger.error("No se recibió respuesta en paso 1")
                return False
                
        except Exception as e:
            logger.error(f"Error en paso 1 de autenticación: {str(e)}")
            return False
            
    def auth_step2_time_sync(self):
        """Ejecuta el paso 2: Sincronización de fecha/hora (FC10)."""
        try:
            logger.info("Ejecutando paso 2: Sincronización de fecha/hora (FC10)")
            
            # Obtener fecha y hora actual
            now = datetime.datetime.now()
            
            # Construir mensaje sin CRC
            message = bytearray([
                self.slave_id,  # ID esclavo (0xD9)
                0x10,           # Función 10 (escribir múltiples registros)
                0x10, 0x00,     # Dirección inicial (4096)
                0x00, 0x06,     # Cantidad de registros (6)
                0x0C,           # Byte count (12 bytes de datos)
                (now.year >> 8) & 0xFF, now.year & 0xFF,  # Año (2 bytes)
                0x00, now.month,                          # Mes (2 bytes)
                0x00, now.day,                            # Día (2 bytes)
                0x00, now.hour,                           # Hora (2 bytes)
                0x00, now.minute,                         # Minuto (2 bytes)
                0x00, now.second                          # Segundo (2 bytes)
            ])
            
            # Calcular y añadir CRC
            crc = self.client.compute_crc(message)
            request = message + crc
            
            logger.debug(f"Enviando Paso 2 - Sincronización Fecha/Hora: {now.isoformat()}: {' '.join([f'{b:02x}' for b in request])}")
            
            # Enviar y recibir
            response = self.client.send_receive(request, expected_length=8)
            
            # Verificar respuesta esperada: d9 10 10 00 00 06 56 13
            if response and len(response) == 8 and response[0] == self.slave_id and response[1] == 0x10:
                logger.info("Paso 2 completado exitosamente")
                return True
            else:
                if response:
                    logger.error(f"Respuesta inesperada en paso 2: {' '.join([f'{b:02x}' for b in response])}")
                else:
                    logger.error("No se recibió respuesta en paso 2")
                return False
                
        except Exception as e:
            logger.error(f"Error en paso 2 de autenticación: {str(e)}")
            return False
            
    def auth_step3_validation(self):
        """Ejecuta el paso 3: Validación de acceso (FC41 inicial)."""
        try:
            logger.info("Ejecutando paso 3: Validación de acceso (FC41 inicial)")
            
            # Construir mensaje: d9 41 05 01 04 3d bd
            request = bytearray([
                self.slave_id,  # ID esclavo (0xD9)
                0x41,           # Función 41
                0x05,           # Tamaño
                0x01,           # Primer byte personalizado
                0x04,           # Segundo byte personalizado
                0x3D, 0xBD      # CRC precomputado
            ])
            
            logger.debug(f"Enviando Paso 3 - Validación de Acceso: {' '.join([f'{b:02x}' for b in request])} 00")
            
            # Enviar y recibir
            response = self.client.send_receive(request, expected_length=12)
            
            # Verificar respuesta esperada: d9 41 05 06 04 00 00 01 5c 40 56 59
            if response and len(response) >= 9 and response[0] == self.slave_id and response[1] == 0x41:
                logger.info("Paso 3 completado exitosamente")
                return True
            else:
                if response:
                    logger.error(f"Respuesta inesperada en paso 3: {' '.join([f'{b:02x}' for b in response])}")
                else:
                    logger.error("No se recibió respuesta en paso 3")
                return False
                
        except Exception as e:
            logger.error(f"Error en paso 3 de autenticación: {str(e)}")
            return False
            
    def read_device_info(self, index):
        """
        Lee información del dispositivo usando FC41 con el índice especificado.
        
        Args:
            index: Índice de información
            
        Returns:
            tuple: (datos_interpretados, datos_crudos) o (None, None) si hay error
        """
        if not self.is_authenticated:
            logger.error("Intento de lectura sin autenticación previa")
            return None, None
            
        try:
            logger.info(f"Leyendo información del dispositivo, índice {index}")
            
            # Construir mensaje sin CRC: d9 41 06 03 04 00 XX
            message = bytearray([
                self.slave_id,  # ID esclavo (0xD9)
                0x41,           # Función 41
                0x06,           # Tamaño
                0x03,           # Subcódigo 1
                0x04,           # Subcódigo 2
                0x00,           # Byte fijo
                index           # Índice de información
            ])
            
            # Calcular y añadir CRC
            crc = self.client.compute_crc(message)
            request = message + crc
            
            logger.debug(f"Enviando Lectura FC41 índice {index}: {' '.join([f'{b:02x}' for b in request])}")
            
            # Enviar y recibir - aquí usamos timeout extendido para respuestas más largas
            response = self.client.send_receive(request, timeout=2.0)
            
            if not response:
                logger.error(f"No se recibió respuesta para índice {index}")
                return None, None
                
            if len(response) < 4:
                logger.error(f"Respuesta demasiado corta para índice {index}")
                return None, None
                
            # Verificar que la respuesta sea para FC41
            if response[0] != self.slave_id:
                logger.error(f"ID de esclavo incorrecto en respuesta: {response[0]} (esperado {self.slave_id})")
                return None, None
                
            # Verificar si la respuesta indica un error (FC41 + 0x80 = 0xC1)
            if response[1] == 0xC1:
                error_code = ' '.join([f'{b:02x}' for b in response[2:]])
                logger.warning(f"Respuesta de error para índice {index}: Función 0xC1 (Error en FC41), código: {error_code}")
                return f"ERROR: Código {error_code}", response
                
            if response[1] != 0x41:
                logger.error(f"Código de función incorrecto en respuesta: {response[1]:02x} (esperado 41)")
                return None, None
                
            # Extraer datos (depende del formato de respuesta)
            # La cabecera puede ser variable, pero los datos comienzan después de cabecera
            # Normalmente: d9 41 06 43 04 00 XX [DATOS] CRC
            data_start = 7
            if len(response) <= data_start:
                logger.warning(f"Respuesta sin datos para índice {index}")
                return "Sin datos", response
                
            # Extraer datos sin el CRC final (2 bytes)
            data_bytes = response[data_start:-2] if len(response) > (data_start+2) else response[data_start:]
            
            try:
                # Convertir bytes a texto, ignorando errores de decodificación
                text_data = data_bytes.decode('utf-8', errors='replace')
                logger.info(f"Datos recibidos (índice {index}): {text_data}")
                logger.info(f"Lectura exitosa para índice {index}")
                return text_data, response
            except Exception as decode_error:
                logger.warning(f"Error al decodificar datos: {str(decode_error)}")
                return f"DATOS BINARIOS ({len(data_bytes)} bytes)", response
                
        except Exception as e:
            logger.error(f"Error al leer información índice {index}: {str(e)}")
            return None, None
            
    def process_device_info(self, text_data_list):
        """
        Procesa los datos de información recibidos y extrae valores significativos.
        
        Args:
            text_data_list: Lista de cadenas de texto con la información
        """
        self.device_info = {
            "modelo": "Desconocido",
            "fabricante": "Desconocido",
            "num_serie": "Desconocido",
            "fecha_fabricacion": "Desconocido",
            "descripcion": "Desconocido",
            "version_info": "Desconocido",
            "version_etiqueta": "Desconocido",
            "otros": {}
        }
        
        # Expresiones comunes para buscar
        info_patterns = {
            "modelo": ["BoardType=", "Model="],
            "fabricante": ["VendorName=", "rName="],
            "num_serie": ["BarCode="],
            "fecha_fabricacion": ["Manufactured="],
            "descripcion": ["Description="],
            "version_info": ["ArchivesInfoVersion="],
            "version_etiqueta": ["ElabelVersion="]
        }
        
        # Combinar todos los textos para análisis
        combined_text = " ".join(text_data_list)
        
        # Extraer información usando patrones
        for key, patterns in info_patterns.items():
            for pattern in patterns:
                if pattern in combined_text:
                    # Encontrar el patrón y extraer el valor hasta el fin de línea
                    start_idx = combined_text.find(pattern) + len(pattern)
                    end_idx = combined_text.find("\n", start_idx)
                    if end_idx == -1:  # Si no hay nueva línea, tomar hasta el final
                        end_idx = len(combined_text)
                    value = combined_text[start_idx:end_idx].strip()
                    if value:  # Si se encontró un valor
                        self.device_info[key] = value
                        break  # Usar el primer patrón que coincida
                        
        # Recopilar otros datos de interés
        for text in text_data_list:
            lines = text.split("\n")
            for line in lines:
                if "=" in line and not any(p in line for p in sum(info_patterns.values(), [])):
                    parts = line.split("=", 1)
                    if len(parts) == 2 and parts[0].strip() and parts[1].strip():
                        key = parts[0].strip()
                        value = parts[1].strip()
                        self.device_info["otros"][key] = value
        
        # Procesar la descripción - puede estar dividida en múltiples partes
        if "Description=" in combined_text:
            description_parts = []
            start_idx = combined_text.find("Description=") + len("Description=")
            
            # Extraer el texto después de Description=
            remaining = combined_text[start_idx:]
            
            # Para simplificar, tomamos todo hasta "Manufactured=" o final
            end_markers = ["Manufactured=", "VendorName=", "rName="]
            end_idx = len(remaining)
            
            for marker in end_markers:
                marker_idx = remaining.find(marker)
                if marker_idx > 0 and marker_idx < end_idx:
                    end_idx = marker_idx
                    
            description = remaining[:end_idx].strip()
            if description:
                self.device_info["descripcion"] = description
        
    def show_summary(self):
        """Muestra un resumen de la información del dispositivo."""
        print("\n\n--- RESUMEN DE INFORMACIÓN DEL DISPOSITIVO ---")
        print(f"Modelo: {self.device_info['modelo']}")
        print(f"Fabricante: {self.device_info['fabricante']}")
        print(f"Número de Serie: {self.device_info['num_serie']}")
        print(f"Fabricado: {self.device_info['fecha_fabricacion']}")
        print(f"Descripción: {self.device_info['descripcion']}")
        print(f"Versión de Información: {self.device_info['version_info']}")
        print(f"Versión de Etiqueta: {self.device_info['version_etiqueta']}")
        
        if self.device_info["otros"]:
            print("\nOtros datos:")
            for key, value in self.device_info["otros"].items():
                print(f"  {key}: {value}")
    
    def show_hex_and_ascii_dump(self):
        """Muestra un volcado hexadecimal y ASCII de todas las respuestas."""
        print("\n\n--- VOLCADO HEXADECIMAL Y ASCII DE RESPUESTAS ---")
        
        for index in sorted(self.last_responses.keys()):
            response = self.last_responses[index]
            
            if not response or len(response) < 7:
                print(f"\nÍndice {index}: Respuesta inválida o vacía")
                continue
                
            # Verificar tipo de respuesta
            response_type = "Normal"
            if response[1] == 0xC1:
                response_type = "ERROR"
            
            print(f"\n>>> ÍNDICE {index} ({response_type}):")
            
            # Mostrar cabecera separada
            header = response[:7]
            print(f"CABECERA: {' '.join([f'{b:02x}' for b in header])}")
            
            # Mostrar datos (si hay)
            if len(response) > 7:
                data = response[7:-2] if len(response) > 9 else response[7:]
                print(f"DATOS ({len(data)} bytes):")
                
                # Mostrar como hexadecimal
                hex_dump = ' '.join([f'{b:02x}' for b in data])
                print(f"  HEX: {hex_dump}")
                
                # Mostrar como ASCII
                ascii_dump = ''.join([chr(b) if 32 <= b <= 126 else '.' for b in data])
                print(f"  ASCII: {ascii_dump}")
                
                # Análisis para datos estructurados - buscar patrones
                self._analyze_data_structure(data, index)
            
    def _analyze_data_structure(self, data, index):
        """
        Analiza la estructura de los datos para buscar patrones.
        
        Args:
            data: Bytes de datos a analizar
            index: Índice de la respuesta
        """
        # Solo realizar análisis para índices extendidos (>5)
        if index <= 5:
            return
            
        print("  ANÁLISIS ESTRUCTURAL:")
        
        # 1. Verificar si parece datos de texto ASCII
        ascii_count = sum(1 for b in data if 32 <= b <= 126)
        ascii_ratio = ascii_count / len(data) if data else 0
        print(f"  - Ratio ASCII: {ascii_ratio:.2f} ({ascii_count}/{len(data)} bytes)")
        
        if ascii_ratio > 0.7:
            print("  - Parece contener principalmente texto ASCII")
        
        # 2. Buscar delimitadores comunes
        delimiters = {
            "0x00 (NULL)": data.count(0),
            "0x0A (LF)": data.count(10),
            "0x0D (CR)": data.count(13),
            "0x09 (TAB)": data.count(9),
            "0x20 (SPACE)": data.count(32),
            "0x2C (COMMA)": data.count(44),
            "0x3D (EQUAL)": data.count(61)
        }
        
        for delim, count in delimiters.items():
            if count > 0:
                print(f"  - Delimitador {delim}: {count} ocurrencias")
        
        # 3. Buscar patrones numéricos
        numerical_sequences = []
        in_sequence = False
        start_idx = 0
        
        for i in range(len(data)):
            # Verificar si es un valor numérico (0-9)
            if 48 <= data[i] <= 57:
                if not in_sequence:
                    in_sequence = True
                    start_idx = i
            else:
                if in_sequence and (i - start_idx) >= 3:  # Secuencias de al menos 3 dígitos
                    numerical_sequences.append(data[start_idx:i])
                in_sequence = False
        
        # Agregar la última secuencia si termina el array
        if in_sequence and (len(data) - start_idx) >= 3:
            numerical_sequences.append(data[start_idx:len(data)])
        
        if numerical_sequences:
            print(f"  - Secuencias numéricas encontradas: {len(numerical_sequences)}")
            for seq in numerical_sequences[:3]:  # Mostrar hasta 3 ejemplos
                print(f"    * {seq.decode('ascii', errors='replace')}")
            if len(numerical_sequences) > 3:
                print(f"    * ... y {len(numerical_sequences)-3} más")
        
        # 4. Buscar estructuras potenciales de fecha/hora
        # Patrón común: AAAA-MM-DD o DD-MM-AAAA
        for i in range(len(data) - 10):
            segment = data[i:i+10]
            # Buscar algo como 2023-04-21 o 21/04/2023
            if (48 <= segment[0] <= 57 and 48 <= segment[1] <= 57 and 
                48 <= segment[2] <= 57 and 48 <= segment[3] <= 57 and
                (segment[4] == 45 or segment[4] == 47) and  # - o /
                48 <= segment[5] <= 57 and 48 <= segment[6] <= 57 and
                (segment[7] == 45 or segment[7] == 47) and  # - o /
                48 <= segment[8] <= 57 and 48 <= segment[9] <= 57):
                date_str = segment.decode('ascii', errors='replace')
                print(f"  - Posible fecha encontrada: {date_str}")
        
        # 5. Verificar si los datos podrían ser valores binarios estructurados
        if len(data) % 2 == 0 and len(data) >= 6:  # Múltiplo de 2 bytes (posibles valores uint16)
            print("  - Los datos podrían representar valores de 16 bits (uint16)")
            # Mostrar algunos ejemplos de valores uint16
            for i in range(0, min(6, len(data)), 2):
                value = (data[i] << 8) | data[i+1]
                print(f"    * Offset {i}: {value} (0x{value:04x})")
            
        if len(data) % 4 == 0 and len(data) >= 12:  # Múltiplo de 4 bytes (posibles valores uint32/float)
            print("  - Los datos podrían representar valores de 32 bits (uint32/float)")
            # Mostrar algunos ejemplos de valores uint32
            for i in range(0, min(12, len(data)), 4):
                value = (data[i] << 24) | (data[i+1] << 16) | (data[i+2] << 8) | data[i+3]
                print(f"    * Offset {i}: {value} (0x{value:08x})")
        
# Ejecutar prueba si se ejecuta como script principal
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Prueba extendida para batería Huawei')
    parser.add_argument('--port', default='COM8', help='Puerto COM (default: COM8)')
    parser.add_argument('--start', type=int, default=0, help='Índice inicial (default: 0)')
    parser.add_argument('--end', type=int, default=10, help='Índice final (default: 10)')
    
    args = parser.parse_args()
    
    print(f"Iniciando prueba extendida para batería Huawei")
    print(f"Puerto: {args.port}, Explorando índices: {args.start}-{args.end}")
    
    test = HuaweiBatteryTest(port=args.port)
    test.run_test(start_index=args.start, end_index=args.end)