import json
import os

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.json')

def load_config():
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)

def get_available_batteries():
    config = load_config()
    return {
        "batteries": config.get("application", {}).get("available_battery_ids", [217]),
        "default_id": config.get("application", {}).get("last_connected_id", 217)
    }

def get_default_slave_id():
    config = load_config()
    return config.get("application", {}).get("last_connected_id", 217)