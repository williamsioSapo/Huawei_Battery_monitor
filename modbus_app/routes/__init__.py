# modbus_app/routes/__init__.py

def register_routes(app):
    """Register all application routes with the Flask app."""
    # Import routes
    from modbus_app.routes.auth_routes import register_auth_routes
    from modbus_app.routes.battery_routes import register_battery_routes 
    from modbus_app.routes.modbus_routes import register_modbus_routes
    from modbus_app.routes.device_routes import register_device_routes
    from modbus_app.routes.console_routes import register_console_routes
    
    # Register routes with the app
    register_auth_routes(app)
    register_battery_routes(app)
    register_modbus_routes(app)
    register_device_routes(app)
    register_console_routes(app)