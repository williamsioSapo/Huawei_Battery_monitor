#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Escáner de dispositivos Modbus RTU para la aplicación de batería Huawei.
Este script lee la configuración desde config.json y escanea el bus Modbus
en busca de dispositivos en el rango especificado, guardando los resultados.
"""

import json
import time
import os
import sys
from datetime import datetime

# Añadir la ruta actual al sys.path para poder importar los módulos
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Importar los módulos necesarios
try:
    from modbus_app.client import connect_client, disconnect_client, get_client
except ImportError:
    print("ERROR: No se pueden importar los módulos modbus_app. Asegúrate de ejecutar desde el directorio correcto.")
    sys.exit(1)

# Constantes
CONFIG_FILE = os.path.join(current_dir, 'config.json')

def load_config():
    """Carga la configuración desde el archivo."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError:
            print(f"ERROR: El archivo {CONFIG_FILE} no contiene JSON válido.")
            sys.exit(1)
        except Exception as e:
            print(f"ERROR: No se pudo leer el archivo {CONFIG_FILE}: {str(e)}")
            sys.exit(1)
    else:
        print(f"ERROR: No se encontró el archivo de configuración {CONFIG_FILE}")
        sys.exit(1)

def save_config(config):
    """Guarda la configuración en el archivo."""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        print(f"Configuración guardada en {CONFIG_FILE}")
    except Exception as e:
        print(f"ERROR: No se pudo guardar la configuración: {str(e)}")
        sys.exit(1)

def scan_device(client, slave_id, max_attempts=3, progressive_wait=True):
    """
    Prueba si un dispositivo Modbus responde, con intentos progresivos para despertar.
    
    Args:
        client: Cliente Modbus conectado
        slave_id: ID del esclavo a probar
        max_attempts: Número máximo de intentos
        progressive_wait: Si True, aumenta el tiempo de espera progresivamente
        
    Returns:
        dict: Información del dispositivo si se encuentra, None en caso contrario
    """
    if not client:
        print(f"Error: No hay cliente Modbus disponible para escanear ID {slave_id}")
        return None
        
    print(f"Escaneando dispositivo ID {slave_id}...")
    
    for attempt in range(1, max_attempts + 1):
        try:
            print(f"  Intento {attempt}/{max_attempts}...")
            # Usar función 03 (Read Holding Registers) como prueba
            result = client.read_holding_registers(address=0, count=1, slave=slave_id)
            
            if not result.isError():
                # Dispositivo encontrado - intentar leer más registros para identificarlo
                value = result.registers[0]
                print(f"  ID {slave_id}: ¡DISPOSITIVO ENCONTRADO! (Reg[0]={value})")
                
                # Intentar obtener más información (registros 0-4 para baterías Huawei)
                timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                device_info = {
                    "id": slave_id,
                    "register_0": value,
                    "discovery_date": timestamp,
                    "last_seen": timestamp,
                    "custom_name": f"Dispositivo {slave_id}"
                }
                
                try:
                    # Leer registros adicionales para identificar tipo de dispositivo
                    more_info = client.read_holding_registers(address=0, count=5, slave=slave_id)
                    if not more_info.isError() and hasattr(more_info, 'registers'):
                        # Convertir valores según factores de escala conocidos
                        device_info["registers"] = {}
                        device_info["registers"]["battery_voltage"] = more_info.registers[0] * 0.01 if more_info.registers[0] else None
                        device_info["registers"]["pack_voltage"] = more_info.registers[1] * 0.01 if len(more_info.registers) > 1 and more_info.registers[1] else None
                        
                        # Para corriente, manejar valores negativos (>32767)
                        if len(more_info.registers) > 2:
                            current_raw = more_info.registers[2]
                            if current_raw > 32767:  # Valor negativo en complemento a 2
                                current_raw -= 65536
                            device_info["registers"]["current"] = current_raw * 0.01
                        else:
                            device_info["registers"]["current"] = None
                            
                        device_info["registers"]["soc"] = more_info.registers[3] if len(more_info.registers) > 3 and more_info.registers[3] else None
                        device_info["registers"]["soh"] = more_info.registers[4] if len(more_info.registers) > 4 and more_info.registers[4] else None
                        
                        # Valores crudos para depuración
                        device_info["raw_values"] = [reg for reg in more_info.registers]
                        
                        # Determinar si es una batería Huawei basado en patrones de voltaje típicos
                        voltage = device_info["registers"]["battery_voltage"]
                        if voltage and 30 <= voltage <= 60:
                            device_info["type"] = "huawei_battery"
                            device_info["custom_name"] = f"Batería Huawei {slave_id}"
                            print(f"  ID {slave_id}: Identificado como batería Huawei (Voltaje: {voltage:.2f}V)")
                        else:
                            device_info["type"] = "unknown_device"
                            print(f"  ID {slave_id}: Tipo de dispositivo desconocido (Reg[0]={value})")
                except Exception as e:
                    print(f"  ID {slave_id}: Error al leer información adicional: {str(e)}")
                    device_info["type"] = "unknown_device"
                    
                return device_info
            else:
                print(f"  ID {slave_id}: Error en respuesta - {result}")
                
        except Exception as e:
            print(f"  ID {slave_id}: Sin respuesta - {str(e)}")
        
        # Si no es el último intento, esperar antes de reintentar
        if attempt < max_attempts:
            # Tiempo de espera progresivo si está habilitado
            wait_time = 1.5 * attempt if progressive_wait else 1.0
            print(f"  Esperando {wait_time:.1f}s antes del siguiente intento...")
            time.sleep(wait_time)
    
    print(f"  ID {slave_id}: No responde después de {max_attempts} intentos.")
    return None

