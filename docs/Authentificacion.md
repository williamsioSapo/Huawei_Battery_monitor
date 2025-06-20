# Protocolo de Autenticación Propietario - Baterías Huawei ESM

## ⚠️ INFORMACIÓN CRÍTICA

Este protocolo **NO está documentado** en la especificación Modbus estándar de Huawei. Es un protocolo propietario obtenido mediante ingeniería inversa y análisis de tráfico de comunicaciones.

---

## 1. Información General

**Modelos Compatibles:** ESM-48100B1, ESM-48150B1, ESM-48100B3, ESM-48100U2, y familia ESM  
**Protocolo Base:** Modbus RTU con extensiones propietarias  
**Requisito:** Autenticación obligatoria antes de acceder a funciones FC41  
**Persistencia:** El estado de autenticación se mantiene hasta desconexión física  

### 1.1 ¿Por qué es Necesaria la Autenticación?

- Las baterías Huawei ESM implementan **protección por software**
- Sin autenticación, solo responden a funciones Modbus básicas (FC03, FC04)
- La función **FC41** (lectura de información del dispositivo) está **bloqueada** por defecto
- La autenticación desbloquea acceso completo al BMS

---

## 2. Protocolo de Wake-Up (Opcional pero Recomendado)

### 2.1 Descripción

Las baterías pueden estar en **modo de ahorro de energía** y no responder inmediatamente. El protocolo de wake-up las "despierta" antes de la autenticación.

### 2.2 Implementación

**Comando:** Lectura repetitiva del registro básico de voltaje
```
[slave_id] 03 00 00 00 01 [CRC]
```

**Parámetros de Wake-Up:**
```
Máximo intentos: 5
Timeout por intento: 0.8 segundos
Patrón de espera: 1s, 2s, 4s, 8s, 16s (progresivo)
Criterio de éxito: Respuesta válida con voltaje > 0
```

**Respuesta Exitosa:**
```
[slave_id] 03 02 [voltage_MSB] [voltage_LSB] [CRC]
```

**Interpretación:** Si el voltaje obtenido es mayor a 0V (típicamente 40-55V), la batería está despierta y lista para autenticación.

---

## 3. Secuencia de Autenticación de 3 Pasos

### 3.1 Visión General

| Paso | Función | Propósito | Timeout |
|------|---------|-----------|---------|
| 1 | FC03 Especial | Comando de desbloqueo | 1.0s |
| 2 | FC10 | Sincronización fecha/hora | 1.0s |
| 3 | FC41 | Validación de acceso | 2.0s |

### 3.2 Pasos Intermedios

**Entre pasos:** 0.5-0.8 segundos de pausa para estabilización  
**Después del Paso 3:** 0.3 segundos antes del primer FC41 real

---

## 4. Paso 1: Comando de Desbloqueo Especial

### 4.1 Descripción

Utiliza la función FC03 (Read Holding Registers) con parámetros específicos para desbloquear el acceso a la batería.

### 4.2 Comando

```
Formato: [slave_id] 03 01 06 00 01 [CRC]
```

**Desglose del Comando:**
| Byte | Valor | Descripción |
|------|-------|-------------|
| 0 | slave_id | ID de la batería (típicamente 214-218) |
| 1 | 0x03 | Función 03 (Read Holding Registers) |
| 2 | 0x01 | Dirección MSB (0x0106) |
| 3 | 0x06 | Dirección LSB |
| 4 | 0x00 | Cantidad MSB (1 registro) |
| 5 | 0x01 | Cantidad LSB |
| 6-7 | CRC | CRC16 Modbus (little-endian) |

### 4.3 Respuesta Esperada

```
Formato: [slave_id] 03 02 00 XX [CRC]
Longitud: 7 bytes exactos
```

**Validaciones Críticas:**
- `response[0] == slave_id` (ID correcto)
- `response[1] == 0x03` (función correcta)
- `response[2] == 0x02` (byte count = 2)
- `response[3] == 0x00` (patrón esperado)
- `len(response) == 7` (longitud exacta)

### 4.4 Ejemplo de Tráfico Real

```
TX: [D9 03 01 06 00 01 E4 2F]  // Comando para batería ID 217
RX: [D9 03 02 00 03 F8 45]     // Respuesta exitosa
```

---

