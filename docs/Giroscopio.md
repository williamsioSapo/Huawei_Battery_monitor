# Protocolo de Desactivación de Giroscopio - Batería Huawei ESM-48150B1

## Descripción General

Protocolo no documentado para desactivar el giroscopio integrado en las baterías Huawei ESM-48150B1 mediante comandos Modbus RTU sobre TCP.

## Especificaciones Técnicas

### Comunicación
- **Protocolo**: Modbus RTU sobre TCP
- **Puerto TCP**: 8235
- **Slave ID**: 214 (0xD6)
- **Timeout recomendado**: 1000ms

### Registros Modbus

| Registro | Tipo | Descripción | Acceso |
|----------|------|-------------|--------|
| `0x0000` | Holding | Estado general del sistema | R |
| `0x1118` | Holding | Estado del giroscopio (0=Off, 1=On) | R |
| `0x117C-0x118B` | Holding | Área de clave criptográfica (16 registros) | W |

## Estructura del Protocolo

### Secuencia de Desactivación

```
1. Read(0x0000)          → Verificar estado del sistema
2. Write(0x117C, clave)  → Escribir clave de 32 bytes
3. Read(0x1118)          → Verificar estado = 1 (activo)
4. Write(0x117C, clave)  → Reescribir clave (confirmación)
5. Read(0x1118)          → Verificar estado = 0 (desactivado)
```

### Frame Modbus RTU

#### Comando Write Multiple Registers (0x10)

```
[Slave ID][Function][Address H][Address L][Quantity H][Quantity L][Byte Count][Data...][CRC]
   D6        10         11         7C         00          10          20      [32 bytes] [2 bytes]
```

**Desglose**:
- `D6`: Slave ID (214 decimal)
- `10`: Function Code (Write Multiple Registers)
- `117C`: Starting Address
- `0010`: Quantity of Registers (16 registers = 32 bytes)
- `20`: Byte Count (32 decimal)
- `[32 bytes]`: Clave criptográfica
- `[CRC]`: Modbus CRC-16

#### Respuesta Write Multiple Registers

```
[Slave ID][Function][Address H][Address L][Quantity H][Quantity L][CRC]
   D6        10         11         7C         00          10      [2 bytes]
```

## Clave Criptográfica

### Características

- **Longitud**: 32 bytes (256 bits)
- **Formato**: Binario sin codificación
- **Validez**: 24 horas (cambia diariamente)
- **Alcance**: Universal (misma clave para todas las baterías del mismo modelo)
- **Entropía**: Alta (~88% bytes únicos)

### Estructura de la Clave

```
Offset  +0 +1 +2 +3 +4 +5 +6 +7 +8 +9 +A +B +C +D +E +F
0x00    [-------- 32 bytes de datos criptográficos --------]
0x10    [-------------- continuación... ------------------]
```

### Patrón de Generación

- Algoritmo basado en fecha (cambia a medianoche)
- No contiene identificadores de batería
- Probablemente SHA-256 con sal propietaria
- Sin relación aparente con parámetros del dispositivo

## Ejemplos de Trama

### Write Multiple Registers - Solicitud

```
D6 10 11 7C 00 10 20 25 BD 4C CF 7B 23 EF 2F 43 C3 88 3B 76 74 A3 69
05 3E 27 3B 19 A2 92 EC 05 9B BA DB 08 EA C3 DE D1 53
```

### Write Multiple Registers - Respuesta (ACK)

```
D6 10 11 7C 00 10 17 06
```

### Read Holding Register 0x1118 - Solicitud

```
D6 03 11 18 00 01 13 16
```

### Read Holding Register 0x1118 - Respuesta

```
D6 03 02 00 01 0D 96    // Giroscopio activo (valor = 1)
D6 03 02 00 00 CC 56    // Giroscopio inactivo (valor = 0)
```

## Notas Importantes

1. **Doble Escritura**: El protocolo requiere escribir la clave dos veces para confirmar la operación
2. **Verificación de Estado**: Siempre verificar el registro 0x1118 después de cada escritura
3. **Clave Universal**: La misma clave funciona para todas las baterías durante el período de validez
4. **Sin Documentación Oficial**: Este protocolo no aparece en los manuales del fabricante
5. **Cambio Diario**: La clave cambia cada 24 horas (zona horaria por determinar)

## Diagrama de Flujo

```
┌─────────────┐
│   INICIO    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Read(0x0000)    │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ Write(0x117C, clave) │
└──────────┬───────────┘
           │
           ▼
    ┌──────────────┐
    │ Read(0x1118) │
    └──────┬───────┘
           │
           ▼
      ┌─────────┐
      │ = 0x01? │
      └────┬────┘
           │ Sí
           ▼
┌──────────────────────┐
│ Write(0x117C, clave) │
└──────────┬───────────┘
           │
           ▼
    ┌──────────────┐
    │ Read(0x1118) │
    └──────┬───────┘
           │
           ▼
      ┌─────────┐
      │ = 0x00? │
      └────┬────┘
           │ Sí
           ▼
     ┌─────────┐
     │ ÉXITO   │
     └─────────┘
```

## Consideraciones de Implementación

- Implementar timeout de 1 segundo para cada operación
- Manejar reconexión en caso de pérdida de comunicación
- Validar longitud de clave antes de enviar (exactamente 32 bytes)
- Considerar reintentos en caso de fallo de comunicación
- Logging detallado para troubleshooting
