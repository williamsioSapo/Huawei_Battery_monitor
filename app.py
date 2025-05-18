# app.py (mantener el original pero actualizar los imports)
import io
import sys
import threading
import time
from collections import deque
from flask import Flask, render_template, request, jsonify

# Importar sistema de logging centralizado
from modbus_app.logger_config import setup_logging, log_to_cmd

# Configurar el sistema de logging y obtener el buffer de consola
console_messages = setup_logging()

# Import original modules
from modbus_app.battery_monitor import BatteryMonitor
from modbus_app.battery_initializer import BatteryInitializer
from modbus_app.authentication_status import (
    format_all_batteries_status_for_api,
    format_battery_status_for_api,
    reset_battery_status,
    all_batteries_authenticated,
    get_failed_batteries,
    authentication_is_complete
)

# Initialize Flask app
app = Flask(__name__)

# Clase para capturar salida stdout (mantenida por compatibilidad)
class ConsoleCapturer(io.StringIO):
    def write(self, text):
        if text.strip():  # Ignorar líneas vacías
            console_messages.append(text.rstrip())
        return super().write(text)

# Verificar si ya se ha reemplazado stdout
if not isinstance(sys.stdout, ConsoleCapturer):
    # Guardar stdout original
    original_stdout = sys.stdout
    # Reemplazar sys.stdout para capturar todos los print()
    sys.stdout = ConsoleCapturer()

# Mensaje de inicio
log_to_cmd("Aplicación Modbus RTU iniciada", "INFO", "APP")

# Create battery monitor instance
battery_monitor = BatteryMonitor()

# Option 1: Keep all routes in app.py for now (easiest way to keep it working)
# ...existing route handlers...

# Option 2: Load routes from modular structure
try:
    # Import routes from new structure
    from modbus_app.routes import register_routes
    # Register all routes with the app
    register_routes(app)
    log_to_cmd("Rutas cargadas desde estructura modular", "INFO", "APP")
except ImportError as e:
    log_to_cmd(f"Error al cargar rutas modulares: {e}", "ERROR", "APP")
    log_to_cmd("Usando rutas integradas", "WARNING", "APP")
    # Keep using the original routes (backup option)
    # ...original route handlers...

# For verification, we'll keep the main route here
@app.route('/')
def index():
    """Serve the main page."""
    return render_template('index.html')

if __name__ == '__main__':
    # Make sure the path to your templates and static files is correct
    log_to_cmd("Iniciando servidor Flask", "INFO", "APP")
    app.run(host='0.0.0.0', port=5000, debug=True)  # debug=False for production