def scan_modbus_range(config):
    """
    Escanea un rango de direcciones Modbus y devuelve los dispositivos encontrados.
    
    Args:
        config: Diccionario con la configuración
        
    Returns:
        list: Lista de dispositivos encontrados
    """
    # Obtener parámetros de la configuración
    serial_config = config.get("serial", {})
    port = serial_config.get("port", "COM1")
    baudrate = serial_config.get("baudrate", 9600)
    parity = serial_config.get("parity", "N")
    stopbits = serial_config.get("stopbits", 1)
    bytesize = serial_config.get("bytesize", 8)
    timeout = serial_config.get("timeout", 1.0)
    
    scan_config = config.get("scanning", {})
    start_id = scan_config.get("start_id", 1)
    end_id = scan_config.get("end_id", 247)
    max_attempts = scan_config.get("max_attempts", 3)
    progressive_wait = scan_config.get("progressive_wait", True)
    scan_timeout = scan_config.get("scan_timeout", 0.5)  # Timeout específico para escaneo
    
    print(f"Conectando al puerto {port} ({baudrate},{bytesize}{parity}{stopbits})...")
    success, message = connect_client(port, baudrate, parity, stopbits, bytesize, timeout)
    
    if not success:
        print(f"ERROR: No se pudo conectar al puerto: {message}")
        sys.exit(1)
    
    client = get_client()
    found_devices = []
    original_timeout = None
    
    try:
        # Guardar timeout original y establecer uno más corto para escaneo
        if hasattr(client, 'timeout'):
            original_timeout = client.timeout
            client.timeout = scan_timeout
            print(f"Timeout establecido a {scan_timeout}s para escaneo")
        
        print(f"\nIniciando escaneo de dispositivos (rango {start_id}-{end_id})...")
        start_time = time.time()
        
        try:
            for slave_id in range(start_id, end_id + 1):
                device_info = scan_device(client, slave_id, max_attempts, progressive_wait)
                if device_info:
                    found_devices.append(device_info)
                    # Pequeña pausa entre dispositivos encontrados
                    time.sleep(0.5)
        except KeyboardInterrupt:
            print("\nEscaneo interrumpido por el usuario.")
        
        duration = time.time() - start_time
        print(f"\nEscaneo completado en {duration:.2f} segundos.")
        print(f"Dispositivos encontrados: {len(found_devices)}")
        
        if found_devices:
            for i, device in enumerate(found_devices):
                print(f"\nDispositivo {i+1}:")
                print(f"  ID: {device['id']}")
                print(f"  Tipo: {device.get('type', 'Desconocido')}")
                device_id = device.get("id", "")
                custom_name = device.get("custom_name", f"Dispositivo {device_id}")
                print(f"  Nombre: {custom_name}")
                
                if "registers" in device:
                    regs = device["registers"]
                    print("  Registros:")
                    if regs.get("battery_voltage") is not None:
                        print(f"    Voltaje: {regs['battery_voltage']:.2f} V")
                    if regs.get("pack_voltage") is not None:
                        print(f"    Voltaje Pack: {regs['pack_voltage']:.2f} V")
                    if regs.get("current") is not None:
                        print(f"    Corriente: {regs['current']:.2f} A")
                    if regs.get("soc") is not None:
                        print(f"    SOC: {regs['soc']} %")
                    if regs.get("soh") is not None:
                        print(f"    SOH: {regs['soh']} %")
                
    except Exception as e:
        print(f"ERROR durante el escaneo: {str(e)}")
    finally:
        # Restaurar timeout original
        if original_timeout is not None and hasattr(client, 'timeout'):
            client.timeout = original_timeout
        
        # Desconectar cliente
        disconnect_client()
    
    return found_devices

