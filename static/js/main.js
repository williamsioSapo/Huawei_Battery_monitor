// static/js/main.js (refactorizado)

/**
 * Archivo principal - Versión refactorizada
 * Coordina los módulos y maneja la inicialización de la aplicación
 */

// Esperamos a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    console.log("Main.js: DOMContentLoaded - Inicializando aplicación");
    
    // Recopilar referencias a elementos DOM principales para conexión
    const connectionElements = {
        connectBtn: document.getElementById('connectBtn'),
        disconnectBtn: document.getElementById('disconnectBtn'),
        messageEl: document.getElementById('connectionMessage'),
        slaveIdSelect: document.getElementById('slaveId'),
        portInput: document.getElementById('port'),
        baudrateSelect: document.getElementById('baudrate'),
        paritySelect: document.getElementById('parity'),
        stopbitsSelect: document.getElementById('stopbits'),
        bytesizeSelect: document.getElementById('bytesize'),
        timeoutInput: document.getElementById('timeout')
    };
    
    // Recopilar referencias a secciones principales
    const uiSections = {
        connectionStatusEl: document.getElementById('connectionStatus'),
        connectionStatusText: document.querySelector('#connectionStatus .text'),
        connectionSection: document.getElementById('connection-section'),
        batteryDashboardSection: document.getElementById('battery-dashboard'),
        multiBatterySection: document.getElementById('multi-battery-section'),
        readSection: document.getElementById('read-section'),
        writeSection: document.getElementById('write-section'),
        deviceInfoSection: document.getElementById('device-info-section')
    };
    
    // Inicializar módulos principales
    initConnectionHandler(connectionElements);
    initUiManager(uiSections);
    
    // Inicializar componentes adicionales
    initReadSection();
    initWriteSection();
    initDeviceInfoSection();
    
    // Inicializar los componentes de dashboard (si existen sus funciones)
    initDashboards();
    
    console.log("Main.js: Inicialización completada");
});

/**
 * Inicializa el gestor de conexiones
 * @param {Object} elements - Referencias a elementos DOM para conexión
 */
function initConnectionHandler(elements) {
    if (typeof window.ConnectionHandler === 'undefined') {
        console.error("Main.js: Error crítico - ConnectionHandler no encontrado");
        return;
    }
    
    console.log("Main.js: Inicializando ConnectionHandler");
    window.ConnectionHandler.init(elements);
}

/**
 * Inicializa el gestor de interfaz de usuario
 * @param {Object} sections - Referencias a secciones principales
 */
function initUiManager(sections) {
    if (typeof window.UiManager === 'undefined') {
        console.error("Main.js: Error crítico - UiManager no encontrado");
        return;
    }
    
    console.log("Main.js: Inicializando UiManager");
    window.UiManager.init(sections);
}

/**
 * Inicializa la sección de lectura de registros
 */
