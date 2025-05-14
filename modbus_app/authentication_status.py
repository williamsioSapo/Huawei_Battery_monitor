# modbus_app/authentication_status.py
"""
Módulo para gestionar el estado de autenticación de las baterías.
Proporciona funciones para rastrear, actualizar y consultar el estado de la
autenticación de dispositivos Huawei.
"""

import threading
import time
import logging

# Configurar logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('authentication_status')

# Estados posibles para cada fase
PHASE_STATES = {
    'NOT_STARTED': 'not_started',  # No iniciado
    'IN_PROGRESS': 'in_progress',  # En progreso
    'SUCCESS': 'success',          # Éxito
    'FAILED': 'failed'             # Fallido
}

# Estados globales
GLOBAL_STATES = {
    'WAITING': 'waiting',          # Esperando inicio
    'IN_PROGRESS': 'in_progress',  # En proceso
    'SUCCESS': 'success',          # Completado con éxito
    'FAILED': 'failed'             # Fallido
}

# Diccionario global para almacenar el estado de autenticación de cada batería
# Estructura: {battery_id: {state, phases: {wake_up, authenticate, read_info}, messages, timestamp}}
authentication_status = {}

# Lock para acceso thread-safe
status_lock = threading.RLock()

def initialize_battery_status(battery_id):
    """
    Inicializa el estado de autenticación para una batería.
    
    Args:
        battery_id (int): ID de la batería
    """
    with status_lock:
        authentication_status[battery_id] = {
            'state': GLOBAL_STATES['WAITING'],
            'phases': {
                'wake_up': {
                    'state': PHASE_STATES['NOT_STARTED'],
                    'message': 'Esperando inicio',
                    'timestamp': None
                },
                'authenticate': {
                    'state': PHASE_STATES['NOT_STARTED'],
                    'message': 'Esperando inicio',
                    'timestamp': None
                },
                'read_info': {
                    'state': PHASE_STATES['NOT_STARTED'],
                    'message': 'Esperando inicio',
                    'timestamp': None
                }
            },
            'messages': [],
            'timestamp': time.time()
        }
        
        logger.info(f"Estado de autenticación inicializado para batería {battery_id}")
    
    return authentication_status[battery_id]

def update_phase_status(battery_id, phase, state, message=None):
    """
    Actualiza el estado de una fase específica para una batería.
    
    Args:
        battery_id (int): ID de la batería
        phase (str): Fase a actualizar ('wake_up', 'authenticate', 'read_info')
        state (str): Nuevo estado (usar constantes PHASE_STATES)
        message (str, opcional): Mensaje descriptivo
    
    Returns:
        dict: Estado actualizado de la batería
    """
    with status_lock:
        # Verificar si la batería ya está registrada, si no, inicializarla
        if battery_id not in authentication_status:
            initialize_battery_status(battery_id)
        
        # Verificar fase válida
        if phase not in ('wake_up', 'authenticate', 'read_info'):
            logger.error(f"Fase inválida: {phase}")
            return None
        
        # Actualizar estado de la fase
        authentication_status[battery_id]['phases'][phase]['state'] = state
        authentication_status[battery_id]['phases'][phase]['timestamp'] = time.time()
        
        if message:
            authentication_status[battery_id]['phases'][phase]['message'] = message
            # Añadir también al historial de mensajes
            authentication_status[battery_id]['messages'].append({
                'phase': phase,
                'state': state,
                'message': message,
                'timestamp': time.time()
            })
        
        # Actualizar estado global basado en las fases
        _update_global_state(battery_id)
        
        logger.info(f"Batería {battery_id}, Fase {phase}: {state} - {message}")
        
        return get_battery_status(battery_id)

