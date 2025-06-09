/**
 * HealthTab.js - Solo UI y renderizado
 * Utiliza BatteryHealthCalculations.js para todos los cálculos
 */
const HealthTab = {
    // Referencias a gráficos para limpieza
    _gaugeChart: null,
    _degradationChart: null,
    
    // Cache del último análisis
    _lastAnalysis: null,
    
    /**
     * Renderiza el contenido de la pestaña Salud
     */
    render: function(batteryData, detailedInfo, $container) {
        if (!batteryData) {
            $container.html('<div class="tab-error">No hay datos de batería disponibles</div>');
            return;
        }
        
        console.log('HealthTab: Iniciando renderizado para batería', batteryData.id);
        
        // Generar IDs únicos para los canvas
        const gaugeId = 'health-gauge-' + Date.now();
        const degradationId = 'health-degradation-' + Date.now();
        
        // Renderizar estructura HTML
        const html = this._generateHTML(batteryData.id, gaugeId, degradationId);
        $container.html(html);
        
        // Configurar eventos
        this._setupEvents(batteryData, detailedInfo, $container);
        
        // Iniciar análisis
        this._performAnalysis(batteryData, detailedInfo, gaugeId, degradationId);
    },
    
    /**
     * Genera la estructura HTML completa
     */
    _generateHTML: function(batteryId, gaugeId, degradationId) {
        return `
            <div class="health-info-container">
                <div class="battery-header">
                    <h3>Análisis de Salud - Batería ${batteryId}</h3>
                    <div class="health-controls">
                        <button class="action-btn refresh-health-btn">
                            <i class="action-icon">🔄</i> Actualizar Análisis
                        </button>
                        <button class="action-btn show-details-btn">
                            <i class="action-icon">📊</i> Ver Registros
                        </button>
                    </div>
                </div>
                
                <!-- Indicador de carga -->
                <div class="health-loading-overlay" id="health-loading">
                    <div class="loading-spinner"></div>
                    <p>Analizando salud de la batería...</p>
                </div>
                
                <!-- Contenido principal -->
                <div class="health-content" id="health-content" style="display: none;">
                    
                    <!-- Alertas de inconsistencia -->
                    <div class="health-warnings" id="health-warnings" style="display: none;"></div>
                    
                    <!-- Grid principal 2x2 -->
                    <div class="health-grid">
                        
                        <!-- Gauge de Salud General -->
                        <div class="health-section health-gauge-section">
                            <h4>Salud General</h4>
                            <div class="gauge-container">
                                <canvas id="${gaugeId}" width="200" height="200"></canvas>
                            </div>
                            <div class="gauge-comparison">
                                <div class="comparison-item">
                                    <span class="label">SOH Estimado:</span>
                                    <span class="value" id="soh-estimated">--%</span>
                                </div>
                                <div class="comparison-item">
                                    <span class="label">SOH Real:</span>
                                    <span class="value" id="soh-real">--%</span>
                                </div>
                                <div class="comparison-item">
                                    <span class="label">Diferencia:</span>
                                    <span class="value" id="soh-difference">--%</span>
                                </div>
                                <div class="comparison-item">
                                    <span class="label">Estado:</span>
                                    <span class="value" id="health-status">--</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Predicciones de Vida Útil -->
                        <div class="health-section health-predictions-section">
                            <h4>Predicciones de Vida Útil</h4>
                            
                            <div class="prediction-card realistic">
                                <div class="prediction-header">
                                    <span class="prediction-icon">🎯</span>
                                    <span class="prediction-title">Realista</span>
                                </div>
                                <div class="prediction-content">
                                    <div class="time-remaining" id="realistic-time">-- años</div>
                                    <div class="end-date">Hasta: <span id="realistic-date">--</span></div>
                                    <div class="confidence">Confianza: <span id="realistic-confidence">--%</span></div>
                                </div>
                            </div>
                            
                            <div class="prediction-card conservative">
                                <div class="prediction-header">
                                    <span class="prediction-icon">🔸</span>
                                    <span class="prediction-title">Conservadora</span>
                                </div>
                                <div class="prediction-content">
                                    <div class="time-remaining" id="conservative-time">-- años</div>
                                    <div class="end-date">Hasta: <span id="conservative-date">--</span></div>
                                    <div class="method" id="conservative-method">--</div>
                                </div>
                            </div>
                            
                            <div class="prediction-card optimistic">
                                <div class="prediction-header">
                                    <span class="prediction-icon">🔹</span>
                                    <span class="prediction-title">Optimista</span>
                                </div>
                                <div class="prediction-content">
                                    <div class="time-remaining" id="optimistic-time">-- años</div>
                                    <div class="end-date">Hasta: <span id="optimistic-date">--</span></div>
                                    <div class="method" id="optimistic-method">--</div>
                                </div>
                            </div>
                            
                            <div class="data-quality-indicator">
                                <div class="quality-item">
                                    <span class="quality-label">Calidad de datos:</span>
                                    <span class="quality-value" id="data-quality">--</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Métricas Clave -->
                        <div class="health-section health-metrics-section">
                            <h4>Métricas de Desgaste</h4>
                            
                            <div class="metric-item primary">
                                <div class="metric-header">
                                    <span class="metric-label">🔋 Ah Acumulados</span>
                                    <span class="metric-value" id="ah-value">-- Ah</span>
                                </div>
                                <div class="metric-bar">
                                    <div class="metric-fill" id="ah-fill" style="width: 0%"></div>
                                </div>
                                <div class="metric-info">
                                    <span class="metric-percentage" id="ah-percentage">--%</span>
                                    <span class="metric-detail" id="ah-detail">--</span>
                                </div>
                            </div>
                            
                            <div class="metric-item">
                                <div class="metric-header">
                                    <span class="metric-label">🔄 Ciclos Reportados</span>
                                    <span class="metric-value" id="cycles-value">--</span>
                                </div>
                                <div class="metric-bar">
                                    <div class="metric-fill" id="cycles-fill" style="width: 0%"></div>
                                </div>
                                <div class="metric-info">
                                    <span class="metric-percentage" id="cycles-percentage">--%</span>
                                    <span class="metric-detail" id="cycles-detail">--</span>
                                </div>
                            </div>
                            
                            <div class="metric-item">
                                <div class="metric-header">
                                    <span class="metric-label">⏰ Edad de la Batería</span>
                                    <span class="metric-value" id="age-value">--</span>
                                </div>
                                <div class="metric-bar">
                                    <div class="metric-fill" id="age-fill" style="width: 0%"></div>
                                </div>
                                <div class="metric-info">
                                    <span class="metric-percentage" id="age-percentage">--%</span>
                                    <span class="metric-detail" id="age-detail">--</span>
                                </div>
                            </div>
                            
                            <div class="metric-item">
                                <div class="metric-header">
                                    <span class="metric-label">📊 Patrón de Uso</span>
                                    <span class="metric-value" id="usage-pattern">--</span>
                                </div>
                                <div class="usage-pattern-detail" id="usage-pattern-detail">--</div>
                            </div>
                        </div>
                        
                        <!-- Curva de Degradación -->
                        <div class="health-section health-degradation-section">
                            <h4>Curva de Degradación</h4>
                            <div class="degradation-chart-container">
                                <canvas id="${degradationId}" width="400" height="300"></canvas>
                            </div>
                            <div class="chart-legend">
                                <div class="legend-item">
                                    <span class="legend-color" style="background: #95a5a6;"></span>
                                    <span>Curva teórica</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-color" style="background: #45b7d1;"></span>
                                    <span>Posición actual</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Alertas -->
                    <div class="health-alerts-section" id="health-alerts"></div>
                    
                    <!-- Recomendaciones -->
                    <div class="health-recommendations-section">
                        <h4>Recomendaciones</h4>
                        <div id="health-recommendations" class="recommendations-list"></div>
                    </div>
                    
                    <!-- Detalles Técnicos -->
                    <div class="health-details-section">
                        <div class="details-toggle" id="details-toggle">
                            <span>Ver Detalles Técnicos</span>
                            <span class="toggle-icon">▼</span>
                        </div>
                        <div class="details-content" id="details-content" style="display: none;">
                            <div class="details-grid">
                                <div class="detail-group">
                                    <h5>Datos Extraídos</h5>
                                    <div id="extracted-data"></div>
                                </div>
                                <div class="detail-group">
                                    <h5>Métricas Calculadas</h5>
                                    <div id="calculated-metrics"></div>
                                </div>
                                <div class="detail-group">
                                    <h5>Patrón de Uso</h5>
                                    <div id="usage-pattern-details"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Configura eventos para elementos interactivos
     */
    _setupEvents: function(batteryData, detailedInfo, $container) {
        const self = this;
        
        // Evento para actualizar análisis
        $container.find('.refresh-health-btn').on('click', function() {
            self._refreshAnalysis(batteryData, detailedInfo);
        });
        
        // Evento para mostrar registros detallados
        $container.find('.show-details-btn').on('click', function() {
            self._showRegistersModal(batteryData.id);
        });
        
        // Toggle para detalles técnicos
        $container.find('#details-toggle').on('click', function() {
            const $content = $container.find('#details-content');
            const $icon = $(this).find('.toggle-icon');
            
            if ($content.is(':visible')) {
                $content.slideUp();
                $icon.text('▼');
            } else {
                $content.slideDown();
                $icon.text('▲');
            }
        });
    },
    
    /**
     * Realiza el análisis de salud usando BatteryHealthCalculations
     */
    _performAnalysis: function(batteryData, detailedInfo, gaugeId, degradationId) {
        const self = this;
        
        // Obtener registros Modbus
        this._fetchMappedRegisters(batteryData.id)
            .then(registersData => {
                console.log('HealthTab: Registros obtenidos, iniciando análisis...');
                
                // Usar el motor de cálculo
                const analysis = BatteryHealthCalculations.analyzeHealth(
                    batteryData, detailedInfo, registersData
                );
                
                if (analysis.status === 'error') {
                    self._showError(analysis.message);
                    return;
                }
                
                // Guardar análisis
                self._lastAnalysis = analysis;
                
                // Actualizar UI
                self._updateUI(analysis);
                
                // Crear gráficos
                self._createGaugeChart(gaugeId, analysis.chartData.gaugeData);
                self._createDegradationChart(degradationId, analysis.chartData.degradationCurve);
                
                // Mostrar contenido
                $('#health-loading').hide();
                $('#health-content').show();
                
                console.log('HealthTab: Análisis completado exitosamente');
                
            })
            .catch(error => {
                console.error('HealthTab: Error en análisis:', error);
                self._showError('Error obteniendo datos: ' + error.message);
            });
    },
    
    /**
     * Actualiza toda la UI con los resultados del análisis
     */
    _updateUI: function(analysis) {
        const { healthMetrics, predictions, inconsistencies, dataQuality, recommendations, extractedData, usagePattern } = analysis;
        
        // Actualizar comparación SOH
        $('#soh-estimated').text(healthMetrics.sohEstimado.toFixed(1) + '%');
        $('#soh-real').text(healthMetrics.sohReal.toFixed(1) + '%');
        $('#health-status').text(healthMetrics.estadoSalud);
        
        const diferencia = healthMetrics.sohReal - healthMetrics.sohEstimado;
        $('#soh-difference').text((diferencia >= 0 ? '+' : '') + diferencia.toFixed(1) + '%')
            .removeClass('positive negative')
            .addClass(diferencia >= 0 ? 'positive' : 'negative');
        
        // Actualizar predicciones
        this._updatePredictions(predictions);
        
        // Actualizar calidad de datos
        $('#data-quality').text(dataQuality.description)
            .removeClass('excellent good fair poor')
            .addClass(dataQuality.rating);
        
        // Actualizar métricas
        this._updateMetrics(healthMetrics, extractedData);
        
        // Actualizar patrón de uso
        this._updateUsagePattern(usagePattern);
        
        // Mostrar advertencias
        this._showWarnings(inconsistencies);
        
        // Mostrar recomendaciones
        this._showRecommendations(recommendations);
        
        // Actualizar detalles técnicos
        this._updateTechnicalDetails(analysis);
    },
    
    /**
     * Actualiza las predicciones en la UI
     */
    _updatePredictions: function(predictions) {
        const types = ['realistic', 'conservative', 'optimistic'];
        
        types.forEach(type => {
            const prediction = predictions[type];
            if (prediction) {
                $(`#${type}-time`).text(prediction.years.toFixed(1) + ' años');
                $(`#${type}-date`).text(prediction.endDate.toLocaleDateString());
                
                if (type === 'realistic') {
                    $('#realistic-confidence').text(Math.round(prediction.confidence * 100) + '%');
                } else {
                    $(`#${type}-method`).text(prediction.method);
                }
            } else {
                $(`#${type}-time`).text('No disponible');
                $(`#${type}-date`).text('--');
            }
        });
    },
    
    /**
     * Actualiza las métricas en la UI
     */
    _updateMetrics: function(metrics, data) {
        // Ah acumulados
        $('#ah-value').text(data.ahAcumulados.toLocaleString() + ' Ah');
        if (metrics.progresoAh) {
            $('#ah-percentage').text((metrics.progresoAh.percentage * 100).toFixed(1) + '%');
            $('#ah-detail').text(`de ${metrics.progresoAh.total.toLocaleString()} Ah estimados`);
            $('#ah-fill').css('width', (metrics.progresoAh.percentage * 100) + '%');
            this._applyMetricColor('#ah-fill', metrics.progresoAh.percentage);
        }
        
        // Ciclos
        if (data.ciclosReportados) {
            $('#cycles-value').text(data.ciclosReportados.toLocaleString());
            if (metrics.progresoCiclos) {
                $('#cycles-percentage').text((metrics.progresoCiclos.percentage * 100).toFixed(1) + '%');
                $('#cycles-detail').text(`de ${metrics.progresoCiclos.total.toLocaleString()} esperados`);
                $('#cycles-fill').css('width', (metrics.progresoCiclos.percentage * 100) + '%');
                this._applyMetricColor('#cycles-fill', metrics.progresoCiclos.percentage);
            }
        } else {
            $('#cycles-value').text('Sin datos');
            $('#cycles-detail').text('No disponible');
        }
        
        // Edad
        if (data.edadAnios) {
            $('#age-value').text(data.edadAnios.toFixed(1) + ' años');
            if (metrics.progresoEdad) {
                $('#age-percentage').text((metrics.progresoEdad.percentage * 100).toFixed(1) + '%');
                $('#age-detail').text(`de ${metrics.progresoEdad.total} años esperados`);
                $('#age-fill').css('width', (metrics.progresoEdad.percentage * 100) + '%');
                this._applyMetricColor('#age-fill', metrics.progresoEdad.percentage);
            }
        } else {
            $('#age-value').text('Sin fecha fabricación');
            $('#age-detail').text('No disponible');
        }
    },
    
    /**
     * Actualiza el patrón de uso
     */
    _updateUsagePattern: function(usagePattern) {
        let patternText = '';
        let detailText = '';
        
        switch (usagePattern.type) {
            case 'hybrid':
                patternText = 'Híbrido (UPS → Solar)';
                detailText = `Detectado cambio de uso. Confianza: ${Math.round(usagePattern.confidence * 100)}%`;
                break;
            case 'ups':
                patternText = 'UPS/Respaldo';
                detailText = `Uso conservador típico de UPS. Confianza: ${Math.round(usagePattern.confidence * 100)}%`;
                break;
            case 'solar':
                patternText = 'Solar/Cíclico';
                detailText = `Uso intensivo típico de sistema solar. Confianza: ${Math.round(usagePattern.confidence * 100)}%`;
                break;
            default:
                patternText = 'No determinado';
                detailText = 'Insuficientes datos para determinar patrón';
        }
        
        $('#usage-pattern').text(patternText);
        $('#usage-pattern-detail').text(detailText);
    },
    
    /**
     * Aplica colores a las métricas según el nivel
     */
    _applyMetricColor: function(selector, progreso) {
        const $element = $(selector);
        $element.removeClass('normal warning critical');
        
        if (progreso < 0.6) {
            $element.addClass('normal');
        } else if (progreso < 0.8) {
            $element.addClass('warning');
        } else {
            $element.addClass('critical');
        }
    },
    
    /**
     * Muestra advertencias
     */
    _showWarnings: function(inconsistencies) {
        const $warnings = $('#health-warnings');
        
        if (inconsistencies.length === 0) {
            $warnings.hide();
            return;
        }
        
        const warningsHtml = inconsistencies.map(inc => 
            `<div class="health-warning ${inc.level}">
                <span class="warning-icon">⚠️</span>
                <div class="warning-content">
                    <div class="warning-message">${inc.message}</div>
                    <div class="warning-impact">${inc.impact}</div>
                </div>
            </div>`
        ).join('');
        
        $warnings.html(warningsHtml).show();
    },
    
    /**
     * Muestra recomendaciones
     */
    _showRecommendations: function(recommendations) {
        const recommendationsHtml = recommendations.map(rec => 
            `<div class="recommendation-item ${rec.type}">
                <span class="recommendation-icon">${this._getRecommendationIcon(rec.type)}</span>
                <span class="recommendation-text">${rec.message}</span>
            </div>`
        ).join('');
        
        $('#health-recommendations').html(recommendationsHtml);
    },
    
    /**
     * Obtiene el icono para una recomendación
     */
    _getRecommendationIcon: function(type) {
        const icons = {
            'critical': '🔴',
            'warning': '🟡',
            'planning': '📋',
            'maintenance': '🔧'
        };
        return icons[type] || '💡';
    },
    
    /**
     * Actualiza los detalles técnicos
     */
    _updateTechnicalDetails: function(analysis) {
        const { extractedData, healthMetrics, usagePattern } = analysis;
        
        // Datos extraídos
        let extractedHtml = '';
        Object.keys(extractedData).forEach(key => {
            if (extractedData[key] !== null && extractedData[key] !== undefined) {
                extractedHtml += `<div class="detail-item"><strong>${key}:</strong> ${extractedData[key]}</div>`;
            }
        });
        $('#extracted-data').html(extractedHtml);
        
        // Métricas calculadas
        let metricsHtml = '';
        Object.keys(healthMetrics).forEach(key => {
            if (healthMetrics[key] !== null && healthMetrics[key] !== undefined) {
                let value = healthMetrics[key];
                if (typeof value === 'number') {
                    value = value.toFixed(2);
                }
                metricsHtml += `<div class="detail-item"><strong>${key}:</strong> ${value}</div>`;
            }
        });
        $('#calculated-metrics').html(metricsHtml);
        
        // Patrón de uso
        let patternHtml = `<div class="detail-item"><strong>Tipo:</strong> ${usagePattern.type}</div>`;
        patternHtml += `<div class="detail-item"><strong>Cambio detectado:</strong> ${usagePattern.hasPatternChange ? 'Sí' : 'No'}</div>`;
        patternHtml += `<div class="detail-item"><strong>Confianza:</strong> ${Math.round(usagePattern.confidence * 100)}%</div>`;
        $('#usage-pattern-details').html(patternHtml);
    },
    
    /**
     * Crea el gráfico gauge
     */
    _createGaugeChart: function(canvasId, gaugeData) {
        if (typeof Chart === 'undefined') return;
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (this._gaugeChart) {
            this._gaugeChart.destroy();
        }
        
        this._gaugeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [gaugeData.value, gaugeData.max - gaugeData.value],
                    backgroundColor: [
                        this._getHealthColor(gaugeData.value),
                        '#e0e0e0'
                    ],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    },
    
    /**
     * Crea el gráfico de degradación
     */
    _createDegradationChart: function(canvasId, curveData) {
        if (typeof Chart === 'undefined') return;
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (this._degradationChart) {
            this._degradationChart.destroy();
        }
        
        const theoreticalData = curveData.filter(p => p.type === 'theoretical');
        const currentData = curveData.filter(p => p.type === 'current');
        
        this._degradationChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Curva teórica',
                        data: theoreticalData,
                        borderColor: '#95a5a6',
                        backgroundColor: 'rgba(149, 165, 166, 0.1)',
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: 'Posición actual',
                        data: currentData,
                        borderColor: '#45b7d1',
                        backgroundColor: '#45b7d1',
                        pointRadius: 8,
                        pointHoverRadius: 10,
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Años' }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        title: { display: true, text: 'SOH (%)' }
                    }
                },
                plugins: {
                    legend: { display: true, position: 'bottom' }
                }
            }
        });
    },
    
    /**
     * Obtiene color según SOH
     */
    _getHealthColor: function(soh) {
        if (soh >= 90) return '#4CAF50';
        if (soh >= 80) return '#FFC107';
        if (soh >= 70) return '#FF9800';
        return '#F44336';
    },
    
    /**
     * Shows error message
     */
    _showError: function(message) {
        $('#health-loading').hide();
        $('#health-content').html(`
            <div class="health-error">
                <div class="error-icon">❌</div>
                <div class="error-message">${message}</div>
                <button class="action-btn retry-btn" onclick="location.reload()">
                    <i class="action-icon">🔄</i> Reintentar
                </button>
            </div>
        `).show();
    },
    
    /**
     * Obtiene registros Modbus
     */
    _fetchMappedRegisters: function(batteryId) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/api/batteries/mapped_registers/${batteryId}`,
                method: 'GET',
                dataType: 'json',
                timeout: 10000
            })
            .done(function(response) {
                if (response.status === 'success' || response.status === 'partial') {
                    resolve(response);
                } else {
                    reject(new Error(response.message || 'Error obteniendo registros'));
                }
            })
            .fail(function(xhr, status, error) {
                reject(new Error(`Error HTTP: ${status} - ${error}`));
            });
        });
    },
    
    /**
     * Refresca el análisis
     */
    _refreshAnalysis: function(batteryData, detailedInfo) {
        $('#health-content').hide();
        $('#health-loading').show();
        
        // Generar nuevos IDs para los gráficos
        const gaugeId = 'health-gauge-' + Date.now();
        const degradationId = 'health-degradation-' + Date.now();
        
        // Actualizar IDs en el DOM
        $('canvas[id^="health-gauge-"]').attr('id', gaugeId);
        $('canvas[id^="health-degradation-"]').attr('id', degradationId);
        
        // Limpiar análisis anterior
        this._lastAnalysis = null;
        
        // Realizar nuevo análisis
        this._performAnalysis(batteryData, detailedInfo, gaugeId, degradationId);
    },
    
    /**
     * Muestra modal con registros
     */
    _showRegistersModal: function(batteryId) {
        WindowManager.createWindow({
            title: `Registros Modbus - Batería ${batteryId}`,
            width: 900,
            height: 600,
            content: `
                <div class="registers-modal-content">
                    <div class="loading-message">
                        <div class="loading-spinner"></div>
                        <p>Cargando registros...</p>
                    </div>
                </div>
            `
        });
        
        this._fetchMappedRegisters(batteryId)
            .then(data => {
                const content = this._formatRegistersModal(data);
                $('.registers-modal-content').html(content);
            })
            .catch(error => {
                $('.registers-modal-content').html(`
                    <div class="error-message">Error: ${error.message}</div>
                `);
            });
    },
    
    /**
     * Formatea registros para modal
     */
   _formatRegistersModal: function(registersData) {
       let html = '<div class="registers-display">';
       
       // Resumen general
       html += `
           <div class="registers-summary">
               <h4>Resumen de Registros</h4>
               <div class="summary-stats">
                   <div class="stat-item">
                       <span class="stat-label">Total registros:</span>
                       <span class="stat-value">${registersData.summary.total_registers}</span>
                   </div>
                   <div class="stat-item">
                       <span class="stat-label">Exitosos:</span>
                       <span class="stat-value success">${registersData.summary.successful_reads}</span>
                   </div>
                   <div class="stat-item">
                       <span class="stat-label">Fallidos:</span>
                       <span class="stat-value error">${registersData.summary.failed_reads}</span>
                   </div>
                   <div class="stat-item">
                       <span class="stat-label">Estado:</span>
                       <span class="stat-value ${registersData.status}">${registersData.status}</span>
                   </div>
               </div>
           </div>
       `;
       
       // Registros básicos
       if (registersData.basic_registers) {
           html += '<div class="registers-section">';
           html += '<h4>Registros Básicos</h4>';
           html += '<table class="registers-table">';
           html += '<thead><tr><th>Registro</th><th>Nombre</th><th>Valor Raw</th><th>Valor Procesado</th><th>Unidad</th></tr></thead>';
           html += '<tbody>';
           
           Object.entries(registersData.basic_registers).forEach(([addr, reg]) => {
               html += `<tr>
                   <td class="register-addr">${addr}</td>
                   <td class="register-name">${reg.name}</td>
                   <td class="register-raw">${reg.raw_value}</td>
                   <td class="register-processed">${reg.processed_value}</td>
                   <td class="register-unit">${reg.unit}</td>
               </tr>`;
           });
           
           html += '</tbody></table>';
           html += '</div>';
       }
       
       // Datos de celdas
       if (registersData.cell_data) {
           html += '<div class="registers-section">';
           html += '<h4>Datos de Celdas</h4>';
           
           Object.entries(registersData.cell_data).forEach(([arrayName, arrayData]) => {
               if (arrayData.success && arrayData.cells) {
                   html += `<div class="cell-array">`;
                   html += `<h5>${arrayData.description}</h5>`;
                   html += `<div class="cell-grid">`;
                   
                   arrayData.cells.forEach(cell => {
                       const statusClass = cell.status === 'OK' ? 'ok' : 'na';
                       const value = cell.processed_value !== null ? 
                           `${cell.processed_value}${arrayData.unit}` : 'N/A';
                       
                       html += `<div class="cell-item ${statusClass}">
                           <div class="cell-number">Celda ${cell.cell_number}</div>
                           <div class="cell-value">${value}</div>
                       </div>`;
                   });
                   
                   html += `</div></div>`;
               }
           });
           
           html += '</div>';
       }
       
       // Strings ASCII
       if (registersData.ascii_strings) {
           html += '<div class="registers-section">';
           html += '<h4>Información ASCII</h4>';
           html += '<table class="ascii-table">';
           html += '<thead><tr><th>Campo</th><th>Valor</th><th>Descripción</th></tr></thead>';
           html += '<tbody>';
           
           Object.entries(registersData.ascii_strings).forEach(([key, stringData]) => {
               if (stringData.success) {
                   html += `<tr>
                       <td class="ascii-field">${key}</td>
                       <td class="ascii-value">${stringData.ascii_string}</td>
                       <td class="ascii-desc">${stringData.description}</td>
                   </tr>`;
               }
           });
           
           html += '</tbody></table>';
           html += '</div>';
       }
       
       // Errores si los hay
       if (registersData.errors && registersData.errors.length > 0) {
           html += '<div class="registers-section errors-section">';
           html += '<h4>Errores Encontrados</h4>';
           html += '<div class="errors-list">';
           
           registersData.errors.forEach(error => {
               html += `<div class="error-item">
                   <span class="error-address">${error.address || error.array || 'General'}</span>
                   <span class="error-message">${error.error}</span>
               </div>`;
           });
           
           html += '</div>';
           html += '</div>';
       }
       
       html += '</div>';
       return html;
   },
   
   /**
    * Limpia recursos cuando se destruye el componente
    */
   cleanup: function() {
       if (this._gaugeChart) {
           this._gaugeChart.destroy();
           this._gaugeChart = null;
       }
       
       if (this._degradationChart) {
           this._degradationChart.destroy();
           this._degradationChart = null;
       }
       
       this._lastAnalysis = null;
   }
};

// Exportar para uso global
window.HealthTab = HealthTab;