/**
 * batteryDetailWindow.js
 * Implementación de ventana de detalles de batería usando WindowManager con jQuery UI Tabs.
 */

const BatteryDetailWindow = (function($) {
    
    // Cache para datos de batería y evitar llamadas API innecesarias
    const batteryDataCache = {};
    const detailedInfoCache = {};
    
    /**
     * Abre la ventana de detalles de batería
     * @param {number} batteryId - ID de la batería
     */
    function showBatteryDetail(batteryId) {
        // Mostrar ventana de carga
        const loadingWindowId = WindowManager.createWindow({
            title: `Cargando información de batería ${batteryId}...`,
            width: 800,
            height: 600,
            content: `
                <div class="battery-detail-loading centered-content">
                    <div class="loading-spinner"></div>
                    <p>Obteniendo datos de la batería...</p>
                </div>
            `
        });
        
        // Fetch battery data
        fetchBatteryData(batteryId)
            .then(data => {
                // Almacenar en caché
                batteryDataCache[batteryId] = data.batteryData;
                if (data.detailedInfo) {
                    detailedInfoCache[batteryId] = data.detailedInfo;
                }
                
                // Cerrar ventana de carga
                WindowManager.closeWindow(loadingWindowId);
                
                // Crear ventana con datos completos
                createDetailWindow(data.batteryData, data.detailedInfo);
            })
            .catch(error => {
                // Mostrar error en la ventana de carga
                $(`#${loadingWindowId}`).find('.battery-detail-loading')
                    .html(`<div class="error-message">Error: ${error.message}</div>`);
            });
    }
    
    /**
     * Obtiene datos completos de la batería
     * @param {number} batteryId - ID de la batería para obtener datos
     * @returns {Promise} - Promesa que resuelve con los datos de la batería
     */
    function fetchBatteryData(batteryId) {
        return new Promise((resolve, reject) => {
            // Verificar si hay datos en caché
            if (batteryDataCache[batteryId] && detailedInfoCache[batteryId]) {
                resolve({
                    batteryData: batteryDataCache[batteryId],
                    detailedInfo: detailedInfoCache[batteryId]
                });
                return;
            }
            
            // Obtener datos básicos
            getAllBatteriesStatus()
                .then(response => {
                    if (response.status !== 'success' || !response.batteries) {
                        reject(new Error(response.message || 'No se pudieron obtener datos de baterías'));
                        return;
                    }
                    
                    // Encontrar la batería específica
                    const batteryData = response.batteries.find(b => b.id === parseInt(batteryId) || b.id === batteryId);
                    
                    if (!batteryData) {
                        reject(new Error(`No se encontraron datos para la batería ${batteryId}`));
                        return;
                    }
                    
                    // Obtener información detallada
                    getBatteryDetailedInfo(batteryId)
                        .then(detailedInfo => {
                            resolve({
                                batteryData: batteryData,
                                detailedInfo: detailedInfo
                            });
                        })
                        .catch(error => {
                            // Si falla la info detallada, aún continuamos con lo básico
                            console.warn(`No se pudo obtener información detallada para batería ${batteryId}:`, error);
                            resolve({
                                batteryData: batteryData,
                                detailedInfo: null
                            });
                        });
                })
                .catch(error => {
                    reject(error);
                });
        });
    }
    
    /**
     * Crea la ventana de detalle con jQuery UI Tabs
     * @param {Object} batteryData - Datos de la batería
     * @param {Object} detailedInfo - Información detallada (opcional)
     */
    function createDetailWindow(batteryData, detailedInfo) {
        // Determinar título
        const customName = batteryData.device_info && batteryData.device_info.custom_name 
            ? batteryData.device_info.custom_name 
            : `Batería ${batteryData.id}`;
        
        // Crear contenido con estructura de tabs
        const content = `
            <div class="battery-detail-container">
                <div id="battery-detail-tabs" class="battery-tabs">
                    <ul>
                        <li><a href="#tab-general"><i class="tab-icon general-icon"></i> General</a></li>
                        <li><a href="#tab-technical"><i class="tab-icon technical-icon"></i> Información Técnica</a></li>
                        <li><a href="#tab-cells"><i class="tab-icon cells-icon"></i> Celdas</a></li>
                        <li><a href="#tab-history"><i class="tab-icon history-icon"></i> Histórico</a></li>
                        <li><a href="#tab-advanced"><i class="tab-icon advanced-icon"></i> Avanzado</a></li>
                    </ul>
                    <div id="tab-general" class="tab-content">
                        <div class="tab-loading">Cargando información general...</div>
                    </div>
                    <div id="tab-technical" class="tab-content">
                        <div class="tab-loading">Cargando información técnica...</div>
                    </div>
                    <div id="tab-cells" class="tab-content">
                        <div class="tab-loading">Cargando información de celdas...</div>
                    </div>
                    <div id="tab-history" class="tab-content">
                        <div class="tab-loading">Cargando datos históricos...</div>
                    </div>
                    <div id="tab-advanced" class="tab-content">
                        <div class="tab-loading">Cargando opciones avanzadas...</div>
                    </div>
                </div>
            </div>
        `;
        
        // Crear ventana
        const windowId = WindowManager.createWindow({
            title: `Detalles de ${customName}`,
            width: 900,
            height: 650,
            content: content,
            position: { my: "center", at: "center", of: window }
        });
        
        // Inicializar tabs una vez creada la ventana
        initializeTabs(windowId, batteryData, detailedInfo);
        
        return windowId;
    }
    
    /**
     * Inicializa jQuery UI Tabs y carga contenido
     * @param {string} windowId - ID de la ventana
     * @param {Object} batteryData - Datos de la batería
     * @param {Object} detailedInfo - Información detallada
     */
    function initializeTabs(windowId, batteryData, detailedInfo) {
        // Inicializar jQuery UI Tabs
        $(`#${windowId} #battery-detail-tabs`).tabs({
            animate: false,
            active: 0, // Mostrar primer tab al inicio
            activate: function(event, ui) {
                // Realizar acciones cuando se activa un tab
                const tabId = ui.newPanel.attr('id');
                
                // Verificar si ya se ha cargado el contenido (para evitar recargar)
                if (ui.newPanel.find('.tab-loading').length > 0) {
                    // No se ha cargado el contenido, cargarlo ahora
                    switch(tabId) {
                        case 'tab-general':
                            renderGeneralTab(ui.newPanel, batteryData, detailedInfo);
                            break;
                        case 'tab-technical':
                            renderTechnicalTab(ui.newPanel, batteryData, detailedInfo);
                            break;
                        case 'tab-cells':
                            renderCellsTab(ui.newPanel, batteryData, detailedInfo);
                            break;
                        case 'tab-history':
                            renderHistoryTab(ui.newPanel, batteryData, detailedInfo);
                            break;
                        case 'tab-advanced':
                            renderAdvancedTab(ui.newPanel, batteryData, detailedInfo);
                            break;
                    }
                }
            }
        });
        
        // Añadir iconos a los tabs
        setupTabIcons();
        
        // Renderizar inmediatamente el primer tab (General)
        renderGeneralTab($(`#${windowId} #tab-general`), batteryData, detailedInfo);
    }
    
    /**
     * Configura los iconos de los tabs
     */
    function setupTabIcons() {
        // Usando emojis como iconos para simplicidad
        $('.general-icon').html('📊');
        $('.technical-icon').html('🔧');
        $('.cells-icon').html('🔋');
        $('.history-icon').html('📈');
        $('.advanced-icon').html('⚙️');
    }
    
    /**
     * Renderiza el contenido del tab General
     * @param {jQuery} $container - Contenedor del tab
     * @param {Object} batteryData - Datos de la batería
     * @param {Object} detailedInfo - Información detallada
     */
    function renderGeneralTab($container, batteryData, detailedInfo) {
        // Limpiar contenedor
        $container.empty();
        
        // Estructura para información general
        const html = `
            <div class="general-info-container">
                <div class="battery-header">
                    <h3>${batteryData.device_info?.custom_name || `Batería ${batteryData.id}`}</h3>
                    <span class="battery-status ${Utils.getBatteryStatusClass(batteryData)}">
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
                            <span class="info-value">${Utils.formatTimestamp(batteryData.last_updated, true)}</span>
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
                </div>
            </div>
        `;
        
        // Añadir HTML al contenedor
        $container.html(html);
        
        // Configurar eventos para botones de acción
        $container.find('.verify-cells-btn').on('click', function() {
            handleVerifyCells(batteryData.id, $container);
        });
        
        $container.find('.refresh-data-btn').on('click', function() {
            refreshBatteryData(batteryData.id, $container);
        });
    }
    
    /**
     * Renderiza el contenido del tab Técnico
     * @param {jQuery} $container - Contenedor del tab
     * @param {Object} batteryData - Datos de la batería
     * @param {Object} detailedInfo - Información detallada
     */
    function renderTechnicalTab($container, batteryData, detailedInfo) {
        // Limpiar contenedor
        $container.empty();
        
        // Verificar si hay información detallada disponible
        const hasDetailedInfo = detailedInfo && 
                               (detailedInfo.status === 'success') && 
                               ((detailedInfo.detailed_info && detailedInfo.detailed_info.info) || 
                                detailedInfo.info);
        
        // Obtener la información técnica
        let techInfo = {};
        if (hasDetailedInfo) {
            techInfo = detailedInfo.detailed_info?.info || detailedInfo.info || {};
        }
        
        // Estructura para información técnica
        const html = `
            <div class="technical-info-container">
                <div class="battery-header">
                    <h3>Información Técnica</h3>
                    <span class="battery-type">
                        ${techInfo.manufacturer || batteryData.device_info?.manufacturer || ''} 
                        ${techInfo.model || batteryData.device_info?.model || ''}
                    </span>
                </div>
                
                <div class="technical-info-section">
                    <h4>Especificaciones</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Fabricante:</span>
                            <span class="info-value">${techInfo.manufacturer || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Modelo:</span>
                            <span class="info-value">${techInfo.model || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">N° Serie:</span>
                            <span class="info-value">${techInfo.barcode || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Fecha Fabricación:</span>
                            <span class="info-value">${techInfo.manufactured_date || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Descripción:</span>
                            <span class="info-value">${techInfo.description || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Versión Info:</span>
                            <span class="info-value">${techInfo.info_version || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">E-Label:</span>
                            <span class="info-value">${techInfo.elabel_version || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Pack Voltage:</span>
                            <span class="info-value">${batteryData.pack_voltage !== undefined ? batteryData.pack_voltage.toFixed(2) + ' V' : 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                ${hasDetailedInfo ? `
                    <div class="technical-info-section">
                        <h4>Información Adicional</h4>
                        <div class="info-text">
                            <p>Esta batería cuenta con información detallada proveniente de su eLabel.</p>
                            <p>Los datos fueron obtenidos mediante el protocolo Modbus usando la función personalizada FC41.</p>
                        </div>
                        <button class="action-btn show-raw-info-btn">
                            <i class="action-icon">📃</i> Ver Texto Completo
                        </button>
                    </div>
                ` : `
                    <div class="technical-info-section">
                        <h4>Información Adicional</h4>
                        <div class="info-text">
                            <p>No se dispone de información detallada para esta batería.</p>
                            <p>Puede intentar obtener la información detallada utilizando el botón de actualización.</p>
                        </div>
                    </div>
                `}
            </div>
        `;
        
        // Añadir HTML al contenedor
        $container.html(html);
        
        // Evento para mostrar texto completo
        if (hasDetailedInfo) {
            $container.find('.show-raw-info-btn').on('click', function() {
                const combinedText = detailedInfo.detailed_info?.combined_text || 
                                    detailedInfo.combined_text || '';
                
                showRawTextModal(combinedText, batteryData.id);
            });
        }
    }
    
    /**
     * Renderiza el contenido del tab Celdas
     * @param {jQuery} $container - Contenedor del tab
     * @param {Object} batteryData - Datos de la batería
     * @param {Object} detailedInfo - Información detallada
     */
    function renderCellsTab($container, batteryData, detailedInfo) {
        // Limpiar contenedor
        $container.empty();
        
        // Estructura para información de celdas
        const html = `
            <div class="cells-info-container">
                <div class="battery-header">
                    <h3>Información de Celdas</h3>
                    <button class="action-btn verify-cells-btn">
                        <i class="action-icon">🔍</i> Verificar Celdas
                    </button>
                </div>
                
                <div class="cells-info-section">
                    <h4>Celdas Individuales</h4>
                    <div class="cells-notice">
                        <p>Haga clic en "Verificar Celdas" para obtener información detallada sobre las celdas individuales de esta batería.</p>
                        <p>La verificación leerá los registros correspondientes a voltajes y temperaturas de cada celda.</p>
                    </div>
                    
                    <div id="cells-result-container"></div>
                </div>
                
                <div class="cells-interpretation">
                    <h4>Interpretación de Datos</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Voltaje Nominal:</span>
                            <span class="info-value">3.6V por celda</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Rango Seguro:</span>
                            <span class="info-value">3.0V - 4.2V por celda</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Temperatura Óptima:</span>
                            <span class="info-value">15°C - 35°C</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Añadir HTML al contenedor
        $container.html(html);
        
        // Configurar evento para botón de verificación
        $container.find('.verify-cells-btn').on('click', function() {
            // Mostrar spinner de carga
            const $resultContainer = $container.find('#cells-result-container');
            $resultContainer.html(`
                <div class="verify-cells-result loading">
                    <div class="loading-spinner"></div>
                    <p>Verificando celdas individuales...</p>
                </div>
            `);
            
            // Llamar a la API de verificación
            verifyCellData(batteryData.id)
                .then(result => {
                    if (result.status === 'success' || result.status === 'partial') {
                        renderCellsData(result, $resultContainer);
                    } else {
                        $resultContainer.html(`
                            <div class="verify-cells-result">
                                <div class="error-message">
                                    <p>Error: ${result.message || 'No se pudieron verificar las celdas'}</p>
                                </div>
                            </div>
                        `);
                    }
                })
                .catch(error => {
                    $resultContainer.html(`
                        <div class="verify-cells-result">
                            <div class="error-message">
                                <p>Error: ${error.message || 'Error al verificar celdas'}</p>
                            </div>
                        </div>
                    `);
                });
        });
    }
    
    /**
     * Renderiza los datos de celdas después de la verificación
     * @param {Object} result - Resultado de la verificación
     * @param {jQuery} $container - Contenedor donde mostrar los resultados
     */
    function renderCellsData(result, $container) {
        // Verificar si hay datos de celdas
        if (!result.cell_data || !Array.isArray(result.cell_data) || result.cell_data.length === 0) {
            $container.html(`
                <div class="verify-cells-result">
                    <div class="warning-message">
                        <p>No se encontraron datos de celdas individuales.</p>
                    </div>
                </div>
            `);
            return;
        }
        
        // Crear tabla de celdas
        let tableHtml = `
            <div class="verify-cells-result">
                <div class="success-message">
                    <p>Verificación completada. Se encontraron ${result.cell_data.length} celdas.</p>
                </div>
                
                <table class="cells-table">
                    <thead>
                        <tr>
                            <th>Celda #</th>
                            <th>Voltaje (V)</th>
                            <th>Temperatura (°C)</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Añadir fila para cada celda
        result.cell_data.forEach(cell => {
            // Determinar estado de la celda
            let cellStatus = '';
            let statusClass = '';
            
            if (cell.voltage !== undefined) {
                if (cell.voltage < 3.0) {
                    cellStatus = 'Bajo voltaje';
                    statusClass = 'critical';
                } else if (cell.voltage > 4.2) {
                    cellStatus = 'Alto voltaje';
                    statusClass = 'critical';
                } else if (cell.voltage >= 3.5 && cell.voltage <= 3.7) {
                    cellStatus = 'Óptimo';
                    statusClass = 'success';
                } else {
                   cellStatus = 'Normal';
                   statusClass = '';
               }
           }
           
           if (cell.temperature !== undefined) {
               if (cell.temperature < 5) {
                   cellStatus = 'Temperatura baja';
                   statusClass = 'warning';
               } else if (cell.temperature > 40) {
                   cellStatus = 'Temperatura alta';
                   statusClass = 'critical';
               }
           }
           
           tableHtml += `
               <tr>
                   <td>${cell.cell_number}</td>
                   <td>${cell.voltage !== undefined ? cell.voltage.toFixed(3) + ' V' : 'N/A'}</td>
                   <td>${cell.temperature !== undefined ? cell.temperature + ' °C' : 'N/A'}</td>
                   <td class="${statusClass}">${cellStatus}</td>
               </tr>
           `;
       });
       
       tableHtml += `
                   </tbody>
               </table>
               
               <div class="cells-summary">
                   <p><strong>Resumen:</strong> ${result.summary.cells_count} celdas verificadas</p>
                   ${result.summary.has_voltage_data ? '<p>✓ Datos de voltaje disponibles</p>' : '<p>✗ No hay datos de voltaje</p>'}
                   ${result.summary.has_temp_data ? '<p>✓ Datos de temperatura disponibles</p>' : '<p>✗ No hay datos de temperatura</p>'}
               </div>
           </div>
       `;
       
       // Añadir tabla al contenedor
       $container.html(tableHtml);
   }
   
   /**
    * Renderiza el contenido del tab Histórico
    * @param {jQuery} $container - Contenedor del tab
    * @param {Object} batteryData - Datos de la batería
    * @param {Object} detailedInfo - Información detallada
    */
   function renderHistoryTab($container, batteryData, detailedInfo) {
       // Limpiar contenedor
       $container.empty();
       
       // Verificar disponibilidad de Chart.js
       const chartAvailable = typeof Chart !== 'undefined';
       
       // Estructura para información histórica
       const html = `
           <div class="history-info-container">
               <div class="battery-header">
                   <h3>Datos Históricos</h3>
                   <div class="history-controls">
                       <select class="history-period-select">
                           <option value="day">Últimas 24 horas</option>
                           <option value="week">Última semana</option>
                           <option value="month">Último mes</option>
                       </select>
                   </div>
               </div>
               
               ${chartAvailable ? `
                   <div class="chart-container">
                       <canvas id="battery-history-chart"></canvas>
                   </div>
               ` : `
                   <div class="chart-not-available">
                       <p>La visualización de gráficos requiere Chart.js, que no está disponible actualmente.</p>
                   </div>
               `}
               
               <div class="history-info-section">
                   <h4>Nota sobre Datos Históricos</h4>
                   <div class="info-text">
                       <p>La funcionalidad de datos históricos es una vista previa. Actualmente se muestran datos simulados.</p>
                       <p>Para implementar esta funcionalidad se requiere habilitar el almacenamiento persistente de mediciones periódicas.</p>
                   </div>
               </div>
           </div>
       `;
       
       // Añadir HTML al contenedor
       $container.html(html);
       
       // Si Chart.js está disponible, crear gráfico
       if (chartAvailable) {
           createHistoryChart(batteryData.id);
       }
       
       // Evento para selector de período
       $container.find('.history-period-select').on('change', function() {
           if (chartAvailable) {
               updateHistoryChart(batteryData.id, $(this).val());
           }
       });
   }
   
   /**
    * Crea un gráfico histórico simulado
    * @param {number} batteryId - ID de la batería
    */
   function createHistoryChart(batteryId) {
       // Datos simulados para el gráfico
       const data = generateHistoryData('day');
       
       // Obtener contexto del canvas
       const ctx = document.getElementById('battery-history-chart').getContext('2d');
       
       // Crear gráfico
       window.batteryHistoryChart = new Chart(ctx, {
           type: 'line',
           data: {
               labels: data.labels,
               datasets: [
                   {
                       label: 'Voltaje (V)',
                       data: data.voltage,
                       borderColor: 'rgb(54, 162, 235)',
                       backgroundColor: 'rgba(54, 162, 235, 0.1)',
                       yAxisID: 'y-voltage',
                       fill: true,
                       tension: 0.2
                   },
                   {
                       label: 'SOC (%)',
                       data: data.soc,
                       borderColor: 'rgb(75, 192, 192)',
                       backgroundColor: 'rgba(75, 192, 192, 0.1)',
                       yAxisID: 'y-soc',
                       fill: true,
                       tension: 0.2
                   },
                   {
                       label: 'Corriente (A)',
                       data: data.current,
                       borderColor: 'rgb(255, 99, 132)',
                       backgroundColor: 'rgba(255, 99, 132, 0.1)',
					   yAxisID: 'y-current',
                      fill: true,
                      tension: 0.2
                  }
              ]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                  x: {
                      title: {
                          display: true,
                          text: 'Tiempo'
                      }
                  },
                  'y-voltage': {
                      position: 'left',
                      title: {
                          display: true,
                          text: 'Voltaje (V)'
                      },
                      suggestedMin: 48,
                      suggestedMax: 56
                  },
                  'y-soc': {
                      position: 'right',
                      title: {
                          display: true,
                          text: 'SOC (%)'
                      },
                      suggestedMin: 0,
                      suggestedMax: 100,
                      grid: {
                          drawOnChartArea: false
                      }
                  },
                  'y-current': {
                      position: 'right',
                      title: {
                          display: true,
                          text: 'Corriente (A)'
                      },
                      suggestedMin: -25,
                      suggestedMax: 25,
                      grid: {
                          drawOnChartArea: false
                      }
                  }
              },
              plugins: {
                  title: {
                      display: true,
                      text: `Historial Batería ${batteryId} - Últimas 24 horas`
                  },
                  tooltip: {
                      mode: 'index',
                      intersect: false
                  }
              }
          }
      });
  }
  
  /**
   * Actualiza el gráfico histórico con nuevos datos según el período
   * @param {number} batteryId - ID de la batería
   * @param {string} period - Período seleccionado ('day', 'week', 'month')
   */
  function updateHistoryChart(batteryId, period) {
      if (!window.batteryHistoryChart) return;
      
      // Generar nuevos datos
      const data = generateHistoryData(period);
      
      // Actualizar título
      let titleText = `Historial Batería ${batteryId} - `;
      switch (period) {
          case 'day': titleText += 'Últimas 24 horas'; break;
          case 'week': titleText += 'Última semana'; break;
          case 'month': titleText += 'Último mes'; break;
      }
      
      window.batteryHistoryChart.options.plugins.title.text = titleText;
      
      // Actualizar datos
      window.batteryHistoryChart.data.labels = data.labels;
      window.batteryHistoryChart.data.datasets[0].data = data.voltage;
      window.batteryHistoryChart.data.datasets[1].data = data.soc;
      window.batteryHistoryChart.data.datasets[2].data = data.current;
      
      // Actualizar gráfico
      window.batteryHistoryChart.update();
  }
  
  /**
   * Genera datos históricos simulados según el período
   * @param {string} period - Período ('day', 'week', 'month')
   * @returns {Object} - Datos generados para el gráfico
   */
  function generateHistoryData(period) {
      let points, interval;
      
      // Determinar número de puntos e intervalo según período
      switch (period) {
          case 'day':
              points = 24;
              interval = 'hora';
              break;
          case 'week':
              points = 7;
              interval = 'día';
              break;
          case 'month':
              points = 30;
              interval = 'día';
              break;
          default:
              points = 24;
              interval = 'hora';
      }
      
      // Generar etiquetas
      const labels = [];
      for (let i = 0; i < points; i++) {
          if (interval === 'hora') {
              labels.push(`${i}:00`);
          } else {
              labels.push(`Día ${i + 1}`);
          }
      }
      
      // Generar datos simulados
      // Comenzamos con valores base
      let baseVoltage = 52.5; // Voltaje inicial
      let baseSoc = 80; // SOC inicial
      let baseCurrent = 2; // Corriente inicial
      
      // Arrays para datos
      const voltage = [];
      const soc = [];
      const current = [];
      
      // Generar patrón para los datos
      for (let i = 0; i < points; i++) {
          // Simular ciclos de carga/descarga
          const timeOfDay = (i % 24) / 24; // 0 a 1 representando hora del día
          
          // Durante la noche (valores bajos de timeOfDay) simulamos carga
          // Durante el día simulamos descarga o uso
          const isCharging = timeOfDay < 0.3 || timeOfDay > 0.9;
          
          // Calcular fluctuaciones
          const voltageFluctuation = (Math.random() - 0.5) * 0.8;
          const socFluctuation = (Math.random() - 0.5) * 2;
          
          // Si está cargando, corriente positiva y aumento de SOC/voltaje
          // Si está descargando, corriente negativa y disminución de SOC/voltaje
          let currentValue, voltageChange, socChange;
          
          if (isCharging) {
              currentValue = 5 + (Math.random() * 3);
              voltageChange = 0.05 + (Math.random() * 0.1);
              socChange = 0.3 + (Math.random() * 0.5);
          } else {
              currentValue = -8 + (Math.random() * 5);
              voltageChange = -0.08 - (Math.random() * 0.12);
              socChange = -0.4 - (Math.random() * 0.6);
          }
          
          // Aplicar cambios
          baseVoltage += voltageChange + voltageFluctuation;
          baseSoc += socChange + socFluctuation;
          baseCurrent = currentValue;
          
          // Limitar valores a rangos realistas
          baseVoltage = Math.max(48, Math.min(56, baseVoltage));
          baseSoc = Math.max(20, Math.min(100, baseSoc));
          baseCurrent = Math.max(-20, Math.min(15, baseCurrent));
          
          // Añadir a arrays con redondeo adecuado
          voltage.push(parseFloat(baseVoltage.toFixed(2)));
          soc.push(Math.round(baseSoc));
          current.push(parseFloat(baseCurrent.toFixed(2)));
      }
      
      return { labels, voltage, soc, current };
  }
  
  /**
   * Renderiza el contenido del tab Avanzado
   * @param {jQuery} $container - Contenedor del tab
   * @param {Object} batteryData - Datos de la batería
   * @param {Object} detailedInfo - Información detallada
   */
  function renderAdvancedTab($container, batteryData, detailedInfo) {
      // Limpiar contenedor
      $container.empty();
      
      // Estructura para información avanzada/debug
      const html = `
          <div class="advanced-info-container">
              <div class="battery-header">
                  <h3>Funciones Avanzadas</h3>
                  <div class="advanced-controls">
                      <button class="action-btn refresh-data-btn">
                          <i class="action-icon">🔄</i> Actualizar Datos
                      </button>
                  </div>
              </div>
              
              <div class="advanced-info-section">
                  <h4>Valores Crudos de Registros</h4>
                  
                  <div class="raw-data-container">
                      <h5>Registros Principales</h5>
                      <pre>${JSON.stringify(batteryData.raw_values || [], null, 2)}</pre>
                  </div>
                  
                  <div class="register-mapping">
                      <h5>Mapeo de Registros</h5>
                      <table class="cells-table">
                          <thead>
                              <tr>
                                  <th>Registro</th>
                                  <th>Descripción</th>
                                  <th>Fórmula</th>
                                  <th>Valor Actual</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td>0</td>
                                  <td>Voltaje de Batería</td>
                                  <td>Valor × 0.01</td>
                                  <td>${batteryData.raw_values && batteryData.raw_values[0] ? batteryData.raw_values[0] + ' → ' + (batteryData.raw_values[0] * 0.01).toFixed(2) + ' V' : 'N/A'}</td>
                              </tr>
                              <tr>
                                  <td>1</td>
                                  <td>Voltaje de Pack</td>
                                  <td>Valor × 0.01</td>
                                  <td>${batteryData.raw_values && batteryData.raw_values[1] ? batteryData.raw_values[1] + ' → ' + (batteryData.raw_values[1] * 0.01).toFixed(2) + ' V' : 'N/A'}</td>
                              </tr>
                              <tr>
                                  <td>2</td>
                                  <td>Corriente</td>
                                  <td>Valor × 0.01 (con signo)</td>
                                  <td>${batteryData.raw_values && batteryData.raw_values[2] !== undefined ? batteryData.raw_values[2] + ' → ' + Utils.convertCurrentValue(batteryData.raw_values[2]).toFixed(2) + ' A' : 'N/A'}</td>
                              </tr>
                              <tr>
                                  <td>3</td>
                                  <td>Estado de Carga (SOC)</td>
                                  <td>Valor directo</td>
                                  <td>${batteryData.raw_values && batteryData.raw_values[3] !== undefined ? batteryData.raw_values[3] + ' %' : 'N/A'}</td>
                              </tr>
                              <tr>
                                  <td>4</td>
                                  <td>Estado de Salud (SOH)</td>
                                  <td>Valor directo</td>
                                  <td>${batteryData.raw_values && batteryData.raw_values[4] !== undefined ? batteryData.raw_values[4] + ' %' : 'N/A'}</td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
              </div>
              
              <div class="advanced-actions">
                  <button class="action-btn verify-cells-btn">
                      <i class="action-icon">🔍</i> Verificar Celdas
                  </button>
                  <button class="action-btn show-raw-info-btn">
                      <i class="action-icon">📃</i> Ver Texto Dispositivo
                  </button>
              </div>
          </div>
      `;
      
      // Añadir HTML al contenedor
      $container.html(html);
      
      // Configurar eventos para botones
      $container.find('.verify-cells-btn').on('click', function() {
          handleVerifyCells(batteryData.id, $container);
      });
      
      $container.find('.refresh-data-btn').on('click', function() {
          refreshBatteryData(batteryData.id, $container);
      });
      
      $container.find('.show-raw-info-btn').on('click', function() {
          const combinedText = detailedInfo && 
                              (detailedInfo.detailed_info?.combined_text || 
                               detailedInfo.combined_text) || '';
          
          showRawTextModal(combinedText || 'No hay datos crudos disponibles', batteryData.id);
      });
  }
  
  /**
   * Maneja la acción de verificar celdas
   * @param {number} batteryId - ID de la batería
   * @param {jQuery} $container - Contenedor donde mostrar resultados
   */
  function handleVerifyCells(batteryId, $container) {
      // Mostrar loading
      const $resultArea = $('<div class="verify-cells-result loading">Verificando celdas...</div>');
      $container.append($resultArea);
      
      // Llamar API de verificación
      verifyCellData(batteryId)
          .then(result => {
              $resultArea.removeClass('loading');
              
              if (result.status === 'success' || result.status === 'partial') {
                  $resultArea.html(`
                      <div class="success-message">
                          <p>Verificación completada. Ver detalles en la consola.</p>
                          <p>Resumen: ${result.summary.cells_count} celdas verificadas.</p>
                      </div>
                  `);
              } else {
                  $resultArea.html(`
                      <div class="error-message">
                          <p>Error: ${result.message || 'No se pudieron verificar las celdas'}</p>
                      </div>
                  `);
              }
          })
          .catch(error => {
              $resultArea.removeClass('loading').html(`
                  <div class="error-message">
                      <p>Error: ${error.message}</p>
                  </div>
              `);
          });
  }
  
  /**
   * Actualiza los datos de la batería
   * @param {number} batteryId - ID de la batería
   * @param {jQuery} $container - Contenedor de la ventana
   */
  function refreshBatteryData(batteryId, $container) {
      // Mostrar mensaje de recarga
      const $refreshMessage = $('<div class="refresh-message loading">Actualizando datos...</div>');
      $container.prepend($refreshMessage);
      
      // Obtener nuevos datos
      fetchBatteryData(batteryId)
          .then(data => {
              $refreshMessage.removeClass('loading').html(`
                  <div class="success-message">
                      <p>Datos actualizados correctamente.</p>
                  </div>
              `);
              
              // Obtener el ID de la ventana actual
              const windowId = $container.closest('.ui-dialog-content').attr('id');
              
              // Cerrar ventana actual
              WindowManager.closeWindow(windowId);
              
              // Crear nueva ventana con datos actualizados
              createDetailWindow(data.batteryData, data.detailedInfo);
              
              // Ocultar mensaje después de un tiempo
              setTimeout(() => {
                  $refreshMessage.fadeOut(500, function() {
                      $(this).remove();
                  });
              }, 3000);
          })
          .catch(error => {
              $refreshMessage.removeClass('loading').html(`
                  <div class="error-message">
                      <p>Error al actualizar datos: ${error.message}</p>
                  </div>
              `);
              
              // Ocultar mensaje después de un tiempo
              setTimeout(() => {
                  $refreshMessage.fadeOut(500, function() {
                      $(this).remove();
                  });
              }, 5000);
          });
  }
  
  /**
   * Muestra una ventana modal con texto crudo
   * @param {string} text - Texto a mostrar
   * @param {number} batteryId - ID de la batería
   */
  function showRawTextModal(text, batteryId) {
      WindowManager.createWindow({
          title: `Texto Crudo - Batería ${batteryId}`,
          width: 800,
          height: 600,
          content: `
              <div class="raw-text-container">
                  <div class="raw-text-header">
                      <p>Texto crudo obtenido del dispositivo mediante función FC41:</p>
                  </div>
                  <div class="raw-text-content">
                      <pre>${text || 'No hay datos disponibles'}</pre>
                  </div>
              </div>
          `
      });
  }
  
  // API pública
  return {
      showBatteryDetail: showBatteryDetail
  };
  
})(jQuery);

// Reemplazar la implementación anterior manteniendo la compatibilidad
window.showBatteryDetail = BatteryDetailWindow.showBatteryDetail;