// static/js/multiBatteryDashboard.js
'use strict';

/**
 * Implementación jQuery del Panel Múltiple de Baterías
 * Reemplaza el componente React original
 */
(function($) {
    // Si jQuery no está disponible, mostrar error y salir
    if (typeof $ !== 'function') {
        console.error("jQuery no está disponible. El dashboard múltiple de baterías no funcionará correctamente.");
        return;
    }

    // Estado interno
    let isMonitoring = false;
    let isInitialLoading = false;
    let lastUpdateTime = null;
    let updateIntervalId = null;
    
    // Inicializar cuando el DOM esté listo
    $(function() {
        console.log("Inicializando MultiBatteryDashboard jQuery");
        
        // Verificar que existe el contenedor
        if ($('#multi-battery-dashboard').length === 0) {
            console.warn("Contenedor #multi-battery-dashboard no encontrado");
            return;
        }
        
        // Configurar estructura si no existe
        if ($('#multi-battery-dashboard').children().length === 0) {
            inicializarEstructuraHTML();
        }
        
        // Configurar manejadores de eventos
        setupEventHandlers();
        
        // Exponer función startMonitoring globalmente para ser llamada por otros módulos
        window.startMultiBatteryMonitoring = startMonitoring;
        
        // También exponer updateMultiBatteryDashboard para compatibilidad
        window.updateMultiBatteryDashboard = updateDashboard;
    });

    /**
     * Inicializa la estructura HTML del dashboard
     */
    function inicializarEstructuraHTML() {
        const $dashboard = $('#multi-battery-dashboard');
        
        // Crear estructura HTML básica
        const dashboardHtml = `
            <div class="dashboard-header">
                <h2>Panel de Monitorización de Baterías</h2>
                <div class="control-buttons">
                    <button class="start-btn">Iniciar Monitoreo</button>
                    <button class="refresh-btn">Actualizar Ahora</button>
                </div>
                
                <div class="view-filters">
                    <span>Filtrar: </span>
                    <select class="view-filter-select">
                        <option value="all">Todas</option>
                        <option value="active">Activas</option>
                        <option value="charging">Cargando</option>
                        <option value="discharging">Descargando</option>
                        <option value="critical">Estado Crítico</option>
                    </select>
                </div>
            </div>
            
            <div class="error-message" style="display: none;"></div>
            
            <div class="loading-progress" style="display: none;">
                <h3>Cargando información detallada de baterías...</h3>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
                <p class="progress-text">0 de 0 baterías completadas (0%)</p>
                <p class="current-battery" style="display: none;">Procesando batería ID: 0</p>
            </div>
            
            <div class="loading-container" style="display: none;">
                <p>Cargando datos de baterías...</p>
            </div>
            
            <div class="system-overview">
                <h3>Resumen del Sistema</h3>
                <div class="system-metrics">
                    <div class="metric">
                        <span class="metric-label">Total de Baterías:</span>
                        <span class="metric-value total-batteries">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Baterías Activas:</span>
                        <span class="metric-value active-batteries">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Baterías Críticas:</span>
                        <span class="metric-value critical-batteries">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">SOC Promedio:</span>
                        <span class="metric-value avg-soc">N/A</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Última Actualización:</span>
                        <span class="metric-value last-update">N/A</span>
                    </div>
                </div>
            </div>
            
            <div class="batteries-grid">
                <!-- Aquí se renderizarán los paneles de batería -->
            </div>
        `;
        
        $dashboard.html(dashboardHtml);
        console.log("Estructura HTML del dashboard múltiple inicializada");
    }

    /**
     * Configura manejadores de eventos para los controles del dashboard
     */
    function setupEventHandlers() {
        // Botón para iniciar monitoreo
        $('#multi-battery-dashboard .start-btn').on('click', function() {
            if (isMonitoring) {
                stopMonitoring();
                $(this).text('Iniciar Monitoreo').removeClass('stop-btn').addClass('start-btn');
            } else {
                startMonitoring();
                $(this).text('Detener Monitoreo').removeClass('start-btn').addClass('stop-btn');
            }
        });
        
        // Botón para actualizar datos
        $('#multi-battery-dashboard .refresh-btn').on('click', function() {
            updateBatteryData();
        });
        
        // Cambio en el filtro de visualización
        $('#multi-battery-dashboard .view-filter-select').on('change', function() {
            updateBatteryGrid();
        });
        
        console.log("Manejadores de eventos configurados para el dashboard múltiple");
    }

    /**
     * Inicia el monitoreo de baterías - Implementación corregida
     */
    function startMonitoring() {
        console.log("MultiBatteryDashboard: Iniciando monitoreo...");
        
        // Mostrar estado de carga
        isInitialLoading = true;
        updateUIState();
        
        // Paso 1: Verificar si hay una carga en progreso
        $.ajax({
            url: '/api/batteries/detailed_info_status',
            method: 'GET',
            dataType: 'json',
            success: function(loadingStatus) {
                // Si hay una carga en progreso, mostrar progreso
                if (loadingStatus.status === 'success' && loadingStatus.loading_active) {
                    updateProgressBar(loadingStatus.progress);
                }
                
                // Paso 2: Obtener lista de baterías disponibles
                $.ajax({
                    url: '/api/batteries',
                    method: 'GET',
                    dataType: 'json',
                    success: function(availableBatteries) {
                        if (!availableBatteries || !availableBatteries.batteries || !availableBatteries.batteries.length) {
                            handleMonitoringError("No hay baterías disponibles para monitorear");
                            return;
                        }
                        
                        console.log(`MultiBatteryDashboard: Encontradas ${availableBatteries.batteries.length} baterías`);
                        
                        // Paso 3: Iniciar monitoreo con los IDs obtenidos
                        $.ajax({
                            url: '/api/batteries/start_monitoring',
                            method: 'POST',
                            dataType: 'json',
                            contentType: 'application/json',
                            data: JSON.stringify({ battery_ids: availableBatteries.batteries }),
                            success: function(result) {
                                if (result.status === 'success') {
                                    console.log("MultiBatteryDashboard: Monitoreo iniciado exitosamente");
                                    isMonitoring = true;
                                    
                                    // Iniciar actualizaciones periódicas
                                    startPeriodicUpdates();
                                    
                                    // Actualizar UI de inmediato
                                    updateBatteryData();
                                } else {
                                    handleMonitoringError(result.message || "Error al iniciar monitoreo");
                                }
                                
                                // Finalizar estado de carga inicial en cualquier caso
                                isInitialLoading = false;
                                updateUIState();
                            },
                            error: function(xhr, status, error) {
                                handleMonitoringError("Error al iniciar monitoreo: " + error);
                                
                                // Finalizar estado de carga inicial
                                isInitialLoading = false;
                                updateUIState();
                            }
                        });
                    },
                    error: function(xhr, status, error) {
                        handleMonitoringError("Error al obtener baterías disponibles: " + error);
                        
                        // Finalizar estado de carga inicial
                        isInitialLoading = false;
                        updateUIState();
                    }
                });
            },
            error: function(xhr, status, error) {
                handleMonitoringError("Error al verificar carga de información: " + error);
                
                // Finalizar estado de carga inicial
                isInitialLoading = false;
                updateUIState();
            }
        });
    }

    /**
     * Maneja errores durante el inicio del monitoreo
     */
    function handleMonitoringError(message) {
        console.error("Error al iniciar monitoreo:", message);
        showError(message);
        
        // Resetear estado
        isMonitoring = false;
        
        // Actualizar botón
        $('#multi-battery-dashboard .start-btn')
            .text('Iniciar Monitoreo')
            .removeClass('stop-btn')
            .addClass('start-btn');
    }

    /**
     * Detiene el monitoreo de baterías
     */
    function stopMonitoring() {
        console.log("MultiBatteryDashboard: Deteniendo monitoreo...");
        
        $.ajax({
            url: '/api/batteries/stop_monitoring',
            method: 'POST',
            dataType: 'json',
            success: function(result) {
                console.log("MultiBatteryDashboard: Monitoreo detenido", result);
                isMonitoring = false;
                
                // Detener actualizaciones periódicas
                stopPeriodicUpdates();
                
                // Actualizar botón
                $('#multi-battery-dashboard .start-btn')
                    .text('Iniciar Monitoreo')
                    .removeClass('stop-btn')
                    .addClass('start-btn');
            },
            error: function(xhr, status, error) {
                console.error("Error al detener monitoreo:", error);
                showError("Error al detener monitoreo: " + error);
            }
        });
    }

    /**
     * Inicia actualizaciones periódicas de datos
     */
    function startPeriodicUpdates() {
        // Detener intervalo previo si existe
        if (updateIntervalId) {
            clearInterval(updateIntervalId);
        }
        
        // Crear nuevo intervalo
        updateIntervalId = setInterval(function() {
            updateBatteryData();
        }, 5000); // Actualizar cada 5 segundos
        
        console.log("MultiBatteryDashboard: Actualizaciones periódicas iniciadas");
    }

    /**
     * Detiene las actualizaciones periódicas
     */
    function stopPeriodicUpdates() {
        if (updateIntervalId) {
            clearInterval(updateIntervalId);
            updateIntervalId = null;
            console.log("MultiBatteryDashboard: Actualizaciones periódicas detenidas");
        }
    }

    /**
     * Actualiza los datos de baterías desde la API
     */
    function updateBatteryData() {
        console.log("MultiBatteryDashboard: Actualizando datos de baterías...");
        
        $.ajax({
            url: '/api/batteries/status',
            method: 'GET',
            dataType: 'json',
            success: function(data) {
                if (data.status === 'success' && data.batteries) {
                    // Actualizar estadísticas del sistema
                    updateSystemStats(data.batteries, data.last_updated);
                    
                    // Actualizar grid de baterías
                    updateBatteryGrid(data.batteries);
                    
                    // Actualizar timestamp
                    lastUpdateTime = data.last_updated;
                } else {
                    showError(data.message || "Error al obtener datos de baterías");
                }
            },
            error: function(xhr, status, error) {
                console.error("Error al actualizar datos:", error);
                showError("Error al actualizar datos de baterías: " + error);
            }
        });
    }

    /**
     * Actualiza la sección de estadísticas del sistema
     */
    function updateSystemStats(batteriesData, lastUpdated) {
        if (!batteriesData || !batteriesData.length) return;
        
        // Calcular estadísticas
        const totalBatteries = batteriesData.length;
        
        const activeBatteries = batteriesData.filter(function(b) {
            return b.status === 'Cargando' || b.status === 'Descargando';
        }).length;
        
        const criticalBatteries = batteriesData.filter(function(b) {
            return b.soc !== undefined && b.soc < 20;
        }).length;
        
        // Calcular SOC promedio
        let avgSOC = 'N/A';
        if (totalBatteries > 0) {
            const totalSOC = batteriesData.reduce(function(sum, b) {
                const socValue = b.soc !== undefined ? b.soc : 0;
                return sum + socValue;
            }, 0);
            avgSOC = (totalSOC / totalBatteries).toFixed(1) + '%';
        }
        
        // Formatear timestamp
        const formattedTime = lastUpdated ? 
                             Utils.formatTimestamp(lastUpdated, true) : 'N/A';
        
        // Actualizar elementos en la UI
        $('#multi-battery-dashboard .total-batteries').text(totalBatteries);
        $('#multi-battery-dashboard .active-batteries').text(activeBatteries);
        
        const $criticalEl = $('#multi-battery-dashboard .critical-batteries');
        $criticalEl.text(criticalBatteries);
        if (criticalBatteries > 0) {
            $criticalEl.addClass('critical');
        } else {
            $criticalEl.removeClass('critical');
        }
        
        $('#multi-battery-dashboard .avg-soc').text(avgSOC);
        $('#multi-battery-dashboard .last-update').text(formattedTime);
    }

    /**
     * Actualiza la cuadrícula de baterías según el filtro seleccionado
     */
    function updateBatteryGrid(batteriesData) {
        const $grid = $('#multi-battery-dashboard .batteries-grid');
        
        // Si no hay datos, mostrar mensaje
        if (!batteriesData || !batteriesData.length) {
            $grid.html('<div class="no-data-message">No hay datos de baterías disponibles. ' + 
                      (isMonitoring ? 'Esperando datos...' : 'Inicie el monitoreo para comenzar.') + '</div>');
            return;
        }
        
        // Obtener filtro seleccionado
        const viewFilter = $('#multi-battery-dashboard .view-filter-select').val() || 'all';
        
        // Filtrar baterías según filtro
        const filteredBatteries = batteriesData.filter(function(batteryData) {
            if (viewFilter === 'all') return true;
            
            const statusClass = Utils.getBatteryStatusClass(batteryData);
            
            switch (viewFilter) {
                case 'active':
                    return statusClass === 'charging' || statusClass === 'discharging';
                case 'charging':
                    return statusClass === 'charging';
                case 'discharging':
                    return statusClass === 'discharging';
                case 'critical':
                    return statusClass === 'critical' || statusClass === 'warning';
                default:
                    return true;
            }
        });
        
        // Si no hay baterías después del filtrado, mostrar mensaje
        if (filteredBatteries.length === 0) {
            $grid.html('<div class="no-data-message">No hay baterías que coincidan con el filtro seleccionado.</div>');
            return;
        }
        
        // Limpiar grid
        $grid.empty();
        
        // Crear paneles para cada batería
        filteredBatteries.forEach(function(batteryData) {
            const statusClass = Utils.getBatteryStatusClass(batteryData);
            
            // Usar la función que definimos en batteryMiniPanel.js
            window.createBatteryPanel($grid, batteryData, statusClass, function(batteryId) {
                // Función para mostrar detalle al hacer clic
                if (typeof window.showBatteryDetail === 'function') {
                    window.showBatteryDetail(batteryId);
                } else {
                    console.warn("Función showBatteryDetail no disponible");
                }
            });
        });
    }

    /**
     * Actualiza el estado visual del UI
     */
    function updateUIState() {
        // Mostrar/ocultar elementos según estado
        if (isInitialLoading) {
            $('#multi-battery-dashboard .loading-container').show();
            $('#multi-battery-dashboard .system-overview, #multi-battery-dashboard .batteries-grid').hide();
        } else {
            $('#multi-battery-dashboard .loading-container').hide();
            $('#multi-battery-dashboard .system-overview, #multi-battery-dashboard .batteries-grid').show();
        }
    }

    /**
     * Actualiza la barra de progreso durante la carga
     */
    function updateProgressBar(progressData) {
        if (!progressData) return;
        
        const { total, completed, current_battery } = progressData;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        // Mostrar barra de progreso
        $('#multi-battery-dashboard .loading-progress').show();
        $('#multi-battery-dashboard .progress-bar').css('width', percent + '%');
        $('#multi-battery-dashboard .progress-text').text(
            `${completed} de ${total} baterías completadas (${percent}%)`
        );
        
        if (current_battery) {
            $('#multi-battery-dashboard .current-battery')
                .text(`Procesando batería ID: ${current_battery}`)
                .show();
        } else {
            $('#multi-battery-dashboard .current-battery').hide();
        }
    }

    /**
     * Muestra un mensaje de error
     */
    function showError(message) {
        if (!message) return;
        
        const $errorEl = $('#multi-battery-dashboard .error-message');
        $errorEl.text(message).show();
        
        // Ocultar después de 5 segundos
        setTimeout(function() {
            $errorEl.hide();
        }, 5000);
    }

    /**
     * Actualiza el dashboard
     * Función compatible con el sistema actual para recibir props
     */
    function updateDashboard(props) {
        console.log("MultiBatteryDashboard jQuery: actualizando con props:", props);
        
        // Manejar error
        if (props && props.error) {
            showError(props.error);
        }
        
        // Manejar carga inicial
        if (props && props.initialLoading !== undefined) {
            isInitialLoading = props.initialLoading;
            updateUIState();
        }
        
        // Manejar progreso
        if (props && props.loadingProgress) {
            updateProgressBar(props.loadingProgress);
        }
        
        // Si requiere actualización forzada, refrescar datos
        if (props && props.forceUpdate) {
            updateBatteryData();
        }
    }

    // NUEVO: Stub para showBatteryDetail hasta que implementemos la vista de detalle
    window.showBatteryDetail = function(batteryId) {
        console.log(`Mostrando detalles de batería ${batteryId} (implementación pendiente)`);
        alert(`Detalles de batería ${batteryId}\nEsta funcionalidad se implementará próximamente.`);
    };

})(jQuery);