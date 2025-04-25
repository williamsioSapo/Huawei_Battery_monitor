// static/js/main.js

// Referencias a elementos del DOM
const connectionStatusEl = document.getElementById('connectionStatus');
const connectionStatusText = connectionStatusEl.querySelector('.text');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const connectionMessageEl = document.getElementById('connectionMessage');

const readSection = document.getElementById('read-section');
const writeSection = document.getElementById('write-section');
const deviceInfoSection = document.getElementById('device-info-section');

const readSlaveIdInput = document.getElementById('readSlaveId');
const readFunctionSelect = document.getElementById('readFunction');
const readAddressInput = document.getElementById('readAddress');
const readCountInput = document.getElementById('readCount');
const readBtn = document.getElementById('readBtn');
const readResultEl = document.getElementById('readResult');
const dataTableBody = document.getElementById('dataTableBody');

const writeSlaveIdInput = document.getElementById('writeSlaveId');
const writeFunctionSelect = document.getElementById('writeFunction');
const writeAddressInput = document.getElementById('writeAddress');
const writeValuesInput = document.getElementById('writeValues');
const writeBtn = document.getElementById('writeBtn');
const writeMessageEl = document.getElementById('writeMessage');

const readInfoBtn = document.getElementById('readInfoBtn');
const deviceInfoResultEl = document.getElementById('deviceInfoResult').querySelector('code');
const deviceInfoMessageEl = document.getElementById('deviceInfoMessage');

// --- Estado de la Aplicación ---
let isConnected = false;
let readInterval = null; // Para la lectura periódica

// --- Mapa de registros para la batería Huawei ESM-48150B1 ---
const HUAWEI_BATTERY_REGISTERS = {
    0: { name: "Battery Voltage", unit: "V", factor: 0.01, signed: false },
    1: { name: "Pack Voltage", unit: "V", factor: 0.01, signed: false },
    2: { name: "Battery Current", unit: "A", factor: 0.01, signed: true },
    3: { name: "Battery SOC", unit: "%", factor: 1, signed: false },
    4: { name: "Battery SOH", unit: "%", factor: 1, signed: false },
    5: { name: "Reg Unknown 5", unit: "", factor: 1, signed: false },
    6: { name: "Reg Unknown 6", unit: "", factor: 1, signed: false }
};

// --- Funciones para interpretar datos de la batería ---
function interpretRegisterValue(address, value) {
    // Si el registro no está en nuestro mapa, devolver el valor tal cual
    if (!HUAWEI_BATTERY_REGISTERS[address]) {
        return { 
            name: `Registro ${address}`,
            rawValue: value,
            unit: '',
            interpretedValue: value.toString()
        };
    }

    const register = HUAWEI_BATTERY_REGISTERS[address];
    
    // Convertir valor a formato signed si es necesario
    let processedValue = value;
    if (register.signed && value > 32767) {
        // Convertir valor de 16 bits con signo (complemento a 2)
        processedValue = value - 65536;
    }
    
    // Aplicar factor de escala
    const scaledValue = processedValue * register.factor;
    
    return {
        name: register.name,
        rawValue: value,
        unit: register.unit,
        interpretedValue: scaledValue.toFixed(2).replace(/\.?0+$/, '') // Elimina ceros al final
    };
}

// --- Funciones de Actualización de UI ---
function showMessage(element, message, type = 'info') {
    element.textContent = message;
    element.className = `message-area ${type}`; // Aplica clase para estilo
    // Opcional: Ocultar mensaje después de unos segundos
    // setTimeout(() => { element.textContent = ''; element.className = 'message-area'; }, 5000);
}

function updateConnectionStatusUI(connected) {
    isConnected = connected;
    if (connected) {
        connectionStatusEl.className = 'status-indicator connected';
        connectionStatusText.textContent = 'Conectado';
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        readSection.style.display = 'block'; // Mostrar secciones
        writeSection.style.display = 'block';
        deviceInfoSection.style.display = 'block';
        
        // Dispatch event para notificar al dashboard
        document.dispatchEvent(new CustomEvent('connection-status-change', { 
            detail: { connected: true } 
        }));
    } else {
        connectionStatusEl.className = 'status-indicator disconnected';
        connectionStatusText.textContent = 'Desconectado';
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        readSection.style.display = 'none'; // Ocultar secciones
        writeSection.style.display = 'none';
        deviceInfoSection.style.display = 'none';
        
        if (readInterval) {
            clearInterval(readInterval); // Detener lectura periódica
            readInterval = null;
        }
        
        // Dispatch event para notificar al dashboard
        document.dispatchEvent(new CustomEvent('connection-status-change', { 
            detail: { connected: false } 
        }));
        
        // Limpiar resultados al desconectar
        readResultEl.textContent = '';
        dataTableBody.innerHTML = '';
        writeMessageEl.textContent = '';
        writeMessageEl.className = 'message-area';
        deviceInfoResultEl.textContent = '';
        deviceInfoMessageEl.textContent = '';
        deviceInfoMessageEl.className = 'message-area';
    }
}

