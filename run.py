# run.py
"""
Run script for the Modbus RTU application.
"""
import os
import sys

if __name__ == "__main__":
    import app  # Importa app.py desde el directorio raíz
    print("Iniciando servidor Modbus RTU...")
    app.app.run(host='0.0.0.0', port=5000, debug=True)  # app.app hace referencia a la instancia Flask