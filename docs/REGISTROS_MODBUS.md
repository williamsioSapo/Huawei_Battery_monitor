# Documentación Modbus - Batería Huawei ESM-48150B1

## Información General

**Modelo:** ESM-48150B1  
**Protocolo:** Modbus RTU/TCP  
**Fabricante:** Huawei  
**Tipo:** Sistema de Gestión de Batería (BMS)

---

## 1. Registros de Monitoreo Principal (0x0000 - 0x0099)

### 1.1 Parámetros Básicos de Batería

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x0000 | Voltaje de Batería | V | 1 | Voltaje total del sistema de batería |
| 0x0001 | Voltaje de Paquete | V | 1 | Voltaje del paquete de baterías |
| 0x0002 | Corriente de Batería | A | 1 | Corriente actual de la batería |
| 0x0003 | Estado de Carga (SOC) | % | 1 | Porcentaje de carga restante |
| 0x0004 | Estado de Salud (SOH) | % | 1 | Estado de salud de la batería |
| 0x000A | Estado de Batería | - | 1 | Estado operacional general |

### 1.2 Temperaturas

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x0005 | Temperatura Máxima de Celda | °C | 1 | Mayor temperatura entre todas las celdas |
| 0x0006 | Temperatura Mínima de Celda | °C | 1 | Menor temperatura entre todas las celdas |
| 0x020B | Temperatura Ambiente | °C | 1 | Temperatura del entorno |
| 0x020D | Temperatura Alta del PCB | °C | 1 | Temperatura máxima del circuito |
| 0x020F | Temperatura Baja del PCB | °C | 1 | Temperatura mínima del circuito |

### 1.3 Estadísticas de Uso

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x0042 | Ciclos de Descarga | - | 1 | Número total de descargas |
| 0x0044 | Amperios-hora Descargados | Ah | 1 | Capacidad total descargada |
| 0x7D6B | Ciclos Acumulados | - | 1 | Total de ciclos de carga/descarga |

---

## 2. Información del Sistema (0x0100 - 0x01FF)

### 2.1 Identificación

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x0101 | Versión de Software | - | 1 | Versión principal del firmware |
| 0x0106 | Subversión de Software | - | 1 | Versión secundaria del firmware |
| 0x0107 | Capacidad de Batería | Ah | 1 | Capacidad nominal total |
| 0x010A | Número de Serie | - | 1 | Identificador único del dispositivo |
| 0x0332 | Modelo de Batería | - | 1 | Modelo específico de la batería |

### 2.2 Corrientes Adicionales

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x0206 | Corriente del Paquete | A | 1 | Corriente específica del paquete |

---

## 3. Límites y Control (0x1000 - 0x10FF)

### 3.1 Límites de Corriente

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x100B | Límite de Corriente de Descarga | A | 1 | Máxima corriente permitida en descarga |
| 0x100D | Límite de Corriente de Carga | A | 1 | Máxima corriente permitida en carga |
| 0x127E | Configuración Límite de Carga | A | 1 | Parámetro configurable de límite |

### 3.2 Configuración de Salidas Digitales

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x100F | Acción de Alarma DO1 | - | 1 | Configuración de salida digital 1 |
| 0x1010 | Acción de Alarma DO2 | - | 1 | Configuración de salida digital 2 |

### 3.3 Configuraciones Especiales

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x101B | Coeficiente Límite de Carga | - | 1 | Factor de ajuste para límites |
| 0x1118 | Estado del Giroscopio | - | 1 | Estado del sensor de movimiento |
| 0x1119 | Sensibilidad del Giroscopio | - | 1 | Configuración de sensibilidad |

---

## 4. Comunicaciones (0x1100 - 0x11FF)

### 4.1 Configuración SMS

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x1130 | Número de Centro SMS | - | 1 | Centro de mensajes SMS |
| 0x113A | Número Móvil 1 | - | 1 | Primer número de contacto |
| 0x1144 | Número Móvil 2 | - | 1 | Segundo número de contacto |
| 0x114E | Número Móvil 3 | - | 1 | Tercer número de contacto |
| 0x1158 | Número Móvil 4 | - | 1 | Cuarto número de contacto |
| 0x1162 | Número Móvil 5 | - | 1 | Quinto número de contacto |

