@echo off
echo Iniciando servidor Modbus RTU...

:: Navegar al directorio del proyecto
cd /d C:\Sata\modbusserver

:: Activar entorno virtual
call env\Scripts\activate

:: Iniciar el navegador con la URL del servidor (en segundo plano)
start "" http://127.0.0.1:5000

:: Iniciar la aplicación
python app.py

pause