def update_config_with_devices(config, devices):
    """
    Actualiza la configuración con los dispositivos encontrados.
    Reemplaza completamente los dispositivos anteriores.
    
    Args:
        config: Diccionario con la configuración
        devices: Lista de dispositivos encontrados
    
    Returns:
        dict: Configuración actualizada
    """
    # Reemplazar completamente la lista de dispositivos
    config["application"]["discovered_devices"] = devices
    
    # Si se encontraron dispositivos, establecer el último conectado
    if devices:
        # Buscar la primera batería Huawei, si existe
        huawei_battery = next((d for d in devices if d.get("type") == "huawei_battery"), None)
        if huawei_battery:
            config["application"]["last_connected_id"] = huawei_battery["id"]
        else:
            # Si no hay baterías Huawei, usar el primer dispositivo
            config["application"]["last_connected_id"] = devices[0]["id"]
    
    return config

def main():
    print("\n=========================================")
    print("  ESCÁNER DE DISPOSITIVOS MODBUS RTU")
    print("=========================================\n")
    
    try:
        # Cargar configuración
        print("Cargando configuración...")
        config = load_config()
        
        # Mostrar parámetros
        serial_config = config.get("serial", {})
        scan_config = config.get("scanning", {})
        
        print(f"Puerto: {serial_config.get('port', 'COM1')}")
        print(f"Baudrate: {serial_config.get('baudrate', 9600)}")
        print(f"Configuración: {serial_config.get('bytesize', 8)}{serial_config.get('parity', 'N')}{serial_config.get('stopbits', 1)}")
        print(f"Timeout: {serial_config.get('timeout', 1.0)}s")
        print(f"Rango de escaneo: {scan_config.get('start_id', 1)}-{scan_config.get('end_id', 247)}")
        print(f"Intentos por dispositivo: {scan_config.get('max_attempts', 3)}")
        print(f"Espera progresiva: {'Habilitada' if scan_config.get('progressive_wait', True) else 'Deshabilitada'}")
        
        # Confirmar escaneo
        print("\nATENCIÓN: Este proceso reemplazará todos los dispositivos anteriormente descubiertos.")
        confirmation = input("¿Desea continuar? (s/n): ").strip().lower()
        if confirmation != 's' and confirmation != 'si' and confirmation != 'y' and confirmation != 'yes':
            print("Escaneo cancelado por el usuario.")
            sys.exit(0)
        
        # Realizar escaneo
        devices = scan_modbus_range(config)
        
        # Actualizar configuración
        if devices:
            config = update_config_with_devices(config, devices)
            save_config(config)
            print(f"\nInformación de {len(devices)} dispositivos guardada en configuración")
        else:
            print("\nNo se encontraron dispositivos para guardar en la configuración.")
        
    except KeyboardInterrupt:
        print("\nOperación cancelada por el usuario.")
        sys.exit(0)
    except Exception as e:
        print(f"\nERROR inesperado: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()