### 4.2 Configuración GPS/GPRS

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x118C | Dirección IP GPS | - | 1 | IP del servidor GPS |
| 0x1196 | Puerto GPS | - | 1 | Puerto de comunicación GPS |
| 0x1199 | Nombre del APN | - | 1 | Punto de acceso de red móvil |
| 0x11A7 | Usuario APN | - | 1 | Usuario para conexión APN |
| 0x11B5 | Contraseña APN | - | 1 | Contraseña para conexión APN |

---

## 5. Umbrales de Voltaje (0x1200 - 0x121F)

### 5.1 Umbrales de Celdas Individuales

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x1200 | Umbral Alarma Alto Voltaje Celda | V | 1 | Límite superior para alarma |
| 0x1201 | Umbral Restauración Alto Voltaje Celda | V | 1 | Punto de restauración de alarma alta |
| 0x1202 | Umbral Restauración Bajo Voltaje Celda | V | 1 | Punto de restauración de alarma baja |
| 0x1203 | Umbral Alarma Bajo Voltaje Celda | V | 1 | Límite inferior para alarma |
| 0x1204 | Umbral Protección Sobrevoltaje Celda | V | 1 | Límite crítico superior |
| 0x1205 | Umbral Restauración Sobrevoltaje Celda | V | 1 | Restauración de protección alta |
| 0x1206 | Umbral Restauración Subtensión Celda | V | 1 | Restauración de protección baja |
| 0x1207 | Umbral Protección Subtensión Celda | V | 1 | Límite crítico inferior |

### 5.2 Umbrales del Paquete Completo

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x1210 | Umbral Alarma Alto Voltaje Paquete | V | 1 | Límite superior para alarma del paquete |
| 0x1211 | Umbral Restauración Alto Voltaje Paquete | V | 1 | Restauración de alarma alta del paquete |
| 0x1212 | Umbral Restauración Bajo Voltaje Paquete | V | 1 | Restauración de alarma baja del paquete |
| 0x1213 | Umbral Alarma Bajo Voltaje Paquete | V | 1 | Límite inferior para alarma del paquete |
| 0x1214 | Umbral Protección Sobrevoltaje Paquete | V | 1 | Límite crítico superior del paquete |
| 0x1215 | Umbral Restauración Sobrevoltaje Paquete | V | 1 | Restauración protección alta del paquete |
| 0x1216 | Umbral Restauración Subtensión Paquete | V | 1 | Restauración protección baja del paquete |
| 0x1217 | Umbral Protección Subtensión Paquete | V | 1 | Límite crítico inferior del paquete |

---

## 6. Umbrales de Temperatura (0x1220 - 0x123F)

### 6.1 Temperaturas de Carga

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x1220 | Umbral Alarma Alta Temperatura Carga | °C | 1 | Límite superior en carga |
| 0x1221 | Umbral Restauración Alta Temperatura Carga | °C | 1 | Restauración alarma alta carga |
| 0x1222 | Umbral Restauración Baja Temperatura Carga | °C | 1 | Restauración alarma baja carga |
| 0x1223 | Umbral Alarma Baja Temperatura Carga | °C | 1 | Límite inferior en carga |
| 0x1224 | Umbral Protección Sobretemperatura Carga | °C | 1 | Límite crítico superior carga |
| 0x1225 | Umbral Restauración Sobretemperatura Carga | °C | 1 | Restauración protección alta carga |
| 0x1226 | Umbral Restauración Subtemperatura Carga | °C | 1 | Restauración protección baja carga |
| 0x1227 | Umbral Protección Subtemperatura Carga | °C | 1 | Límite crítico inferior carga |

### 6.2 Temperaturas de Descarga

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x1228 | Umbral Alarma Alta Temperatura Descarga | °C | 1 | Límite superior en descarga |
| 0x1229 | Umbral Restauración Alta Temperatura Descarga | °C | 1 | Restauración alarma alta descarga |
| 0x122A | Umbral Restauración Baja Temperatura Descarga | °C | 1 | Restauración alarma baja descarga |
| 0x122B | Umbral Alarma Baja Temperatura Descarga | °C | 1 | Límite inferior en descarga |
| 0x122C | Umbral Protección Sobretemperatura Descarga | °C | 1 | Límite crítico superior descarga |
| 0x122D | Umbral Restauración Sobretemperatura Descarga | °C | 1 | Restauración protección alta descarga |
| 0x122E | Umbral Restauración Subtemperatura Descarga | °C | 1 | Restauración protección baja descarga |
| 0x122F | Umbral Protección Subtemperatura Descarga | °C | 1 | Límite crítico inferior descarga |