## 5. Paso 2: Sincronización de Fecha/Hora

### 5.1 Descripción

Envía la fecha y hora actual del sistema a la batería usando FC10 (Write Multiple Registers). **Este paso es obligatorio** aunque la batería tenga su propio RTC.

### 5.2 Comando

```
Formato: [slave_id] 10 10 00 00 06 0C [FECHA/HORA] [CRC]
```

**Estructura del Comando:**
| Bytes | Valor | Descripción |
|-------|-------|-------------|
| 0 | slave_id | ID de la batería |
| 1 | 0x10 | Función 10 (Write Multiple Registers) |
| 2-3 | 0x10 0x00 | Dirección inicial: 0x1000 |
| 4-5 | 0x00 0x06 | Cantidad: 6 registros (12 bytes) |
| 6 | 0x0C | Byte count: 12 bytes de datos |
| 7-18 | [DATOS] | Fecha/hora (ver formato abajo) |
| 19-20 | CRC | CRC16 Modbus |

### 5.3 Formato de Fecha/Hora

**12 bytes organizados como 6 registros de 16-bit (big-endian):**

| Bytes | Registro | Descripción | Formato | Ejemplo |
|-------|----------|-------------|---------|---------|
| 7-8 | 1 | Año | YYYY (16-bit) | 0x07E8 = 2024 |
| 9-10 | 2 | Mes | 0x00 + MM | 0x000C = Diciembre |
| 11-12 | 3 | Día | 0x00 + DD | 0x001F = 31 |
| 13-14 | 4 | Hora | 0x00 + HH | 0x0017 = 23:xx |
| 15-16 | 5 | Minuto | 0x00 + mm | 0x003B = xx:59 |
| 17-18 | 6 | Segundo | 0x00 + ss | 0x003B = xx:xx:59 |

### 5.4 Respuesta Esperada

```
Formato: [slave_id] 10 10 00 00 06 [CRC]
Longitud: 8 bytes exactos
```

**Validaciones:**
- Echo de los bytes 2-5 del comando original
- Confirma escritura de 6 registros en 0x1000

### 5.5 Ejemplo de Tráfico Real

```
// Para 31/Dec/2024 23:59:59
TX: [D9 10 10 00 00 06 0C 07 E8 00 0C 00 1F 00 17 00 3B 00 3B XX XX]
RX: [D9 10 10 00 00 06 XX XX]  // Echo de confirmación
```

---

## 6. Paso 3: Validación de Acceso

### 6.1 Descripción

Utiliza la función personalizada **FC41** para completar la validación y habilitar el acceso completo a todas las funciones FC41 posteriores.

### 6.2 Comando

```
Formato: [slave_id] 41 05 01 04 [CRC]
```

**Desglose del Comando:**
| Byte | Valor | Descripción |
|------|-------|-------------|
| 0 | slave_id | ID de la batería |
| 1 | 0x41 | Función 41 (personalizada Huawei) |
| 2 | 0x05 | Subfunción/parámetro |
| 3 | 0x01 | Parámetro de validación |
| 4 | 0x04 | Código de comando |
| 5-6 | CRC | CRC16 Modbus |

### 6.3 Respuesta Esperada

```
Formato: [slave_id] 41 05 06 [DATA...] [CRC]
Longitud mínima: 9 bytes
Longitud típica: 10-12 bytes
```

**Validaciones Mínimas:**
- `response[0] == slave_id`
- `response[1] == 0x41`
- `len(response) >= 9`
- Bytes 2-3 típicamente: `0x05 0x06`

### 6.4 Ejemplo de Tráfico Real

```
TX: [D9 41 05 01 04 XX XX]        // Comando de validación
RX: [D9 41 05 06 XX XX XX XX XX]  // Respuesta de confirmación
```

---

## 7. Lectura Post-Autenticación con FC41

### 7.1 Funciones Disponibles

Una vez completada la autenticación, las siguientes funciones FC41 están disponibles:

| Subfunción | Comando | Propósito |
|------------|---------|-----------|
| 06 03 04 | Información del dispositivo | Leer datos del fabricante, modelo, serie |
| 06 03 05 | Registros históricos | Leer logs almacenados |
| 05 01 05 | Inicializar historial | Preparar sesión de historial |
| 0C 01 05 | Cerrar historial | Finalizar sesión de historial |