function initReadSection() {
    const readSlaveIdInput = document.getElementById('readSlaveId');
    const readFunctionSelect = document.getElementById('readFunction');
    const readAddressInput = document.getElementById('readAddress');
    const readCountInput = document.getElementById('readCount');
    const readBtn = document.getElementById('readBtn');
    const readResultEl = document.getElementById('readResult');
    const dataTableBody = document.getElementById('dataTableBody');
    
    // Salir si no se encuentran elementos críticos
    if (!readBtn || !readResultEl) return;
    
    readBtn.addEventListener('click', async () => {
        const params = {
            slaveId: parseInt(readSlaveIdInput?.value || '217'),
            function: readFunctionSelect?.value || 'holding',
            address: parseInt(readAddressInput?.value || '0'),
            count: parseInt(readCountInput?.value || '1')
        };
        
        readResultEl.textContent = 'Leyendo...';
        if (dataTableBody) dataTableBody.innerHTML = '';
        
        try {
            const result = await readModbusRegisters(params);
            if (result.status === 'success' && Array.isArray(result.data)) {
                displayReadData(result.data, params.address);
            } else {
                readResultEl.textContent = `Error: ${result.message || 'Respuesta inválida'}`;
            }
        } catch (error) {
            readResultEl.textContent = `Error: ${error.message}`;
        }
    });
    
    // Esta función procesará y mostrará los datos leídos
    function displayReadData(data, baseAddress) {
        if (!readResultEl || !dataTableBody) return;
        
        readResultEl.textContent = JSON.stringify(data, null, 2);
        dataTableBody.innerHTML = '';
        
        // Verificar que la tabla tenga la columna de valor interpretado
        const headerRow = document.querySelector('#dataTable thead tr');
        if (headerRow && headerRow.cells.length < 4) {
            const interpretedHeader = document.createElement('th');
            interpretedHeader.textContent = 'Valor Interpretado';
            headerRow.appendChild(interpretedHeader);
        }
        
        // Mostrar los datos en la tabla
        data.forEach((value, index) => {
            const address = baseAddress + index;
            const row = dataTableBody.insertRow();
            const interpretation = interpretRegisterValue(address, value);
            
            row.insertCell().textContent = `${address} - ${interpretation.name}`;
            row.insertCell().textContent = value.toString();
            
            const hexCell = row.insertCell();
            hexCell.textContent = (typeof value === 'boolean') 
                ? (value ? 'TRUE' : 'FALSE') 
                : '0x' + value.toString(16).toUpperCase().padStart(4, '0');
            
            const interpretedCell = row.insertCell();
            interpretedCell.textContent = interpretation.unit 
                ? `${interpretation.interpretedValue} ${interpretation.unit}` 
                : interpretation.interpretedValue;
        });
    }
    
    // Define cómo interpretar valores específicos de registros
    function interpretRegisterValue(address, value) {
        // Mapa de registros conocidos (copia simplificada del original)
        const HUAWEI_BATTERY_REGISTERS = {
            0: { name: "Battery Voltage", unit: "V", factor: 0.01, signed: false },
            1: { name: "Pack Voltage", unit: "V", factor: 0.01, signed: false },
            2: { name: "Battery Current", unit: "A", factor: 0.01, signed: true },
            3: { name: "Battery SOC", unit: "%", factor: 1, signed: false },
            4: { name: "Battery SOH", unit: "%", factor: 1, signed: false },
            5: { name: "Reg Unknown 5", unit: "", factor: 1, signed: false },
            6: { name: "Reg Unknown 6", unit: "", factor: 1, signed: false }
        };
        
        if (!HUAWEI_BATTERY_REGISTERS[address]) {
            return { name: `Registro ${address}`, rawValue: value, unit: '', interpretedValue: value.toString() };
        }
        
        const register = HUAWEI_BATTERY_REGISTERS[address];
        let processedValue = value;
        
        if (register.signed && value > 32767) {
            processedValue = value - 65536;
        }
        
        const scaledValue = processedValue * register.factor;
        return { 
            name: register.name, 
            rawValue: value, 
            unit: register.unit, 
            interpretedValue: scaledValue.toFixed(2).replace(/\.?0+$/, '') 
        };
    }
}

/**
 * Inicializa la sección de escritura de registros
 */
function initWriteSection() {
    const writeSlaveIdInput = document.getElementById('writeSlaveId');
    const writeFunctionSelect = document.getElementById('writeFunction');
    const writeAddressInput = document.getElementById('writeAddress');
    const writeValuesInput = document.getElementById('writeValues');
    const writeBtn = document.getElementById('writeBtn');
    const writeMessageEl = document.getElementById('writeMessage');
    
    // Salir si no se encuentran elementos críticos
    if (!writeBtn || !writeMessageEl) return;
    
    writeBtn.addEventListener('click', async () => {
        // Procesar valores según el tipo de función
        const valuesText = writeValuesInput?.value || '';
        let values;
        const writeFunction = writeFunctionSelect?.value || 'holding';
        
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
            if (window.UiManager) {
                window.UiManager.showMessage(writeMessageEl, `Error en valores: ${parseError.message}`, 'error');
            } else {
                writeMessageEl.textContent = `Error en valores: ${parseError.message}`;
                writeMessageEl.className = 'message-area error';
            }
            return;
        }
        
        // Preparar parámetros y ejecutar
        const params = {
            slaveId: parseInt(writeSlaveIdInput?.value || '217'),
            function: writeFunction,
            address: parseInt(writeAddressInput?.value || '0'),
            values: values
        };
        
        if (window.UiManager) {
            window.UiManager.showMessage(writeMessageEl, 'Escribiendo...', 'info');
        } else {
            writeMessageEl.textContent = 'Escribiendo...';
            writeMessageEl.className = 'message-area info';
        }
        
        try {
            const result = await writeModbusRegisters(params);
            
            if (window.UiManager) {
                window.UiManager.showMessage(writeMessageEl, result.message, result.status || 'info');
            } else {
                writeMessageEl.textContent = result.message;
                writeMessageEl.className = `message-area ${result.status || 'info'}`;
            }
        } catch (error) {
            if (window.UiManager) {
                window.UiManager.showMessage(writeMessageEl, `Error: ${error.message}`, 'error');
            } else {
                writeMessageEl.textContent = `Error: ${error.message}`;
                writeMessageEl.className = 'message-area error';
            }
        }
    });
}

