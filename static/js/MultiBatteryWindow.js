// static/js/MultiBatteryWindow.js
'use strict';

/**
 * MultiBatteryWindow - Dashboard de Múltiples Baterías como Ventana Flotante
 * VERSIÓN CORREGIDA: Gauge en header, optimización de espacios, baterías en grid
 */
const MultiBatteryWindow = (function($) {
    'use strict';
    
    // ========== VARIABLES PRIVADAS ==========
    
    let windowId = null;
    let isWindowOpen = false;
    let isMonitoring = false;
    let updateIntervalId = null;
    let lastUpdateTimestamp = null;
    let batteriesData = [];
    
    // Variables para gauge y toggle button
    let systemCurrentGauge = null;
    let monitoringButtonState = {
        isMonitoring: false,
        isLoading: false
    };
    
    // Estado interno del dashboard
    let dashboardState = {
        isInitialLoading: false,
        hasError: false,
        errorMessage: '',
        loadingProgress: null
    };
    
    // ========== CREACIÓN DE CONTENIDO HTML CON GAUGE EN HEADER ==========
    
    /**
     * Genera el HTML moderno del dashboard con gauge integrado en header
     */
    function generateModernContent() {
        return `
            <div class="multi-battery-dashboard-window modern-dashboard">
                <!-- Header con gauge integrado -->
                <div class="modern-dashboard-header compact with-gauge">
                    <div class="header-left">
                        <h3 class="modern-title">🔋 Panel de Baterías</h3>
						<span>Ultima Actualizacion:</span>
						<span class="last-update-time" id="last-update-display">--:--:--</span>
                    </div>
                    
						 <div class="header-center">
							<div class="current-gauge-compact" id="system-current-gauge">
								<!-- Gauge aquí -->
							</div>
							<span class="current-value" id="gauge-current-value">0.0A</span>
						</div>
                    
                    <div class="header-right">
                        <div class="header-controls">
                            
                            <button class="modern-toggle-btn" id="monitoring-toggle">
                                <span class="toggle-icon">⏹️</span>
                                <span class="toggle-text">Detener</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="error-message" id="window-error-message" style="display: none;"></div>
                
                <div class="loading-container" id="window-loading-container" style="display: none;">
                    <p>Cargando datos de baterías...</p>
                    <div class="loading-progress" id="loading-progress"></div>
                </div>
                
                <!-- Contenido principal solo para baterías -->
                <div class="main-content">
                    <div class="batteries-grid" id="batteries-grid">
                        <!-- Solo baterías aquí -->
                    </div>
                </div>
            </div>
        `;
    }
    
    // ========== GESTIÓN DEL GAUGE DE CORRIENTE TOTAL EN HEADER ==========
    
    /**
     * CORREGIDO: Inicializa el gauge de corriente en el header
     */
    function initializeCurrentGauge() {
        console.log('MultiBatteryWindow: Inicializando gauge en header...');
        
        const gaugeContainer = $(`#${windowId} #system-current-gauge`);
        if (!gaugeContainer.length) {
            console.error('MultiBatteryWindow: No se encontró contenedor del gauge en header');
            return false;
        }
        
        try {
            systemCurrentGauge = new CurrentGauge({
                minValue: -100,
                maxValue: 100,
                size: 120,
                strokeWidth: 8,
                compact: true,
                headerMode: true,  // Modo header
                showLabels: true,
                showTicks: true,
                neutralZone: 1,
                animationDuration: 400,
                onUpdate: (value) => {
                    updateGaugeValueDisplay(value);
                }
            });
            
            const initialized = systemCurrentGauge.init('system-current-gauge');
            if (initialized) {
                console.log('MultiBatteryWindow: Gauge en header inicializado correctamente');
                return true;
            } else {
                console.error('MultiBatteryWindow: Error al inicializar gauge en header');
                systemCurrentGauge = null;
                return false;
            }
        } catch (error) {
            console.error('MultiBatteryWindow: Error creando gauge en header:', error);
            systemCurrentGauge = null;
            return false;
        }
    }
    
    /**
     * NUEVO: Actualiza el display de valor del gauge con formato optimizado
     */
    function updateGaugeValueDisplay(value) {
        const $valueDisplay = $(`#${windowId} #gauge-current-value`);
        if ($valueDisplay.length) {
            let displayText;
            if (value > 0) {
                displayText = `+${value.toFixed(1)}A`;  // +40.5A
            } else if (value < 0) {
                displayText = `${value.toFixed(1)}A`;   // -25.3A (ya tiene el -)
            } else {
                displayText = '0.0A';                   // 0.0A
            }
            
            $valueDisplay.text(displayText);
            
            // Actualizar clases de estado
            $valueDisplay.removeClass('charging discharging neutral');
            if (value > 1) {
                $valueDisplay.addClass('charging');
            } else if (value < -1) {
                $valueDisplay.addClass('discharging');
            } else {
                $valueDisplay.addClass('neutral');
            }
        }
    }
    
    /**
     * CORREGIDO: Actualiza el gauge de corriente total del sistema
     */
    function updateSystemCurrentGauge(batteriesData) {
        if (!systemCurrentGauge || !batteriesData || !Array.isArray(batteriesData)) {
            return;
        }
        
        const totalCurrent = batteriesData.reduce((sum, battery) => {
            const current = battery.current || 0;
            return sum + current;
        }, 0);
        
        systemCurrentGauge.updateValue(totalCurrent);
        console.log(`MultiBatteryWindow: Gauge actualizado con corriente total: ${totalCurrent.toFixed(1)}A`);
    }
    
    // ========== GESTIÓN DE ESTADO DEL TOGGLE BUTTON ==========
    
    /**
     * Actualiza el estado visual del botón de toggle
     */
    function updateToggleButton(state) {
        const $toggleBtn = $(`#${windowId} #monitoring-toggle`);
        if (!$toggleBtn.length) return;
        
        const $icon = $toggleBtn.find('.toggle-icon');
        const $text = $toggleBtn.find('.toggle-text');
        
        $toggleBtn.removeClass('stopped monitoring loading');
        
        switch (state) {
            case 'stopped':
                $toggleBtn.addClass('stopped');
                $icon.text('▶️');
                $text.text('Iniciar');
                monitoringButtonState.isMonitoring = false;
                monitoringButtonState.isLoading = false;
                break;
            case 'loading':
                $toggleBtn.addClass('loading');
                $icon.text('⏳');
                $text.text('Iniciando...');
                monitoringButtonState.isLoading = true;
                break;
            case 'monitoring':
                $toggleBtn.addClass('monitoring');
                $icon.text('⏹️');
                $text.text('Detener');
                monitoringButtonState.isMonitoring = true;
                monitoringButtonState.isLoading = false;
                break;
        }
    }
    
    // ========== GESTIÓN DE DATOS DE BATERÍAS (SOLO BATERÍAS) ==========
    
    /**
     * CORREGIDO: Actualiza el grid SOLO con baterías (gauge está en header)
     */
    function updateBatteriesGrid() {
        if (!windowId) return;
        
        const $grid = $(`#${windowId} .batteries-grid`);
        if (!$grid.length) {
            console.warn('MultiBatteryWindow: No se encontró grid de baterías');
            return;
        }
        
        console.log("DEBUG: updateBatteriesGrid llamado");
        console.log("DEBUG: batteriesData length:", batteriesData ? batteriesData.length : 'undefined');
        
        // Mostrar mensaje si no hay datos
        if (!batteriesData || batteriesData.length === 0) {
            if ($grid.find('.no-data-message').length === 0) {
                $grid.html('<div class="no-data-message">' + 
                          (isMonitoring ? 'Esperando datos...' : 'Inicie el monitoreo para comenzar.') + '</div>');
            }
            return;
        }
        
        // Limpiar mensajes de "no data" y paneles antiguos
        $grid.find('.no-data-message').remove();
        $grid.find('.battery-panel-container').remove(); // Solo baterías
        
        // Mostrar todas las baterías
        const filteredBatteries = batteriesData;
        
        console.log("DEBUG: Creando paneles para", filteredBatteries.length, "baterías");
        
        // Crear paneles para cada batería
        filteredBatteries.forEach(function(batteryData) {
            const statusClass = Utils.getBatteryStatusClass(batteryData);
            
            // Usar la función global para crear paneles
            if (typeof window.createBatteryPanel === 'function') {
                window.createBatteryPanel($grid, batteryData, statusClass, function(batteryId) {
                    // Función para mostrar detalle al hacer clic
                    if (typeof window.showBatteryDetail === 'function') {
                        window.showBatteryDetail(batteryId);
                    } else {
                        console.warn("MultiBatteryWindow: Función showBatteryDetail no disponible");
                    }
                });
            } else {
                console.error("MultiBatteryWindow: createBatteryPanel no disponible");
            }
        });
        
        console.log("DEBUG: Paneles de baterías creados");
    }
    
    // ========== GESTIÓN DE MONITOREO ==========
    
    /**
     * Actualiza el display de última actualización
     */
	function updateLastUpdateDisplay(timestamp) {
		if (!windowId) return;
		
		const displayElement = $(`#${windowId} #last-update-display`);
		if (!displayElement.length) return;
		
		// Usar la función Utils existente
		const formattedTime = Utils.formatTimestamp(timestamp, false, '--:--:--');
		displayElement.text(formattedTime);
	}
    
    /**
     * Inicia el monitoreo de baterías
     */
    function startWindowMonitoring() {
        console.log("MultiBatteryWindow: Iniciando monitoreo...");
        
        // Verificar conexión
        if (!window.ConnectionHandler || !window.ConnectionHandler.isConexionUnicaConnected()) {
            handleWindowMonitoringError("No hay conexión al sistema activa. Conéctese primero.");
            updateToggleButton('stopped');
            return;
        }
        
        // Actualizar botón a estado "loading"
        updateToggleButton('loading');
        
        // Mostrar estado de carga
        dashboardState.isInitialLoading = true;
        updateWindowUIState();
        
        // Obtener lista de baterías disponibles y iniciar monitoreo
        $.ajax({
            url: '/api/batteries',
            method: 'GET',
            dataType: 'json',
            success: function(availableBatteries) {
                if (!availableBatteries || !availableBatteries.batteries || !availableBatteries.batteries.length) {
                    handleWindowMonitoringError("No hay baterías disponibles para monitorear");
                    return;
                }
                
                console.log(`MultiBatteryWindow: Encontradas ${availableBatteries.batteries.length} baterías`);
                
                // Iniciar monitoreo con los IDs obtenidos
                $.ajax({
                    url: '/api/batteries/start_monitoring',
                    method: 'POST',
                    dataType: 'json',
                    contentType: 'application/json',
                    data: JSON.stringify({ battery_ids: availableBatteries.batteries }),
                    success: function(result) {
                        if (result.status === 'success') {
                            console.log("MultiBatteryWindow: Monitoreo iniciado exitosamente");
                            isMonitoring = true;
                            updateToggleButton('monitoring');
                            
                            // Iniciar actualizaciones periódicas
                            startPeriodicUpdates();
                            
                            // Ocultar estado de carga
                            dashboardState.isInitialLoading = false;
                            updateWindowUIState();
                            
                        } else {
                            handleWindowMonitoringError(result.message || "Error al iniciar monitoreo");
                        }
                    },
                    error: function(xhr, status, error) {
                        handleWindowMonitoringError(`Error de comunicación: ${error}`);
                    }
                });
            },
            error: function(xhr, status, error) {
                handleWindowMonitoringError(`Error obteniendo lista de baterías: ${error}`);
            }
        });
    }
	/**
     * Detiene el monitoreo de baterías
     */
    function stopWindowMonitoring() {
        console.log("MultiBatteryWindow: Deteniendo monitoreo...");
        
        updateToggleButton('loading');
        
        $.ajax({
            url: '/api/batteries/stop_monitoring',
            method: 'POST',
            dataType: 'json',
            success: function(result) {
                console.log("MultiBatteryWindow: Monitoreo detenido");
                isMonitoring = false;
                updateToggleButton('stopped');
                
                // Detener actualizaciones periódicas
                stopPeriodicUpdates();
                
                // Limpiar datos
                batteriesData = [];
                updateBatteriesGrid();
                
                // Actualizar timestamp
                updateLastUpdateDisplay(null);
                
            },
            error: function(xhr, status, error) {
                console.error("MultiBatteryWindow: Error deteniendo monitoreo:", error);
                updateToggleButton('monitoring'); // Revertir estado
            }
        });
    }
    
    /**
     * Inicia las actualizaciones periódicas
     */
    function startPeriodicUpdates() {
        // Limpiar interval previo si existe
        if (updateIntervalId) {
            clearInterval(updateIntervalId);
        }
        
        // Actualización inmediata
        updateBatteriesData();
        
        // Configurar actualizaciones cada 3 segundos
        updateIntervalId = setInterval(updateBatteriesData, 10000);
        
        console.log("MultiBatteryWindow: Actualizaciones periódicas iniciadas");
    }
    
    /**
     * Detiene las actualizaciones periódicas
     */
    function stopPeriodicUpdates() {
        if (updateIntervalId) {
            clearInterval(updateIntervalId);
            updateIntervalId = null;
            console.log("MultiBatteryWindow: Actualizaciones periódicas detenidas");
        }
    }
    
    /**
     * CORREGIDO: Actualiza los datos de todas las baterías
     */
    function updateBatteriesData() {
        if (!isMonitoring) return;
        
        $.ajax({
            url: '/api/batteries/status',
            method: 'GET',
            dataType: 'json',
            success: function(result) {
                if (result.status === 'success' && result.batteries) {
                    batteriesData = result.batteries;
                    lastUpdateTimestamp = result.last_updated || new Date().toISOString();
                    
                    console.log(`MultiBatteryWindow: ${batteriesData.length} baterías recibidas`);
                    
                    // Actualizar UI
                    updateBatteriesGrid();
                    updateSystemCurrentGauge(batteriesData);
                    updateLastUpdateDisplay(lastUpdateTimestamp);
                    
                    // Limpiar errores previos
                    clearWindowError();
                    
                } else {
                    console.warn('MultiBatteryWindow: Respuesta inválida del servidor');
                }
            },
            error: function(xhr, status, error) {
                console.error('MultiBatteryWindow: Error actualizando datos:', error);
                showWindowError(`Error actualizando datos: ${error}`);
            }
        });
    }
    
    // ========== GESTIÓN DE UI Y ERRORES ==========
    
    /**
     * Actualiza el estado visual de la UI de la ventana
     */
    function updateWindowUIState() {
        if (!windowId) return;
        
        const $window = $(`#${windowId}`);
        
        // Mostrar/ocultar elementos según estado
        if (dashboardState.isInitialLoading) {
            $window.find('#window-loading-container').show();
            $window.find('.main-content').hide();
        } else {
            $window.find('#window-loading-container').hide();
            $window.find('.main-content').show();
        }
        
        // Mostrar/ocultar errores
        if (dashboardState.hasError) {
            $window.find('#window-error-message').text(dashboardState.errorMessage).show();
        } else {
            $window.find('#window-error-message').hide();
        }
    }
    
    /**
     * Muestra un error en la ventana
     */
    function showWindowError(message) {
        dashboardState.hasError = true;
        dashboardState.errorMessage = message;
        updateWindowUIState();
        console.error('MultiBatteryWindow:', message);
    }
    
    /**
     * Limpia errores de la ventana
     */
    function clearWindowError() {
        dashboardState.hasError = false;
        dashboardState.errorMessage = '';
        updateWindowUIState();
    }
    
    /**
     * Maneja errores de monitoreo
     */
    function handleWindowMonitoringError(message) {
        console.error("MultiBatteryWindow: Error de monitoreo:", message);
        
        isMonitoring = false;
        updateToggleButton('stopped');
        
        dashboardState.isInitialLoading = false;
        showWindowError(message);
        
        stopPeriodicUpdates();
    }
    
    // ========== CONFIGURACIÓN DE EVENTOS ==========
    
    /**
     * CORREGIDO: Configura los event handlers de la ventana
     */
    function setupWindowEventHandlers() {
        if (!windowId) return;
        
        console.log("MultiBatteryWindow: Configurando event handlers...");
        
        // Event handler para botón de toggle
        $(`#${windowId} #monitoring-toggle`).off('click').on('click', function() {
            if (monitoringButtonState.isLoading) return;
            
            if (isMonitoring) {
                stopWindowMonitoring();
            } else {
                startWindowMonitoring();
            }
        });
        
        // CORREGIDO: Inicializar gauge en header inmediatamente
        setTimeout(() => {
            initializeCurrentGauge(); // Gauge en header
        }, 100);
        
        console.log("MultiBatteryWindow: Event handlers configurados");
    }
    
    // ========== LIMPIEZA DE RECURSOS ==========
    
    /**
     * Limpia todos los recursos de la ventana
     */
    function cleanupWindowResources() {
        console.log("MultiBatteryWindow: Iniciando limpieza de recursos...");
        
        // Detener monitoreo si está activo
        if (isMonitoring) {
            stopPeriodicUpdates();
            
            $.ajax({
                url: '/api/batteries/stop_monitoring',
                method: 'POST',
                async: false // Síncrono para asegurar limpieza
            });
        }
        
        // Limpiar gauge
        if (systemCurrentGauge) {
            if (typeof systemCurrentGauge.destroy === 'function') {
                systemCurrentGauge.destroy();
            }
            systemCurrentGauge = null;
        }
        
        // Limpiar intervals
        if (updateIntervalId) {
            clearInterval(updateIntervalId);
            updateIntervalId = null;
        }
        
        // Limpiar variables
        batteriesData = [];
        lastUpdateTimestamp = null;
        
        // Resetear estado del toggle
        monitoringButtonState = {
            isMonitoring: false,
            isLoading: false
        };
        
        // Resetear estado
        dashboardState = {
            isInitialLoading: false,
            hasError: false,
            errorMessage: '',
            loadingProgress: null
        };
        
        // Resetear flags
        isMonitoring = false;
        isWindowOpen = false;
        windowId = null;
        
        console.log("MultiBatteryWindow: Limpieza completada");
    }
    
    // ========== API PÚBLICA ==========
    
    return {
        /**
         * Abre la ventana del dashboard de múltiples baterías
         */
        open: function() {
            // Verificar si ya hay una ventana abierta
            if (isWindowOpen) {
                console.log("MultiBatteryWindow: Ventana ya está abierta");
                return windowId;
            }
            
            // Verificar conexión
            if (!window.ConnectionHandler || !window.ConnectionHandler.isConexionUnicaConnected()) {
                console.error("MultiBatteryWindow: No hay conexión al sistema activa");
                if (window.UiManager && window.UiManager.showMessage) {
                    const messageEl = document.getElementById('conexionUnicaMessage');
                    if (messageEl) {
                        window.UiManager.showMessage(
                            messageEl,
                            'Se requiere conexión al sistema activa para abrir el dashboard de baterías.',
                            'error'
                        );
                    }
                }
                return null;
            }
            
            // Verificar que WindowManager esté disponible
            if (typeof window.WindowManager === 'undefined') {
                console.error('MultiBatteryWindow: WindowManager no está disponible');
                return null;
            }
            
            console.log("MultiBatteryWindow: Abriendo ventana con gauge en header...");
            
            // Crear ventana con WindowManager - DIMENSIONES AUMENTADAS
            windowId = window.WindowManager.createWindow({
                title: 'Dashboard de Múltiples Baterías',
                width: 1320,  // AUMENTADO: +300px de ancho
                height: 800,  // AUMENTADO: +100px de alto
                content: generateModernContent(),
                position: { my: "center", at: "center", of: window },
                close: function(event, ui) {
                    console.log("MultiBatteryWindow: Cerrando ventana");
                    cleanupWindowResources();
                }
            });
            
            if (windowId) {
                isWindowOpen = true;
                
                // Configurar event handlers
                setupWindowEventHandlers();
                
                // Inicializar estado del toggle
                updateToggleButton('stopped');
                
                // Iniciar monitoreo automáticamente
                setTimeout(function() {
                    if (isWindowOpen) {
                        startWindowMonitoring();
                    }
                }, 500);
                
                console.log("MultiBatteryWindow: Ventana abierta con ID:", windowId);
            }
            
            return windowId;
        },
        
        /**
         * Cierra la ventana del dashboard
         */
        close: function() {
            if (windowId && window.WindowManager) {
                window.WindowManager.closeWindow(windowId);
                // cleanupWindowResources() se llamará automáticamente por el callback de cierre
            }
        },
        
        /**
         * Verifica si la ventana está abierta
         */
        isOpen: function() {
            return isWindowOpen;
        },
        
        /**
         * Obtiene el ID de la ventana actual
         */
        getWindowId: function() {
            return windowId;
        }
    };
    
})(jQuery);

// Exportar para uso global
window.MultiBatteryWindow = MultiBatteryWindow;