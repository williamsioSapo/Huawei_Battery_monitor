import json
import os

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.json')

def load_config():
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)

def get_available_batteries():
    config = load_config()
    
    # Obtener la lista de dispositivos descubiertos
    discovered_devices = config.get("application", {}).get("discovered_devices", [])
    
    # Extraer solo los IDs de los dispositivos realmente descubiertos
    available_ids = [device.get("id") for device in discovered_devices if isinstance(device, dict) and "id" in device]
    
    # Si no hay dispositivos, usar 217 como fallback
    if not available_ids:
        available_ids = [217]
    
    # Asegurar que el ID predeterminado esté en la lista de disponibles
    default_id = config.get("application", {}).get("last_connected_id", 217)
    if default_id not in available_ids and available_ids:
        default_id = available_ids[0]
    
    return {
        "batteries": available_ids,
        "default_id": default_id
    }

def get_default_slave_id():
    config = load_config()
    return config.get("application", {}).get("last_connected_id", 217)