function displayReadData(data, baseAddress) {
    // Mostrar JSON crudo
    readResultEl.textContent = JSON.stringify(data, null, 2);

    // Poblar la tabla
    dataTableBody.innerHTML = ''; // Limpiar tabla anterior
    
    // Crear encabezados de la tabla si no existen
    const headerRow = document.querySelector('#dataTable thead tr');
    // Si no hay una columna para el valor interpretado, añadirla
    if (headerRow && headerRow.cells.length < 4) {
        const interpretedHeader = document.createElement('th');
        interpretedHeader.textContent = 'Valor Interpretado';
        headerRow.appendChild(interpretedHeader);
    }
    
    // Añadir filas con datos
    data.forEach((value, index) => {
        const address = baseAddress + index;
        const row = dataTableBody.insertRow();

        const addressCell = row.insertCell();
        
        // Interpretar el valor según el registro
        const interpretation = interpretRegisterValue(address, value);
        
        // Añadir nombre del registro si está disponible
        addressCell.textContent = `${address} - ${interpretation.name}`;

        const decimalCell = row.insertCell();
        decimalCell.textContent = value.toString(); // Mostrar valor decimal

        const hexCell = row.insertCell();
        // Manejar valores booleanos para Coils/Discrete Inputs si es necesario
        if (typeof value === 'boolean') {
            hexCell.textContent = value ? 'TRUE' : 'FALSE';
        } else {
            hexCell.textContent = '0x' + value.toString(16).toUpperCase().padStart(4, '0');
        }
        
        // Añadir celda para el valor interpretado
        const interpretedCell = row.insertCell();
        if (interpretation.unit) {
            interpretedCell.textContent = `${interpretation.interpretedValue} ${interpretation.unit}`;
        } else {
            interpretedCell.textContent = interpretation.interpretedValue;
        }
    });
}

function displayDeviceInfo(fragments) {
    // Parsea los fragmentos para extraer información clave
    let deviceData = extractDeviceData(fragments);
    
    // Muestra información estructurada
    let formattedOutput = "--- Información del Dispositivo ---\n\n";
    
    // Información del fabricante y modelo
    formattedOutput += `Fabricante: ${deviceData.manufacturer || 'Desconocido'}\n`;
    formattedOutput += `Modelo: ${deviceData.model || 'Desconocido'}\n`;
    formattedOutput += `S/N: ${deviceData.barcode || 'Desconocido'}\n`;
    formattedOutput += `Fecha Fabricación: ${deviceData.manufactureDate || 'Desconocida'}\n`;
    
    // Tipo de batería y especificaciones
    if (deviceData.description) {
        formattedOutput += `Descripción: ${deviceData.description}\n`;
    }
    
    // Versiones
    formattedOutput += `Versión Info: ${deviceData.infoVersion || 'Desconocida'}\n`;
    formattedOutput += `Versión E-Label: ${deviceData.elabelVersion || 'Desconocida'}\n`;
    
    // Datos crudos (opcional - comentar si no se quiere mostrar)
    formattedOutput += "\n--- Datos Crudos ---\n\n";
    for (let i = 0; i <= 5; i++) {
        const fragmentKey = `fragment_${i}`;
        if (fragments[fragmentKey]) {
            formattedOutput += `[Fragmento ${i}]:\n${fragments[fragmentKey]}\n\n`;
        }
    }
    
    deviceInfoResultEl.textContent = formattedOutput;
}