### 7.2 Lectura de Información del Dispositivo

#### 7.2.1 Comando

```
Formato: [slave_id] 41 06 03 04 00 [index] [CRC]
```

**Parámetros:**
- **index:** 0-5 (6 fragmentos disponibles)

#### 7.2.2 Información por Índice

| Índice | Contenido Típico |
|--------|------------------|
| 0 | Fabricante (VendorName), Modelo (BoardType) |
| 1 | Número de serie (BarCode) |
| 2 | Fecha de fabricación (Manufactured) |
| 3 | Versión de firmware (ArchivesInfoVersion) |
| 4 | Versión de etiqueta (ElabelVersion) |
| 5 | Información extendida y descripción |

#### 7.2.3 Formato de Respuesta

```
[slave_id] 41 [length] [status] [data_bytes...] [CRC]
```

**Estructura:**
- **Bytes 0-1:** slave_id + 0x41
- **Bytes 2-6:** Cabecera de respuesta FC41
- **Bytes 7 hasta CRC-2:** Datos ASCII del dispositivo
- **Últimos 2 bytes:** CRC

#### 7.2.4 Decodificación de Datos

Los datos se devuelven como **texto ASCII** con formato clave=valor:

**Ejemplo de datos decodificados:**
```
VendorName=HUAWEI
BoardType=ESM-48150B1
BarCode=ABC123DEF456
Manufactured=2023-08-15
ArchivesInfoVersion=V1.2
ElabelVersion=V2.1
Description=Lithium Battery Management System
```

**Proceso de decodificación:**
1. Extraer bytes de datos (desde byte 7 hasta CRC-2)
2. Decodificar como ASCII (ignorar caracteres no imprimibles)
3. Parsear líneas separadas por \n o \r
4. Dividir cada línea por '=' para obtener clave-valor
5. Limpiar espacios en blanco y caracteres especiales

### 7.3 Lectura de Historial

#### 7.3.1 Secuencia de Lectura de Historial

1. **Inicializar sesión:** `[slave_id] 41 05 01 05 [CRC]`
2. **Resetear puntero:** `[slave_id] 41 06 03 05 00 00 [CRC]`
3. **Leer registros:** `[slave_id] 41 06 03 05 [record_MSB] [record_LSB] [CRC]`
4. **Cerrar sesión:** `[slave_id] 41 0C 01 05 [CRC]`

#### 7.3.2 Formato de Registro Histórico

Cada registro histórico contiene **32 bytes de datos** con la siguiente estructura:

| Bytes | Parámetro | Factor | Descripción |
|-------|-----------|--------|-------------|
| 8-9 | Voltaje del Pack | 0.01 | Voltaje total en V |
| 10-11 | Corriente | 0.01 | Corriente con signo en A |
| 16 | Temperatura Mínima | 1 | Temperatura más baja en °C |
| 18 | Temperatura Máxima | 1 | Temperatura más alta en °C |
| 20 | SOC | 1 | Estado de carga en % |
| 24-25 | Ah Descargados | 1 | Amperios-hora descargados |
| 28 | Ciclos de Descarga | 1 | Número de descargas |
| 30-31 | Voltaje de Batería | 0.01 | Voltaje de batería en V |

#### 7.3.3 Detección de Fin de Historial

**Registro vacío:** Todos los 32 bytes de datos son `0xFF`
```
[slave_id] 41 [length] [status] [FF FF FF ... FF] [CRC]
```

Esto indica que se ha alcanzado el final del historial almacenado.

#### 7.3.4 Procesamiento de Valores con Signo

**Corriente (bytes 10-11):**
- Si valor > 32767: valor_real = valor - 65536
- Factor: 0.01
- Positivo: Carga, Negativo: Descarga

---

## 8. Verificación Post-Autenticación

### 8.1 Test de Autenticación Exitosa

Después de los 3 pasos, verificar el éxito intentando leer información básica:

```
Comando: [slave_id] 41 06 03 04 00 00 [CRC]
```

**Resultado esperado:** Respuesta FC41 con datos ASCII del dispositivo

### 8.2 Indicadores de Éxito

Una autenticación exitosa se confirma cuando:
- Los 3 pasos se completan sin errores
- El primer comando FC41 devuelve datos ASCII válidos
- Los datos contienen campos como "VendorName=HUAWEI"
- No hay errores de timeout en comandos posteriores

