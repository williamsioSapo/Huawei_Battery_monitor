// static/js/battery-components/tabs/GeneralTab.js
const GeneralTab = {
    /**
     * Renderiza el contenido de la pestaña General
     * @param {Object} batteryData - Datos de la batería
     * @param {Object} detailedInfo - Información detallada opcional
     * @param {jQuery} $container - Contenedor donde renderizar
     */
    render: function(batteryData, detailedInfo, $container) {
        if (!batteryData) {
            $container.html('<div class="tab-error">No hay datos disponibles</div>');
            return;
        }
        
        // Determinar nombre personalizado
        const customName = batteryData.device_info?.custom_name || `Batería ${batteryData.id}`;
        
        // Estructura HTML del componente
        const html = `
            <div class="general-info-container">
                <div class="battery-header">
                    <h3>${customName}</h3>
                    <span class="battery-status ${this._getBatteryStatusClass(batteryData)}">
                        ${batteryData.status || 'Desconocido'}
                    </span>
                </div>
                
                <!-- Grid de métricas principales -->
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-title">Estado de Carga</div>
                        <div class="metric-value ${batteryData.soc < 20 ? 'critical' : batteryData.soc < 40 ? 'warning' : ''}">
                            ${batteryData.soc !== undefined ? batteryData.soc + '%' : 'N/A'}
                        </div>
                        <div class="metric-indicator">
                            <div class="soc-bar">
                                <div class="soc-fill" style="width: ${batteryData.soc || 0}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-title">Voltaje</div>
                        <div class="metric-value">
                            ${batteryData.voltage !== undefined ? batteryData.voltage.toFixed(2) + ' V' : 'N/A'}
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-title">Corriente</div>
                        <div class="metric-value ${batteryData.current > 0 ? 'charging' : batteryData.current < 0 ? 'discharging' : ''}">
                            ${batteryData.current !== undefined ? batteryData.current.toFixed(2) + ' A' : 'N/A'}
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-title">Estado de Salud</div>
                        <div class="metric-value">
                            ${batteryData.soh !== undefined ? batteryData.soh + '%' : 'N/A'}
                        </div>
                    </div>
                </div>
                
                <!-- Información del dispositivo -->
                <div class="device-info-section">
                    <h4>Información del Dispositivo</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">ID:</span>
                            <span class="info-value">${batteryData.id}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Fabricante:</span>
                            <span class="info-value">${batteryData.device_info?.manufacturer || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Modelo:</span>
                            <span class="info-value">${batteryData.device_info?.model || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Última Actualización:</span>
                            <span class="info-value">${this._formatTimestamp(batteryData.last_updated)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Acciones rápidas -->
                <div class="quick-actions">
                    <button class="action-btn verify-cells-btn">
                        <i class="action-icon">🔍</i> Verificar Celdas
                    </button>
                    <button class="action-btn refresh-data-btn">
                        <i class="action-icon">🔄</i> Actualizar Datos
                    </button>
                    <button class="action-btn open-modern-view-btn">
                        <i class="action-icon">🚀</i> Vista Moderna
                    </button>
                </div>
            </div>
        `;
        
        // Añadir HTML al contenedor
        $container.html(html);
        
        // Configurar eventos
        this._setupEvents(batteryData, $container);
    },
    
    /**
     * Configura eventos para elementos interactivos
     * @private
     */
	_setupEvents: function(batteryData, $container) {
		$container.find('.verify-cells-btn').on('click', function() {
			if (typeof handleVerifyCells === 'function') {
				handleVerifyCells(batteryData.id, $container);
			}
		});
		
		$container.find('.refresh-data-btn').on('click', function() {
			if (typeof refreshBatteryData === 'function') {
				refreshBatteryData(batteryData.id, $container);
			}
		});
		
		// NUEVO: Evento para vista moderna
		$container.find('.open-modern-view-btn').on('click', function() {
			if (typeof BatteryModernView !== 'undefined' && BatteryModernView.openModernView) {
				BatteryModernView.openModernView(batteryData.id);
			} else {
				console.error('BatteryModernView no está disponible');
				alert('Error: Vista moderna no disponible. Verifique que todos los archivos estén cargados.');
			}
		});
	},
    
    /**
     * Obtiene la clase CSS para el estado de la batería
     * @private
     */
    _getBatteryStatusClass: function(batteryData) {
        if (!batteryData) return 'unknown';
        
        // Verificar si hay error
        if (batteryData.error) return 'error';
        
        // Verificar SOC para estado crítico
        const socValue = batteryData.soc !== undefined ? batteryData.soc : null;
        if (socValue !== null) {
            if (socValue < 20) return 'critical';
            if (socValue < 40) return 'warning';
        }
        
        // Verificar estado basado en corriente
        const status = batteryData.status !== undefined ? batteryData.status : '';
        if (status === 'Cargando') return 'charging';
        if (status === 'Descargando') return 'discharging';
        
        return 'normal';
    },
    
    /**
     * Formatea un timestamp a fecha/hora legible
     * @private
     */
    _formatTimestamp: function(timestamp, includeDate = true) {
        if (!timestamp) return 'N/A';
        
        try {
            const date = new Date(timestamp * 1000);
            return includeDate ? date.toLocaleString() : date.toLocaleTimeString();
        } catch (e) {
            console.error(`Error al formatear timestamp: ${e.message}`);
            return 'N/A';
        }
    }
};