function extractDeviceData(fragments) {
    let data = {
        manufacturer: '',
        model: '',
        barcode: '',
        manufactureDate: '',
        description: '',
        infoVersion: '',
        elabelVersion: '',
    };
    
    // Buscar información específica en los fragmentos
    for (const key in fragments) {
        const content = fragments[key];
        
        // Buscar información clave usando expresiones regulares
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
    const params = {
        port: document.getElementById('port').value,
        baudrate: parseInt(document.getElementById('baudrate').value),
        parity: document.getElementById('parity').value,
        stopbits: parseInt(document.getElementById('stopbits').value),
        bytesize: parseInt(document.getElementById('bytesize').value),
        timeout: parseInt(document.getElementById('timeout').value)
    };
    showMessage(connectionMessageEl, 'Conectando...', 'info');
    try {
        const result = await connectModbus(params);
        showMessage(connectionMessageEl, result.message, 'success');
        updateConnectionStatusUI(true);
        // Iniciar lectura periódica (opcional) - Leer datos en tiempo real cada 5 segundos
        // startPeriodicRead();
    } catch (error) {
        showMessage(connectionMessageEl, `Error: ${error.message}`, 'error');
        updateConnectionStatusUI(false);
    }
}

async function handleDisconnect() {
     showMessage(connectionMessageEl, 'Desconectando...', 'info');
    try {
        const result = await disconnectModbus();
        showMessage(connectionMessageEl, result.message, 'success');
    } catch (error) {
         showMessage(connectionMessageEl, `Error: ${error.message}`, 'error');
    } finally {
        updateConnectionStatusUI(false); // Asegura que la UI se actualice incluso si falla
    }
}

async function handleRead() {
    const params = {
        slaveId: parseInt(readSlaveIdInput.value),
        function: readFunctionSelect.value,
        address: parseInt(readAddressInput.value),
        count: parseInt(readCountInput.value)
    };
    readResultEl.textContent = 'Leyendo...'; // Indicador visual
    dataTableBody.innerHTML = '';
    try {
        const result = await readModbusRegisters(params);
        if (result.status === 'success') {
            displayReadData(result.data, params.address);
        } else {
            // El error ya debería estar en result.message según apiRequest
             readResultEl.textContent = `Error: ${result.message}`;
        }
    } catch (error) {
        readResultEl.textContent = `Error: ${error.message}`;
    }
}

async function handleWrite() {
    const valuesText = writeValuesInput.value;
    let values;
    const writeFunction = writeFunctionSelect.value;

    try {
        // Parsear valores basados en la función
        if (writeFunction === 'coil') {
            values = valuesText.split(',').map(v => {
                const trimmed = v.trim().toLowerCase();
                if (trimmed === 'true' || trimmed === '1') return true;
                if (trimmed === 'false' || trimmed === '0') return false;
                throw new Error(`Valor inválido para coil: '${v.trim()}'`);
            });
        } else { // Asumir 'holding'
            values = valuesText.split(',').map(v => {
                const parsed = parseInt(v.trim());
                if (isNaN(parsed)) {
                    throw new Error(`Valor numérico inválido: '${v.trim()}'`);
                }
                return parsed;
            });
        }
    } catch (parseError) {
        showMessage(writeMessageEl, `Error en valores: ${parseError.message}`, 'error');
        return; // Detener si los valores son incorrectos
    }


    const params = {
        slaveId: parseInt(writeSlaveIdInput.value),
        function: writeFunction,
        address: parseInt(writeAddressInput.value),
        values: values
    };

    showMessage(writeMessageEl, 'Escribiendo...', 'info');
    try {
        const result = await writeModbusRegisters(params);
         showMessage(writeMessageEl, result.message, result.status); // Usa el status de la API
    } catch (error) {
        showMessage(writeMessageEl, `Error: ${error.message}`, 'error');
    }
}

async function handleReadDeviceInfo() {
     const slaveId = parseInt(readSlaveIdInput.value); // Usar el mismo ID que para lectura
     const indicesToRead = [0, 1, 2, 3, 4, 5];
     let accumulatedInfo = {};
     let errors = [];

     showMessage(deviceInfoMessageEl, 'Leyendo información del dispositivo (FC41)...', 'info');
     deviceInfoResultEl.textContent = ''; // Limpiar resultado anterior

     for (const index of indicesToRead) {
        try {
            const result = await readModbusDeviceInfo({ slaveId, index });
            if (result.status === 'success') {
                accumulatedInfo[`fragment_${index}`] = result.ascii_data;
            } else {
                 errors.push(`Índice ${index}: ${result.message}`);
                 accumulatedInfo[`fragment_${index}`] = `Error: ${result.message}`;
            }
        } catch (error) {
             errors.push(`Índice ${index}: ${error.message}`);
             accumulatedInfo[`fragment_${index}`] = `Error de red: ${error.message}`;
        }
        // Pequeña pausa para no saturar (opcional)
        // await new Promise(resolve => setTimeout(resolve, 50));
     }

     displayDeviceInfo(accumulatedInfo); // Muestra lo que se haya podido leer

     if (errors.length > 0) {
        showMessage(deviceInfoMessageEl, `Se completó la lectura con errores: ${errors.join('; ')}`, 'error');
     } else {
         showMessage(deviceInfoMessageEl, 'Información del dispositivo leída correctamente.', 'success');
     }
}

// --- Lectura Periódica (Opcional) ---
function startPeriodicRead() {
    if (readInterval) { // Si ya existe, limpiarlo
        clearInterval(readInterval);
    }
    if (isConnected) {
        // Ejecutar inmediatamente la primera vez
        handleRead();
        // Luego ejecutar cada 5 segundos (5000 ms)
        readInterval = setInterval(handleRead, 5000);
    }
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    // Añadir listeners a los botones
    connectBtn.addEventListener('click', handleConnect);
    disconnectBtn.addEventListener('click', handleDisconnect);
    readBtn.addEventListener('click', handleRead);
    writeBtn.addEventListener('click', handleWrite);
    readInfoBtn.addEventListener('click', handleReadDeviceInfo);

    // Inicializar el dashboard
    if (typeof initDashboard === 'function') {
        initDashboard();
    }

    // Comprobar estado inicial (por si la página se recarga y el backend sigue conectado)
    // Opcional: podrías llamar a checkStatus() aquí
    updateConnectionStatusUI(false); // Empezar como desconectado
});