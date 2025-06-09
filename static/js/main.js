// static/js/main.js (versión refactorizada para conexión única)

// Esperamos a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    Utils.logInfo("Inicializando aplicación con conexión única", "Main");
    
    // Recopilar referencias a elementos DOM principales para conexión única
    const connectionElements = {
        // NUEVOS elementos para conexión única
        conexionUnicaConnectBtn: document.getElementById('conexionUnicaConnectBtn'),
        conexionUnicaDisconnectBtn: document.getElementById('conexionUnicaDisconnectBtn'),
        initializeBtn: document.getElementById('initializeBtn'),
        openDashboardBtn: document.getElementById('openDashboardBtn'),
        
        // Elementos de estado visual
        comunicacionStatus: document.getElementById('comunicacionStatus'),
        bateriasStatus: document.getElementById('bateriasStatus'),
        sistemaStatus: document.getElementById('sistemaStatus'),
        
        // Elemento de mensajes unificado
        messageEl: document.getElementById('conexionUnicaMessage'),
        
        // Elementos de parámetros (sin cambios)
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
        conexionUnicaSection: document.getElementById('conexion-unica-section'),
        multiBatterySection: document.getElementById('multi-battery-section'),
        readSection: document.getElementById('read-section'),
        writeSection: document.getElementById('write-section'),
        deviceInfoSection: document.getElementById('device-info-section')
    };
    
    // Verificar que las secciones críticas estén visibles
    const sectionsToShow = ['connection-section', 'conexion-unica-section'];
    sectionsToShow.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = 'block';
            Utils.logInfo(`Sección ${id} visible`, "Main");
        }
    });
    
    // Inicializar módulos principales
    initConnectionHandler(connectionElements);
    initUiManager(uiSections);
    
    // Inicializar componentes adicionales
    initReadSection();
    initWriteSection();
    initDeviceInfoSection();    
    // Configurar listeners para eventos de sistema
    setupEventListeners();
    
    Utils.logInfo("Inicialización completada con conexión única", "Main");
    
    // Verificar nuevamente que las secciones críticas estén visibles
    setTimeout(() => {
        sectionsToShow.forEach(id => {
            const section = document.getElementById(id);
            if (section && section.style.display !== 'block') {
                Utils.logInfo(`Forzando visibilidad de sección ${id}`, "Main");
                section.style.display = 'block';
            }
        });
    }, 500);
});

/**
 * Inicializa el gestor de conexiones unificadas
 */
function initConnectionHandler(elements) {
    if (typeof window.ConnectionHandler === 'undefined') {
        Utils.logError("Error crítico - ConnectionHandler no encontrado", "Main");
        return;
    }
    
    Utils.logInfo("Inicializando ConnectionHandler con conexión única", "Main");
    window.ConnectionHandler.init(elements);
}

/**
 * Inicializa el gestor de interfaz de usuario
 */
