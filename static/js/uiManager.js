// static/js/uiManager.js

/**
 * Módulo para gestionar la interfaz de usuario y la visualización de paneles
 * Maneja la presentación visual y el cambio entre vistas
 */
const UiManager = (function() {
    // Referencias a elementos DOM para secciones UI
    let sections = {
        connectionStatusEl: null,
        connectionStatusText: null,
        connectionSection: null,
        batteryDashboardSection: null,
        multiBatterySection: null,
        readSection: null,
        writeSection: null,
        deviceInfoSection: null,
        
        // Nuevas secciones para separación de conexiones
        lowLevelConnectionSection: null,
        modbusConnectionSection: null
    };
    
    // Referencias a elementos de selección de vista
    let viewControls = {
        singleViewBtn: null,
        multiViewBtn: null
    };
    
    // Estado actual de la vista
    let currentView = 'single'; // 'single' o 'multi'
    
    /**
     * Actualiza la UI basado en el estado de conexión
     * @param {Object} connections - Objeto con estados de conexión {lowLevel, modbus}
     */
    function updateConnectionUI(connections) {
        if (!sections.connectionStatusEl || !sections.connectionStatusText) return;
        
        const { lowLevel, modbus } = connections || { lowLevel: false, modbus: false };
        
        console.log(`UiManager: Actualizando UI de conexión (bajo nivel: ${lowLevel}, modbus: ${modbus})`);
        
        // Actualizar indicador de estado
        if (modbus) {
            sections.connectionStatusEl.className = 'status-indicator connected';
            sections.connectionStatusText.textContent = 'PyModbus Conectado';
        } else if (lowLevel) {
            sections.connectionStatusEl.className = 'status-indicator partial';
            sections.connectionStatusText.textContent = 'Bajo Nivel Conectado';
        } else {
            sections.connectionStatusEl.className = 'status-indicator disconnected';
            sections.connectionStatusText.textContent = 'Desconectado';
        }
        
        // Mostrar/ocultar secciones basado en estado de conexión
        
        // Secciones que requieren al menos conexión de bajo nivel
        if (lowLevel) {
            if (sections.lowLevelConnectionSection) sections.lowLevelConnectionSection.style.display = 'block';
        } else {
            // Si no hay conexión de bajo nivel, ocultar todo excepto la sección de conexión
            if (sections.lowLevelConnectionSection) sections.lowLevelConnectionSection.style.display = 'none';
        }
        
        // Secciones que requieren PyModbus conectado y autenticación completa
        if (modbus && window.allBatteriesAuthenticated) {
            if (sections.batteryDashboardSection) {
                sections.batteryDashboardSection.style.display = currentView === 'single' ? 'block' : 'none';
            }
            if (sections.multiBatterySection) {
                sections.multiBatterySection.style.display = currentView === 'multi' ? 'block' : 'none';
            }
            
            // Mostrar siempre estas secciones cuando hay conexión PyModbus y autenticación completa
            if (sections.readSection) sections.readSection.style.display = 'block';
            if (sections.writeSection) sections.writeSection.style.display = 'block';
            if (sections.deviceInfoSection) sections.deviceInfoSection.style.display = 'block';
        } else {
            // Ocultar todas las secciones que requieren PyModbus
            if (sections.batteryDashboardSection) sections.batteryDashboardSection.style.display = 'none';
            if (sections.multiBatterySection) sections.multiBatterySection.style.display = 'none';
            if (sections.readSection) sections.readSection.style.display = 'none';
            if (sections.writeSection) sections.writeSection.style.display = 'none';
            if (sections.deviceInfoSection) sections.deviceInfoSection.style.display = 'none';
            
            // Mostrar el monitor de autenticación si está disponible y hay conexión de bajo nivel
            if (lowLevel && !window.allBatteriesAuthenticated) {
                if (window.AuthMonitor && window.AuthMonitor.show) {
                    window.AuthMonitor.show();
                }
            }
        }
        
        // Actualizar la sección de conexión Modbus si existe
        if (sections.modbusConnectionSection) {
            sections.modbusConnectionSection.style.display = lowLevel ? 'block' : 'none';
        }
    }
    
    /**
     * Crea e inicializa el selector de vistas
     */
    function initViewSelector() {
        console.log("UiManager: initViewSelector - Inicializando selector de vista...");
        
        // Verificar si el selector ya existe para evitar duplicados
        if (document.querySelector('.view-selector')) {
            console.log("UiManager: initViewSelector - Selector de vista ya existe");
            return;
        }
        
        // Crear container para los botones de selección de vista
        const viewSelectorContainer = document.createElement('div');
        viewSelectorContainer.className = 'view-selector';
        viewSelectorContainer.style.marginTop = '15px';
        viewSelectorContainer.style.textAlign = 'center';
        
        // Crear botones para cambiar entre vistas
        const singleViewBtn = document.createElement('button');
        singleViewBtn.textContent = '👁️ Panel Individual';
        singleViewBtn.className = 'view-btn active';
        singleViewBtn.onclick = () => switchView('single');
        viewControls.singleViewBtn = singleViewBtn;
        
        const multiViewBtn = document.createElement('button');
        multiViewBtn.textContent = '🔄 Panel Múltiple';
        multiViewBtn.className = 'view-btn';
        multiViewBtn.onclick = () => switchView('multi');
        viewControls.multiViewBtn = multiViewBtn;
        
        // Añadir botones al container
        viewSelectorContainer.appendChild(singleViewBtn);
        viewSelectorContainer.appendChild(document.createTextNode(' '));
        viewSelectorContainer.appendChild(multiViewBtn);
        
        // Añadir container después de los botones de conexión
        if (sections.modbusConnectionSection) {
            const connectionButtons = sections.modbusConnectionSection.querySelector('.button-group');
            if (connectionButtons) {
                connectionButtons.parentNode.insertBefore(viewSelectorContainer, connectionButtons.nextSibling);
                console.log("UiManager: initViewSelector - Selector de vista añadido correctamente");
            } else {
                console.error("UiManager: initViewSelector - No se encontró .button-group en modbusConnectionSection");
            }
        } else if (sections.connectionSection) {
            const connectionButtons = sections.connectionSection.querySelector('.button-group');
            if (connectionButtons) {
                connectionButtons.parentNode.insertBefore(viewSelectorContainer, connectionButtons.nextSibling);
                console.log("UiManager: initViewSelector - Selector de vista añadido correctamente");
            } else {
                console.error("UiManager: initViewSelector - No se encontró .button-group en connectionSection");
            }
        } else {
            console.error("UiManager: initViewSelector - No se encontró sección de conexión");
        }
        
        // Establecer estilos CSS inline para los botones
        const btns = viewSelectorContainer.querySelectorAll('.view-btn');
        btns.forEach(btn => {
            btn.style.padding = '8px 15px';
            btn.style.marginRight = '10px';
            btn.style.border = '1px solid #ddd';
            btn.style.borderRadius = '4px';
            btn.style.backgroundColor = '#f8f9fa';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.2s';
        });
        
        // Aplicar estilo para botón activo
        updateViewButtonStyles();
        
        console.log("UiManager: initViewSelector - Selector de vista inicializado completamente");
    }
    
    /**
     * Actualiza los estilos de los botones según la vista activa
     */
    function updateViewButtonStyles() {
        // Reset all buttons
        const btns = document.querySelectorAll('.view-btn');
        btns.forEach(btn => {
            btn.classList.remove('active');
            btn.style.backgroundColor = '#f8f9fa';
            btn.style.color = '#333';
            btn.style.borderColor = '#ddd';
        });
        
        // Highlight active button
        if (currentView === 'single' && viewControls.singleViewBtn) {
            viewControls.singleViewBtn.classList.add('active');
            viewControls.singleViewBtn.style.backgroundColor = '#3498db';
            viewControls.singleViewBtn.style.color = 'white';
            viewControls.singleViewBtn.style.borderColor = '#2980b9';
        } else if (currentView === 'multi' && viewControls.multiViewBtn) {
            viewControls.multiViewBtn.classList.add('active');
            viewControls.multiViewBtn.style.backgroundColor = '#3498db';
            viewControls.multiViewBtn.style.color = 'white';
            viewControls.multiViewBtn.style.borderColor = '#2980b9';
        }
    }
    
    /**
     * Cambia entre vistas (panel individual o múltiple)
     * @param {string} viewType - Tipo de vista ('single' o 'multi')
     */
    function switchView(viewType) {
		console.log(`UiManager: switchView - Cambiando a vista: ${viewType}`);
		
		// NUEVO: Verificar si todas las baterías están autenticadas
		if (!window.allBatteriesAuthenticated) {
			console.log("UiManager: switchView - No se puede cambiar vista porque no todas las baterías están autenticadas");
			
			// Mostrar el monitor de autenticación
			if (window.AuthMonitor && window.AuthMonitor.show) {
				window.AuthMonitor.show();
			}
			
			return;
		}
		
		// Verificar si hay conexión PyModbus activa
		if (!window.ConnectionHandler || !window.ConnectionHandler.isModbusConnected()) {
			console.log("UiManager: switchView - No se puede cambiar la vista porque no hay conexión PyModbus activa");
			return;
		}
		
		// Actualizar el estado interno
		currentView = viewType;
		
		// Actualizar estilos de los botones
		updateViewButtonStyles();
		
		// Mostrar/ocultar secciones correspondientes
		if (viewType === 'single') {
			console.log("UiManager: switchView - Activando panel individual");
			
			// Mostrar panel individual y ocultar multi-batería
			if (sections.batteryDashboardSection) {
				sections.batteryDashboardSection.style.display = 'block';
				console.log("UiManager: switchView - Panel individual visible");
			}
			
			if (sections.multiBatterySection) {
				sections.multiBatterySection.style.display = 'none';
				console.log("UiManager: switchView - Panel múltiple oculto");
			}
			
			// Si hay un panel individual inicializado, actualizarlo
			if (typeof window.updateDashboard === 'function') {
				console.log("UiManager: switchView - Actualizando datos del panel individual");
				window.updateDashboard();
			}
			
			// Si hay monitoreo de panel múltiple activo, detenerlo
			if (typeof window.stopMonitoring === 'function') {
				console.log("UiManager: switchView - Deteniendo monitoreo de panel individual");
				window.stopMonitoring();
			}
			
		} else { // vista múltiple
			console.log("UiManager: switchView - Activando panel múltiple");
			
			// Mostrar multi-batería y ocultar panel individual
			if (sections.batteryDashboardSection) {
				sections.batteryDashboardSection.style.display = 'none';
				console.log("UiManager: switchView - Panel individual oculto");
			}
			
			if (sections.multiBatterySection) {
				sections.multiBatterySection.style.display = 'block';
				console.log("UiManager: switchView - Panel múltiple visible");
				
				// Actualizar el panel múltiple
				if (typeof window.updateMultiBatteryDashboard === 'function') {
					console.log("UiManager: switchView - Actualizando datos del panel múltiple");
					window.updateMultiBatteryDashboard({
						forceUpdate: true,
						initialLoading: false
					});
					
					// NUEVO: Mejor enfoque - llamar directamente a la función global si está disponible
					console.log("UiManager: switchView - Verificando si startMultiBatteryMonitoring está disponible");
					if (typeof window.startMultiBatteryMonitoring === 'function') {
						console.log("UiManager: switchView - Llamando directamente a startMultiBatteryMonitoring");
						window.startMultiBatteryMonitoring();
					} else {
						console.warn("UiManager: switchView - La función startMultiBatteryMonitoring no está disponible");
						
						// Mantener el intento de clic como fallback
						console.log("UiManager: switchView - Utilizando fallback: simulando inicio automático de monitoreo múltiple");
						const batteryDashboard = document.querySelector('#multi-battery-dashboard');
						if (batteryDashboard) {
							const startMonitoringBtn = batteryDashboard.querySelector('.start-btn');
							if (startMonitoringBtn && !startMonitoringBtn.disabled) {
								startMonitoringBtn.click();
							} else {
								console.warn("UiManager: switchView - No se encontró el botón .start-btn o está deshabilitado");
							}
						} else {
							console.warn("UiManager: switchView - No se encontró el contenedor #multi-battery-dashboard");
						}
					}
				}
			}
		}
		
		// Disparar evento personalizado para informar del cambio de vista
		document.dispatchEvent(new CustomEvent('view-changed', {
			detail: { view: viewType }
		}));
	}
    
    /**
     * Muestra un mensaje en un elemento específico
     * @param {HTMLElement} element - Elemento donde mostrar el mensaje
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de mensaje (success, error, info)
     */
    function showMessage(element, message, type = 'info') {
        if (!element) return;
        
        if (element.timeoutId) {
            clearTimeout(element.timeoutId);
        }
        
        element.textContent = message;
        element.className = `message-area ${type}`;
        
        // Auto-limpiar después de un tiempo
        element.timeoutId = setTimeout(() => {
            if (element.textContent === message) {
                element.textContent = '';
                element.className = 'message-area';
            }
        }, 5000);
    }
    
    /**
     * Actualiza el estado de autenticación de todas las baterías
     * @param {boolean} allAuthenticated - true si todas las baterías están autenticadas, false si no
     */
    function updateAuthenticationStatus(allAuthenticated) {
        console.log(`UiManager: updateAuthenticationStatus - Todas autenticadas: ${allAuthenticated}`);
        
        // Guardar estado global
        window.allBatteriesAuthenticated = allAuthenticated;
        
        // Actualizar UI basada en el nuevo estado
        if (window.ConnectionHandler) {
            const connections = {
                lowLevel: window.ConnectionHandler.isLowLevelConnected(),
                modbus: window.ConnectionHandler.isModbusConnected()
            };
            updateConnectionUI(connections);
        }
        
        // Actualizar estado de botones si es necesario
        updateModbusConnectButtonState(allAuthenticated);
    }
    
    /**
     * Actualiza el estado del botón de conexión PyModbus
     * @param {boolean} enabled - true para habilitar, false para deshabilitar
     */
    function updateModbusConnectButtonState(enabled) {
        // Buscar el botón de conexión PyModbus
        const modbusConnectBtn = document.getElementById('modbusConnectBtn');
        if (modbusConnectBtn) {
            // Habilitar solo si todas las baterías están autenticadas y no hay conexión PyModbus actual
            const modbusConnected = window.ConnectionHandler && window.ConnectionHandler.isModbusConnected();
            modbusConnectBtn.disabled = !enabled || modbusConnected;
            
            if (enabled && !modbusConnected) {
                modbusConnectBtn.classList.add('ready');
                
                // Añadir tooltip o indicador visual
                modbusConnectBtn.title = "Baterías autenticadas correctamente. Listo para conectar PyModbus.";
            } else {
                modbusConnectBtn.classList.remove('ready');
                
                if (!enabled) {
                    modbusConnectBtn.title = "Todas las baterías deben estar autenticadas antes de conectar PyModbus.";
                } else {
                    modbusConnectBtn.title = "";
                }
            }
        }
    }
    
    // API pública
    return {
        /**
         * Inicializa el gestor de UI
         * @param {Object} domSections - Referencias a secciones DOM
         */
        init: function(domSections) {
            console.log('UiManager: Inicializando...');
            
            // Guardar referencias a elementos DOM
            sections = { ...sections, ...domSections };
            
            // Inicializar selector de vista
            initViewSelector();
            
            // Establecer estado inicial como desconectado
            updateConnectionUI({
                lowLevel: false,
                modbus: false
            });
            
            // Inicializar estado de autenticación
            window.allBatteriesAuthenticated = false;
            
            // Escuchar eventos de cambio de estado de conexión
            document.addEventListener('low-level-connection-status-change', (e) => {
                console.log("UiManager: Evento 'low-level-connection-status-change' recibido:", e.detail);
                if (e && e.detail && typeof e.detail.connected !== 'undefined') {
                    // Obtener también el estado modbus para actualización completa
                    const modbusConnected = window.ConnectionHandler ? 
                                            window.ConnectionHandler.isModbusConnected() : false;
                                            
                    updateConnectionUI({
                        lowLevel: e.detail.connected,
                        modbus: modbusConnected
                    });
                }
            });
            
            document.addEventListener('modbus-connection-status-change', (e) => {
                console.log("UiManager: Evento 'modbus-connection-status-change' recibido:", e.detail);
                if (e && e.detail && typeof e.detail.connected !== 'undefined') {
                    // Obtener también el estado de bajo nivel para actualización completa
                    const lowLevelConnected = window.ConnectionHandler ? 
                                             window.ConnectionHandler.isLowLevelConnected() : false;
                                             
                    updateConnectionUI({
                        lowLevel: lowLevelConnected,
                        modbus: e.detail.connected
                    });
                }
            });
            
            // Por compatibilidad, mantener también el evento original
            document.addEventListener('connection-status-change', (e) => {
                console.log("UiManager: Evento 'connection-status-change' recibido:", e.detail);
                if (e && e.detail && typeof e.detail.connected !== 'undefined') {
                    // Este evento ahora se considera PyModbus, para mantener compatibilidad
                    const lowLevelConnected = window.ConnectionHandler ? 
                                             window.ConnectionHandler.isLowLevelConnected() : false;
                    
                    updateConnectionUI({
                        lowLevel: lowLevelConnected,
                        modbus: e.detail.connected
                    });
                }
            });
            
            console.log('UiManager: Inicialización completada');
        },
        
        /**
         * Cambia la vista actual
         * @param {string} viewType - Tipo de vista ('single' o 'multi')
         */
        switchView: switchView,
        
        /**
         * Obtiene la vista actual
         * @returns {string} - Tipo de vista actual ('single' o 'multi')
         */
        getCurrentView: function() {
            return currentView;
        },
        
        /**
         * Actualiza la UI de conexión manualmente
         * @param {Object} connections - Estados de conexión {lowLevel, modbus}
         */
        updateConnectionStatus: function(connections) {
            updateConnectionUI(connections);
        },
        
        /**
         * Actualiza el estado de autenticación de todas las baterías
         * @param {boolean} allAuthenticated - true si todas las baterías están autenticadas, false si no
         */
        updateAuthenticationStatus: updateAuthenticationStatus,
        
        /**
         * Muestra un mensaje en un elemento específico
         * @param {HTMLElement} element - Elemento donde mostrar el mensaje
         * @param {string} message - Mensaje a mostrar
         * @param {string} type - Tipo de mensaje (success, error, info)
         */
        showMessage: showMessage,
        
        /**
         * Propiedad para indicar si todas las baterías están autenticadas
         * (para acceso desde otros módulos)
         */
        get allBatteriesAuthorized() {
            return window.allBatteriesAuthenticated || false;
        }
    };
})();

// Exportar para uso global
window.UiManager = UiManager;