### 8.3 Persistencia del Estado

- **Durante la sesión:** El estado autenticado se mantiene
- **Tras desconexión:** Se pierde y debe repetirse
- **Cambio de baudrate:** Requiere re-autenticación
- **Reset de hardware:** Requiere secuencia completa

---

## 9. Troubleshooting y Errores Comunes

### 9.1 Errores de Comunicación

| Error | Síntoma | Causa Probable | Solución |
|-------|---------|----------------|----------|
| Sin respuesta en Paso 1 | Timeout | Batería en sleep mode | Ejecutar wake-up primero |
| Respuesta incompleta | Pocos bytes | Timeout muy corto | Aumentar timeout a 1.0s+ |
| CRC incorrecto | Error de validación | Interferencia en bus | Verificar cableado RS485 |
| ID incorrecto | response[0] != slave_id | Dirección errónea | Verificar slave_id correcto |

### 9.2 Errores de Protocolo

| Error | Síntoma | Causa | Solución |
|-------|---------|-------|----------|
| Paso 2 falla | Echo incorrecto | Formato de fecha/hora | Verificar construcción de comando |
| Paso 3 sin respuesta | FC41 no responde | Pasos 1-2 fallaron | Reiniciar secuencia completa |
| FC41 posterior falla | Función no disponible | Autenticación incompleta | Re-autenticar |

### 9.3 Problemas de Hardware

| Problema | Síntoma | Verificación |
|----------|---------|--------------|
| Cable RS485 | Sin comunicación | Verificar pines A, B y GND |
| Terminación | Datos corruptos | Verificar resistencias 120Ω |
| Alimentación | Batería no responde | Verificar 48V presente |
| Baudrate | Caracteres extraños | Confirmar 9600 bps |

---

## 10. Consideraciones de Implementación

### 10.1 Parámetros de Tiempo

- **Timeout mínimo:** 0.8 segundos por comando
- **Tiempo total:** 5-7 segundos para secuencia completa
- **Reintentos:** Máximo 3 intentos por paso
- **Persistencia:** Estado se mantiene durante toda la sesión

### 10.2 Compatibilidad de Modelos

| Modelo | Compatibilidad | Notas |
|--------|----------------|-------|
| ESM-48100B1 | ✅ Confirmado | Protocolo estándar |
| ESM-48150B1 | ✅ Confirmado | Protocolo estándar |
| ESM-48100B3 | ✅ Confirmado | Protocolo estándar |
| ESM-48100U2 | ⚠️ Probable | No verificado |
| Otros ESM | ⚠️ Probable | Verificar individualmente |

### 10.3 Consideraciones de Seguridad

- **Autenticación por sesión:** Debe repetirse después de cada desconexión
- **No es criptográfica:** El protocolo no incluye encriptación
- **Acceso completo:** Una vez autenticado, acceso total al BMS
- **Sin control de acceso:** No hay roles o permisos diferenciados

### 10.4 Integración con Sistemas

Para integrar en sistemas de monitoreo:

1. **Inicializar:** Wake-up + Autenticación al establecer conexión
2. **Mantener:** Verificar conexión periódicamente
3. **Recuperar:** Re-autenticar automáticamente tras desconexión
4. **Monitorear:** Usar FC03/FC04 para lectura continua de registros
5. **Diagnosticar:** Usar FC41 para información detallada según necesidad

---

## 11. Referencias y Recursos

### 11.1 Herramientas de Análisis

- **Analizadores Modbus:** Para capturar tráfico y verificar comandos
- **Osciloscopios:** Para verificar señales RS485
- **Multímetros:** Para verificar niveles de voltaje

### 11.2 Documentación Relacionada

- Especificación Modbus RTU oficial
- Manual de registros Modbus Huawei ESM
- Guías de cableado RS485

### 11.3 Información de Contacto

- Foros DIYSolar para experiencias de usuarios
- Repositorios GitHub con implementaciones de referencia
- Grupos de ingeniería inversa de protocolos BMS

---

**Nota Final:** Este protocolo fue desarrollado mediante ingeniería inversa y análisis de tráfico. Huawei no proporciona documentación oficial sobre esta secuencia de autenticación. Usar bajo su propio riesgo y siempre verificar compatibilidad con hardware específico.
