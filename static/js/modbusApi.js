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
        // Re-lanza el error para que sea manejado por quien llama a la función
        throw error;
    }
}

// ========== FUNCIONES PARA CONEXIÓN ÚNICA ==========

/**
 * Obtiene las baterías disponibles en el sistema
 * @returns {Promise<Object>} - Lista de baterías disponibles
 */
function getAvailableBatteries() {
    return apiRequest('/api/batteries', 'GET');
}

/**
 * Establece conexión única al sistema (reemplaza lowLevelConnect)
 * @param {Object} params - Parámetros de conexión
 * @returns {Promise<Object>} - Resultado de la conexión
 */
function conectarSistema(params) {
    return apiRequest('/api/connect', 'POST', params);
}

/**
 * Desconecta del sistema (reemplaza lowLevelDisconnect)
 * @returns {Promise<Object>} - Resultado de la desconexión
 */
function desconectarSistema() {
    return apiRequest('/api/disconnect', 'POST');
}

/**
 * Inicializa las baterías del sistema
 * @returns {Promise<Object>} - Resultado de la inicialización
 */
function inicializarBaterias() {
    return apiRequest('/api/initialize', 'POST');
}

/**
 * Reintenta la inicialización de una batería específica
 * @param {number} batteryId - ID de la batería a reintentar
 * @returns {Promise<Object>} - Resultado del reintento
 */
function reintentarBateria(batteryId) {
    return apiRequest(`/api/retry_battery/${batteryId}`, 'POST');
}

/**
 * Verifica el estado actual del sistema
 * @returns {Promise<Object>} - Estado del sistema
 */
function verificarEstadoSistema() {
    return apiRequest('/api/status', 'GET');
}

// ========== FUNCIONES PARA OPERACIONES DE REGISTROS ==========

/**
 * Lee registros del sistema (reemplaza readModbusRegisters)
 * @param {Object} params - Parámetros de lectura
 * @returns {Promise<Object>} - Datos leídos
 */
function readRegisters(params) {
    return apiRequest('/api/read', 'POST', params);
}

/**
 * Escribe registros en el sistema (reemplaza writeModbusRegisters)
 * @param {Object} params - Parámetros de escritura
 * @returns {Promise<Object>} - Resultado de la escritura
 */
function writeRegisters(params) {
    return apiRequest('/api/write', 'POST', params);
}

/**
 * Lee información del dispositivo (caché FC41)
 * @param {Object} params - Parámetros opcionales
 * @returns {Promise<Object>} - Información del dispositivo
 */
function readDeviceInfo(params) {
    Utils.logInfo("Leyendo información de dispositivo desde caché", "API");
    return apiRequest('/api/device_info', 'GET');
}

/**
 * Verifica datos de celdas individuales de una batería
 * @param {number} slaveId - ID de la batería (default: 217)
 * @returns {Promise<Object>} - Datos de verificación de celdas
 */
function verifyCellData(slaveId = 217) {
    return apiRequest('/api/verify_cells', 'POST', { slaveId: slaveId });
}

// ========== FUNCIONES PARA MONITOREO DE MÚLTIPLES BATERÍAS ==========

/**
 * Inicia el monitoreo de múltiples baterías
 * @param {Array} batteryIds - IDs de baterías a monitorear (vacío = todas)
 * @returns {Promise<Object>} - Resultado del inicio de monitoreo
 */
function startMultiBatteryMonitoring(batteryIds = []) {
    return apiRequest('/api/batteries/start_monitoring', 'POST', { battery_ids: batteryIds });
}

/**
 * Detiene el monitoreo de múltiples baterías
 * @returns {Promise<Object>} - Resultado de detener monitoreo
 */
function stopMultiBatteryMonitoring() {
    return apiRequest('/api/batteries/stop_monitoring', 'POST');
}

/**
 * Obtiene el estado de todas las baterías monitoreadas
 * @returns {Promise<Object>} - Estado de todas las baterías
 */
function getAllBatteriesStatus() {
    return apiRequest('/api/batteries/status', 'GET');
}

/**
 * Inicia la carga de información detallada de baterías
 * @param {Array} batteryIds - IDs de baterías (vacío = todas)
 * @returns {Promise<Object>} - Resultado del inicio de carga
 */
function loadBatteriesDetailedInfo(batteryIds = []) {
    return apiRequest('/api/batteries/load_detailed_info', 'POST', { battery_ids: batteryIds });
}

/**
 * Verifica el estado de la carga de información detallada
 * @returns {Promise<Object>} - Estado de la carga
 */
function getDetailedInfoLoadingStatus() {
    return apiRequest('/api/batteries/detailed_info_status', 'GET');
}

/**
 * Obtiene la información detallada de una batería específica
 * @param {number} batteryId - ID de la batería
 * @returns {Promise<Object>} - Información detallada de la batería
 */
function getBatteryDetailedInfo(batteryId) {
    return apiRequest(`/api/batteries/detailed_info/${batteryId}`, 'GET');
}

