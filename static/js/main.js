// static/js/main.js (versión corregida)

// Esperamos a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    Utils.logInfo("Inicializando aplicación", "Main");
    
    // Recopilar referencias a elementos DOM principales para conexión
    // CORREGIDO: Usar los mismos nombres y IDs que la versión original
    const connectionElements = {
        // Elementos para la conexión a bajo nivel - usar nombres compatibles con el HTML actual
        lowLevelConnectBtn: document.getElementById('lowLevelConnectBtn'),
        lowLevelDisconnectBtn: document.getElementById('lowLevelDisconnectBtn'),
        initializeBtn: document.getElementById('initializeBtn'),
        
        // Elementos para la conexión PyModbus
        modbusConnectBtn: document.getElementById('modbusConnectBtn'),
        modbusDisconnectBtn: document.getElementById('modbusDisconnectBtn'),
        
        // Elementos comunes
        messageEl: document.getElementById('connectionMessage'),
        
        // Elementos de parámetros
        slaveIdSelect: document.getElementById('slaveId'),
        portInput: document.getElementById('port'),
        baudrateSelect: document.getElementById('baudrate'),
        paritySelect: document.getElementById('parity'),
        stopbitsSelect: document.getElementById('stopbits'),
        bytesizeSelect: document.getElementById('bytesize'),
        timeoutInput: document.getElementById('timeout')
    };
    
    // Recopilar referencias a secciones principales
    // CORREGIDO: Usar solo las secciones originales para mantener compatibilidad
    const uiSections = {
        connectionStatusEl: document.getElementById('connectionStatus'),
        connectionStatusText: document.querySelector('#connectionStatus .text'),
        connectionSection: document.getElementById('connection-section'),
        multiBatterySection: document.getElementById('multi-battery-section'),
        readSection: document.getElementById('read-section'),
        writeSection: document.getElementById('write-section'),
        deviceInfoSection: document.getElementById('device-info-section')
    };
    
    // CORREGIDO: Asegurarse de que las secciones críticas estén visibles
    const lowLevelSection = document.getElementById('low-level-connection-section');
    if (lowLevelSection) {
        lowLevelSection.style.display = 'block';
    }
    
    // Inicializar módulos principales
    initConnectionHandler(connectionElements);
    initUiManager(uiSections);
    
    // Inicializar componentes adicionales
    initReadSection();
    initWriteSection();
    initDeviceInfoSection();
    initMultiBatteryIntegration();
    
    // Configurar listeners para eventos de sistema
    setupEventListeners();
    
    Utils.logInfo("Inicialización completada", "Main");
    
    // CORREGIDO: Verificar nuevamente que las secciones críticas estén visibles
    setTimeout(() => {
        if (lowLevelSection && lowLevelSection.style.display !== 'block') {
            Utils.logInfo("Forzando visibilidad de sección critical de conexión", "Main");
            lowLevelSection.style.display = 'block';
        }
    }, 500);
});

/**
 * Inicializa el gestor de conexiones
 */
