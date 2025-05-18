# modbus_app/logger_config.py
"""
Módulo de configuración centralizada de logging.
Proporciona una configuración unificada para dirigir logs a la consola del servidor
y a la cola de mensajes para la consola web.
"""

import logging
import sys
import os
import json
from collections import deque

# Definir un nivel NONE más alto que CRITICAL para suprimir todos los mensajes
NONE_LEVEL = 100  # Un nivel más alto que cualquier otro (CRITICAL es 50)
logging.addLevelName(NONE_LEVEL, "NONE")

# Buffer circular para mensajes de consola web
web_console_messages = deque(maxlen=500)

# Formato predeterminado para los logs
DEFAULT_LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

class WebConsoleHandler(logging.Handler):
    """Handler personalizado que redirige los mensajes de log a un buffer circular."""
    
    def emit(self, record):
        """Procesa un registro de log y lo añade al buffer."""
        try:
            msg = self.format(record)
            web_console_messages.append(msg)
        except Exception:
            self.handleError(record)

def load_config():
    """
    Carga la configuración desde el archivo config.json
    
    Returns:
        dict: Configuración cargada o valores predeterminados
    """
    try:
        # Ruta al archivo de configuración (usando la misma ubicación que config_manager.py)
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.json')
        
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Si existe una sección de logging en la configuración, usarla
        log_config = config.get('logging', {})
        return log_config
    except Exception as e:
        print(f"Error al cargar la configuración de logging: {str(e)}")
        return {}

def setup_logging():
    """
    Configura el sistema de logging centralizado basado en config.json
    
    Returns:
        deque: Cola de mensajes para la consola web
    """
    # Cargar configuración
    log_config = load_config()
    
    # Obtener valores de configuración o usar predeterminados
    log_level = log_config.get('log_level', 'INFO').upper()
    log_format = log_config.get('log_format', DEFAULT_LOG_FORMAT)
    max_console_messages = log_config.get('max_console_messages', 500)
    verbose_modules = log_config.get('verbose_modules', [
        'device_info_manager', 'device_communication', 'device_cache', 'battery_monitor'
    ])
    
    # Actualizar tamaño del buffer de mensajes si se especifica
    global web_console_messages
    if web_console_messages.maxlen != max_console_messages:
        web_console_messages = deque(maxlen=max_console_messages)
    
    # Resetear handlers existentes en el logger raíz
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Convertir nombre de nivel a constante de logging
    if log_level == 'NONE':
        numeric_level = NONE_LEVEL
    else:
        numeric_level = getattr(logging, log_level, logging.INFO)
    
    # Establecer nivel base para el logger raíz
    root_logger.setLevel(numeric_level)
    
    # Si el nivel es NONE, no añadimos handlers (suprimimos todos los mensajes)
    if log_level != 'NONE':
        # Handler para consola del servidor
        server_handler = logging.StreamHandler(sys.stdout)
        server_handler.setFormatter(logging.Formatter(log_format))
        server_handler.setLevel(numeric_level)
        
        # Handler para consola web
        web_handler = WebConsoleHandler()
        web_handler.setFormatter(logging.Formatter(log_format))
        web_handler.setLevel(numeric_level)
        
        # Añadir ambos handlers al logger raíz
        root_logger.addHandler(server_handler)
        root_logger.addHandler(web_handler)
        
        # Configurar loggers específicos para módulos
        for module in verbose_modules:
            module_logger = logging.getLogger(f'modbus_app.{module}')
            module_logger.setLevel(logging.DEBUG)  # Nivel más detallado para estos módulos
        
        # Configurar logger para mensajes de consola web puros (sin timestamp)
        console_logger = logging.getLogger('console')
        console_logger.setLevel(logging.INFO)
        
        # Handler especial para mensajes de consola web sin formato
        plain_web_handler = WebConsoleHandler()
        plain_web_handler.setFormatter(logging.Formatter('%(message)s'))
        console_logger.addHandler(plain_web_handler)
        
        # Evitar propagación para este logger especial
        console_logger.propagate = False
        
        # Configurar logger para mensajes de consola CMD (con formato completo)
        cmd_logger = logging.getLogger('cmd')
        cmd_logger.setLevel(logging.INFO)
        
        # Handler especial para mensajes de consola CMD con formato completo
        cmd_handler = logging.StreamHandler(sys.stdout)
        cmd_handler.setFormatter(logging.Formatter(log_format))
        cmd_logger.addHandler(cmd_handler)
        
        # Evitar propagación para este logger especial
        cmd_logger.propagate = False
    
    return web_console_messages

# Función auxiliar para enviar mensajes directamente a la consola web
def log_to_web_console(message):
    """
    Envía un mensaje directamente a la consola web, sin formato adicional.
    
    Args:
        message (str): Mensaje a enviar
    """
    logger = logging.getLogger('console')
    logger.info(message)

# Función auxiliar para enviar mensajes a la consola CMD (servidor) con formato completo
def log_to_cmd(message, level='INFO', module='CMD'):
    """
    Envía un mensaje a la consola CMD del servidor con formato completo.
    
    Args:
        message (str): Mensaje a enviar
        level (str): Nivel de log (DEBUG, INFO, WARNING, ERROR, CRITICAL, NONE)
        module (str): Nombre del módulo o componente que envía el mensaje
    """
    # Si el nivel es NONE, no hacemos nada
    if level.upper() == 'NONE':
        return
        
    logger = logging.getLogger(f'cmd.{module}')
    
    level_upper = level.upper()
    if level_upper == 'DEBUG':
        logger.debug(message)
    elif level_upper == 'INFO':
        logger.info(message)
    elif level_upper == 'WARNING':
        logger.warning(message)
    elif level_upper == 'ERROR':
        logger.error(message)
    elif level_upper == 'CRITICAL':
        logger.critical(message)
    else:
        logger.info(message)  # Nivel por defecto si se especifica uno no válido

# Exportar la función para obtener loggers específicos
def get_logger(name):
    """
    Obtiene un logger configurado para un módulo específico.
    
    Args:
        name (str): Nombre del módulo o componente
        
    Returns:
        logging.Logger: Logger configurado
    """
    logger_name = f'modbus_app.{name}' if not name.startswith('modbus_app.') else name
    return logging.getLogger(logger_name)