### 6.3 Temperaturas Ambientales y del Sistema

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x1232 | Umbral Alarma Alta Temperatura Ambiente | °C | 1 | Límite superior ambiente |
| 0x1233 | Umbral Alarma Baja Temperatura Ambiente | °C | 1 | Límite inferior ambiente |
| 0x1234 | Umbral Protección Sobretemperatura Ambiente | °C | 1 | Límite crítico superior ambiente |
| 0x1235 | Umbral Restauración Sobretemperatura Ambiente | °C | 1 | Restauración protección alta ambiente |
| 0x1236 | Umbral Restauración Subtemperatura Ambiente | °C | 1 | Restauración protección baja ambiente |
| 0x1237 | Umbral Protección Subtemperatura Ambiente | °C | 1 | Límite crítico inferior ambiente |
| 0x1238 | Umbral Protección Sobretemperatura BMS | °C | 1 | Límite crítico superior del BMS |
| 0x1239 | Umbral Restauración Sobretemperatura BMS | °C | 1 | Restauración protección alta BMS |
| 0x123A | Umbral Alarma Alta Temperatura BMS | °C | 1 | Límite superior del BMS |
| 0x123B | Umbral Restauración Alta Temperatura BMS | °C | 1 | Restauración alarma alta BMS |

---

## 7. Protecciones de Corriente (0x1270 - 0x127F)

### 7.1 Umbrales de Sobrecorriente

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x1270 | Umbral Alarma Sobrecorriente Carga | A | 1 | Límite alarma en carga |
| 0x1271 | Umbral Restauración Sobrecorriente Carga | A | 1 | Restauración alarma carga |
| 0x1272 | Umbral Restauración Sobrecorriente Descarga | A | 1 | Restauración alarma descarga |
| 0x1273 | Umbral Alarma Sobrecorriente Descarga | A | 1 | Límite alarma en descarga |
| 0x1274 | Umbral Protección Sobrecorriente Carga | A | 1 | Límite crítico carga |
| 0x1276 | Umbral Protección Sobrecorriente Descarga | A | 1 | Límite crítico descarga |
| 0x1278 | Umbral Protección Sobrecorriente Secundaria | A | 1 | Protección secundaria |
| 0x127A | Umbral Protección Cortocircuito | A | 1 | Detección de cortocircuito |

### 7.2 Temporizadores y Retardos

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x1275 | Retardo Sobrecorriente Carga | ms | 1 | Tiempo antes de activar protección |
| 0x1277 | Retardo Sobrecorriente Descarga | ms | 1 | Tiempo antes de activar protección |
| 0x1279 | Retardo Sobrecorriente Secundaria | ms | 1 | Tiempo protección secundaria |
| 0x127B | Retardo Cortocircuito | ms | 1 | Tiempo detección cortocircuito |
| 0x127C | Retardo Restauración Sobrecorriente | ms | 1 | Tiempo para restaurar |
| 0x127D | Número de Bloqueos por Sobrecorriente | - | 1 | Contador de eventos |

---

## 8. Configuración de Logs (0x12A0 - 0x12AF)

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x12AB | Hora Inicio Almacenamiento Logs | - | 1 | Timestamp de inicio |
| 0x12AD | Hora Fin Almacenamiento Logs | - | 1 | Timestamp de finalización |
| 0x12AF | Intervalo Almacenamiento Logs | s | 1 | Frecuencia de registro |

---

## 9. Switches de Función (0x12F0 - 0x12F5)

| Dirección | Parámetro | Unidad | Factor | Descripción |
|-----------|-----------|--------|--------|-------------|
| 0x12F0 | Parámetros Switch Función Voltaje | - | 1 | Habilitación funciones de voltaje |
| 0x12F1 | Parámetros Switch Función Temperatura | - | 1 | Habilitación funciones de temperatura |
| 0x12F2 | Parámetros Switch Función Corriente | - | 1 | Habilitación funciones de corriente |
| 0x12F3 | Parámetros Switch Función Capacidad | - | 1 | Habilitación funciones de capacidad |
| 0x12F4 | Parámetros Switch Función Ecualización | - | 1 | Habilitación ecualización de celdas |
| 0x12F5 | Parámetros Switch Función Indicación | - | 1 | Habilitación indicadores |

