# modbus_app/routes/console_routes.py
from flask import request, jsonify
from modbus_app.logger_config import get_logger

# Obtener un logger para este módulo
logger = get_logger('routes.console')

def register_console_routes(app):
    """Register console-related routes with the Flask app."""

    @app.route('/api/console', methods=['GET'])
    def get_console_messages():
        """Endpoint to get console messages."""
        # Esta función ya no necesita importar console_messages de app.py
        # ya que está disponible globalmente a través del módulo app
        from app import console_messages

        # Registrar la solicitud en el log
        logger.debug(f"Solicitud de mensajes de consola recibida. Params: {request.args}")

        # Get only new messages from last_id
        last_id = request.args.get('last_id', '0')
        try:
            last_id = int(last_id)
        except ValueError:
            last_id = 0
            logger.warning(f"Valor inválido para last_id: {request.args.get('last_id')}, usando 0")
        
        # Return the most recent messages with their IDs
        messages = list(console_messages)[last_id:]
        
        # Log informativo sobre el número de mensajes enviados
        if messages:
            logger.debug(f"Enviando {len(messages)} mensajes, desde ID {last_id} hasta {last_id + len(messages)}")
        
        return jsonify({
            "messages": messages,
            "last_id": last_id + len(messages)
        })