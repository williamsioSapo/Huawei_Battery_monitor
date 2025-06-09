// static/js/connectionHandler.js

/**
 * Módulo para gestionar la conexión única con dispositivos y el estado de conexión
 * Versión refactorizada - Solo conexión unificada, sin PyModbus separado
 */
const ConnectionHandler = (function() {
    // Estado interno - SIMPLIFICADO a una sola conexión
    let conexionUnicaEstablecida = false;
    let procesoInicializacionActivo = false;
    
    // Referencias a elementos DOM críticos para la conexión
    let elements = {
        // Elementos para conexión única
        conexionUnicaConnectBtn: null,
        conexionUnicaDisconnectBtn: null,
        initializeBtn: null,
        openDashboardBtn: null,
        
        // Elementos comunes
        messageEl: null,
        
        // Elementos de estado visual
        comunicacionStatus: null,
        bateriasStatus: null,
        sistemaStatus: null,
        
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
     * Actualiza los elementos de estado visual
     * @param {Object} estados - Estados a actualizar
     */
    function updateStatusElements(estados) {
        if (elements.comunicacionStatus && estados.comunicacion !== undefined) {
            elements.comunicacionStatus.textContent = estados.comunicacion;
            elements.comunicacionStatus.className = estados.comunicacion === 'Conectado' ? 'status-value connected' : 'status-value disconnected';
        }
        
        if (elements.bateriasStatus && estados.baterias !== undefined) {
            elements.bateriasStatus.textContent = estados.baterias;
            const classList = estados.baterias === 'Completado' ? 'status-value success' : 
                            estados.baterias === 'En progreso' ? 'status-value warning' : 'status-value';
            elements.bateriasStatus.className = classList;
        }
        
        if (elements.sistemaStatus && estados.sistema !== undefined) {
            elements.sistemaStatus.textContent = estados.sistema;
            elements.sistemaStatus.className = estados.sistema === 'Sí' ? 'status-value success' : 'status-value';
        }
    }
    
    /**
     * Maneja el proceso completo de conexión única
     * Incluye conexión + inicialización automática
     */
    async function handleConexionUnicaConnect() {
        if (!elements.conexionUnicaConnectBtn) return;
        
        // Deshabilitar botones durante la operación
        elements.conexionUnicaConnectBtn.disabled = true;
        procesoInicializacionActivo = true;
        
        // Obtener parámetros de conexión
        const params = getConnectionParams();
        
        // Mostrar mensaje inicial
        Utils.showMessage(elements.messageEl, 'Iniciando conexión al sistema de baterías...', 'info');
        updateStatusElements({
            comunicacion: 'Conectando...',
            baterias: 'Esperando...',
            sistema: 'No'
        });
        
        try {
            // PASO 1: Establecer conexión base
            Utils.logInfo("Paso 1: Estableciendo conexión base", "ConnectionHandler");
            const connectionResult = await conectarSistema(params);
            
            if (connectionResult.status !== 'success' && connectionResult.status !== 'warning') {
                throw new Error(connectionResult.message || 'Error en conexión base');
            }
            
            // Actualizar estado de conexión
            conexionUnicaEstablecida = true;
            updateStatusElements({
                comunicacion: 'Conectado',
                baterias: 'Iniciando...'
            });
            
            Utils.showMessage(elements.messageEl, 'Conexión establecida. Inicializando baterías...', 'info');
            Utils.logInfo("Conexión base establecida exitosamente", "ConnectionHandler");
            
            // Mostrar monitor de autenticación
            showAuthMonitor();
            
            // PASO 2: Inicializar baterías automáticamente
            Utils.logInfo("Paso 2: Inicializando baterías automáticamente", "ConnectionHandler");
            const initResult = await lowLevelInitialize();
            
            updateStatusElements({
                baterias: 'Procesando...'
            });
            
            // Verificar resultado de inicialización
            if (initResult.status === 'success' || initResult.status === 'warning') {
                // Verificar si todas las baterías están autenticadas
                if (initResult.all_authenticated === true) {
                    Utils.logInfo("¡SISTEMA COMPLETAMENTE LISTO! Todas las baterías autenticadas", "ConnectionHandler");
                    
                    updateStatusElements({
                        baterias: 'Completado',
                        sistema: 'Sí'
                    });
                    
                    Utils.showMessage(elements.messageEl, 
                        `✅ Sistema listo. ${initResult.message}`, 'success');
                    
                    // Disparar evento de sistema listo
                    dispatchConexionUnicaEvent(true, true);
                    
                    // Ocultar monitor después de un tiempo
                    setTimeout(() => {
                        hideAuthMonitor();
                    }, 3000);
                    
                } else {
                    // Hay baterías sin autenticar
                    Utils.logWarn("Sistema conectado pero con baterías sin autenticar", "ConnectionHandler");
                    
                    updateStatusElements({
                        baterias: 'Parcial',
                        sistema: 'Parcial'
                    });
                    
                    Utils.showMessage(elements.messageEl, 
                        `⚠️ ${initResult.message}. Verifique el monitor de autenticación.`, 'warning');
                    
                    // Disparar evento parcial
                    dispatchConexionUnicaEvent(true, false);
                    
                    // Mantener monitor visible si se requiere acción
                    if (initResult.auth_requires_action && window.AuthMonitor && window.AuthMonitor.setRequiresAction) {
                        window.AuthMonitor.setRequiresAction(
                            initResult.auth_requires_action, 
                            initResult.failed_batteries || []
                        );
                    }
                }
            } else {
                throw new Error(initResult.message || 'Error en inicialización de baterías');
            }
            
        } catch (error) {
            Utils.logError(`Error en conexión única: ${error.message}`, "ConnectionHandler");
            
            // Actualizar estado de error
            conexionUnicaEstablecida = false;
            updateStatusElements({
                comunicacion: 'Error',
                baterias: 'Fallido',
                sistema: 'No'
            });
            
            Utils.showMessage(elements.messageEl, `❌ Error: ${error.message}`, 'error');
            
            // Disparar evento de desconexión
            dispatchConexionUnicaEvent(false, false);
            
        } finally {
            // Actualizar estado de botones
            procesoInicializacionActivo = false;
            updateButtonStates();
        }
    }
    /**
     * Maneja el proceso de desconexión única
     */
    async function handleConexionUnicaDisconnect() {
        if (!elements.conexionUnicaDisconnectBtn) return;
        
        // Deshabilitar botones durante la operación
        elements.conexionUnicaDisconnectBtn.disabled = true;
        
        Utils.showMessage(elements.messageEl, 'Desconectando sistema...', 'info');
        updateStatusElements({
            comunicacion: 'Desconectando...',
            baterias: 'Deteniendo...',
            sistema: 'No'
        });
        
        try {
            // Desconectar sistema
            const result = await desconectarSistema();
            
            Utils.showMessage(elements.messageEl, result.message, result.status);
            
            // Actualizar estado interno
            conexionUnicaEstablecida = false;
            updateStatusElements({
                comunicacion: 'Desconectado',
                baterias: 'No iniciado',
                sistema: 'No'
            });
            
            // Ocultar monitor de autenticación
            hideAuthMonitor();
            
            // Disparar evento de desconexión
            dispatchConexionUnicaEvent(false, false);
            
        } catch (error) {
            Utils.showMessage(elements.messageEl, `Error: ${error.message}`, 'error');
            Utils.logError(`Error en desconexión: ${error.message}`, "ConnectionHandler");
        } finally {
            // Actualizar estado de botones
            updateButtonStates();
        }
    }
    
    /**
     * Maneja reinicialización manual de baterías
     */
    async function handleReinicializarBaterias() {
        if (!elements.initializeBtn || !conexionUnicaEstablecida) return;
        
        elements.initializeBtn.disabled = true;
        procesoInicializacionActivo = true;
        
        // Mostrar monitor de autenticación
        showAuthMonitor();
        
        Utils.showMessage(elements.messageEl, 'Reinicializando baterías...', 'info');
        updateStatusElements({
            baterias: 'Reiniciando...',
            sistema: 'No'
        });
        
        try {
            const result = await inicializarBaterias();
            
            if (result.all_authenticated === true) {
                updateStatusElements({
                    baterias: 'Completado',
                    sistema: 'Sí'
                });
                
                Utils.showMessage(elements.messageEl, `✅ ${result.message}`, 'success');
                
                // Ocultar monitor después de un tiempo
                setTimeout(() => {
                    hideAuthMonitor();
                }, 3000);
                
            } else {
                updateStatusElements({
                    baterias: 'Parcial',
                    sistema: 'Parcial'
                });
                
                Utils.showMessage(elements.messageEl, `⚠️ ${result.message}`, 'warning');
                
                // Mantener monitor visible si se requiere acción
                if (result.auth_requires_action && window.AuthMonitor && window.AuthMonitor.setRequiresAction) {
                    window.AuthMonitor.setRequiresAction(
                        result.auth_requires_action, 
                        result.failed_batteries || []
                    );
                }
            }
            
        } catch (error) {
            updateStatusElements({
                baterias: 'Fallido'
            });
            
            Utils.showMessage(elements.messageEl, `❌ Error: ${error.message}`, 'error');
            Utils.logError(`Error en reinicialización: ${error.message}`, "ConnectionHandler");
            
        } finally {
            procesoInicializacionActivo = false;
            updateButtonStates();
        }
    }
    
    /**
     * Maneja la apertura del dashboard
     */
    function handleOpenDashboard() {
        if (!conexionUnicaEstablecida) {
            Utils.showMessage(elements.messageEl, 'Sistema debe estar conectado para abrir dashboard', 'warning');
            return;
        }
        
        // Verificar que MultiBatteryWindow esté disponible
        if (typeof window.MultiBatteryWindow === 'undefined') {
            Utils.showMessage(elements.messageEl, 'Dashboard no disponible. Verifique la carga de scripts.', 'error');
            return;
        }
        
        // Abrir dashboard
        const windowId = window.MultiBatteryWindow.open();
        if (windowId) {
            Utils.logInfo("Dashboard abierto exitosamente", "ConnectionHandler");
        } else {
            Utils.showMessage(elements.messageEl, 'Error al abrir dashboard', 'error');
        }
    }
    
    /**
     * Reintenta la inicialización de una batería específica
     */
    function handleRetryBatteryInitialization(batteryId) {
        if (!batteryId || !conexionUnicaEstablecida) {
            return Promise.reject(new Error("Sistema no conectado o ID de batería inválido"));
        }
        
        return new Promise(async (resolve, reject) => {
            try {
                Utils.showMessage(elements.messageEl, `Reintentando batería ${batteryId}...`, 'info');
                
                const result = await reintentarBateria(batteryId);
                
                if (result.status === 'success') {
                    Utils.showMessage(elements.messageEl, result.message, 'success');
                    
                    // Actualizar estado si todas están autenticadas
                    if (result.all_authenticated) {
                        updateStatusElements({
                            baterias: 'Completado',
                            sistema: 'Sí'
                        });
                        
                        setTimeout(() => {
                            hideAuthMonitor();
                        }, 3000);
                    }
                    
                    resolve(result);
                } else {
                    Utils.showMessage(elements.messageEl, result.message, 'error');
                    reject(new Error(result.message));
                }
            } catch (error) {
                Utils.showMessage(elements.messageEl, `Error al reintentar: ${error.message}`, 'error');
                reject(error);
            }
        });
    }
    
    /**
     * Actualiza el estado de los botones según el estado de conexión
     */
    function updateButtonStates() {
        // Botón de conexión principal
        if (elements.conexionUnicaConnectBtn) {
            elements.conexionUnicaConnectBtn.disabled = conexionUnicaEstablecida || procesoInicializacionActivo;
        }
        
        // Botón de desconexión
        if (elements.conexionUnicaDisconnectBtn) {
            elements.conexionUnicaDisconnectBtn.disabled = !conexionUnicaEstablecida;
        }
        
        // Botón de reinicialización
        if (elements.initializeBtn) {
            elements.initializeBtn.disabled = !conexionUnicaEstablecida || procesoInicializacionActivo;
        }
        
        // Botón de dashboard
        if (elements.openDashboardBtn) {
            elements.openDashboardBtn.disabled = !conexionUnicaEstablecida;
        }
    }
    
    /**
     * Dispara un evento de cambio de estado de conexión única
     */
    function dispatchConexionUnicaEvent(conectado, sistemaCompleto) {
        Utils.logInfo(`Disparando evento conexion-unica-status-change (conectado: ${conectado}, completo: ${sistemaCompleto})`, "ConnectionHandler");
        
        // Actualizar estado de los botones
        updateButtonStates();
        
        // Disparar evento unificado
        document.dispatchEvent(new CustomEvent('conexion-unica-status-change', {
            detail: { 
                conectado: conectado,
                sistemaCompleto: sistemaCompleto
            }
        }));
        
        // Mantener compatibilidad con eventos anteriores
        document.dispatchEvent(new CustomEvent('connection-status-change', {
            detail: { connected: conectado }
        }));
    }
    
    /**
     * Muestra/Oculta monitor de autenticación
     */
    function showAuthMonitor() {
        if (typeof window.AuthMonitor !== 'undefined' && window.AuthMonitor.show) {
            window.AuthMonitor.show();
            Utils.logInfo("Monitor de autenticación activado", "ConnectionHandler");
        }
    }
    
    function hideAuthMonitor() {
        if (typeof window.AuthMonitor !== 'undefined' && window.AuthMonitor.hide) {
            window.AuthMonitor.hide();
            Utils.logInfo("Monitor de autenticación desactivado", "ConnectionHandler");
        }
    }
    
    /**
     * Inicializa el selector de baterías disponibles
     */
    async function initBatterySelector() {
        if (!elements.slaveIdSelect) return;
        
        try {
            const result = await getAvailableBatteries();
            
            if (result && result.batteries && Array.isArray(result.batteries)) {
                elements.slaveIdSelect.innerHTML = '';
                
                result.batteries.forEach(id => {
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = `Batería ${id}`;
                    
                    if (id === result.default_id) {
                        option.selected = true;
                    }
                    
                    elements.slaveIdSelect.appendChild(option);
                });
            }
        } catch (error) {
            Utils.logError(`Error al cargar baterías disponibles: ${error}`, "ConnectionHandler");
            elements.slaveIdSelect.innerHTML = '<option value="217">Batería 217</option>';
        }
    }
    
    /**
     * Comprueba el estado actual de conexión con el backend
     */
    async function checkConnectionStatus() {
        try {
            const result = await checkStatus();
            
            if (result.connected !== conexionUnicaEstablecida) {
                conexionUnicaEstablecida = result.connected;
                dispatchConexionUnicaEvent(conexionUnicaEstablecida, result.all_authenticated || false);
            }
            
            return { 
                conectado: conexionUnicaEstablecida,
                sistemaCompleto: result.all_authenticated || false
            };
        } catch (error) {
            Utils.logError(`Error al verificar estado de conexión: ${error}`, "ConnectionHandler");
            return { 
                conectado: false,
                sistemaCompleto: false
            };
        }
    }
    
    // API pública
    const publicAPI = {
        /**
         * Inicializa el módulo de conexión única
         */
        init: function(domElements) {
            Utils.logInfo('Inicializando ConnectionHandler (Conexión Única)...', "ConnectionHandler");
            
            // Guardar referencias a elementos DOM
            elements = { ...elements, ...domElements };
            
            // Configurar listeners para botones principales
            if (elements.conexionUnicaConnectBtn) {
                elements.conexionUnicaConnectBtn.addEventListener('click', handleConexionUnicaConnect);
            }
            
            if (elements.conexionUnicaDisconnectBtn) {
                elements.conexionUnicaDisconnectBtn.addEventListener('click', handleConexionUnicaDisconnect);
            }
            
            if (elements.initializeBtn) {
                elements.initializeBtn.addEventListener('click', handleReinicializarBaterias);
            }
            
            if (elements.openDashboardBtn) {
                elements.openDashboardBtn.addEventListener('click', handleOpenDashboard);
            }
            
            // Inicializar selector de baterías
            initBatterySelector();
            
            // Verificar estado inicial
            checkConnectionStatus().then(status => {
                Utils.logInfo(`Estado inicial - Conectado: ${status.conectado}, Sistema completo: ${status.sistemaCompleto}`, "ConnectionHandler");
                
                updateStatusElements({
                    comunicacion: status.conectado ? 'Conectado' : 'Desconectado',
                    baterias: status.sistemaCompleto ? 'Completado' : 'No iniciado',
                    sistema: status.sistemaCompleto ? 'Sí' : 'No'
                });
            });
            
            Utils.logInfo('Inicialización completada', "ConnectionHandler");
        },
        
        /**
         * Estado de conexión única
         */
        isConexionUnicaConnected: function() {
            return conexionUnicaEstablecida;
        },
        
        /**
         * Métodos manuales
         */
        conectarSistema: handleConexionUnicaConnect,
        desconectarSistema: handleConexionUnicaDisconnect,
        reinicializarBaterias: handleReinicializarBaterias,
        abrirDashboard: handleOpenDashboard,
        retryBatteryInitialization: handleRetryBatteryInitialization,
        
        // Métodos de compatibilidad (deprecated pero mantenidos temporalmente)
        isLowLevelConnected: function() {
            Utils.logWarn("Método isLowLevelConnected() deprecated. Use isConexionUnicaConnected()", "ConnectionHandler");
            return conexionUnicaEstablecida;
        },
        
        isModbusConnected: function() {
            Utils.logWarn("Método isModbusConnected() deprecated. Use isConexionUnicaConnected()", "ConnectionHandler");
            return conexionUnicaEstablecida;
        }
    };
    
    // Exportar función de reintento para uso global
    window.retryBatteryInitialization = handleRetryBatteryInitialization;
    
    return publicAPI;
})();

// Exportar para uso global
window.ConnectionHandler = ConnectionHandler;