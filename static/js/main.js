// static/js/main.js

// --- Referencias a elementos del DOM (Solo necesarios para conexión y secciones generales) ---
const connectionStatusEl = document.getElementById('connectionStatus');
const connectionStatusText = connectionStatusEl.querySelector('.text');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const connectionMessageEl = document.getElementById('connectionMessage');

// Secciones generales (para mostrar/ocultar)
const connectionSection = document.getElementById('connection-section'); // Referencia a la sección conexión
const batteryDashboardSection = document.getElementById('battery-dashboard'); // Referencia a la sección dashboard
const readSection = document.getElementById('read-section');
const writeSection = document.getElementById('write-section');
const deviceInfoSection = document.getElementById('device-info-section');

// --- Elementos para la sección de LECTURA (si se mantiene) ---
const readSlaveIdInput = document.getElementById('readSlaveId');
const readFunctionSelect = document.getElementById('readFunction');
const readAddressInput = document.getElementById('readAddress');
const readCountInput = document.getElementById('readCount');
const readBtn = document.getElementById('readBtn');
const readResultEl = document.getElementById('readResult'); // Para mostrar JSON crudo
const dataTableBody = document.getElementById('dataTableBody'); // Para la tabla

// --- Elementos para la sección de ESCRITURA ---
const writeSlaveIdInput = document.getElementById('writeSlaveId');
const writeFunctionSelect = document.getElementById('writeFunction');
const writeAddressInput = document.getElementById('writeAddress');
const writeValuesInput = document.getElementById('writeValues');
const writeBtn = document.getElementById('writeBtn');
const writeMessageEl = document.getElementById('writeMessage');

// --- Elementos para la sección INFO DISPOSITIVO (si se mantiene) ---
const readInfoBtn = document.getElementById('readInfoBtn');
const deviceInfoResultEl = document.getElementById('deviceInfoResult').querySelector('code'); // El pre > code
const deviceInfoMessageEl = document.getElementById('deviceInfoMessage');

// --- Estado de la Aplicación ---
let isConnected = false; // Sigue siendo útil para lógica interna si es necesario

// --- Mapa de registros (solo si se mantiene displayReadData) ---
const HUAWEI_BATTERY_REGISTERS = {
    0: { name: "Battery Voltage", unit: "V", factor: 0.01, signed: false },
    1: { name: "Pack Voltage", unit: "V", factor: 0.01, signed: false },
    2: { name: "Battery Current", unit: "A", factor: 0.01, signed: true },
    3: { name: "Battery SOC", unit: "%", factor: 1, signed: false },
    4: { name: "Battery SOH", unit: "%", factor: 1, signed: false },
    5: { name: "Reg Unknown 5", unit: "", factor: 1, signed: false },
    6: { name: "Reg Unknown 6", unit: "", factor: 1, signed: false }
};

// --- Funciones de ayuda (solo si se mantiene displayReadData) ---
function interpretRegisterValue(address, value) {
    if (!HUAWEI_BATTERY_REGISTERS[address]) {
        return { name: `Registro ${address}`, rawValue: value, unit: '', interpretedValue: value.toString() };
    }
    const register = HUAWEI_BATTERY_REGISTERS[address];
    let processedValue = value;
    if (register.signed && value > 32767) {
        processedValue = value - 65536;
    }
    const scaledValue = processedValue * register.factor;
    return { name: register.name, rawValue: value, unit: register.unit, interpretedValue: scaledValue.toFixed(2).replace(/\.?0+$/, '') };
}

// --- Funciones de Actualización de UI ---
function showMessage(element, message, type = 'info') {
    if (!element) return; // Verificar si el elemento existe
    element.textContent = message;
    element.className = `message-area ${type}`;
}