/**
 * Inicializa la sección de información del dispositivo
 */
function initDeviceInfoSection() {
    const readInfoBtn = document.getElementById('readInfoBtn');
    const deviceInfoResultEl = document.getElementById('deviceInfoResult')?.querySelector('code');
    const deviceInfoMessageEl = document.getElementById('deviceInfoMessage');
    
    // Salir si no se encuentran elementos críticos
    if (!readInfoBtn || !deviceInfoResultEl) return;
    
    readInfoBtn.addEventListener('click', async () => {
        const readSlaveIdInput = document.getElementById('readSlaveId');
        const slaveId = parseInt(readSlaveIdInput?.value || '217');
        
        if (window.UiManager) {
            window.UiManager.showMessage(deviceInfoMessageEl, 'Leyendo información del dispositivo...', 'info');
        } else if (deviceInfoMessageEl) {
            deviceInfoMessageEl.textContent = 'Leyendo información del dispositivo...';
            deviceInfoMessageEl.className = 'message-area info';
        }
        
        deviceInfoResultEl.textContent = 'Cargando...';
        
        try {
            const response = await fetch('/api/device_info');
            
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status} al obtener info del dispositivo`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success' && result.fragments) {
                displayDeviceInfo(result.fragments);
                
                if (window.UiManager) {
                    window.UiManager.showMessage(deviceInfoMessageEl, 'Información leída correctamente.', 'success');
                } else if (deviceInfoMessageEl) {
                    deviceInfoMessageEl.textContent = 'Información leída correctamente.';
                    deviceInfoMessageEl.className = 'message-area success';
                }
            } else {
                throw new Error(result.message || 'No se pudo obtener información');
            }
            
        } catch (error) {
            console.error('Error al leer información del dispositivo:', error);
            
            if (window.UiManager) {
                window.UiManager.showMessage(deviceInfoMessageEl, `Error: ${error.message}`, 'error');
            } else if (deviceInfoMessageEl) {
                deviceInfoMessageEl.textContent = `Error: ${error.message}`;
                deviceInfoMessageEl.className = 'message-area error';
            }
            
            deviceInfoResultEl.textContent = `Error al obtener información: ${error.message}`;
        }
    });
    
    // Función para mostrar la información del dispositivo
    function displayDeviceInfo(fragments) {
        if (!deviceInfoResultEl) return;
        
        let deviceData = extractDeviceData(fragments);
        let formattedOutput = "--- Información del Dispositivo ---\n\n";
        formattedOutput += `Fabricante: ${deviceData.manufacturer || 'Desconocido'}\n`;
        formattedOutput += `Modelo: ${deviceData.model || 'Desconocido'}\n`;
        formattedOutput += `S/N: ${deviceData.barcode || 'Desconocido'}\n`;
        formattedOutput += `Fecha Fabricación: ${deviceData.manufactureDate || 'Desconocida'}\n`;
        
        if (deviceData.description) {
            formattedOutput += `Descripción: ${deviceData.description}\n`;
        }
        
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
    
    // Función para extraer datos estructurados del dispositivo
    function extractDeviceData(fragments) {
        let data = { 
            manufacturer: '', 
            model: '', 
            barcode: '', 
            manufactureDate: '', 
            description: '', 
            infoVersion: '', 
            elabelVersion: '' 
        };
        
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
}

/**
 * Inicializa los componentes de dashboard
 */
function initDashboards() {
    console.log("Main.js: Inicializando componentes de dashboard");
    
    // Inicializar dashboard individual si existe la función
    if (typeof initDashboard === 'function') {
        console.log("Main.js: Llamando a initDashboard...");
        initDashboard();
    } else {
        console.warn("Main.js: initDashboard no está definida (verifique que dashboard.js se carga correctamente).");
    }
    
    // Configurar la integración del panel múltiple si existe
    initMultiBatteryIntegration();
    
    console.log("Main.js: Inicialización de dashboards completada");
}

/**
 * Inicializa la integración del panel múltiple
 */
function initMultiBatteryIntegration() {
    console.log("Main.js: initMultiBatteryIntegration - Inicializando...");
    
    // Estado inicial para el panel múltiple cuando está desconectado
    const disconnectedProps = {
        error: "No hay conexión activa con el bus Modbus"
    };
    
    // Función para manejar cambios en el estado de conexión
    const handleMultiBatteryConnectionChange = (connected) => {
        // Verificar si la sección está disponible
        const multiBatterySection = document.getElementById('multi-battery-section');
        if (!multiBatterySection) {
            console.error("Main.js: handleMultiBatteryConnectionChange - No se encontró la sección #multi-battery-section");
            return;
        }
        
        if (connected) {
            console.log("Main.js: handleMultiBatteryConnectionChange - Estado cambiado a CONECTADO");
            
            // No mostrar automáticamente, solo preparar para cuando el usuario cambie la vista
            // La visibilidad se controla desde UiManager.switchView()
            
            // Actualizar panel a estado inicial/cargando
            if (typeof window.updateMultiBatteryDashboard === 'function') {
                window.updateMultiBatteryDashboard({
                    initialLoading: true,
                    error: null
                });
                console.log("Main.js: handleMultiBatteryConnectionChange - panel múltiple actualizado a estado 'Cargando'");
            } else {
                console.warn("Main.js: handleMultiBatteryConnectionChange - updateMultiBatteryDashboard no definido al conectar");
            }
            
        } else {
            console.log("Main.js: handleMultiBatteryConnectionChange - Estado cambiado a DESCONECTADO");
            
            // Ocultar sección (aunque UiManager ya lo hace)
            multiBatterySection.style.display = 'none';
            
            // Actualizar panel a estado desconectado
            if (typeof window.updateMultiBatteryDashboard === 'function') {
                window.updateMultiBatteryDashboard(disconnectedProps);
                console.log("Main.js: handleMultiBatteryConnectionChange - panel múltiple actualizado a estado 'Desconectado'");
            } else {
                console.warn("Main.js: handleMultiBatteryConnectionChange - updateMultiBatteryDashboard no definido al desconectar");
            }
        }
    };
    
    // Escuchar el evento personalizado de cambio de conexión
    console.log("Main.js: initMultiBatteryIntegration - Añadiendo listener para 'connection-status-change'");
    document.addEventListener('connection-status-change', (e) => {
        console.log("Main.js: Evento 'connection-status-change' recibido para panel múltiple:", e.detail);
        if (e && e.detail && typeof e.detail.connected !== 'undefined') {
            handleMultiBatteryConnectionChange(e.detail.connected);
        } else {
            console.error("Main.js: Evento 'connection-status-change' recibido sin detalle válido para panel múltiple", e);
        }
    });
    
    console.log("Main.js: initMultiBatteryIntegration - completado.");
}
function checkDetailedInfoLoading() {
    // Verificar si hay una carga de información detallada en progreso
    if (typeof getDetailedInfoLoadingStatus === 'function') {
        getDetailedInfoLoadingStatus().then(result => {
            if (result.status === 'success' && result.loading_active) {
                console.log("Main.js: Detectada carga de información detallada en progreso");
                
                // Si hay una carga en progreso y estamos en la vista multi-batería,
                // actualizar el estado de progreso
                if (window.UiManager && window.UiManager.getCurrentView() === 'multi' && 
                    typeof window.updateMultiBatteryDashboard === 'function') {
                    
                    window.updateMultiBatteryDashboard({
                        loadingProgress: result.progress
                    });
                }
                
                // Programar otra verificación
                setTimeout(checkDetailedInfoLoading, 2000);
            }
        }).catch(error => {
            console.error("Error al verificar estado de carga:", error);
        });
    }
}

// Modificar initConnectionHandler para iniciar la verificación
function initConnectionHandler(elements) {
    if (typeof window.ConnectionHandler === 'undefined') {
        console.error("Main.js: Error crítico - ConnectionHandler no encontrado");
        return;
    }
    
    console.log("Main.js: Inicializando ConnectionHandler");
    window.ConnectionHandler.init(elements);
    
    // Iniciar verificación de carga de información detallada
    setTimeout(checkDetailedInfoLoading, 1000);
}