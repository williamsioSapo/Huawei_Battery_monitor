# Modbus Web UI para Batería Huawei ESM-48150B1

![Versión de Python](https://img.shields.io/badge/python-3.12.5-blue.svg)
![Licencia](https://img.shields.io/badge/license-BSD-green.svg)

## Introducción

Este proyecto proporciona una interfaz web (Flask/JavaScript) para interactuar vía Modbus RTU con la batería de litio Huawei ESM-48150B1. Implementa la secuencia de autenticación y la función personalizada (FC41) necesarias para leer información detallada específica de esta batería, además de las operaciones Modbus estándar.

## Características Clave

- **Interfaz Web Intuitiva** (Conexión/Desconexión Serial)
- **Operaciones Modbus RTU Estándar** (Lectura/Escritura)
- **Soporte Específico Huawei ESM-48150B1**
  - Autenticación de 3 pasos
  - Lectura de Información Extendida (SN, Fabricante, etc.) vía FC41
- **Dashboard de Batería** - Visualización en tiempo real (Voltaje, Corriente, SOC, SOH, Estado)
- **Consola de Depuración Web**

## Motivación

La comunicación avanzada con la batería Huawei ESM-48150B1 requiere una lógica específica (autenticación + FC41) no cubierta por herramientas Modbus genéricas. Este proyecto implementa esa lógica.

## Dispositivo Objetivo

- **Fabricante:** Huawei
- **Modelo:** ESM-48150B1
- **ID Esclavo Modbus Típico:** 217 (0xD9)

(Funciones estándar pueden funcionar con otros dispositivos, pero la autenticación, FC41 y dashboard son específicos para este modelo).

## Documentación Detallada

Para obtener información más específica, consulta las siguientes secciones en la carpeta `docs`:

- 🔧 [Instalación y Configuración](docs/INSTALACION.md) - Pasos para poner en marcha el proyecto
- 🔌 [Configuración de Hardware](docs/CONFIGURACION_HARDWARE.md) - Detalles sobre adaptadores y conexiones RS485/Ethernet
- 🔋 [Detalles Específicos Huawei (Auth & FC41)](docs/DETALLES_HUAWEI_ESM.md) - Explicación de la comunicación propietaria
- ▶️ [Guía de Uso](docs/USO.md) - Cómo operar la interfaz web
- ❓ [Solución de Problemas](docs/SOLUCION_PROBLEMAS.md) - Ayuda con errores comunes
- 🤝 [Cómo Contribuir](docs/CONTRIBUCIONES.md) - Guía para colaborar con el proyecto

## Pila Tecnológica

- **Backend:** Python 3.12.5, Flask, Pymodbus 3.6.7
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Protocolo:** Modbus RTU (sobre conexión serie)

## Estructura del Proyecto

```
.
├── app.py                     # Aplicación principal Flask y endpoints API
├── modbus_app/                # Lógica Modbus y específica del dispositivo
│   ├── __init__.py
│   ├── client.py              # Gestión del cliente Modbus
│   ├── operations.py          # Operaciones Modbus estándar
│   ├── device_info.py         # Lógica Huawei Auth, FC41, parsing
│   └── custom_requests.py     # Clases Pymodbus para FC41
├── static/                    # Archivos estáticos (CSS, JS, Images)
│   ├── css/
│   ├── js/
│   └── images/                # Carpeta para imágenes referenciadas
├── templates/                 # Plantillas HTML (Flask)
│   └── index.html
├── docs/                      # Carpeta de Documentación Detallada
│   ├── INSTALACION.md
│   ├── CONFIGURACION_HARDWARE.md
│   ├── USO.md
│   ├── DETALLES_HUAWEI_ESM.md
│   ├── SOLUCION_PROBLEMAS.md
│   └── CONTRIBUCIONES.md
├── requirements.txt           # Dependencias de Python
├── loguin.py                  # Script de prueba/referencia
├── trafico_Fase_1.txt         # Captura de tráfico (análisis)
├── informe1.html              # Informe de análisis
├── informe2.html              # Informe de análisis
├── LICENSE                    # Archivo de Licencia BSD
└── README.md                  # Este archivo (vista general)
```

## Posibles Mejoras Futuras

- Usar variables de entorno o archivo de configuración para parámetros de conexión
- Implementar backend asíncrono (`asyncio`)
- Mejorar manejo de errores en UI
- Soporte para Modbus TCP directo
- Pruebas unitarias/integración
- Configuración de intervalo de monitoreo en UI

## Licencia

Este proyecto está bajo la licencia BSD. Consulta el archivo `LICENSE` en la raíz del repositorio para más detalles.

## Agradecimientos

- A la comunidad Pymodbus
- [Menciona aquí si te basaste en algún foro, blog o persona específica para el análisis]