// Función PRINCIPAL para actualizar estado visual y DISPARAR EVENTO
function updateConnectionStatusUI(connected) {
    isConnected = connected; // Actualizar estado global

    // --- Lógica de habilitar/deshabilitar botones y mostrar/ocultar secciones ---
    if (connected) {
        connectionStatusEl.className = 'status-indicator connected';
        connectionStatusText.textContent = 'Conectado';
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        // Mostrar secciones relevantes (asegúrate que las referencias existan)
        if(batteryDashboardSection) batteryDashboardSection.style.display = 'block';
        if(readSection) readSection.style.display = 'block';
        if(writeSection) writeSection.style.display = 'block';
        if(deviceInfoSection) deviceInfoSection.style.display = 'block';
    } else {
        connectionStatusEl.className = 'status-indicator disconnected';
        connectionStatusText.textContent = 'Desconectado';
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
         // Ocultar secciones relevantes
        if(batteryDashboardSection) batteryDashboardSection.style.display = 'none';
        if(readSection) readSection.style.display = 'none';
        if(writeSection) writeSection.style.display = 'none';
        if(deviceInfoSection) deviceInfoSection.style.display = 'none';

        // Limpiar resultados de lectura/escritura/info al desconectar (si se mantienen las secciones)
        if(readResultEl) readResultEl.textContent = '';
        if(dataTableBody) dataTableBody.innerHTML = '';
        if(writeMessageEl) { writeMessageEl.textContent = ''; writeMessageEl.className = 'message-area'; }
        if(deviceInfoResultEl) deviceInfoResultEl.textContent = '';
        if(deviceInfoMessageEl) { deviceInfoMessageEl.textContent = ''; deviceInfoMessageEl.className = 'message-area'; }
    }

     // --- DISPARAR EL EVENTO ---
     // Usar console.log aquí es útil para depurar si el evento se dispara
     console.log(`Main.js: Despachando evento connection-status-change (connected: ${connected})`);
     document.dispatchEvent(new CustomEvent('connection-status-change', {
         detail: { connected: connected }
     }));
     // --------------------------
}

// --- Funciones para poblar UI (solo si se mantienen las secciones) ---
function displayReadData(data, baseAddress) {
    if (!readResultEl || !dataTableBody) return; // Salir si los elementos no existen

    readResultEl.textContent = JSON.stringify(data, null, 2);
    dataTableBody.innerHTML = '';
    const headerRow = document.querySelector('#dataTable thead tr');
    if (headerRow && headerRow.cells.length < 4) {
        const interpretedHeader = document.createElement('th');
        interpretedHeader.textContent = 'Valor Interpretado';
        headerRow.appendChild(interpretedHeader);
    }

    data.forEach((value, index) => {
        const address = baseAddress + index;
        const row = dataTableBody.insertRow();
        const interpretation = interpretRegisterValue(address, value); // Necesita interpretRegisterValue

        row.insertCell().textContent = `${address} - ${interpretation.name}`;
        row.insertCell().textContent = value.toString();
        const hexCell = row.insertCell();
        hexCell.textContent = (typeof value === 'boolean') ? (value ? 'TRUE' : 'FALSE') : '0x' + value.toString(16).toUpperCase().padStart(4, '0');
        const interpretedCell = row.insertCell();
        interpretedCell.textContent = interpretation.unit ? `${interpretation.interpretedValue} ${interpretation.unit}` : interpretation.interpretedValue;
    });
}

function displayDeviceInfo(fragments) {
     if (!deviceInfoResultEl) return; // Salir si el elemento no existe

    let deviceData = extractDeviceData(fragments); // Necesita extractDeviceData
    let formattedOutput = "--- Información del Dispositivo ---\n\n";
    formattedOutput += `Fabricante: ${deviceData.manufacturer || 'Desconocido'}\n`;
    formattedOutput += `Modelo: ${deviceData.model || 'Desconocido'}\n`;
    formattedOutput += `S/N: ${deviceData.barcode || 'Desconocido'}\n`;
    formattedOutput += `Fecha Fabricación: ${deviceData.manufactureDate || 'Desconocida'}\n`;
    if (deviceData.description) formattedOutput += `Descripción: ${deviceData.description}\n`;
    formattedOutput += `Versión Info: ${deviceData.infoVersion || 'Desconocida'}\n`;
    formattedOutput += `Versión E-Label: ${deviceData.elabelVersion || 'Desconocida'}\n`;
    formattedOutput += "\n--- Datos Crudos ---\n\n";
    for (let i = 0; i <= 5; i++) {
        const fragmentKey = `fragment_${i}`;
        if (fragments[fragmentKey]) {
            formattedOutput += `[Fragmento ${i}]:\n${fragments[fragmentKey]}\n\n`;
        }
    }
    deviceInfoResultEl.textContent = formattedOutput;
}