/**
 * Obtiene todos los registros mapeados de una batería
 * @param {number} batteryId - ID de la batería
 * @returns {Promise<Object>} - Datos de registros mapeados
 */
function getAllMappedRegisters(batteryId) {
    return apiRequest(`/api/batteries/mapped_registers/${batteryId}`, 'GET');
}

// ========== FUNCIONES DE COMPATIBILIDAD (DEPRECATED) ==========

/**
 * @deprecated Use conectarSistema() en su lugar
 */
function lowLevelConnect(params) {
    Utils.logWarn("lowLevelConnect() deprecated. Use conectarSistema()", "API");
    return conectarSistema(params);
}

/**
 * @deprecated Use desconectarSistema() en su lugar
 */
function lowLevelDisconnect() {
    Utils.logWarn("lowLevelDisconnect() deprecated. Use desconectarSistema()", "API");
    return desconectarSistema();
}

/**
 * @deprecated Use inicializarBaterias() en su lugar
 */
function lowLevelInitialize() {
    Utils.logWarn("lowLevelInitialize() deprecated. Use inicializarBaterias()", "API");
    return inicializarBaterias();
}

/**
 * @deprecated Use reintentarBateria() en su lugar
 */
function lowLevelRetryBattery(batteryId) {
    Utils.logWarn("lowLevelRetryBattery() deprecated. Use reintentarBateria()", "API");
    return reintentarBateria(batteryId);
}

/**
 * @deprecated Use verificarEstadoSistema() en su lugar
 */
function checkStatus() {
    Utils.logWarn("checkStatus() deprecated. Use verificarEstadoSistema()", "API");
    return verificarEstadoSistema();
}

/**
 * @deprecated Use readRegisters() en su lugar
 */
function readModbusRegisters(params) {
    Utils.logWarn("readModbusRegisters() deprecated. Use readRegisters()", "API");
    return readRegisters(params);
}

/**
 * @deprecated Use writeRegisters() en su lugar
 */
function writeModbusRegisters(params) {
    Utils.logWarn("writeModbusRegisters() deprecated. Use writeRegisters()", "API");
    return writeRegisters(params);
}

/**
 * @deprecated Use readDeviceInfo() en su lugar
 */
function readModbusDeviceInfo(params) {
    Utils.logWarn("readModbusDeviceInfo() deprecated. Use readDeviceInfo()", "API");
    return readDeviceInfo(params);
}

// ========== FUNCIONES ELIMINADAS (YA NO DISPONIBLES) ==========

/**
 * @removed Esta función ya no existe - era específica de PyModbus
 */
function connectModbus(params) {
    Utils.logError("connectModbus() eliminada. El sistema ahora usa conexión única. Use conectarSistema()", "API");
    throw new Error("connectModbus() ya no está disponible. Use conectarSistema()");
}

/**
 * @removed Esta función ya no existe - era específica de PyModbus
 */
function disconnectModbus() {
    Utils.logError("disconnectModbus() eliminada. El sistema ahora usa conexión única. Use desconectarSistema()", "API");
    throw new Error("disconnectModbus() ya no está disponible. Use desconectarSistema()");
}

// ========== EXPORTACIÓN DE FUNCIONES ==========

// Funciones principales (nuevas)
window.conectarSistema = conectarSistema;
window.desconectarSistema = desconectarSistema;
window.inicializarBaterias = inicializarBaterias;
window.reintentarBateria = reintentarBateria;
window.verificarEstadoSistema = verificarEstadoSistema;
window.readRegisters = readRegisters;
window.writeRegisters = writeRegisters;
window.readDeviceInfo = readDeviceInfo;

// Funciones de baterías
window.getAvailableBatteries = getAvailableBatteries;
window.verifyCellData = verifyCellData;
window.startMultiBatteryMonitoring = startMultiBatteryMonitoring;
window.stopMultiBatteryMonitoring = stopMultiBatteryMonitoring;
window.getAllBatteriesStatus = getAllBatteriesStatus;
window.loadBatteriesDetailedInfo = loadBatteriesDetailedInfo;
window.getDetailedInfoLoadingStatus = getDetailedInfoLoadingStatus;
window.getBatteryDetailedInfo = getBatteryDetailedInfo;
window.getAllMappedRegisters = getAllMappedRegisters;

// Funciones de compatibilidad (deprecated)
window.lowLevelConnect = lowLevelConnect;
window.lowLevelDisconnect = lowLevelDisconnect;
window.lowLevelInitialize = lowLevelInitialize;
window.lowLevelRetryBattery = lowLevelRetryBattery;
window.checkStatus = checkStatus;
window.readModbusRegisters = readModbusRegisters;
window.writeModbusRegisters = writeModbusRegisters;
window.readModbusDeviceInfo = readModbusDeviceInfo;

// Funciones eliminadas (lanzan error)
window.connectModbus = connectModbus;
window.disconnectModbus = disconnectModbus;