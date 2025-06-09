// static/js/uiManager.js

/**
 * Módulo para gestionar la interfaz de usuario y la visualización de paneles
 * Versión refactorizada para conexión única - sin PyModbus separado
 */
const UiManager = (function() {
    // Referencias a elementos DOM para secciones UI
    let sections = {
        connectionStatusEl: null,
        connectionStatusText: null,
        connectionSection: null,
        conexionUnicaSection: null,
        multiBatterySection: null,
        readSection: null,
        writeSection: null,
        deviceInfoSection: null
    };
    
    // Estado actual de la vista
    let currentView = 'single'; // 'single' o 'multi'
    
    // Estado de conexión unificado
    let conexionState = {
        conectado: false,
        sistemaCompleto: false
    };
    
    /**
     * Actualiza la UI basado en el estado de conexión única
     * @param {Object} estado - Estado de conexión {conectado, sistemaCompleto}
     */
    function updateConnectionUI(estado) {
        if (!sections.connectionStatusEl || !sections.connectionStatusText) return;
        
        const { conectado, sistemaCompleto } = estado || { conectado: false, sistemaCompleto: false };
        
        console.log(`UiManager: Actualizando UI de conexión (conectado: ${conectado}, sistema completo: ${sistemaCompleto})`);
        
        // Guardar estado interno
        conexionState = { conectado, sistemaCompleto };
        
        // Actualizar indicador de estado principal
        if (sistemaCompleto) {
            sections.connectionStatusEl.className = 'status-indicator connected';
            sections.connectionStatusText.textContent = 'Sistema Listo';
        } else if (conectado) {
            sections.connectionStatusEl.className = 'status-indicator partial';
            sections.connectionStatusText.textContent = 'Sistema Conectado';
        } else {
            sections.connectionStatusEl.className = 'status-indicator disconnected';
            sections.connectionStatusText.textContent = 'Desconectado';
        }
        
        // Mostrar/ocultar secciones basado en estado de conexión
        updateSectionVisibility(conectado, sistemaCompleto);
    }
    
    /**
     * Actualiza la visibilidad de secciones según el estado de conexión
     * @param {boolean} conectado - Si hay conexión base
     * @param {boolean} sistemaCompleto - Si el sistema está completamente listo
     */
    function updateSectionVisibility(conectado, sistemaCompleto) {
        // Secciones que siempre deben estar visibles
        if (sections.connectionSection) sections.connectionSection.style.display = 'block';
        if (sections.conexionUnicaSection) sections.conexionUnicaSection.style.display = 'block';
        
        // Secciones que requieren conexión base (conectado)
        if (conectado) {
            // Estas secciones se muestran cuando hay conexión base
            if (sections.readSection) sections.readSection.style.display = 'block';
            if (sections.writeSection) sections.writeSection.style.display = 'block';
            if (sections.deviceInfoSection) sections.deviceInfoSection.style.display = 'block';
            
            console.log('UiManager: Secciones operativas habilitadas (sistema conectado)');
        } else {
            // Ocultar secciones que requieren conexión
            if (sections.readSection) sections.readSection.style.display = 'none';
            if (sections.writeSection) sections.writeSection.style.display = 'none';
            if (sections.deviceInfoSection) sections.deviceInfoSection.style.display = 'none';
            
            console.log('UiManager: Secciones operativas deshabilitadas (sistema desconectado)');
        }
        
        // La sección multiBattery se mantiene oculta por defecto 
        // ya que ahora usamos ventana flotante para el dashboard
        if (sections.multiBatterySection) {
            sections.multiBatterySection.style.display = 'none';
        }
    }
    
    /**
     * Crea e inicializa el botón de dashboard
     */
    function initDashboardButton() {
        console.log("UiManager: initDashboardButton - Inicializando botón de dashboard...");
        
        // Verificar si el botón ya existe
        const existingBtn = document.getElementById('openDashboardBtn');
        if (existingBtn) {
            console.log("UiManager: Botón de dashboard ya existe, configurando evento");
            existingBtn.addEventListener('click', () => openDashboard());
            return;
        }
        
        // Si no existe, intentar crearlo dinámicamente (por compatibilidad)
        const conexionUnicaSection = sections.conexionUnicaSection || document.getElementById('conexion-unica-section');
        if (!conexionUnicaSection) {
            console.warn("UiManager: No se encontró sección de conexión única para añadir botón");
            return;
        }
        
        // Buscar contenedor de dashboard o crearlo
        let dashboardContainer = conexionUnicaSection.querySelector('.dashboard-access');
        if (!dashboardContainer) {
            dashboardContainer = document.createElement('div');
            dashboardContainer.className = 'dashboard-access';
            dashboardContainer.style.marginTop = '20px';
            dashboardContainer.innerHTML = `
                <h3>📊 Monitorización</h3>
                <p>Una vez conectado el sistema, acceda al dashboard de múltiples baterías:</p>
                <div class="view-selector">
                    <button class="dashboard-btn" id="openDashboardBtn" disabled>
                        🔄 Abrir Dashboard de Baterías
                    </button>
                </div>
            `;
            conexionUnicaSection.appendChild(dashboardContainer);
        }
        
        // Configurar evento del botón
        const dashboardBtn = dashboardContainer.querySelector('#openDashboardBtn');
        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', () => openDashboard());
            console.log("UiManager: Botón de dashboard creado y configurado");
        }
    }
    
    /**
     * Abre el dashboard de baterías
     */
    function openDashboard() {
        console.log("UiManager: Solicitando apertura de dashboard");
        
        // Verificar estado de conexión
        if (!conexionState.conectado) {
            console.log("UiManager: No se puede abrir dashboard - sin conexión");
            showMessage(
                sections.conexionUnicaSection?.querySelector('.message-area'),
                'Se requiere conexión activa para abrir el dashboard de baterías.',
                'error'
            );
            return;
        }
        
        // Verificar que MultiBatteryWindow esté disponible
        if (typeof window.MultiBatteryWindow === 'undefined') {
            console.error("UiManager: MultiBatteryWindow no está disponible");
            showMessage(
                sections.conexionUnicaSection?.querySelector('.message-area'),
                'Dashboard no disponible. Verifique la carga de scripts.',
                'error'
            );
            return;
        }
        
        console.log("UiManager: Abriendo dashboard de baterías en ventana flotante");
        
        // Abrir ventana flotante del dashboard
        const windowId = window.MultiBatteryWindow.open();
        
        if (windowId) {
            console.log("UiManager: Dashboard abierto exitosamente en ventana:", windowId);
            
            // Actualizar estado interno
            currentView = 'multi';
            
            // Disparar evento para compatibilidad con otros módulos
            document.dispatchEvent(new CustomEvent('view-changed', {
                detail: { view: 'multi', windowId: windowId }
            }));
        } else {
            console.error("UiManager: Error al abrir dashboard");
            showMessage(
                sections.conexionUnicaSection?.querySelector('.message-area'),
                'Error al abrir el dashboard de baterías.',
                'error'
            );
        }
    }
    
    /**
     * Cambia entre vistas (mantenido por compatibilidad)
     * @param {string} viewType - Tipo de vista ('single' o 'multi')
     */
    function switchView(viewType) {
        console.log(`UiManager: switchView - Solicitada vista: ${viewType}`);
        
        if (viewType === 'multi') {
            openDashboard();
        } else {
            console.log("UiManager: Vista 'single' - no se requiere acción especial");
            currentView = 'single';
        }
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
     * Actualiza el estado de autenticación (mantenido por compatibilidad)
     * @param {boolean} allAuthenticated - true si todas las baterías están autenticadas
     */
    function updateAuthenticationStatus(allAuthenticated) {
        console.log(`UiManager: updateAuthenticationStatus - Todas autenticadas: ${allAuthenticated}`);
        
        // En el nuevo sistema, esto se maneja automáticamente en ConnectionHandler
        // Pero mantenemos la función por compatibilidad
        
        // Actualizar estado global si es necesario
        if (typeof window.allBatteriesAuthenticated !== 'undefined') {
            window.allBatteriesAuthenticated = allAuthenticated;
        }
        
        // Si todas están autenticadas y hay conexión, considerar sistema completo
        if (allAuthenticated && conexionState.conectado) {
            updateConnectionUI({
                conectado: true,
                sistemaCompleto: true
            });
        }
    }
    
    /**
     * Actualiza el estado del botón de dashboard según la conexión
     * @param {boolean} enabled - true para habilitar, false para deshabilitar
     */
    function updateDashboardButtonState(enabled) {
        const dashboardBtn = document.getElementById('openDashboardBtn');
        if (dashboardBtn) {
            dashboardBtn.disabled = !enabled;
            
            if (enabled) {
                dashboardBtn.classList.add('ready');
                dashboardBtn.title = "Sistema listo. Click para abrir dashboard.";
            } else {
                dashboardBtn.classList.remove('ready');
                dashboardBtn.title = "Sistema debe estar conectado para abrir dashboard.";
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
            console.log('UiManager: Inicializando con conexión única...');
            
            // Guardar referencias a elementos DOM
            sections = { ...sections, ...domSections };
            
            // Inicializar botón de dashboard
            initDashboardButton();
            
            // Establecer estado inicial como desconectado
            updateConnectionUI({
                conectado: false,
                sistemaCompleto: false
            });
            
            // Establecer vista inicial
            currentView = 'single';
            
            // Escuchar eventos de cambio de estado de conexión única
            document.addEventListener('conexion-unica-status-change', (e) => {
                console.log("UiManager: Evento 'conexion-unica-status-change' recibido:", e.detail);
                if (e && e.detail) {
                    const { conectado, sistemaCompleto } = e.detail;
                    updateConnectionUI({ conectado, sistemaCompleto });
                    updateDashboardButtonState(conectado);
                }
            });
            
            // Mantener compatibilidad con eventos antiguos (deprecated)
            document.addEventListener('connection-status-change', (e) => {
                console.log("UiManager: Evento 'connection-status-change' recibido (deprecated):", e.detail);
                if (e && e.detail && typeof e.detail.connected !== 'undefined') {
                    updateConnectionUI({
                        conectado: e.detail.connected,
                        sistemaCompleto: e.detail.connected // Asumir completo si está conectado
                    });
                    updateDashboardButtonState(e.detail.connected);
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
         * @returns {string} - Tipo de vista actual
         */
        getCurrentView: function() {
            return currentView;
        },
        
        /**
         * Actualiza la UI de conexión manualmente
         * @param {Object} estado - Estado de conexión {conectado, sistemaCompleto}
         */
        updateConnectionStatus: function(estado) {
            updateConnectionUI(estado);
        },
        
        /**
         * Actualiza el estado de autenticación (compatibility)
         * @param {boolean} allAuthenticated - Estado de autenticación
         */
        updateAuthenticationStatus: updateAuthenticationStatus,
        
        /**
         * Muestra un mensaje en un elemento específico
         * @param {HTMLElement} element - Elemento donde mostrar el mensaje
         * @param {string} message - Mensaje a mostrar
         * @param {string} type - Tipo de mensaje
         */
        showMessage: showMessage,
        
        /**
         * Propiedad para indicar si el sistema está listo
         */
        get sistemaListo() {
            return conexionState.conectado && conexionState.sistemaCompleto;
        },
        
        /**
         * Propiedad para indicar si hay conexión (compatibility)
         */
        get allBatteriesAuthorized() {
            console.warn("UiManager.allBatteriesAuthorized deprecated. Use sistemaListo");
            return conexionState.sistemaCompleto;
        },
        
        /**
         * Estado actual de conexión
         */
        get conexionState() {
            return { ...conexionState };
        }
    };
})();

// Exportar para uso global
window.UiManager = UiManager;