function extractDeviceData(fragments) { // Necesario para displayDeviceInfo
    let data = { manufacturer: '', model: '', barcode: '', manufactureDate: '', description: '', infoVersion: '', elabelVersion: '' };
    for (const key in fragments) {
        const content = fragments[key];
        const manufacturerMatch = content.match(/[vV]endorName=([^\r\n]+)/);
        if (manufacturerMatch) data.manufacturer = manufacturerMatch[1].trim();
        const modelMatch = content.match(/Model=([^\r\n]+)/) || content.match(/BoardType=([^\r\n]+)/);
        if (modelMatch) data.model = modelMatch[1].trim();
        const barcodeMatch = content.match(/BarCode=([^\r\n]+)/);
        if (barcodeMatch) data.barcode = barcodeMatch[1].trim();
        const dateMatch = content.match(/Manufactured=([^\r\n]+)/);
        if (dateMatch) data.manufactureDate = dateMatch[1].trim();
        const descriptionMatch = content.match(/Description=([^\r\n]+)/);
        if (descriptionMatch) data.description = descriptionMatch[1].trim();
        const infoVersionMatch = content.match(/ArchivesInfoVersion=([^\r\n]+)/);
        if (infoVersionMatch) data.infoVersion = infoVersionMatch[1].trim();
        const elabelVersionMatch = content.match(/ElabelVersion=([^\r\n]+)/);
        if (elabelVersionMatch) data.elabelVersion = elabelVersionMatch[1].trim();
    }
    return data;
}

// --- Manejadores de Eventos ---

async function handleConnect() {
    if (!connectBtn || !disconnectBtn) return; // Verificar existencia de botones

    // Deshabilitar botón mientras conecta
    connectBtn.disabled = true;
    disconnectBtn.disabled = true; // Deshabilitar ambos

    const params = {
        port: document.getElementById('port')?.value || 'COM8', // Añadir ? y default
        baudrate: parseInt(document.getElementById('baudrate')?.value || '9600'),
        parity: document.getElementById('parity')?.value || 'N',
        stopbits: parseInt(document.getElementById('stopbits')?.value || '1'),
        bytesize: parseInt(document.getElementById('bytesize')?.value || '8'),
        timeout: parseInt(document.getElementById('timeout')?.value || '1')
    };
    showMessage(connectionMessageEl, 'Conectando...', 'info');
    let connectSuccess = false;
    try {
        // Usar la función de modbusApi.js
        const result = await connectModbus(params); // Asume que modbusApi.js está cargado
        showMessage(connectionMessageEl, result.message, result.status || 'info'); // Usa status si existe
        // Considera éxito si status es 'success' o 'warning' (conectado pero auth falló parcialmente)
        if (result.status === 'success' || result.status === 'warning') {
            connectSuccess = true;
        }
    } catch (error) {
        showMessage(connectionMessageEl, `Error: ${error.message}`, 'error');
        connectSuccess = false;
    } finally {
        // Actualizar UI y disparar evento basado en el éxito final
        updateConnectionStatusUI(connectSuccess);
        // No es necesario disparar el evento aquí, updateConnectionStatusUI ya lo hace
    }
}

async function handleDisconnect() {
     if (!connectBtn || !disconnectBtn) return;

     // Deshabilitar botones mientras desconecta
    connectBtn.disabled = true;
    disconnectBtn.disabled = true;

     showMessage(connectionMessageEl, 'Desconectando...', 'info');
    try {
        // Usar la función de modbusApi.js
        const result = await disconnectModbus();
        showMessage(connectionMessageEl, result.message, 'success');
    } catch (error) {
         showMessage(connectionMessageEl, `Error: ${error.message}`, 'error');
    } finally {
        // Actualizar UI y disparar evento
        updateConnectionStatusUI(false);
         // No es necesario disparar el evento aquí, updateConnectionStatusUI ya lo hace
    }
}

async function handleRead() { // Si se mantiene la sección de lectura
    if (!readSlaveIdInput || !readFunctionSelect || !readAddressInput || !readCountInput || !readResultEl || !dataTableBody) return;

    const params = {
        slaveId: parseInt(readSlaveIdInput.value),
        function: readFunctionSelect.value,
        address: parseInt(readAddressInput.value),
        count: parseInt(readCountInput.value)
    };
    readResultEl.textContent = 'Leyendo...';
    dataTableBody.innerHTML = '';
    try {
        const result = await readModbusRegisters(params); // Asume modbusApi.js
        if (result.status === 'success' && Array.isArray(result.data)) {
            displayReadData(result.data, params.address); // Necesita displayReadData
        } else {
             readResultEl.textContent = `Error: ${result.message || 'Respuesta inválida'}`;
        }
    } catch (error) {
        readResultEl.textContent = `Error: ${error.message}`;
    }
}

