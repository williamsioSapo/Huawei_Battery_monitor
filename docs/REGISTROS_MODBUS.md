# Tabla de Registros Modbus Huawei ESM-48150B1

[<- Volver al README principal](../README.md)

Esta referencia reúne los registros Modbus utilizados por la batería Huawei ESM-48150B1 agrupados por funcionalidad.

### Registros Básicos

| Dirección | Nombre | Factor | Unidad | Notas |
|-----------|--------|--------|--------|-------|
| 0x0000 | Voltaje de Batería | 0.01 | V |  |
| 0x0001 | Voltaje del Pack | 0.01 | V |  |
| 0x0002 | Corriente de Batería | 0.01 | A |  |
| 0x0003 | Estado de Carga (SOC) | 1 | % |  |
| 0x0004 | Estado de Salud (SOH) | 1 | % |  |
| 0x0005 | Temperatura Máxima Celda | 1 | °C |  |
| 0x0006 | Temperatura Mínima Celda | 1 | °C |  |

### Sistema de Identificación

| Dirección | Nombre | Factor | Unidad | Notas |
|-----------|--------|--------|--------|-------|
| 0x0101 | Versión de Software | 1 | - |  |
| 0x010F | Número de Celdas | 1 | celdas |  |

### Diagnóstico y Alarmas

| Dirección | Nombre | Factor | Unidad | Notas |
|-----------|--------|--------|--------|-------|
| 0x000A | Estado General (Bits de Control) | 1 | - | Valor constante 0x0003 observado, posible máscara de bits de estado base |
| 0x0046 | Indicador de Fallas Hardware | 1 | - | 0x0000=OK, 0x0006=Sensores desconectados. NO refleja alarmas de estado (SOC/SOH) |
| 0x0047 | Reservado/Estado Auxiliar 1 | 1 | - | Siempre 0x0000 en todos los casos observados. Función por determinar |
| 0x0048 | Estado de Sensores Principales | 1 | - | 0x0000=Sensores OK, 0x2000=Sensores críticos desconectados |
| 0x0049 | Modo de Operación Batería | 1 | - | Indicador confiable del estado operativo de la batería |
| 0x004A | Estado de Subsistemas | 1 | - | 0x0000=OK, 0x0004=Posible falla en subsistema (bit 2) |

### Estadísticas

| Dirección | Nombre | Factor | Unidad | Notas |
|-----------|--------|--------|--------|-------|
| 0x0042 | Tiempos de Descarga | 1 | veces |  |
| 0x0044 | Descarga AH Acumulada | 1 | AH |  |
| 0x7D6B | Ciclos Acumulados | 1 | ciclos |  |

### Límites de Operación

| Dirección | Nombre | Factor | Unidad | Notas |
|-----------|--------|--------|--------|-------|
| 0x100B | Límite Corriente de Descarga | 0.001 | C |  |
| 0x100D | Límite Corriente de Carga | 0.001 | C |  |

### Registros Experimentales

| Dirección | Nombre | Factor | Unidad | Notas |
|-----------|--------|--------|--------|-------|
| 0x0106 | Parámetro Sistema 0x0106 | 1 | - |  |
| 0x0107 | Parámetro Sistema 0x0107 | 1 | - |  |
| 0x0206 | Estado Detallado Sistema | 1 | - |  |
| 0x0320 | Registro de Control 0x0320 | 1 | - |  |
| 0x100F | Configuración 0x100F | 1 | - |  |
| 0x1010 | Configuración 0x1010 | 1 | - |  |
| 0x101B | Configuración 0x101B | 1 | - |  |
| 0x1118 | Info Dispositivo 0x1118 | 1 | - |  |
| 0x1119 | Info Dispositivo 0x1119 | 1 | - |  |

### Arrays de Celdas

| Dirección | Nombre | Factor | Unidad | Notas |
|-----------|--------|--------|--------|-------|
| 0x0012 | Temperaturas Celdas 1-16 | 1 | °C | 16 registros; valores especiales: 0x7FFF=Sensor desconectado, 0xFC19=Sensor fuera de rango |
| 0x0022 | Voltajes Celdas 1-16 | 0.001 | V | 16 registros; valores especiales: 0xFFFF=Sensor desconectado |
| 0x0300 | Temperaturas Celdas 17-24 | 1 | °C | 8 registros |
| 0x0310 | Voltajes Celdas 17-24 | 0.001 | V | 8 registros |

### Strings ASCII

| Dirección | Nombre | Factor | Unidad | Notas |
|-----------|--------|--------|--------|-------|
| 0x010A | Código de Barras/Serial | 1 | - | 10 caracteres |
| 0x0332 | Modelo de Batería | 1 | - | 12 caracteres |

[<- Volver al README principal](../README.md)
