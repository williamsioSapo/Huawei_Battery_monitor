// static/js/connectionHandler.js

/**
 * Módulo para gestionar la conexión con dispositivos Modbus y el estado de conexión
 * Encapsula toda la lógica de conexión para mantenerla separada de la UI
 */
const ConnectionHandler = (function() {
    // Estado interno
    let lowLevelConnected = false;
    let modbusConnected = false;
    
    // Referencias a elementos DOM críticos para la conexión
    let elements = {
        // Elementos para conexión a bajo nivel
        lowLevelConnectBtn: null,
        lowLevelDisconnectBtn: null,
        initializeBtn: null,
        
        // Elementos para conexión PyModbus
        modbusConnectBtn: null,
        modbusDisconnectBtn: null,
        
        // Elementos comunes
        messageEl: null,
        
        // Elementos de parámetros
        slaveIdSelect: null,
        portInput: null,
        baudrateSelect: null,
        paritySelect: null,
        stopbitsSelect: null,
        bytesizeSelect: null,
        timeoutInput: null
    };
    
    /**
     * Obtiene los parámetros de conexión actuales desde los inputs
     * @returns {Object} Parámetros de conexión
     */
    function getConnectionParams() {
        return {
            port: elements.portInput?.value || 'COM8',
            baudrate: parseInt(elements.baudrateSelect?.value || '9600'),
            parity: elements.paritySelect?.value || 'N',
            stopbits: parseInt(elements.stopbitsSelect?.value || '1'),
            bytesize: parseInt(elements.bytesizeSelect?.value || '8'),
            timeout: parseInt(elements.timeoutInput?.value || '1'),
            slaveId: parseInt(elements.slaveIdSelect?.value || 217)
        };
    }
    
    /**
     * Maneja el proceso de conexión a bajo nivel
     */
    async function handleLowLevelConnect() {
        if (!elements.lowLevelConnectBtn) return;
        
        // Deshabilitar botones durante la operación
        elements.lowLevelConnectBtn.disabled = true;
        
        // Obtener parámetros de conexión
        const params = getConnectionParams();
        
        // Mostrar mensaje de conexión
        showConnectionMessage('Conectando a bajo nivel...', 'info');
        
        try {
            // Establecer conexión a bajo nivel
            const result = await lowLevelConnect(params);
            
            if (result.status === 'success' || result.status === 'warning') {
                showConnectionMessage(`Conexión de bajo nivel establecida: ${result.message}`, 'success');
                
                // Actualizar estado interno
                lowLevelConnected = true;
                dispatchLowLevelConnectionEvent(true);
            } else {
                showConnectionMessage(`Error en conexión a bajo nivel: ${result.message}`, 'error');
                
                // Actualizar estado interno
                lowLevelConnected = false;
                dispatchLowLevelConnectionEvent(false);
            }
        } catch (error) {
            showConnectionMessage(`Error: ${error.message}`, 'error');
            
            // Actualizar estado interno
            lowLevelConnected = false;
            dispatchLowLevelConnectionEvent(false);
        } finally {
            // Actualizar estado de botones
            updateButtonStates();
        }
    }
    
    /**
     * Maneja el proceso de desconexión a bajo nivel
     */
    async function handleLowLevelDisconnect() {
        if (!elements.lowLevelDisconnectBtn) return;
        
        // Deshabilitar botones durante la operación
        elements.lowLevelDisconnectBtn.disabled = true;
        
        showConnectionMessage('Desconectando a bajo nivel...', 'info');
        
        try {
            // Desconectar a bajo nivel
            const result = await lowLevelDisconnect();
            
            showConnectionMessage(result.message, result.status);
            
            // Actualizar estado interno
            lowLevelConnected = false;
            dispatchLowLevelConnectionEvent(false);
        } catch (error) {
            showConnectionMessage(`Error: ${error.message}`, 'error');
        } finally {
            // Actualizar estado de botones
            updateButtonStates();
        }
    }
    
    /**
     * Maneja el proceso de inicialización de baterías
     */
    async function handleInitializeBatteries() {
		if (!elements.initializeBtn) return;
		
		// Deshabilitar botones durante la operación
		elements.initializeBtn.disabled = true;
		
		// Mostrar monitor de autenticación durante el proceso
		showAuthMonitor();
		
		showConnectionMessage('Inicializando baterías...', 'info');
		
		try {
			// Inicializar baterías
			const result = await lowLevelInitialize();
			
			showConnectionMessage(result.message, result.status);
			
			// Actualizar estado de autenticación en UiManager (esto solo actualiza UI)
			if (typeof window.UiManager !== 'undefined' && 
				typeof window.UiManager.updateAuthenticationStatus === 'function') {
				window.UiManager.updateAuthenticationStatus(result.all_authenticated || false);
			}
			
			// NUEVO: Verifica si todas las baterías están autenticadas para disparar el evento
			if (result.all_authenticated === true) {
				console.log("ConnectionHandler: ¡TODAS LAS BATERÍAS AUTENTICADAS! Disparando evento de transición...");
				
				// Disparar evento para iniciar transición automática
				document.dispatchEvent(new CustomEvent('authentication-status-change', {
					detail: { allAuthenticated: true }
				}));
				
				// Ocultar el monitor después de un tiempo si todo está ok
				setTimeout(() => {
					hideAuthMonitor();
				}, 5000);
			}
			
			// Mantener monitor visible si se requiere acción
			if (result.auth_requires_action) {
				console.log("Manteniendo monitor de autenticación visible - se requiere acción para baterías fallidas");
				
				// Notificar a AuthMonitor que se requiere acción
				if (window.AuthMonitor && window.AuthMonitor.setRequiresAction) {
					window.AuthMonitor.setRequiresAction(
						result.auth_requires_action, 
						result.failed_batteries || []
					);
				}
			}
			
		} catch (error) {
			showConnectionMessage(`Error: ${error.message}`, 'error');
			
			// CORREGIDO: NO ocultar el monitor en caso de error
			// El usuario necesita ver qué falló
			
		} finally {
			// Actualizar estado de botones
			updateButtonStates();
		}
	}
    
    /**
     * Maneja el proceso de conexión con PyModbus
     */
    async function handleModbusConnect() {
        if (!elements.modbusConnectBtn) return;
        
        // Deshabilitar botones durante la operación
        elements.modbusConnectBtn.disabled = true;
        
        // Obtener parámetros de conexión
        const params = getConnectionParams();
        
        showConnectionMessage('Conectando cliente PyModbus...', 'info');
        
        try {
            // Conectar cliente PyModbus
            const result = await connectModbus(params);
            
            if (result.status === 'success' || result.status === 'warning') {
                showConnectionMessage(result.message, result.status);
                
                // Actualizar estado interno
                modbusConnected = true;
                dispatchModbusConnectionEvent(true);
                
                // Cambiar a vista múltiple si todas las baterías están inicializadas
                if (result.all_authenticated !== false && typeof window.UiManager !== 'undefined') {
                    setTimeout(() => {
                        window.UiManager.switchView('multi');
                    }, 500);
                }
            } else {
                showConnectionMessage(result.message, result.status);
                
                // Actualizar estado interno
                modbusConnected = false;
                dispatchModbusConnectionEvent(false);
            }
        } catch (error) {
            showConnectionMessage(`Error: ${error.message}`, 'error');
            
            // Actualizar estado interno
            modbusConnected = false;
            dispatchModbusConnectionEvent(false);
        } finally {
            // Actualizar estado de botones
            updateButtonStates();
        }
    }
    
    /**
     * Maneja el proceso de desconexión de PyModbus
     */
    async function handleModbusDisconnect() {
        if (!elements.modbusDisconnectBtn) return;
        
        // Deshabilitar botones durante la operación
        elements.modbusDisconnectBtn.disabled = true;
        
        showConnectionMessage('Desconectando cliente PyModbus...', 'info');
        
        try {
            // Desconectar cliente PyModbus
            const result = await disconnectModbus();
            
            showConnectionMessage(result.message, result.status);
            
            // Actualizar estado interno
            modbusConnected = false;
            dispatchModbusConnectionEvent(false);
        } catch (error) {
            showConnectionMessage(`Error: ${error.message}`, 'error');
        } finally {
            // Actualizar estado de botones
            updateButtonStates();
        }
    }
    
    /**
     * Reintenta la inicialización de una batería específica
     * @param {number} batteryId - ID de la batería a reintentar
     * @returns {Promise} - Promesa que se resuelve con el resultado del reintento
     */
    function handleRetryBatteryInitialization(batteryId) {
        if (!batteryId) return Promise.reject(new Error("No se especificó ID de batería"));
        
        return new Promise(async (resolve, reject) => {
            try {
                showConnectionMessage(`Reintentando inicialización de batería ${batteryId}...`, 'info');
                
                // Verificar que hay conexión a bajo nivel activa
                if (!lowLevelConnected) {
                    throw new Error("No hay conexión a bajo nivel activa. Conéctese primero.");
                }
                
                const result = await lowLevelRetryBattery(batteryId);
                
                if (result.status === 'success') {
                    showConnectionMessage(result.message, 'success');
                    
                    // Actualizar estado de autenticación en UiManager
                    if (typeof window.UiManager !== 'undefined' && 
                        typeof window.UiManager.updateAuthenticationStatus === 'function') {
                        window.UiManager.updateAuthenticationStatus(result.all_authenticated || false);
                    }
                    
                    // Si todas las baterías están autenticadas, ocultar monitor
                    if (result.all_authenticated) {
                        setTimeout(() => {
                            hideAuthMonitor();
                        }, 3000);
                    }
                    
                    resolve(result);
                } else {
                    showConnectionMessage(result.message, 'error');
                    reject(new Error(result.message));
                }
            } catch (error) {
                showConnectionMessage(`Error al reintentar: ${error.message}`, 'error');
                reject(error);
            }
        });
    }
    
    /**
     * Muestra un mensaje en el área de conexión
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de mensaje (success, error, info)
     */
    function showConnectionMessage(message, type = 'info') {
        if (!elements.messageEl) return;
        
        if (elements.messageEl.timeoutId) {
            clearTimeout(elements.messageEl.timeoutId);
        }
        
        elements.messageEl.textContent = message;
        elements.messageEl.className = `message-area ${type}`;
        
        // Auto-limpiar después de un tiempo
        elements.messageEl.timeoutId = setTimeout(() => {
            if (elements.messageEl.textContent === message) {
                elements.messageEl.textContent = '';
                elements.messageEl.className = 'message-area';
            }
        }, 5000);
    }
    
    /**
     * Actualiza el estado de los botones según el estado de conexión
     */
    function updateButtonStates() {
        // Botones de bajo nivel
        if (elements.lowLevelConnectBtn) {
            elements.lowLevelConnectBtn.disabled = lowLevelConnected;
        }
        
        if (elements.lowLevelDisconnectBtn) {
            elements.lowLevelDisconnectBtn.disabled = !lowLevelConnected;
        }
        
        if (elements.initializeBtn) {
            elements.initializeBtn.disabled = !lowLevelConnected;
        }
        
        // Botones de PyModbus
        if (elements.modbusConnectBtn) {
            // Solo habilitar si no hay conexión Modbus actual
            const authorized = window.UiManager && window.UiManager.allBatteriesAuthorized === true;
            elements.modbusConnectBtn.disabled = modbusConnected || !authorized;
        }
        
        if (elements.modbusDisconnectBtn) {
            elements.modbusDisconnectBtn.disabled = !modbusConnected;
        }
    }
    
    /**
     * Dispara un evento de cambio de estado de conexión a bajo nivel
     * @param {boolean} connected - Estado de conexión
     */
    function dispatchLowLevelConnectionEvent(connected) {
        console.log(`ConnectionHandler: Disparando evento low-level-connection-status-change (connected: ${connected})`);
        
        // Actualizar estado de los botones
        updateButtonStates();
        
        // Disparar evento para otros módulos
        document.dispatchEvent(new CustomEvent('low-level-connection-status-change', {
            detail: { connected: connected }
        }));
    }
    
    /**
     * Dispara un evento de cambio de estado de conexión PyModbus
     * @param {boolean} connected - Estado de conexión
     */
    function dispatchModbusConnectionEvent(connected) {
        console.log(`ConnectionHandler: Disparando evento modbus-connection-status-change (connected: ${connected})`);
        
        // Actualizar estado de los botones
        updateButtonStates();
        
        // Disparar evento para otros módulos
        document.dispatchEvent(new CustomEvent('modbus-connection-status-change', {
            detail: { connected: connected }
        }));
        
        // Mantener compatibilidad con el evento anterior
        document.dispatchEvent(new CustomEvent('connection-status-change', {
            detail: { connected: connected }
        }));
    }
    
    /**
     * Inicializa el selector de baterías disponibles
     */
    async function initBatterySelector() {
        if (!elements.slaveIdSelect) return;
        
        try {
            // Obtener baterías disponibles desde la API
            const result = await getAvailableBatteries();
            
            if (result && result.batteries && Array.isArray(result.batteries)) {
                // Limpiar opciones existentes
                elements.slaveIdSelect.innerHTML = '';
                
                // Añadir opciones basadas en configuración
                result.batteries.forEach(id => {
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = `Batería ${id}`;
                    
                    // Seleccionar la predeterminada
                    if (id === result.default_id) {
                        option.selected = true;
                    }
                    
                    elements.slaveIdSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar baterías disponibles:', error);
            // Añadir opción predeterminada en caso de error
            elements.slaveIdSelect.innerHTML = '<option value="217">Batería 217</option>';
        }
    }
    
    /**
     * Comprueba el estado actual de conexión con el backend
     */
    async function checkConnectionStatus() {
        try {
            const result = await checkStatus(); // Función de modbusApi.js
            
            // Actualizar estado interno de conexión PyModbus
            if (result.connected !== modbusConnected) {
                modbusConnected = result.connected;
                dispatchModbusConnectionEvent(modbusConnected);
            }
            
            // También verificar estado de conexión a bajo nivel
            // (Este es un ejemplo - necesitarías implementar el endpoint correspondiente)
            try {
                const lowLevelResult = await fetch('/api/low_level/status').then(r => r.json());
                if (lowLevelResult.connected !== lowLevelConnected) {
                    lowLevelConnected = lowLevelResult.connected;
                    dispatchLowLevelConnectionEvent(lowLevelConnected);
                }
            } catch (error) {
                // Si hay error, asumimos que no hay conexión a bajo nivel
                if (lowLevelConnected) {
                    lowLevelConnected = false;
                    dispatchLowLevelConnectionEvent(false);
                }
            }
            
            return { 
                modbus: modbusConnected,
                lowLevel: lowLevelConnected
            };
        } catch (error) {
            console.error('Error al verificar estado de conexión:', error);
            return { 
                modbus: false,
                lowLevel: false
            };
        }
    }
    
    /**
     * Muestra el monitor de autenticación
     * @private
     */
    function showAuthMonitor() {
        if (typeof window.AuthMonitor !== 'undefined' && window.AuthMonitor.show) {
            window.AuthMonitor.show();
            console.log("Monitor de autenticación activado");
        } else {
            console.warn("Monitor de autenticación no disponible");
        }
    }

    /**
     * Oculta el monitor de autenticación
     * @private
     */
    function hideAuthMonitor() {
        if (typeof window.AuthMonitor !== 'undefined' && window.AuthMonitor.hide) {
            window.AuthMonitor.hide();
            console.log("Monitor de autenticación desactivado");
        }
    }
    
    // API pública
    const publicAPI = {
        /**
         * Inicializa el módulo de conexión
         * @param {Object} domElements - Referencias a elementos DOM necesarios
         */
        init: function(domElements) {
            console.log('ConnectionHandler: Inicializando...');
            
            // Guardar referencias a elementos DOM
            elements = { ...elements, ...domElements };
            
            // Configurar listeners para botones principales
            if (elements.lowLevelConnectBtn) {
                elements.lowLevelConnectBtn.addEventListener('click', handleLowLevelConnect);
            }
            
            if (elements.lowLevelDisconnectBtn) {
                elements.lowLevelDisconnectBtn.addEventListener('click', handleLowLevelDisconnect);
            }
            
            if (elements.initializeBtn) {
                elements.initializeBtn.addEventListener('click', handleInitializeBatteries);
            }
            
            if (elements.modbusConnectBtn) {
                elements.modbusConnectBtn.addEventListener('click', handleModbusConnect);
            }
            
            if (elements.modbusDisconnectBtn) {
                elements.modbusDisconnectBtn.addEventListener('click', handleModbusDisconnect);
            }
            
            // Inicializar selector de baterías
            initBatterySelector();
            
            // Verificar estado inicial
            checkConnectionStatus().then(status => {
                console.log(`ConnectionHandler: Estado inicial - PyModbus: ${status.modbus}, Bajo nivel: ${status.lowLevel}`);
            });
            
            console.log('ConnectionHandler: Inicialización completada');
        },
        
        /**
         * Devuelve el estado actual de conexión PyModbus
         * @returns {boolean} - true si está conectado, false si no
         */
        isModbusConnected: function() {
            return modbusConnected;
        },
        
        /**
         * Devuelve el estado actual de conexión a bajo nivel
         * @returns {boolean} - true si está conectado, false si no
         */
        isLowLevelConnected: function() {
            return lowLevelConnected;
        },
        
        /**
         * Inicia el proceso de conexión a bajo nivel manualmente
         */
        connectLowLevel: handleLowLevelConnect,
        
        /**
         * Inicia el proceso de desconexión a bajo nivel manualmente
         */
        disconnectLowLevel: handleLowLevelDisconnect,
        
        /**
         * Inicia el proceso de inicialización de baterías manualmente
         */
        initializeBatteries: handleInitializeBatteries,
        
        /**
         * Inicia el proceso de conexión PyModbus manualmente
         */
        connectModbus: handleModbusConnect,
        
        /**
         * Inicia el proceso de desconexión PyModbus manualmente
         */
        disconnectModbus: handleModbusDisconnect,
        
        /**
         * Reintenta la inicialización de una batería específica
         * @param {number} batteryId - ID de la batería a reintentar
         * @returns {Promise} - Promesa que se resuelve con el resultado del reintento
         */
        retryBatteryInitialization: handleRetryBatteryInitialization,
        
        /**
         * Actualiza el estado de conexión sin iniciar la conexión/desconexión
         * @param {Object} state - Estado de conexión {modbus, lowLevel}
         */
        updateConnectionState: function(state) {
            if (state.modbus !== undefined && state.modbus !== modbusConnected) {
                modbusConnected = state.modbus;
                dispatchModbusConnectionEvent(modbusConnected);
            }
            
            if (state.lowLevel !== undefined && state.lowLevel !== lowLevelConnected) {
                lowLevelConnected = state.lowLevel;
                dispatchLowLevelConnectionEvent(lowLevelConnected);
            }
        }
    };
    
    // También exportar la función de reintento a window para uso global
    window.retryBatteryInitialization = handleRetryBatteryInitialization;
    
    return publicAPI;
})();

// Exportar para uso global
window.ConnectionHandler = ConnectionHandler;