async function handleWrite() {
     if (!writeSlaveIdInput || !writeFunctionSelect || !writeAddressInput || !writeValuesInput || !writeMessageEl) return;

    const valuesText = writeValuesInput.value;
    let values;
    const writeFunction = writeFunctionSelect.value;

    try {
        if (writeFunction === 'coil') {
            values = valuesText.split(',').map(v => {
                const trimmed = v.trim().toLowerCase();
                if (trimmed === 'true' || trimmed === '1') return true;
                if (trimmed === 'false' || trimmed === '0') return false;
                throw new Error(`Valor inválido para coil: '${v.trim()}'`);
            });
        } else {
            values = valuesText.split(',').map(v => {
                const parsed = parseInt(v.trim());
                if (isNaN(parsed)) throw new Error(`Valor numérico inválido: '${v.trim()}'`);
                return parsed;
            });
        }
         if (values.length === 0) throw new Error("No se proporcionaron valores.");

    } catch (parseError) {
        showMessage(writeMessageEl, `Error en valores: ${parseError.message}`, 'error');
        return;
    }

    const params = {
        slaveId: parseInt(writeSlaveIdInput.value),
        function: writeFunction,
        address: parseInt(writeAddressInput.value),
        values: values
    };

    showMessage(writeMessageEl, 'Escribiendo...', 'info');
    try {
        const result = await writeModbusRegisters(params); // Asume modbusApi.js
        showMessage(writeMessageEl, result.message, result.status || 'info');
    } catch (error) {
        showMessage(writeMessageEl, `Error: ${error.message}`, 'error');
    }
}

async function handleReadDeviceInfo() { // Si se mantiene la sección de info
    if (!readSlaveIdInput || !deviceInfoMessageEl || !deviceInfoResultEl) return;

    const slaveId = parseInt(readSlaveIdInput.value); // Usa el ID de la sección de lectura
    const indicesToRead = [0, 1, 2, 3, 4, 5];
    let accumulatedInfo = {};
    let errors = [];

    showMessage(deviceInfoMessageEl, 'Leyendo información del dispositivo (FC41)...', 'info');
    deviceInfoResultEl.textContent = 'Cargando...';

    // Leer desde caché del backend (asumiendo que /api/device_info funciona)
    try {
         const response = await fetch('/api/device_info'); // O usar helper API
         if (!response.ok) {
             throw new Error(`Error HTTP ${response.status} al obtener info del dispositivo`);
         }
         const result = await response.json();

         if (result.status === 'success' && result.fragments) {
             accumulatedInfo = result.fragments; // Usar los fragmentos de la caché
             showMessage(deviceInfoMessageEl, 'Información del dispositivo leída desde caché.', 'success');
         } else {
             throw new Error(result.message || 'No se pudo obtener información de caché');
         }

    } catch(error) {
        errors.push(error.message);
        showMessage(deviceInfoMessageEl, `Error al obtener info: ${error.message}`, 'error');
    }

    // Mostrar lo que se haya podido obtener (desde caché o error)
    displayDeviceInfo(accumulatedInfo); // Necesita displayDeviceInfo y extractDeviceData

    // Mostrar errores acumulados si los hubo
    if (errors.length > 0) {
        showMessage(deviceInfoMessageEl, `Se completó la operación con errores: ${errors.join('; ')}`, 'warning'); // Warning, no error si algo se mostró
    }
}

// --- ELIMINADA LA FUNCIÓN startPeriodicRead ---

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Main.js: DOMContentLoaded");

    // Añadir listeners a los botones principales
    if (connectBtn) connectBtn.addEventListener('click', handleConnect);
    if (disconnectBtn) disconnectBtn.addEventListener('click', handleDisconnect);

    // Añadir listeners para secciones opcionales (si existen)
    if (readBtn) readBtn.addEventListener('click', handleRead);
    if (writeBtn) writeBtn.addEventListener('click', handleWrite);
    if (readInfoBtn) readInfoBtn.addEventListener('click', handleReadDeviceInfo);

    // Inicializar el dashboard (si la función existe en dashboard.js)
    if (typeof initDashboard === 'function') {
        console.log("Main.js: Llamando a initDashboard...");
        initDashboard();
    } else {
        console.warn("Main.js: initDashboard no está definida (asegúrate que dashboard.js se carga correctamente).");
    }

    // Establecer estado inicial como desconectado (importante que se haga antes de cualquier posible evento inicial)
    updateConnectionStatusUI(false);
    console.log("Main.js: Estado inicial establecido a desconectado.");

    // Opcional: Comprobar estado inicial del backend (si es necesario)
    // checkBackendStatus(); // Necesitarías implementar esta función y un endpoint /api/status
});