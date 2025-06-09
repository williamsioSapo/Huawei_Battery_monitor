/**
 * modernView.js - Vista Moderna de Batería (Archivo Principal)
 * Función principal y gestión de ventanas
 */

const BatteryModernView = (function() {
    'use strict';
    
    // Referencias internas
    let currentBatteryId = null;
    
    /**
     * Abre la vista moderna para una batería específica
     * @param {number} batteryId - ID de la batería
     */
    function openModernView(batteryId) {
        if (!batteryId) {
            console.error('BatteryModernView: ID de batería requerido');
            return;
        }
        
        console.log(`BatteryModernView: Abriendo vista moderna para batería ${batteryId}`);
        currentBatteryId = batteryId;
        
        // Obtener datos de la batería
        fetchBatteryData(batteryId)
            .then(batteryData => {
                createModernWindow(batteryData);
            })
            .catch(error => {
                console.error('Error al obtener datos de batería:', error);
                // Crear ventana con datos por defecto
                createModernWindow(createDefaultBatteryData(batteryId));
            });
    }
    
    /**
     * Obtiene datos de la batería
     */
    function fetchBatteryData(batteryId) {
        return new Promise((resolve, reject) => {
            if (typeof getAllBatteriesStatus === 'function') {
                getAllBatteriesStatus()
                    .then(response => {
                        if (response.status === 'success' && response.batteries) {
                            const battery = response.batteries.find(b => 
                                b.id === parseInt(batteryId) || b.id === batteryId
                            );
                            
                            if (battery) {
                                resolve(battery);
                            } else {
                                reject(new Error(`Batería ${batteryId} no encontrada`));
                            }
                        } else {
                            reject(new Error('Error al obtener datos de baterías'));
                        }
                    })
                    .catch(reject);
            } else {
                // Si no está disponible la API, usar datos por defecto
                resolve(createDefaultBatteryData(batteryId));
            }
        });
    }
    
    /**
     * Crea datos por defecto para demostración
     */
    function createDefaultBatteryData(batteryId) {
        return {
            id: batteryId,
            soc: 61.47,
            voltage: 52.8,
            current: -8.5, // Negativo = descargando
            soh: 94,
            status: 'Descargando',
            pack_voltage: 52.8,
            device_info: {
                custom_name: `Batería ${batteryId}`,
                manufacturer: 'Huawei',
                model: 'LUNA2000-15-S0'
            }
        };
    }
    
    /**
     * Crea la ventana moderna
     */
    function createModernWindow(batteryData) {
        const windowId = WindowManager.createWindow({
            title: `Vista Moderna - ${batteryData.device_info?.custom_name || `Batería ${batteryData.id}`}`,
            width: 1400,
            height: 900,
            resizable: false,
            content: generateModernContent(batteryData),
            close: function() {
                // Esta función se definirá en dataUtils.js
                if (typeof cleanupModernView === 'function') {
                    cleanupModernView();
                }
            }
        });
        
        // Inicializar componentes después de crear la ventana
        setTimeout(() => {
            // Esta función se definirá en windowManager.js
            if (typeof initializeModernComponents === 'function') {
                initializeModernComponents(windowId, batteryData);
            }
        }, 100);
        
        return windowId;
    }
    
    /**
     * Genera el contenido HTML de la vista moderna
     */
    function generateModernContent(batteryData) {
        const customName = batteryData.device_info?.custom_name || `Batería ${batteryData.id}`;
        
        return `
            <div class="modern-battery-container">
                <!-- Header con título y controles -->
                <div class="modern-header">
                    <h2 class="modern-title">${customName}</h2>
                    <div class="modern-controls">
                        <button class="modern-btn refresh-modern" title="Actualizar datos">
                            <span class="btn-icon">🔄</span>
                            Actualizar
                        </button>
                    </div>
                </div>
                
                <!-- Grid principal -->
                <div class="modern-grid">
                    <!-- Estado de Carga (Izquierda) -->
                    <div class="charge-state-section">
                        <h3 class="section-title">ESTADO DE CARGA</h3>
                        
                        <!-- Contenedor de Voltaje (Izquierda) -->
                        <div class="voltage-container">
                            <div class="metric-ring voltage-ring">
                                <div class="ring-content">
                                    <span class="ring-value" id="voltage-ring-value">${batteryData.voltage}V</span>
                                    <span class="ring-label">VOLTAJE</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Contenedor Central (Batería + SOC) -->
                        <div class="battery-central-container">
                            <div class="battery-visual-compact" id="battery-visual-compact">
                                <!-- SVG de batería se insertará aquí -->
                            </div>
                            <div class="soc-display-compact">
                                <span class="soc-value-compact" id="soc-value-compact">${batteryData.soc}%</span>
                                <span class="soc-label-compact">STATE OF CHARGE</span>
                            </div>
                        </div>
                        
                        <!-- Contenedor de Corriente (Derecha) -->
                        <div class="current-container">
                            <div class="metric-ring current-ring">
                                <div class="ring-content">
                                    <span class="ring-value" id="current-ring-value">${batteryData.current}A</span>
                                    <span class="ring-label">CORRIENTE</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Power Flow (Centro Superior) -->
						<div id="power-flow-placeholder" class="power-flow-section">
							<!-- El PowerFlowSection se insertará aquí dinámicamente -->
						</div>
                    
                    <!-- Log de Eventos (Derecha Superior) -->
                    <div class="events-log-section">
                        <h3 class="section-title">LOG DE EVENTOS</h3>
                        <div class="events-container" id="events-container">
                            <!-- Los eventos se generarán dinámicamente -->
                        </div>
                    </div>
                    
                    <!-- Información de Celdas (Inferior Izquierda) -->
                    <div class="cells-info-section" id="cells-info-section">
                        <h3 class="section-title">INFORMACIÓN DE STRINGS</h3>
                        <div class="cells-grid" id="cells-grid">
                            <!-- Se generará dinámicamente por el sistema de celdas -->
                        </div>
                    </div>
                    
                    <!-- Monitoreo en Tiempo Real (Centro Inferior) -->
                    <div class="monitoring-section">
                        <h3 class="section-title">MONITOREO EN TIEMPO REAL</h3>
                        <div class="chart-container">
                            <canvas id="monitoring-chart"></canvas>
                        </div>
                        <div class="chart-legend" id="chart-legend">
                            <!-- Leyenda se generará dinámicamente -->
                        </div>
                    </div>
                    
                    <!-- Resumen Mensual (Derecha Inferior) -->
                    <div class="monthly-summary-section">
                        <h3 class="section-title">RESUMEN MENSUAL</h3>
                        <div class="summary-content">
                            <div class="summary-period">
                                <span class="period-label">Diciembre 2024</span>
                            </div>
                            
                            <div class="summary-metric charging">
                                <div class="summary-icon">⚡</div>
                                <div class="summary-data">
                                    <span class="summary-label">Total Cargado</span>
                                    <span class="summary-value">1,247 kWh</span>
                                </div>
                            </div>
                            
                            <div class="summary-metric discharging">
                                <div class="summary-icon">🔋</div>
                                <div class="summary-data">
                                    <span class="summary-label">Total Descargado</span>
                                    <span class="summary-value">1,089 kWh</span>
                                </div>
                            </div>
                            
                            <div class="summary-efficiency">
                                <span class="efficiency-label">Eficiencia del Mes</span>
                                <span class="efficiency-value">87.3%</span>
                            </div>
                            
                            <div class="summary-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Días Activos</span>
                                    <span class="stat-value">28/31</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Ciclos Completados</span>
                                    <span class="stat-value">42</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // API pública
    return {
        openModernView: openModernView
    };
})();

// Exportar para uso global
window.BatteryModernView = BatteryModernView;