---

## 10. Registros de Estado y Alarmas (Bitfields)

### 10.1 Registro 0x0046 - Fallos del Sistema

| Bit | Descripción |
|-----|-------------|
| 0 | Fallo del calentador |
| 1 | Fallo en detección de voltaje de celdas |
| 2 | Fallo en detección de temperatura de celdas |
| 3 | Cortocircuito en salida de carga |
| 4 | Cortocircuito en relé |
| 5 | Bloqueo por sobrecarga |
| 6 | Fallo en MOSFET bidireccional |

### 10.2 Registro 0x0047 - Estado de Celdas Individuales

| Bit | Descripción |
|-----|-------------|
| 0-15 | Fallo en celda 1-16 respectivamente |

### 10.3 Registro 0x0048 - Protecciones Activas

| Bit | Descripción |
|-----|-------------|
| 0 | Protección por baja temperatura en carga |
| 1 | Protección por alta temperatura en carga |
| 2 | Protección por baja temperatura en descarga |
| 3 | Protección por alta temperatura en descarga |
| 4 | Protección por sobrevoltaje del paquete |
| 5 | Protección por sobrevoltaje en celda |
| 6 | Protección por subtensión del paquete |
| 7 | Protección por subtensión en celda |
| 8 | Protección por sobrevoltaje de salida |
| 9 | Protección por sobretemperatura interna |
| 10 | Protección por cortocircuito en salida |
| 11 | Corte de descarga por celda con voltaje bajo |
| 12 | Inversión de polaridad en la entrada |
| 13 | Alarma antirrobo activada |
| 14 | Protección por sobrecarga |

### 10.4 Registro 0x0049 - Advertencias Activas

| Bit | Descripción |
|-----|-------------|
| 0 | Advertencia por baja temperatura de carga |
| 1 | Advertencia por alta temperatura de carga |
| 2 | Advertencia por baja temperatura de descarga |
| 3 | Advertencia por alta temperatura de descarga |
| 4 | Advertencia por sobrevoltaje del paquete |
| 5 | Advertencia por sobrevoltaje en celda |
| 6 | Advertencia por subtensión del paquete |
| 7 | Advertencia por subtensión en celda |
| 8 | Alarma por circuito abierto en convertidor |
| 9 | Conflicto de número de serie |

### 10.5 Registro 0x004A - Estados Especiales

| Bit | Descripción |
|-----|-------------|
| 0 | Apagado por comando |
| 1 | Fallo de batería de litio |
| 2 | Fallo en handshake antirrobo |
| 3 | Protección activa de litio |
| 4 | Advertencia por sobrecorriente de descarga |
| 5 | Protección por sobrecorriente de descarga |
| 6 | Bloqueo por sobrecorriente de descarga |
| 7 | Protección por sobrevoltaje interno |
| 9 | Fallo de lectura FRU |
| 10 | Advertencia por sobrecorriente de carga |
| 11 | Protección por sobrecorriente de carga |
| 12 | Fallo del giroscopio |
| 13 | Cortocircuito en terminal de batería |

---

## Notas de Implementación

### Factores de Escala
- Todos los registros tienen factor 1 según la documentación original
- Verificar las unidades reales durante la implementación
- Algunos valores pueden requerir conversión adicional

### Comunicación Modbus
- Protocolo: Modbus RTU/TCP
- Velocidad recomendada: 9600 bps para RTU
- Paridad: Verificar con el dispositivo específico
- Timeout recomendado: 1000ms

### Consideraciones de Seguridad
- Los registros de configuración (0x1200+) pueden afectar la operación del sistema
- Verificar límites seguros antes de modificar umbrales
- Realizar respaldos de configuración antes de cambios

### Monitoreo Recomendado
Los siguientes registros deben monitorearse continuamente:
- 0x0000-0x0006: Parámetros básicos
- 0x0046-0x004A: Estados de alarma y protección
- 0x0048: Protecciones activas críticas
