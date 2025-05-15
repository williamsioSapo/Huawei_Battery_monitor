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
        deviceInfoSection: null
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
     * @param {boolean} connected - true si conectado, false si no
     */
    function updateConnectionUI(connected) {
        if (!sections.connectionStatusEl || !sections.connectionStatusText) return;
        
        console.log(`UiManager: Actualizando UI de conexión (conectado: ${connected})`);
        
        // Actualizar indicador de estado
        if (connected) {
            sections.connectionStatusEl.className = 'status-indicator connected';
            sections.connectionStatusText.textContent = 'Conectado';
        } else {
            sections.connectionStatusEl.className = 'status-indicator disconnected';
            sections.connectionStatusText.textContent = 'Desconectado';
        }
        
        // Mostrar/ocultar secciones basado en estado de conexión
        if (connected) {
            // MODIFICADO: Solo mostrar una vista activa a la vez (single o multi)
            // y solo si todas las baterías están autenticadas
            if (window.allBatteriesAuthenticated) {
                if (sections.batteryDashboardSection) {
                    sections.batteryDashboardSection.style.display = currentView === 'single' ? 'block' : 'none';
                }
                if (sections.multiBatterySection) {
                    sections.multiBatterySection.style.display = currentView === 'multi' ? 'block' : 'none';
                }
                
                // Mostrar siempre estas secciones cuando hay conexión y autenticación completa
                if (sections.readSection) sections.readSection.style.display = 'block';
                if (sections.writeSection) sections.writeSection.style.display = 'block';
                if (sections.deviceInfoSection) sections.deviceInfoSection.style.display = 'block';
            } else {
                // Si no están todas autenticadas, no mostrar nada
                if (sections.batteryDashboardSection) sections.batteryDashboardSection.style.display = 'none';
                if (sections.multiBatterySection) sections.multiBatterySection.style.display = 'none';
                if (sections.readSection) sections.readSection.style.display = 'none';
                if (sections.writeSection) sections.writeSection.style.display = 'none';
                if (sections.deviceInfoSection) sections.deviceInfoSection.style.display = 'none';
                
                // Mostrar el monitor de autenticación si está disponible
                if (window.AuthMonitor && window.AuthMonitor.show) {
                    window.AuthMonitor.show();
                }
            }
        } else {
            // Ocultar todas las secciones que requieren conexión
            if (sections.batteryDashboardSection) sections.batteryDashboardSection.style.display = 'none';
            if (sections.multiBatterySection) sections.multiBatterySection.style.display = 'none';
            if (sections.readSection) sections.readSection.style.display = 'none';
            if (sections.writeSection) sections.writeSection.style.display = 'none';
            if (sections.deviceInfoSection) sections.deviceInfoSection.style.display = 'none';
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
        if (sections.connectionSection) {
            const connectionButtons = sections.connectionSection.querySelector('.button-group');
            if (connectionButtons) {
                connectionButtons.parentNode.insertBefore(viewSelectorContainer, connectionButtons.nextSibling);
                console.log("UiManager: initViewSelector - Selector de vista añadido correctamente");
            } else {
                console.error("UiManager: initViewSelector - No se encontró .button-group en connectionSection");
            }
        } else {
            console.error("UiManager: initViewSelector - No se encontró connectionSection");
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
        
        // Verificar si hay conexión activa
        if (!window.ConnectionHandler || !window.ConnectionHandler.isConnected()) {
            console.log("UiManager: switchView - No se puede cambiar la vista porque no hay conexión activa");
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
                    
                    // Iniciar monitoreo automático si está disponible
                    const batteryDashboard = document.querySelector('#multi-battery-dashboard');
                    if (batteryDashboard) {
                        console.log("UiManager: switchView - Simulando inicio automático de monitoreo múltiple");
                        const startMonitoringBtn = batteryDashboard.querySelector('.start-btn');
                        if (startMonitoringBtn && !startMonitoringBtn.disabled) {
                            startMonitoringBtn.click();
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
        if (window.ConnectionHandler && window.ConnectionHandler.isConnected()) {
            updateConnectionUI(true);
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
            updateConnectionUI(false);
            
            // Inicializar estado de autenticación
            window.allBatteriesAuthenticated = false;
            
            // Escuchar eventos de cambio de estado de conexión
            document.addEventListener('connection-status-change', (e) => {
                console.log("UiManager: Evento 'connection-status-change' recibido:", e.detail);
                if (e && e.detail && typeof e.detail.connected !== 'undefined') {
                    updateConnectionUI(e.detail.connected);
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
         * @param {boolean} connected - Estado de conexión
         */
        updateConnectionStatus: function(connected) {
            updateConnectionUI(connected);
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
        showMessage: showMessage
    };
})();

// Exportar para uso global
window.UiManager = UiManager;