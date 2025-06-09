/**
 * Componente para la pestaña de Celdas
 * Interfaz visual moderna para monitoreo de celdas individuales
 * VERSIÓN 3.0 - Diseño visual con representación de botellas
 */
const CellsTab = {
    // Cache de datos para evitar re-renders innecesarios
    _lastCellData: null,
    _isLoading: false,
    _viewMode: 'voltage', // 'voltage' o 'temperature'
    
    /**
     * Renderiza el contenido de la pestaña Celdas
     */
    render: function(batteryData, detailedInfo, $container) {
        if (!batteryData) {
            $container.html('<div class="tab-error">No hay datos disponibles</div>');
            return;
        }
        
        // Estructura HTML del componente
        const html = `
            <div class="cells-info-container-v3">
                <div class="cells-header">
                    <div class="header-info">
                        <h3>🔋 Batería ${batteryData.id}</h3>
                    </div>
                    <div class="header-controls">
                        <button class="action-btn toggle-view-btn" data-mode="${this._viewMode}">
                            <i class="action-icon">${this._viewMode === 'voltage' ? '🌡️' : '⚡'}</i> 
                            ${this._viewMode === 'voltage' ? 'Ver Temperaturas' : 'Ver Voltajes'}
                        </button>
                        <button class="action-btn refresh-cells-btn">
                            <i class="action-icon">🔄</i> Actualizar
                        </button>
                    </div>
                </div>
                
                <div class="cells-content" id="cells-content">
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>Cargando datos de celdas...</p>
                    </div>
                </div>
            </div>
        `;
        
        $container.html(html);
        this._setupEvents(batteryData, $container);
        
        // Carga automática de datos
        this._loadCellsData(batteryData.id, $container);
    },
    
    /**
     * Configura eventos para elementos interactivos
     */
    _setupEvents: function(batteryData, $container) {
        const self = this;
        
        // Evento para actualizar datos
        $container.find('.refresh-cells-btn').on('click', function() {
            if (!self._isLoading) {
                self._loadCellsData(batteryData.id, $container);
            }
        });
        
        // Evento para cambiar entre vista de voltajes y temperaturas
        $container.find('.toggle-view-btn').on('click', function() {
            const $btn = $(this);
            const currentMode = $btn.data('mode');
            
            // Cambiar modo
            self._viewMode = currentMode === 'voltage' ? 'temperature' : 'voltage';
            
            // Actualizar botón
            $btn.data('mode', self._viewMode);
            $btn.html(`
                <i class="action-icon">${self._viewMode === 'voltage' ? '🌡️' : '⚡'}</i> 
                ${self._viewMode === 'voltage' ? 'Ver Temperaturas' : 'Ver Voltajes'}
            `);
            
            // Si ya tenemos datos cargados, actualizar la vista
            if (self._lastCellData) {
                self._renderCellsInterface(self._lastCellData, $container);
            }
        });
    },
    
    /**
     * Carga los datos de celdas usando el nuevo endpoint optimizado
     */
    _loadCellsData: function(batteryId, $container) {
        const self = this;
        
        if (self._isLoading) return;
        
        self._isLoading = true;
        const $content = $container.find('#cells-content');
        const $refreshBtn = $container.find('.refresh-cells-btn');
        
        // Mostrar estado de carga
        $content.html(`
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Leyendo registros de celdas...</p>
            </div>
        `);
        
        $refreshBtn.prop('disabled', true);
        
        // Usar el nuevo endpoint optimizado
        fetch(`/api/batteries/cells_data/${batteryId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(result => {
                console.log('Datos recibidos del endpoint optimizado:', result);
                if (result.status === 'success' || result.status === 'partial') {
                    self._lastCellData = result;
                    self._renderCellsInterface(result, $container);
                } else {
                    self._renderError(result.message || 'Error al cargar datos', $content);
                }
            })
            .catch(error => {
                console.error('Error al cargar datos de celdas:', error);
                self._renderError(`Error de conexión: ${error.message}`, $content);
            })
            .finally(() => {
                self._isLoading = false;
                $refreshBtn.prop('disabled', false);
            });
    },
    
    /**
     * Renderiza la interfaz completa de celdas
     */
    _renderCellsInterface: function(data, $container) {
        const cellsInfo = this._processCellsData(data);
        
        if (!cellsInfo.isValid) {
            this._renderError('No se encontraron datos válidos de celdas', $container.find('#cells-content'));
            return;
        }
        
        // Crear la interfaz completa con el nuevo orden
        const interfaceHtml = `
            <div class="cells-interface">
                ${this._createBottleGridSection(cellsInfo)}
                <div class="battery-status-bar" id="battery-status">
                    ${this._createStatusBar(cellsInfo)}
                </div>
                ${this._createBalanceSection(cellsInfo)}
                ${this._createThermalSection(cellsInfo)}
                ${this._createTechnicalDetails(cellsInfo)}
            </div>
        `;
        
        $container.find('#cells-content').html(interfaceHtml);
        
        // Configurar eventos de la interfaz
        this._setupInterfaceEvents($container);
    },
    
    /**
     * Funciones de utilidad (MOVIDAS AL PRINCIPIO)
     */
    _renderError: function(message, $container) {
        $container.html(`
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h4>Error al cargar datos</h4>
                <p>${message}</p>
            </div>
        `);
    },
    
    _setupInterfaceEvents: function($container) {
        // Los eventos se configuran automáticamente con onclick en el HTML
    },
    
    /**
     * Crea la barra de estado de la batería
     */
    _createStatusBar: function(cellsInfo) {
        const batteryData = cellsInfo.batteryData;
        const cellCount = cellsInfo.activeCells.length;
        const soc = batteryData.soc || 'N/A';
        const tempRange = cellsInfo.temperatureStats ? 
            `${cellsInfo.temperatureStats.min}-${cellsInfo.temperatureStats.max}°C` : 'N/A';
        
        return `
            <span class="status-item">📊 ${cellCount} Celdas Activas</span>
            <span class="status-item">⚡ ${soc}% SOC</span>
            <span class="status-item">🌡️ ${tempRange}</span>
            <span class="status-item ${this._getBalanceStatusClass(cellsInfo)}">
                ${this._getBalanceStatusIcon(cellsInfo)} ${this._getBalanceStatusText(cellsInfo)}
            </span>
        `;
    },
    
    /**
     * ACTUALIZADO: Procesa los datos del nuevo formato optimizado
     */
    _processCellsData: function(data) {
        const result = {
            isValid: false,
            activeCells: [],
            cellCount: 0,
            batteryData: {},
            voltageStats: null,
            temperatureStats: null,
            rawData: data
        };
        
        try {
            // NUEVO: Extraer datos básicos del formato optimizado
            if (data.basic_data) {
                result.batteryData = {
                    soc: data.basic_data.soc,
                    soh: data.basic_data.soh,
                    current: data.basic_data.current,
                    maxTemp: data.basic_data.max_cell_temp,
                    minTemp: data.basic_data.min_cell_temp
                };
                
                result.cellCount = data.basic_data.cell_count || 0;
            }
            
            // ACTUALIZADO: Procesar datos de celdas con nuevo formato
            if (data.cell_data) {
                result.activeCells = this._extractActiveCells(data.cell_data, result.cellCount);
                
                if (result.activeCells.length > 0) {
                    result.voltageStats = this._calculateVoltageStats(result.activeCells);
                    result.temperatureStats = this._calculateTemperatureStats(result.activeCells);
                    result.isValid = true;
                }
            }
            
        } catch (error) {
            console.error('Error procesando datos de celdas:', error);
        }
        
        return result;
    },
    
    /**
     * ACTUALIZADO: Extrae solo las celdas activas del nuevo formato
     */
    _extractActiveCells: function(cellData, maxCells) {
        const cells = [];
        const cellMap = new Map(); // Para combinar voltajes y temperaturas
        
        console.log('Extrayendo celdas activas. maxCells:', maxCells);
        console.log('cellData recibido:', cellData);
        
        // Procesar voltajes block1
        if (cellData.cell_voltages_block1 && cellData.cell_voltages_block1.success) {
            console.log('Procesando cell_voltages_block1...');
            cellData.cell_voltages_block1.cells.forEach(cell => {
                if (cell.status === 'OK' && cell.cell_number <= maxCells) {
                    if (!cellMap.has(cell.cell_number)) {
                        cellMap.set(cell.cell_number, { cell_number: cell.cell_number });
                    }
                    cellMap.get(cell.cell_number).voltage = cell.processed_value;
                    cellMap.get(cell.cell_number).voltage_raw = cell.raw_value;
                }
            });
        }
        
        // Procesar voltajes block2 (si existe y tiene éxito)
        if (cellData.cell_voltages_block2 && cellData.cell_voltages_block2.success) {
            console.log('Procesando cell_voltages_block2...');
            cellData.cell_voltages_block2.cells.forEach(cell => {
                if (cell.status === 'OK' && cell.cell_number <= maxCells) {
                    if (!cellMap.has(cell.cell_number)) {
                        cellMap.set(cell.cell_number, { cell_number: cell.cell_number });
                    }
                    cellMap.get(cell.cell_number).voltage = cell.processed_value;
                    cellMap.get(cell.cell_number).voltage_raw = cell.raw_value;
                }
            });
        } else {
            console.log('cell_voltages_block2 no disponible:', cellData.cell_voltages_block2);
        }
        
        // Procesar temperaturas block1
        if (cellData.cell_temperatures_block1 && cellData.cell_temperatures_block1.success) {
            console.log('Procesando cell_temperatures_block1...');
            cellData.cell_temperatures_block1.cells.forEach(cell => {
                if (cell.status === 'OK' && cell.cell_number <= maxCells) {
                    if (!cellMap.has(cell.cell_number)) {
                        cellMap.set(cell.cell_number, { cell_number: cell.cell_number });
                    }
                    cellMap.get(cell.cell_number).temperature = cell.processed_value;
                    cellMap.get(cell.cell_number).temperature_raw = cell.raw_value;
                }
            });
        }
        
        // Procesar temperaturas block2
        if (cellData.cell_temperatures_block2 && cellData.cell_temperatures_block2.success) {
            console.log('Procesando cell_temperatures_block2...');
            cellData.cell_temperatures_block2.cells.forEach(cell => {
                if (cell.status === 'OK' && cell.cell_number <= maxCells) {
                    if (!cellMap.has(cell.cell_number)) {
                        cellMap.set(cell.cell_number, { cell_number: cell.cell_number });
                    }
                    cellMap.get(cell.cell_number).temperature = cell.processed_value;
                    cellMap.get(cell.cell_number).temperature_raw = cell.raw_value;
                }
            });
        }
        
        // Convertir mapa a array y ordenar por número de celda
        const result = Array.from(cellMap.values())
            .filter(cell => cell.voltage !== undefined || cell.temperature !== undefined)
            .sort((a, b) => a.cell_number - b.cell_number);
            
        console.log('Celdas extraídas:', result);
        return result;
    },
    
    /**
     * Calcula estadísticas de voltajes
     */
    _calculateVoltageStats: function(cells) {
        const voltages = cells.filter(c => c.voltage !== undefined).map(c => c.voltage);
        if (voltages.length === 0) return null;
        
        const min = Math.min(...voltages);
        const max = Math.max(...voltages);
        const avg = voltages.reduce((a, b) => a + b, 0) / voltages.length;
        const diff = max - min;
        
        return {
            min: min,
            max: max,
            avg: avg,
            diff: diff,
            count: voltages.length,
            minCellIndex: voltages.indexOf(min),
            maxCellIndex: voltages.indexOf(max)
        };
    },
    
    /**
     * Calcula estadísticas de temperaturas
     */
    _calculateTemperatureStats: function(cells) {
        const temps = cells.filter(c => c.temperature !== undefined).map(c => c.temperature);
        if (temps.length === 0) return null;
        
        const min = Math.min(...temps);
        const max = Math.max(...temps);
        const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
        const diff = max - min;
        
        return {
            min: min,
            max: max,
            avg: avg,
            diff: diff,
            count: temps.length,
            minCellIndex: temps.indexOf(min),
            maxCellIndex: temps.indexOf(max)
        };
    },
    
    /**
     * Crea el grid visual de celdas con representación de botellas
     */
    _createBottleGridSection: function(cellsInfo) {
        const cells = cellsInfo.activeCells;
        if (cells.length === 0) return '';
        
        // Determinar layout del grid según el número de celdas
        const totalCells = cells.length;
        let gridCols;
        
        if (totalCells <= 11) {
            gridCols = Math.ceil(Math.sqrt(totalCells));
        } else if (totalCells <= 16) {
            gridCols = 4; // 4x4 para 16 celdas
        } else {
            gridCols = Math.ceil(totalCells / 4); // Para 22 o más celdas
        }
        
        // Preparar datos para identificar min/max
        const viewMode = this._viewMode;
        
        let minValue, maxValue, isCriticalBalance = false;
        let minCellNumber, maxCellNumber;
        
        if (viewMode === 'voltage' && cellsInfo.voltageStats) {
            minValue = cellsInfo.voltageStats.min;
            maxValue = cellsInfo.voltageStats.max;
            isCriticalBalance = cellsInfo.voltageStats.diff > 0.1;
            
            cells.forEach(cell => {
                if (cell.voltage === minValue) minCellNumber = cell.cell_number;
                if (cell.voltage === maxValue) maxCellNumber = cell.cell_number;
            });
            
        } else if (viewMode === 'temperature' && cellsInfo.temperatureStats) {
            minValue = cellsInfo.temperatureStats.min;
            maxValue = cellsInfo.temperatureStats.max;
            isCriticalBalance = cellsInfo.temperatureStats.diff > 8;
            
            cells.forEach(cell => {
                if (cell.temperature === minValue) minCellNumber = cell.cell_number;
                if (cell.temperature === maxValue) maxCellNumber = cell.cell_number;
            });
        }
        
        // Título de la sección según el modo de vista
        const sectionTitle = viewMode === 'voltage' ? 
            '🔋 Niveles de Carga (Voltajes)' : 
            '🌡️ Temperaturas de Celdas';
        
        let gridHtml = `
            <div class="bottle-grid-section">
                <h4>${sectionTitle}</h4>
                <div class="bottle-grid" style="grid-template-columns: repeat(${gridCols}, 1fr);">
        `;
        
        // Generar HTML para cada celda
        cells.forEach(cell => {
            let fillPercentage = 0;
            let bottleClass = 'normal';
            let bottleIcon = '';
            let bottleValue = 'N/A';
            
            if (viewMode === 'voltage' && cell.voltage !== undefined) {
                const minVoltage = 2.8;
                const maxVoltage = 3.65;
                const range = maxVoltage - minVoltage;
                
                fillPercentage = Math.min(100, Math.max(0, 
                    ((cell.voltage - minVoltage) / range) * 100
                ));
                
                if (cell.cell_number === maxCellNumber) {
                    bottleClass = isCriticalBalance ? 'critical-high' : 'highest';
                } else if (cell.cell_number === minCellNumber) {
                    bottleClass = 'lowest';
                } else if (cell.voltage < 3.0) {
                    bottleClass = 'critical-low';
                } else if (cell.voltage > 3.6) {
                    bottleClass = 'high';
                }
                
                bottleValue = cell.voltage.toFixed(3) + 'V';
                
            } else if (viewMode === 'temperature' && cell.temperature !== undefined) {
                const minTemp = 0;
                const maxTemp = 45;
                const range = maxTemp - minTemp;
                
                fillPercentage = Math.min(100, Math.max(0, 
                    ((cell.temperature - minTemp) / range) * 100
                ));
                
                if (cell.temperature < 5) {
                    bottleClass = 'temp-cold';
                    bottleIcon = '❄️';
                } else if (cell.temperature > 40) {
                    bottleClass = 'temp-hot';
                    bottleIcon = '🔥';
                } else if (cell.cell_number === maxCellNumber) {
                    bottleClass = 'temp-highest';
                } else if (cell.cell_number === minCellNumber) {
                    bottleClass = 'temp-lowest';
                }
                
                bottleValue = cell.temperature + '°C';
            }
            
            gridHtml += `
                <div class="bottle-cell ${bottleClass}">
                    <div class="bottle-header">
                        <span class="cell-number">C${cell.cell_number}</span>
                        ${bottleIcon ? `<span class="bottle-icon">${bottleIcon}</span>` : ''}
                    </div>
                    <div class="bottle-container">
                        <div class="bottle-body">
                            <div class="bottle-fill" style="height: ${fillPercentage}%"></div>
                        </div>
                        <div class="bottle-neck"></div>
                        <div class="bottle-cap"></div>
                    </div>
                    <div class="bottle-value">${bottleValue}</div>
                </div>
            `;
        });
        
        gridHtml += `
                </div>
            </div>
        `;
        
        return gridHtml;
    },
    
    /**
     * Crea la sección de balance de voltajes
     */
    _createBalanceSection: function(cellsInfo) {
        if (!cellsInfo.voltageStats) return '';
        
        const stats = cellsInfo.voltageStats;
        const balanceClass = this._getBalanceStatusClass(cellsInfo);
        const balanceIcon = this._getBalanceStatusIcon(cellsInfo);
        
        return `
            <div class="balance-section">
                <h4>📊 Balance de Voltajes</h4>
                <div class="balance-info">
                    <div class="balance-bar">
                        <div class="bar-track">
                            <div class="bar-fill ${balanceClass}" style="width: 100%"></div>
                        </div>
                        <div class="bar-labels">
                            <span>${stats.min.toFixed(3)}V</span>
                            <span>${stats.max.toFixed(3)}V</span>
                        </div>
                    </div>
                    <div class="balance-stats">
                        <div class="stat-item">
                            <span class="stat-label">Diferencia:</span>
                            <span class="stat-value ${balanceClass}">${(stats.diff * 1000).toFixed(0)}mV ${balanceIcon}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Promedio:</span>
                            <span class="stat-value">${stats.avg.toFixed(3)}V</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Celdas:</span>
                            <span class="stat-value">${stats.count}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Crea la sección de distribución térmica
     */
    _createThermalSection: function(cellsInfo) {
        if (this._viewMode !== 'voltage' || !cellsInfo.temperatureStats) return '';
        
        const stats = cellsInfo.temperatureStats;
        const thermalClass = this._getThermalStatusClass(stats);
        const thermalIcon = this._getThermalStatusIcon(stats);
        
        return `
            <div class="thermal-section">
                <h4>🌡️ Distribución Térmica</h4>
                <div class="thermal-info">
                    <div class="thermal-bar">
                        <div class="bar-track">
                            <div class="bar-fill ${thermalClass}" style="width: 100%"></div>
                        </div>
                        <div class="bar-labels">
                            <span>${stats.min}°C</span>
                            <span>${stats.max}°C</span>
                        </div>
                    </div>
                    <div class="thermal-stats">
                        <div class="stat-item">
                            <span class="stat-label">Diferencia:</span>
                            <span class="stat-value ${thermalClass}">${stats.diff}°C ${thermalIcon}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Promedio:</span>
                            <span class="stat-value">${stats.avg.toFixed(1)}°C</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Sensores:</span>
                            <span class="stat-value">${stats.count}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Crea la sección de datos técnicos expandibles
     */
    _createTechnicalDetails: function(cellsInfo) {
        const cells = cellsInfo.activeCells;
        
        return `
            <div class="technical-section">
                <div class="technical-header" onclick="CellsTab._toggleTechnicalDetails()">
                    <h4>🔧 Datos Técnicos Detallados</h4>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="technical-content" style="display: none;">
                    <table class="technical-table">
                        <thead>
                            <tr>
                                <th>Celda</th>
                                <th>Voltaje (V)</th>
                                <th>Temperatura (°C)</th>
                                <th>Voltaje Raw</th>
                                <th>Temperatura Raw</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cells.map(cell => {
                                const status = this._getCellStatus(cell);
                                return `
                                    <tr>
                                        <td><strong>C${cell.cell_number}</strong></td>
                                        <td>${cell.voltage !== undefined ? cell.voltage.toFixed(3) : 'N/A'}</td>
                                        <td>${cell.temperature !== undefined ? cell.temperature : 'N/A'}</td>
                                        <td>${cell.voltage_raw !== undefined ? cell.voltage_raw : 'N/A'}</td>
                                        <td>${cell.temperature_raw !== undefined ? cell.temperature_raw : 'N/A'}</td>
                                        <td class="${status.class}">${status.icon} ${status.text}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },
    
    /**
     * Funciones de estado y clasificación
     */
    _getCellStatus: function(cell) {
        if (cell.voltage !== undefined) {
            if (cell.voltage < 3.0) return { class: 'critical', icon: '❌', text: 'Voltaje Crítico' };
            if (cell.voltage > 3.65) return { class: 'critical', icon: '❌', text: 'Sobrevoltaje' };
        }
        
        if (cell.temperature !== undefined) {
            if (cell.temperature < 5) return { class: 'warning', icon: '❄️', text: 'Temp. Baja' };
            if (cell.temperature > 40) return { class: 'critical', icon: '🔥', text: 'Temp. Alta' };
        }
        
        return { class: 'success', icon: '✅', text: 'Normal' };
    },
    
    _getBalanceStatusClass: function(cellsInfo) {
        if (!cellsInfo.voltageStats) return 'unknown';
        const diffMv = cellsInfo.voltageStats.diff * 1000;
        if (diffMv <= 10) return 'excellent';
        if (diffMv <= 50) return 'good';
        if (diffMv <= 100) return 'warning';
        return 'critical';
    },
    
    _getBalanceStatusIcon: function(cellsInfo) {
        const statusClass = this._getBalanceStatusClass(cellsInfo);
        const icons = {
            'excellent': '🏆',
            'good': '✅', 
            'warning': '⚠️',
            'critical': '❌',
            'unknown': '❓'
        };
        return icons[statusClass] || '❓';
    },
    
    _getBalanceStatusText: function(cellsInfo) {
        const statusClass = this._getBalanceStatusClass(cellsInfo);
        const texts = {
            'excellent': 'Excelente',
            'good': 'Bueno',
            'warning': 'Advertencia', 
            'critical': 'Crítico',
            'unknown': 'Desconocido'
        };
        return texts[statusClass] || 'Desconocido';
    },
    
    _getThermalStatusClass: function(stats) {
        if (stats.diff <= 3) return 'excellent';
        if (stats.diff <= 8) return 'good';
        if (stats.diff <= 15) return 'warning';
        return 'critical';
    },
    
    _getThermalStatusIcon: function(stats) {
        const statusClass = this._getThermalStatusClass(stats);
        const icons = {
            'excellent': '❄️',
            'good': '✅',
            'warning': '⚠️', 
            'critical': '🔥'
        };
        return icons[statusClass] || '❓';
    },
    
    _toggleTechnicalDetails: function() {
        const $content = $('.technical-content');
        const $icon = $('.toggle-icon');
        
        if ($content.is(':visible')) {
            $content.slideUp();
            $icon.text('▼');
        } else {
            $content.slideDown();
            $icon.text('▲');
        }
    }
};