def _update_global_state(battery_id):
    """
    Actualiza el estado global de la batería basado en el estado de sus fases.
    Esta función debe ser llamada con el lock adquirido.
    
    Args:
        battery_id (int): ID de la batería
    """
    phases = authentication_status[battery_id]['phases']
    
    # Si alguna fase está fallida, todo el proceso está fallido
    if any(phase['state'] == PHASE_STATES['FAILED'] for phase in phases.values()):
        authentication_status[battery_id]['state'] = GLOBAL_STATES['FAILED']
        return
    
    # Si todas las fases son exitosas, todo el proceso es exitoso
    if all(phase['state'] == PHASE_STATES['SUCCESS'] for phase in phases.values()):
        authentication_status[battery_id]['state'] = GLOBAL_STATES['SUCCESS']
        return
    
    # Si alguna fase está en progreso, todo el proceso está en progreso
    if any(phase['state'] == PHASE_STATES['IN_PROGRESS'] for phase in phases.values()):
        authentication_status[battery_id]['state'] = GLOBAL_STATES['IN_PROGRESS']
        return
    
    # Si llegamos aquí, puede que algunas fases sean exitosas y otras no iniciadas
    # En ese caso, consideramos que el proceso está en progreso
    if any(phase['state'] == PHASE_STATES['SUCCESS'] for phase in phases.values()):
        authentication_status[battery_id]['state'] = GLOBAL_STATES['IN_PROGRESS']
        return
    
    # Si todas las fases están en 'not_started', el estado global es 'waiting'
    authentication_status[battery_id]['state'] = GLOBAL_STATES['WAITING']

def get_battery_status(battery_id):
    """
    Obtiene el estado actual de autenticación para una batería específica.
    
    Args:
        battery_id (int): ID de la batería
        
    Returns:
        dict: Estado de autenticación o None si no existe
    """
    with status_lock:
        if battery_id not in authentication_status:
            return None
        
        # Devolver una copia para evitar problemas de concurrencia
        return dict(authentication_status[battery_id])

def get_all_batteries_status():
    """
    Obtiene el estado de autenticación de todas las baterías.
    
    Returns:
        dict: Estado de todas las baterías {battery_id: status}
    """
    with status_lock:
        # Devolver una copia para evitar problemas de concurrencia
        return {id: dict(status) for id, status in authentication_status.items()}

def reset_battery_status(battery_id):
    """
    Reinicia el estado de autenticación para una batería.
    
    Args:
        battery_id (int): ID de la batería
        
    Returns:
        dict: Nuevo estado inicializado
    """
    return initialize_battery_status(battery_id)

def reset_all_batteries_status():
    """
    Reinicia el estado de todas las baterías.
    
    Returns:
        int: Número de baterías reiniciadas
    """
    with status_lock:
        battery_ids = list(authentication_status.keys())
        
        for battery_id in battery_ids:
            initialize_battery_status(battery_id)
        
        return len(battery_ids)

# Funciones para convertir el estado a formato API
def format_battery_status_for_api(battery_id):
    """
    Formatea el estado de autenticación para ser devuelto via API.
    
    Args:
        battery_id (int): ID de la batería
        
    Returns:
        dict: Formato API del estado de autenticación
    """
    with status_lock:
        if battery_id not in authentication_status:
            return {
                'status': 'error',
                'message': f'No hay información de autenticación para la batería {battery_id}',
                'battery_id': battery_id
            }
        
        status = authentication_status[battery_id]
        
        # Formato simplificado para la API
        api_status = {
            'status': 'success',
            'battery_id': battery_id,
            'state': status['state'],
            'phases': {
                'wake_up': status['phases']['wake_up']['state'],
                'authenticate': status['phases']['authenticate']['state'],
                'read_info': status['phases']['read_info']['state']
            },
            'messages': {
                'wake_up': status['phases']['wake_up']['message'],
                'authenticate': status['phases']['authenticate']['message'],
                'read_info': status['phases']['read_info']['message']
            },
            'last_updated': max(
                phase['timestamp'] if phase['timestamp'] else 0 
                for phase in status['phases'].values()
            ),
            'history': status['messages'][-5:] if status['messages'] else []  # Últimos 5 mensajes
        }
        
        return api_status

def format_all_batteries_status_for_api():
    """
    Formatea el estado de todas las baterías para la API.
    
    Returns:
        dict: Estado formateado de todas las baterías
    """
    with status_lock:
        all_batteries = []
        
        for battery_id in authentication_status:
            all_batteries.append(format_battery_status_for_api(battery_id))
        
        return {
            'status': 'success',
            'count': len(all_batteries),
            'batteries': all_batteries,
            'timestamp': time.time()
        }