function initConnectionHandler(elements) {
    // CORREGIDO: Usar la verificación original
    if (typeof window.ConnectionHandler === 'undefined') {
        Utils.logError("Error crítico - ConnectionHandler no encontrado", "Main");
        return;
    }
    
    Utils.logInfo("Inicializando ConnectionHandler", "Main");
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
    
    Utils.logInfo("Inicializando UiManager", "Main");
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
            const result = await readModbusRegisters(params);
            if (result.status === 'success' && Array.isArray(result.data)) {
                // CORREGIDO: Usar la función de Utils
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
            if (window.UiManager) {
                window.UiManager.showMessage(writeMessageEl, `Error en valores: ${parseError.message}`, 'error');
            } else {
                writeMessageEl.textContent = `Error en valores: ${parseError.message}`;
                writeMessageEl.className = 'message-area error';
            }
            return;
        }
        
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
            Utils.logError(`Error al escribir registros: ${error.message}`, "Main");
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
            Utils.logError(`Error al leer información del dispositivo: ${error.message}`, "Main");
            
            if (window.UiManager) {
                window.UiManager.showMessage(deviceInfoMessageEl, `Error: ${error.message}`, 'error');
            } else if (deviceInfoMessageEl) {
                deviceInfoMessageEl.textContent = `Error: ${error.message}`;
                deviceInfoMessageEl.className = 'message-area error';
            }
            
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
 * Inicializa la integración del panel múltiple
 */
function initMultiBatteryIntegration() {
    Utils.logInfo("Inicializando integración de panel múltiple", "Main");
    
    // Estado inicial para el panel múltiple cuando está desconectado
    const disconnectedProps = {
        error: "No hay conexión activa con el bus Modbus"
    };
    
    // Función para manejar cambios en el estado de conexión
    const handleMultiBatteryConnectionChange = (connected) => {
        const multiBatterySection = document.getElementById('multi-battery-section');
        if (!multiBatterySection) {
            Utils.logError("No se encontró la sección #multi-battery-section", "Main");
            return;
        }
        
        if (connected) {
            Utils.logInfo("Estado de multiBatterySection cambiado a CONECTADO", "Main");
            
            // No mostrar automáticamente, solo preparar para cuando el usuario cambie la vista
            
            // Actualizar panel a estado inicial/cargando
            if (typeof window.updateMultiBatteryDashboard === 'function') {
                window.updateMultiBatteryDashboard({
                    initialLoading: true,
                    error: null
                });
                Utils.logInfo("Panel múltiple actualizado a estado 'Cargando'", "Main");
            } else {
                Utils.logWarn("updateMultiBatteryDashboard no definido al conectar", "Main");
            }
            
        } else {
            Utils.logInfo("Estado de multiBatterySection cambiado a DESCONECTADO", "Main");
            
            // Ocultar sección (aunque UiManager ya lo hace)
            multiBatterySection.style.display = 'none';
            
            // Actualizar panel a estado desconectado
            if (typeof window.updateMultiBatteryDashboard === 'function') {
                window.updateMultiBatteryDashboard(disconnectedProps);
                Utils.logInfo("Panel múltiple actualizado a estado 'Desconectado'", "Main");
            } else {
                Utils.logWarn("updateMultiBatteryDashboard no definido al desconectar", "Main");
            }
        }
    };
    
    // Escuchar el evento personalizado de cambio de conexión
    Utils.logInfo("Añadiendo listener para 'connection-status-change'", "Main");
    document.addEventListener('connection-status-change', (e) => {
        Utils.logInfo("Evento 'connection-status-change' recibido para panel múltiple", "Main");
        // CORREGIDO: Comprobar e.detail de manera segura
        if (e && e.detail && typeof e.detail.connected !== 'undefined') {
            handleMultiBatteryConnectionChange(e.detail.connected);
        } else {
            Utils.logError("Evento 'connection-status-change' recibido sin detalle válido para panel múltiple", "Main");
        }
    });
}

/**
 * Configura event listeners para eventos del sistema
 */
function setupEventListeners() {
    Utils.logInfo("Configurando listeners para eventos de conexión", "Main");
    
    // CORREGIDO: Asegurar visibilidad de secciones críticas
    const criticalSections = ['low-level-connection-section', 'connection-section'];
    criticalSections.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.style.display = 'block';
    });
    
    // Conexión de bajo nivel
    document.addEventListener('low-level-connection-status-change', (e) => {
        Utils.logInfo(`Evento 'low-level-connection-status-change' recibido: ${e.detail?.connected}`, "Main");
        
        // CORREGIDO: Asegurar que e.detail existe
        const isConnected = e && e.detail && e.detail.connected;
        
        // CORREGIDO: Asegurar que la sección de conexión a bajo nivel siempre esté visible
        const lowLevelSection = document.getElementById('low-level-connection-section');
        if (lowLevelSection) lowLevelSection.style.display = 'block';
        
        if (window.UiManager) {
            window.UiManager.updateConnectionStatus({
                lowLevel: isConnected,
                modbus: window.ConnectionHandler ? window.ConnectionHandler.isModbusConnected() : false
            });
        }
        
        if (isConnected) {
            Utils.logInfo("Conexión a bajo nivel ACTIVA", "Main");
            if (window.ConnectionHandler && window.ConnectionHandler.initializeBatteries) {
                Utils.logInfo("Iniciando automáticamente la inicialización de baterías", "Main");
                window.ConnectionHandler.initializeBatteries();
            }
        } else {
            Utils.logInfo("Conexión a bajo nivel INACTIVA", "Main");
            
            if (window.AuthMonitor && window.AuthMonitor.hide) {
                window.AuthMonitor.hide();
            }
        }
    });
    
    // Conexión PyModbus
    document.addEventListener('modbus-connection-status-change', (e) => {
        Utils.logInfo(`Evento 'modbus-connection-status-change' recibido: ${e.detail?.connected}`, "Main");
        
        // CORREGIDO: Asegurar que e.detail existe
        const isConnected = e && e.detail && e.detail.connected;
        
        if (window.UiManager) {
            window.UiManager.updateConnectionStatus({
                lowLevel: window.ConnectionHandler ? window.ConnectionHandler.isLowLevelConnected() : false,
                modbus: isConnected
            });
        }
        
        if (isConnected) {
            Utils.logInfo("Conexión PyModbus ACTIVA", "Main");
            
            // Si se ha conectado PyModbus y todas las baterías están autenticadas,
            // podemos cambiar a la vista multi-batería automáticamente
            if (window.allBatteriesAuthenticated && window.UiManager) {
                setTimeout(() => {
                    window.UiManager.switchView('multi');
                }, 500);
            }
        } else {
            Utils.logInfo("Conexión PyModbus INACTIVA", "Main");
        }
    });
    
    // Estado de autenticación
    document.addEventListener('authentication-status-change', (e) => {
        Utils.logInfo(`Evento 'authentication-status-change' recibido: ${JSON.stringify(e.detail)}`, "Main");
        
        // CORREGIDO: Comprobar e.detail de manera segura
        if (e && e.detail && typeof e.detail.allAuthenticated !== 'undefined') {
            Utils.logInfo(`Estado de autenticación - Nuevo: ${e.detail.allAuthenticated}`, "Main");
            
            const prevAllAuthenticated = window.allBatteriesAuthenticated || false;
            window.allBatteriesAuthenticated = e.detail.allAuthenticated;
            
            if (window.UiManager) {
                window.UiManager.updateAuthenticationStatus(e.detail.allAuthenticated);
            }
            
            if (e.detail.allAuthenticated === true) {
                Utils.logInfo("¡ESTADO AUTENTICADO DETECTADO! Verificando transición...", "Main");
                
                if (window.ConnectionHandler && window.ConnectionHandler.isLowLevelConnected() && 
                    !window.ConnectionHandler.isModbusConnected()) {
                    
                    Utils.logInfo("¡TRANSICIÓN AUTOMÁTICA ACTIVADA!", "Main");
                    
                    if (window.UiManager) {
                        const messageEl = document.getElementById('connectionMessage');
                        if (messageEl) {
                            window.UiManager.showMessage(
                                messageEl, 
                                'Todas las baterías autenticadas. Iniciando conexión PyModbus automáticamente...', 
                                'success'
                            );
                        }
                    }
                    
                    setTimeout(() => {
                        Utils.logInfo("Iniciando secuencia de transición", "Main");
                        
                        if (!window.ConnectionHandler) {
                            Utils.logError("FALLO - No se encuentra el objeto ConnectionHandler", "Main");
                            return;
                        }
                        
                        if (!window.ConnectionHandler.isLowLevelConnected()) {
                            Utils.logWarn("No hay conexión a bajo nivel activa para cerrar", "Main");
                            return;
                        }
                        
                        if (window.ConnectionHandler.isModbusConnected()) {
                            Utils.logWarn("Ya hay una conexión PyModbus activa", "Main");
                            return;
                        }
                        
                        Utils.logInfo("Cerrando conexión a bajo nivel automáticamente", "Main");
                        window.ConnectionHandler.disconnectLowLevel()
                            .then((disconnectResult) => {
                                Utils.logInfo(`Conexión a bajo nivel cerrada: ${disconnectResult?.message}`, "Main");
                                
                                return new Promise(resolve => setTimeout(() => {
                                    Utils.logInfo("Iniciando conexión PyModbus...", "Main");
                                    
                                    if (!window.ConnectionHandler || typeof window.ConnectionHandler.connectModbus !== 'function') {
                                        Utils.logError("FALLO - Método connectModbus no disponible", "Main");
                                        return Promise.reject(new Error("Método connectModbus no disponible"));
                                    }
                                    
                                    resolve(window.ConnectionHandler.connectModbus());
                                }, 1000));
                            })
                            .then((connectResult) => {
                                Utils.logInfo(`Resultado de conexión PyModbus: ${connectResult?.status}`, "Main");
                                
                                if (connectResult && connectResult.status === "success") {
                                    Utils.logInfo("¡ÉXITO! Conexión PyModbus establecida", "Main");
                                    
                                    if (window.UiManager) {
                                        Utils.logInfo("Forzando actualización de UI a estado 'modbus conectado'", "Main");
                                        window.UiManager.updateConnectionStatus({
                                            lowLevel: false,
                                            modbus: true
                                        });
                                        
                                        setTimeout(() => {
                                            Utils.logInfo("Cambiando a vista múltiple", "Main");
                                            window.UiManager.switchView('multi');
                                        }, 1000);
                                    }
                                } else {
                                    Utils.logError(`Error al conectar PyModbus: ${connectResult?.message}`, "Main");
                                    handleConnectionError("Error al conectar PyModbus automáticamente. Intente conectar manualmente.");
                                }
                            })
                            .catch(error => {
                                Utils.logError(`EXCEPCIÓN durante la transición: ${error.message}`, "Main");
                                handleConnectionError("Error durante la transición. Intente conectar manualmente.");
                            });
                    }, 2000);
                } else {
                    Utils.logInfo("No se inicia transición - Condiciones no cumplidas", "Main");
                }
            }
        }
        
        function handleConnectionError(message) {
            Utils.logError(`Manejando error de conexión: ${message}`, "Main");
            
            const modbusMessageEl = document.getElementById('modbusConnectionMessage');
            if (modbusMessageEl && window.UiManager) {
                window.UiManager.showMessage(
                    modbusMessageEl,
                    message,
                    'error'
                );
            }
            
            const modbusConnectBtn = document.getElementById('modbusConnectBtn');
            if (modbusConnectBtn) {
                Utils.logInfo("Habilitando botón de conexión manual como fallback", "Main");
                modbusConnectBtn.disabled = false;
                modbusConnectBtn.classList.add('ready');
                modbusConnectBtn.title = "Haga clic para intentar conectar PyModbus manualmente.";
            }
        }
    });
    
    // Cambios de vista
    document.addEventListener('view-changed', (e) => {
        Utils.logInfo(`Evento 'view-changed' recibido: ${e.detail?.view}`, "Main");
        
        if (e && e.detail && e.detail.view) {
            if (e.detail.view === 'multi') {
                if (typeof window.updateMultiBatteryDashboard === 'function') {
                    window.updateMultiBatteryDashboard({ forceUpdate: true });
                }
            }
        }
    });
    
    // CORREGIDO: Asegurar de nuevo la visibilidad de secciones críticas
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

/**
 * Verifica el progreso de carga de información detallada
 */
function checkDetailedInfoLoading() {
    if (typeof getDetailedInfoLoadingStatus === 'function') {
        getDetailedInfoLoadingStatus().then(result => {
            if (result.status === 'success' && result.loading_active) {
                Utils.logInfo("Detectada carga de información detallada en progreso", "Main");
                
                if (window.UiManager && window.UiManager.getCurrentView() === 'multi' && 
                    typeof window.updateMultiBatteryDashboard === 'function') {
                    
                    window.updateMultiBatteryDashboard({
                        loadingProgress: result.progress
                    });
                }
                
                setTimeout(checkDetailedInfoLoading, 2000);
            }
        }).catch(error => {
            Utils.logError(`Error al verificar estado de carga: ${error.message}`, "Main");
        });
    }
}