function initUiManager(sections) {
    if (typeof window.UiManager === 'undefined') {
        Utils.logError("Error crítico - UiManager no encontrado", "Main");
        return;
    }
    
    Utils.logInfo("Inicializando UiManager con conexión única", "Main");
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
            const result = await readRegisters(params); // Función renombrada
            if (result.status === 'success' && Array.isArray(result.data)) {
                Utils.displayRegisterData(dataTableBody, result.data, params.address);
                readResultEl.textContent = JSON.stringify(result.data, null, 2);
            } else {
                readResultEl.textContent = `Error: ${result.message || 'Respuesta inválida'}`;
            }
        } catch (error) {
            Utils.logError(`Error al leer registros: ${error.message}`, "Main");
            readResultEl.textContent = `Error: ${error.message}`;
        }
    });
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
    
    if (!writeBtn || !writeMessageEl) return;
    
    writeBtn.addEventListener('click', async () => {
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
            Utils.logWarn(`Error en valores: ${parseError.message}`, "Main");
            Utils.showMessage(writeMessageEl, `Error en valores: ${parseError.message}`, 'error');
            return;
        }
        
        const params = {
            slaveId: parseInt(writeSlaveIdInput?.value || '217'),
            function: writeFunction,
            address: parseInt(writeAddressInput?.value || '0'),
            values: values
        };
        
        Utils.showMessage(writeMessageEl, 'Escribiendo...', 'info');
        
        try {
            const result = await writeRegisters(params); // Función renombrada
            Utils.showMessage(writeMessageEl, result.message, result.status || 'info');
        } catch (error) {
            Utils.logError(`Error al escribir registros: ${error.message}`, "Main");
            Utils.showMessage(writeMessageEl, `Error: ${error.message}`, 'error');
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
    
    if (!readInfoBtn || !deviceInfoResultEl) return;
    
    readInfoBtn.addEventListener('click', async () => {
        const readSlaveIdInput = document.getElementById('readSlaveId');
        const slaveId = parseInt(readSlaveIdInput?.value || '217');
        
        Utils.showMessage(deviceInfoMessageEl, 'Leyendo información del dispositivo...', 'info');
        deviceInfoResultEl.textContent = 'Cargando...';
        
        try {
            const response = await fetch('/api/device_info');
            
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status} al obtener info del dispositivo`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success' && result.fragments) {
                displayDeviceInfo(result.fragments);
                Utils.showMessage(deviceInfoMessageEl, 'Información leída correctamente.', 'success');
            } else {
                throw new Error(result.message || 'No se pudo obtener información');
            }
            
        } catch (error) {
            Utils.logError(`Error al leer información del dispositivo: ${error.message}`, "Main");
            Utils.showMessage(deviceInfoMessageEl, `Error: ${error.message}`, 'error');
            deviceInfoResultEl.textContent = `Error al obtener información: ${error.message}`;
        }
    });
    
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
            
            const modelMatch = content.match(/BoardType=([^\r\n]+)/) || content.match(/Model=([^\r\n]+)/);
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
 * Configura event listeners para eventos del sistema
 */
function setupEventListeners() {
    Utils.logInfo("Configurando listeners para eventos de conexión única", "Main");
    
    // Asegurar visibilidad de secciones críticas
    const criticalSections = ['connection-section', 'conexion-unica-section'];
    criticalSections.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.style.display = 'block';
    });
    
    // NUEVO: Conexión única (evento principal)
    document.addEventListener('conexion-unica-status-change', (e) => {
        Utils.logInfo(`Evento 'conexion-unica-status-change' recibido: conectado=${e.detail?.conectado}, completo=${e.detail?.sistemaCompleto}`, "Main");
        
        const { conectado, sistemaCompleto } = e.detail || { conectado: false, sistemaCompleto: false };
        
        // Asegurar que la sección de conexión única siempre esté visible
        const conexionUnicaSection = document.getElementById('conexion-unica-section');
        if (conexionUnicaSection) conexionUnicaSection.style.display = 'block';
        
        // Actualizar UiManager con estado unificado
        if (window.UiManager) {
            window.UiManager.updateConnectionStatus({
                conectado: conectado,
                sistemaCompleto: sistemaCompleto
            });
        }
        
        if (conectado) {
            Utils.logInfo(`Sistema CONECTADO (completo: ${sistemaCompleto})`, "Main");
            
            // Si hay autenticación automática activa y está completo, no hacer nada más
            // El proceso ya se maneja en ConnectionHandler
            
        } else {
            Utils.logInfo("Sistema DESCONECTADO", "Main");
            
            // Ocultar monitor de autenticación si está visible
            if (window.AuthMonitor && window.AuthMonitor.hide) {
                window.AuthMonitor.hide();
            }
        }
    });
    
    // DEPRECATED: Mantener compatibilidad con eventos antiguos
    document.addEventListener('low-level-connection-status-change', (e) => {
        Utils.logWarn("Evento 'low-level-connection-status-change' deprecated. Use 'conexion-unica-status-change'", "Main");
        
        // Redirigir al nuevo sistema
        if (e && e.detail && typeof e.detail.connected !== 'undefined') {
            document.dispatchEvent(new CustomEvent('conexion-unica-status-change', {
                detail: { 
                    conectado: e.detail.connected,
                    sistemaCompleto: e.detail.connected // Asumir completo si está conectado
                }
            }));
        }
    });
    
    document.addEventListener('modbus-connection-status-change', (e) => {
        Utils.logWarn("Evento 'modbus-connection-status-change' deprecated. Use 'conexion-unica-status-change'", "Main");
        
        // Redirigir al nuevo sistema
        if (e && e.detail && typeof e.detail.connected !== 'undefined') {
            document.dispatchEvent(new CustomEvent('conexion-unica-status-change', {
                detail: { 
                    conectado: e.detail.connected,
                    sistemaCompleto: e.detail.connected
                }
            }));
        }
    });
    
    // Evento de cambio de vista (mantener por compatibilidad)
    document.addEventListener('view-changed', (e) => {
        Utils.logInfo(`Evento 'view-changed' recibido: ${e.detail?.view}`, "Main");
        // El evento se mantiene para compatibilidad pero ya no requiere acción específica
    });
    
    // Evento de estado de autenticación (mantener por compatibilidad)
    document.addEventListener('authentication-status-change', (e) => {
        Utils.logInfo(`Evento 'authentication-status-change' recibido: ${e.detail?.allAuthenticated}`, "Main");
        
        // Actualizar estado en UiManager si es necesario
        if (window.UiManager && window.UiManager.updateAuthenticationStatus) {
            window.UiManager.updateAuthenticationStatus(e.detail?.allAuthenticated || false);
        }
    });
    
    // Asegurar de nuevo la visibilidad de secciones críticas
    setTimeout(() => {
        criticalSections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                Utils.logInfo(`Asegurando visibilidad de sección ${id}`, "Main");
                section.style.display = 'block';
            }
        });
    }, 1000);
}

