@echo off
echo Iniciando Escaneo Modbus RTU...

:: Navegar al directorio del proyecto
cd /d C:\Sata\modbusserver

:: Activar entorno virtual
call env\Scripts\activate


:: Iniciar la aplicación
python scan_modbus_devices.py

pause