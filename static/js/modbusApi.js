// static/js/modbusApi.js
'use strict';

const BASE_URL = ''; // Si Flask corre en el mismo origen

/**
 * Realiza una petición a la API del backend.
 * @param {string} endpoint - La ruta de la API (ej. '/api/connect').
 * @param {string} method - Método HTTP ('GET', 'POST', etc.).
 * @param {object} [body=null] - Cuerpo de la petición para POST/PUT.
 * @returns {Promise<object>} - Promesa que resuelve con el JSON de la respuesta.
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method: method,
        headers: {},
    };
    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(BASE_URL + endpoint, options);
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                // Si el cuerpo no es JSON o está vacío
                errorData = { message: `Error HTTP ${response.status}: ${response.statusText}` };
            }
            // El error se lanzará y se espera que el llamador lo capture y lo loguee con más contexto.
            throw new Error(errorData.message || `Error HTTP ${response.status} para ${endpoint}`);
        }
        // Si la respuesta es OK pero no tiene cuerpo (ej. 204 No Content)
        if (response.status === 204) {
            return { status: 'success', message: 'Operación exitosa (sin contenido)'};
        }
        return await response.json(); // Devuelve el cuerpo JSON
    } catch (error) {
        // Utils.logError(`Fallo en API request: ${method} ${endpoint}: ${error.message}`, "ModbusAPI"); // Log opcional aquí
        throw error; // Re-lanza el error para que sea manejado por quien llama a la función
    }
}

// Funciones específicas para cada endpoint
function getAvailableBatteries() {
    return apiRequest('/api/batteries', 'GET');
}

// Funciones para comunicación de bajo nivel
function lowLevelConnect(params) {
    return apiRequest('/api/low_level/connect', 'POST', params);
}

function lowLevelDisconnect() {
    return apiRequest('/api/low_level/disconnect', 'POST');
}

function lowLevelInitialize() {
    return apiRequest('/api/low_level/initialize', 'POST');
}

function lowLevelRetryBattery(batteryId) {
    return apiRequest(`/api/low_level/retry_battery/${batteryId}`, 'POST');
}

// Funciones para comunicación PyModbus
function connectModbus(params) {
    return apiRequest('/api/modbus/connect', 'POST', params);
}

function disconnectModbus() {
    return apiRequest('/api/modbus/disconnect', 'POST');
}


function checkStatus() {
    return apiRequest('/api/status', 'GET');
}

function readModbusRegisters(params) {
    return apiRequest('/api/read', 'POST', params);
}

function writeModbusRegisters(params) {
    return apiRequest('/api/write', 'POST', params);
}

// Esta función no parece usarse en main.js original, que usa /api/device_info
function readModbusDeviceInfo(params) {
    // Ya se usa Utils.logWarn en la versión previa, lo cual está bien.
    // Si no estuviera, aquí se añadiría:
    Utils.logWarn("Llamada a readModbusDeviceInfo (directo), se prefiere /api/device_info (cache)", "ModbusAPI");
    return apiRequest('/api/read_device_info', 'POST', params);
}

// Nueva función para verificar datos de celdas individuales
function verifyCellData(slaveId = 217) {
    return apiRequest('/api/verify_cells', 'POST', { slaveId: slaveId });
}
// Funciones para monitoreo de múltiples baterías
function startMultiBatteryMonitoring(batteryIds = []) {
    return apiRequest('/api/batteries/start_monitoring', 'POST', { battery_ids: batteryIds });
}

function stopMultiBatteryMonitoring() {
    return apiRequest('/api/batteries/stop_monitoring', 'POST');
}

function getAllBatteriesStatus() {
    return apiRequest('/api/batteries/status', 'GET');
}

// function getBatteryStatus(batteryId) { // No parece usarse directamente
//     return apiRequest(`/api/batteries/status/${batteryId}`, 'GET');
// }

// Función para iniciar la carga de información detallada
function loadBatteriesDetailedInfo(batteryIds = []) {
    return apiRequest('/api/batteries/load_detailed_info', 'POST', { battery_ids: batteryIds });
}

// Función para verificar el estado de la carga de información detallada
function getDetailedInfoLoadingStatus() {
    return apiRequest('/api/batteries/detailed_info_status', 'GET');
}

// Función para obtener la información detallada de una batería específica
function getBatteryDetailedInfo(batteryId) {
    return apiRequest(`/api/batteries/detailed_info/${batteryId}`, 'GET');
}