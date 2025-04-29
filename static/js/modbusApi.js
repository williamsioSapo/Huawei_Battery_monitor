// static/js/modbusApi.js

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
            // Intenta obtener un mensaje de error del cuerpo si es posible
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                // Si el cuerpo no es JSON o está vacío
                errorData = { message: `Error HTTP ${response.status}: ${response.statusText}` };
            }
            // Lanza un error con el mensaje del backend o un mensaje genérico
            throw new Error(errorData?.message || `Error HTTP ${response.status}`);
        }
        // Si la respuesta es OK pero no tiene cuerpo (ej. 204 No Content)
        if (response.status === 204) {
            return { status: 'success', message: 'Operación exitosa (sin contenido)'}; // O devuelve null o lo que tenga sentido
        }
        return await response.json(); // Devuelve el cuerpo JSON
    } catch (error) {
        console.error(`API request failed for ${method} ${endpoint}:`, error);
        // Re-lanza el error para que sea manejado por quien llama a la función
        throw error;
    }
}

// Funciones específicas para cada endpoint
function getAvailableBatteries() {
    return apiRequest('/api/batteries', 'GET');
}

// Modificar función de conexión
function connectModbus(params) {
    // Si no se especifica slaveId, usar el predeterminado (se resolverá en el backend)
    return apiRequest('/api/connect', 'POST', params);
}

function disconnectModbus() {
    return apiRequest('/api/disconnect', 'POST');
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

function readModbusDeviceInfo(params) {
    return apiRequest('/api/read_device_info', 'POST', params);
}

// Nueva función para verificar datos de celdas individuales
function verifyCellData(slaveId = 217) {
    return apiRequest('/api/verify_cells', 'POST', { slaveId: slaveId });
}