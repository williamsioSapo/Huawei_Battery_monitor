# Modbus Web UI para Batería Huawei ESM-48150B1

![Versión de Python](httpsimg.shields.iobadgepython-3.12.5-blue.svg)
![Licencia](httpsimg.shields.iobadgelicense-BSD-green.svg) !-- Asegúrate que sea BSD si es la licencia final --

## Introducción

Este proyecto proporciona una interfaz web (FlaskJavaScript) para interactuar vía Modbus RTU con la batería de litio Huawei ESM-48150B1. Implementa la secuencia de autenticación y la función personalizada (FC41) necesarias para leer información detallada específica de esta batería, además de las operaciones Modbus estándar.

Características Clave
   Interfaz Web Intuitiva (ConexiónDesconexión Serial)
   Operaciones Modbus RTU Estándar (LecturaEscritura)
   Soporte Específico Huawei ESM-48150B1
       Autenticación de 3 pasos.
       Lectura de Información Extendida (SN, Fabricante, etc.) vía FC41.
   Dashboard de Batería Visualización en tiempo real (Voltaje, Corriente, SOC, SOH, Estado).
   Consola de Depuración Web.

## Motivación

La comunicación avanzada con la batería Huawei ESM-48150B1 requiere una lógica específica (autenticación + FC41) no cubierta por herramientas Modbus genéricas. Este proyecto implementa esa lógica.

## Dispositivo Objetivo

   Fabricante Huawei
   Modelo ESM-48150B1
   ID Esclavo Modbus Típico 217 (0xD9)

(Funciones estándar pueden funcionar con otros dispositivos, pero la autenticación, FC41 y dashboard son específicos para este modelo).

## Documentación Detallada

Para obtener información más específica, consulta las siguientes secciones en la carpeta `docs`

   🔧 [Instalación y Configuración](docsINSTALACION.md) Pasos para poner en marcha el proyecto.
   🔌 [Configuración de Hardware](docsCONFIGURACION_HARDWARE.md) Detalles sobre adaptadores y conexiones RS485Ethernet.
    B [Detalles Específicos Huawei (Auth & FC41)](docsDETALLES_HUAWEI_ESM.md) Explicación de la comunicación propietaria.
   ▶️ [Guía de Uso](docsUSO.md) Cómo operar la interfaz web.
   ❓ [Solución de Problemas](docsSOLUCION_PROBLEMAS.md) Ayuda con errores comunes.
   🤝 [Cómo Contribuir](docsCONTRIBUCIONES.md) Guía para colaborar con el proyecto.

## Pila Tecnológica

   Backend Python 3.12.5, Flask, Pymodbus 3.6.7
   Frontend HTML5, CSS3, Vanilla JavaScript
   Protocolo Modbus RTU (sobre conexión serie)

## Estructura del Proyecto

pre
.
├── app.py                      # Aplicación principal Flask y endpoints API
├── modbus_app                 # Lógica Modbus y específica del dispositivo
│   ├── __init__.py
│   ├── client.py               # Gestión del cliente Modbus
│   ├── operations.py           # Operaciones Modbus estándar
│   ├── device_info.py          # Lógica Huawei Auth, FC41, parsing
│   └── custom_requests.py      # Clases Pymodbus para FC41
├── static                     # Archivos estáticos (CSS, JS, Images)
│   ├── css
│   ├── js
│   └── images                 # - Carpeta para imágenes referenciadas
├── templates                  # Plantillas HTML (Flask)
│   └── index.html
├── docs                       # -- Carpeta de Documentación Detallada
│   ├── INSTALACION.md
│   ├── CONFIGURACION_HARDWARE.md
│   ├── USO.md
│   ├── DETALLES_HUAWEI_ESM.md
│   ├── SOLUCION_PROBLEMAS.md
│   └── CONTRIBUCIONES.md
├── requirements.txt            # Dependencias de Python
├── loguin.py                   # Script de pruebareferencia
├── trafico Fase 1.txt          # Captura de tráfico (análisis)
├── informe1.html               # Informe de análisis
├── informe2.html               # Informe de análisis
├── LICENSE                     # -- Archivo de Licencia (DEBES CREARLO con tu licencia - ej. BSD)
└── README.md                   # Este archivo (vista general)
pre
Nota Asegúrate de mover las imágenes `usr_config_1.jpg`, `vcom_config_2.jpg`, `adm_dispo_1.jpg` a la carpeta `staticimages` y ajustar las rutas en `docsCONFIGURACION_HARDWARE.md` para que sean `..staticimagesnombre_imagen.jpg`.

## Posibles Mejoras Futuras

   Usar variables de entorno o archivo de configuración para parámetros de conexión.
   Implementar backend asíncrono (`asyncio`).
   Mejorar manejo de errores en UI.
   Soporte para Modbus TCP directo.
   Pruebas unitariasintegración.
   Configuración de intervalo de monitoreo en UI.

## Licencia

Este proyecto está bajo la licencia BSD. Consulta el archivo `LICENSE` en la raíz del repositorio para más detalles. (Si usas MIT, cambia la insignia y el texto aquí y en el archivo LICENSE).

## Agradecimientos

   A la comunidad Pymodbus.
   [Menciona aquí si te basaste en algún foro, blog o persona específica para el análisis].