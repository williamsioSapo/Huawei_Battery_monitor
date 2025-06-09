/**
 * BatteryHealthCalculations.js - Motor de cálculo para análisis de salud de baterías
 * Contiene toda la lógica de procesamiento y algoritmos
 */
const BatteryHealthCalculations = {
    // ===== CONFIGURACIÓN PRINCIPAL =====
    CONFIG: {
        // Capacidad nominal de la batería ESM-48150B1
        NOMINAL_CAPACITY_AH: 150,
        
        // Voltaje nominal del sistema
        NOMINAL_VOLTAGE: 48,
        
        // Capacidad energética nominal (kWh)
        NOMINAL_CAPACITY_KWH: 7.2, // 48V * 150Ah / 1000
        
        // Ciclos esperados hasta fin de vida (ajustado para LiFePO4 real)
        EXPECTED_CYCLES_EOL: 6000,
        
        // Años de vida útil esperados
        EXPECTED_LIFE_YEARS: 15,
        
        // SOH mínimo considerado útil
        MIN_USEFUL_SOH: 70,
        
        // Factores de degradación por edad (calendar aging)
        CALENDAR_AGING: {
            DEGRADATION_PER_YEAR: 1.5, // % por año para LiFePO4
            WEIGHT_FACTOR: 0.25 // Peso del envejecimiento calendario vs cíclico
        },
        
        // Thresholds para alertas
        THRESHOLDS: {
            INCONSISTENCY_WARNING: 0.20, // 20% diferencia para advertencia
            INCONSISTENCY_CRITICAL: 0.50, // 50% diferencia para crítico
            SOH_WARNING: 80,
            SOH_CRITICAL: 70,
            USAGE_PATTERN_CHANGE_RATIO: 3 // Ratio eventos/ciclos para detectar cambio
        },
        
        // Patrones de uso conocidos
        USAGE_PATTERNS: {
            UPS: {
                TYPICAL_DOD: 0.10, // 10% DOD típico para UPS
                AH_PER_EVENT: 15,  // Ah por evento de respaldo
                CYCLES_PER_YEAR: 20 // Pocos ciclos por año
            },
            SOLAR: {
                TYPICAL_DOD: 0.80, // 80% DOD típico para solar
                AH_PER_CYCLE: 120, // Ah por ciclo diario
                CYCLES_PER_YEAR: 365 // Ciclo diario
            }
        },
        
        // Modelo de degradación por tramos (SOH-based)
        DEGRADATION_MODEL: {
            EXCELLENT: { soh_min: 90, soh_max: 100, degradation_rate: 0.8 }, // %/año
            GOOD:      { soh_min: 80, soh_max: 90,  degradation_rate: 1.2 },
            FAIR:      { soh_min: 70, soh_max: 80,  degradation_rate: 2.0 },
            POOR:      { soh_min: 50, soh_max: 70,  degradation_rate: 3.5 },
            CRITICAL:  { soh_min: 0,  soh_max: 50,  degradation_rate: 6.0 }
        }
    },
    
    /**
     * Función principal - Analiza la salud completa de la batería
     */
    analyzeHealth: function(batteryData, detailedInfo, registersData) {
        console.log('BatteryHealthCalculations: Iniciando análisis completo');
        
        try {
            // 1. Extraer y validar datos de entrada
            const extractedData = this._extractInputData(batteryData, detailedInfo, registersData);
            this._validateInputData(extractedData);
            
            // 2. Detectar patrón de uso (UPS -> Solar, etc.)
            const usagePattern = this._detectUsagePattern(extractedData);
            
            // 3. Calcular métricas principales de salud
            const healthMetrics = this._calculateHealthMetrics(extractedData, usagePattern);
            
            // 4. Detectar inconsistencias en los datos
            const inconsistencies = this._detectInconsistencies(extractedData, healthMetrics);
            
            // 5. Generar predicciones de vida útil
            const predictions = this._calculateLifePredictions(extractedData, healthMetrics, usagePattern);
            
            // 6. Evaluar calidad de datos
            const dataQuality = this._assessDataQuality(extractedData, inconsistencies);
            
            // 7. Generar recomendaciones
            const recommendations = this._generateRecommendations(healthMetrics, predictions, inconsistencies);
            
            // 8. Generar datos para gráficos
            const chartData = this._generateChartData(healthMetrics, predictions, extractedData);
            
            // 9. Compilar resultado final
            return {
                status: 'success',
                timestamp: new Date(),
                batteryId: extractedData.batteryId,
                extractedData: extractedData,
                usagePattern: usagePattern,
                healthMetrics: healthMetrics,
                predictions: predictions,
                inconsistencies: inconsistencies,
                dataQuality: dataQuality,
                recommendations: recommendations,
                chartData: chartData
            };
            
        } catch (error) {
            console.error('BatteryHealthCalculations: Error en análisis:', error);
            return {
                status: 'error',
                message: error.message,
                timestamp: new Date()
            };
        }
    },
    
    /**
     * Extrae y normaliza todos los datos de entrada
     */
    _extractInputData: function(batteryData, detailedInfo, registersData) {
        const data = {
            batteryId: batteryData.id,
            timestamp: new Date(),
            
            // Datos básicos de los registros
            sohReal: null,
            socActual: null,
            voltaje: null,
            corriente: null,
            
            // Datos de uso acumulado
            ahAcumulados: null,
            ciclosReportados: null,
            tiemposDescarga: null,
            
            // Información del dispositivo
            fechaFabricacion: null,
            edadAnios: null,
            modelo: null,
            fabricante: null,
            numeroSerie: null,
            
            // Datos de celdas
            numeroCeldas: null,
            voltajesCeldas: [],
            temperaturasCeldas: [],
            
            // Metadatos
            softwareVersion: null
        };
        
        // Extraer de registros básicos
        if (registersData.basic_registers) {
            const regs = registersData.basic_registers;
            
            data.sohReal = this._getRegisterValue(regs, '0x0004');
            data.socActual = this._getRegisterValue(regs, '0x0003');
            data.voltaje = this._getRegisterValue(regs, '0x0000');
            data.corriente = this._getRegisterValue(regs, '0x0002');
            
            data.ahAcumulados = this._getRegisterValue(regs, '0x0044');
            data.ciclosReportados = this._getRegisterValue(regs, '0x7D6B');
            data.tiemposDescarga = this._getRegisterValue(regs, '0x0042');
            
            data.numeroCeldas = this._getRegisterValue(regs, '0x010F');
            data.softwareVersion = this._getRegisterValue(regs, '0x0101');
        }
        
        // Extraer información del dispositivo
        if (detailedInfo && detailedInfo.detailed_info && detailedInfo.detailed_info.info) {
            const info = detailedInfo.detailed_info.info;
            
            data.fechaFabricacion = info.manufactured_date;
            data.modelo = info.model;
            data.fabricante = info.manufacturer;
            data.numeroSerie = info.barcode;
            
            // Calcular edad
            if (data.fechaFabricacion) {
                data.edadAnios = this._calculateAge(data.fechaFabricacion);
            }
        }
        
        // Extraer datos de celdas
        if (registersData.cell_data) {
            this._extractCellData(data, registersData.cell_data);
        }
        
        console.log('BatteryHealthCalculations: Datos extraídos:', data);
        return data;
    },
    
    /**
     * Obtiene el valor procesado de un registro
     */
    _getRegisterValue: function(registers, address) {
        const reg = registers[address];
        return reg ? reg.processed_value : null;
    },
    
    /**
     * Calcula la edad de la batería desde la fecha de fabricación
     */
    _calculateAge: function(fechaFabricacion) {
        if (!fechaFabricacion) return null;
        
        try {
            const fechaFab = new Date(fechaFabricacion);
            const fechaActual = new Date();
            const diferenciaMs = fechaActual - fechaFab;
            const edadAnios = diferenciaMs / (365.25 * 24 * 60 * 60 * 1000);
            
            return Math.max(0, edadAnios);
        } catch (error) {
            console.warn('BatteryHealthCalculations: Error calculando edad:', error);
            return null;
        }
    },_extractCellData: function(data, cellData) {
        // Voltajes de celdas
        if (cellData.cell_voltages_block1 && cellData.cell_voltages_block1.success) {
            data.voltajesCeldas = cellData.cell_voltages_block1.cells
                .filter(cell => cell.status === 'OK')
                .map(cell => cell.processed_value);
        }
        
        // Temperaturas de celdas
        if (cellData.cell_temperatures_block1 && cellData.cell_temperatures_block1.success) {
            data.temperaturasCeldas = cellData.cell_temperatures_block1.cells
                .filter(cell => cell.status === 'OK')
                .map(cell => cell.processed_value);
        }
    },
    
    /**
     * Valida que tenemos los datos mínimos necesarios
     */
    _validateInputData: function(data) {
        const required = ['sohReal', 'ahAcumulados'];
        const missing = required.filter(field => data[field] === null || data[field] === undefined);
        
        if (missing.length > 0) {
            throw new Error(`Datos críticos faltantes: ${missing.join(', ')}`);
        }
        
        // Validar rangos lógicos
        if (data.sohReal < 0 || data.sohReal > 100) {
            throw new Error(`SOH fuera de rango válido: ${data.sohReal}%`);
        }
        
        if (data.ahAcumulados < 0) {
            throw new Error(`Ah acumulados no puede ser negativo: ${data.ahAcumulados}`);
        }
        
        console.log('BatteryHealthCalculations: Validación de datos completada');
    },
	_detectUsagePattern: function(data) {
	console.log("aaaa");
        const pattern = {
            type: 'unknown',
            hasPatternChange: false,
            phases: [],
            currentPhase: null,
            confidence: 0
        };
        
        // Si no hay datos de ciclos, no podemos detectar patrón
        if (!data.ciclosReportados || !data.tiemposDescarga || !data.ahAcumulados) {
            return pattern;
        }
        
        const eventToCycleRatio = data.tiemposDescarga / data.ciclosReportados;
        const ahPerCycle = data.ahAcumulados / data.ciclosReportados;
        const ahPerEvent = data.ahAcumulados / data.tiemposDescarga;
        
        console.log('Análisis de patrón de uso:');
        console.log(`  Eventos/Ciclos ratio: ${eventToCycleRatio.toFixed(2)}`);
        console.log(`  Ah por ciclo: ${ahPerCycle.toFixed(1)}`);
        console.log(`  Ah por evento: ${ahPerEvent.toFixed(1)}`);
        
        // Detectar cambio de patrón
        if (eventToCycleRatio > this.CONFIG.THRESHOLDS.USAGE_PATTERN_CHANGE_RATIO) {
            pattern.hasPatternChange = true;
            pattern.type = 'hybrid';
            
            // Estimar fases
            const upsEvents = data.tiemposDescarga - data.ciclosReportados;
            const solarCycles = data.ciclosReportados;
            
            pattern.phases = [
                {
                    type: 'ups',
                    events: upsEvents,
                    estimatedAh: upsEvents * this.CONFIG.USAGE_PATTERNS.UPS.AH_PER_EVENT,
                    period: 'histórico'
                },
                {
                    type: 'solar',
                    cycles: solarCycles,
                    estimatedAh: solarCycles * this.CONFIG.USAGE_PATTERNS.SOLAR.AH_PER_CYCLE,
                    period: 'reciente'
                }
            ];
            
            pattern.currentPhase = 'solar';
            pattern.confidence = 0.8;
            
        } else if (ahPerCycle < 30) {
            // Uso muy conservador - típico UPS
            pattern.type = 'ups';
            pattern.currentPhase = 'ups';
            pattern.confidence = 0.7;
            
        } else if (ahPerCycle > 80) {
            // Uso intensivo - típico Solar
            pattern.type = 'solar';
            pattern.currentPhase = 'solar';
            pattern.confidence = 0.7;
        }
        
        console.log('Patrón detectado:', pattern);
        return pattern;
    },
    
    /**
     * Calcula todas las métricas principales de salud
     */
    _calculateHealthMetrics: function(data, usagePattern) {
        const metrics = {
            sohReal: data.sohReal,
            sohEstimado: null,
            degradacionTotal: null,
            degradacionCiclica: null,
            degradacionCalendario: null,
            
            // Métricas de uso
            dodPromedio: null,
            ahPorCiclo: null,
            utilizacionCapacidad: null,
            
            // Progreso de vida
            progresoAh: null,
            progresoCiclos: null,
            progresoEdad: null,
            
            // Estado actual
            estadoSalud: null,
            tendenciaDegradacion: null
        };
        
        // Calcular DOD promedio y Ah por ciclo
        if (data.ciclosReportados > 0) {
            metrics.ahPorCiclo = data.ahAcumulados / data.ciclosReportados;
            metrics.dodPromedio = metrics.ahPorCiclo / this.CONFIG.NOMINAL_CAPACITY_AH;
        }
        
        // Calcular progreso de vida
        metrics.progresoAh = this._calculateProgressByAh(data, usagePattern);
        metrics.progresoCiclos = this._calculateProgressByCycles(data);
        metrics.progresoEdad = this._calculateProgressByAge(data);
        
        // Calcular degradación
        metrics.degradacionCiclica = this._calculateCyclicDegradation(metrics.progresoAh);
        metrics.degradacionCalendario = this._calculateCalendarDegradation(data.edadAnios);
        
        // SOH estimado (combinando degradaciones)
        metrics.sohEstimado = this._calculateEstimatedSOH(metrics);
        
        // Estado de salud textual
        metrics.estadoSalud = this._getHealthStatus(metrics.sohEstimado);
        
        // Tendencia de degradación
        metrics.tendenciaDegradacion = this._calculateDegradationTrend(data, metrics);
        
        console.log('Métricas de salud calculadas:', metrics);
        return metrics;
    },
    
    /**
     * Calcula el progreso de vida basado en Ah acumulados
     */
    _calculateProgressByAh: function(data, usagePattern) {
        let totalAhExpected;
        
        if (usagePattern.hasPatternChange && usagePattern.phases.length > 0) {
            // Usar patrón híbrido
            const solarPhase = usagePattern.phases.find(p => p.type === 'solar');
            const upsPhase = usagePattern.phases.find(p => p.type === 'ups');
            
            const solarAhExpected = (solarPhase?.cycles || 0) * this.CONFIG.USAGE_PATTERNS.SOLAR.AH_PER_CYCLE;
            const upsAhExpected = (upsPhase?.events || 0) * this.CONFIG.USAGE_PATTERNS.UPS.AH_PER_EVENT;
            
            totalAhExpected = solarAhExpected + upsAhExpected;
            
        } else {
            // Usar patrón uniforme
            const dodToUse = data.ciclosReportados > 0 ? 
                (data.ahAcumulados / data.ciclosReportados) / this.CONFIG.NOMINAL_CAPACITY_AH :
                0.8; // Default
            
            totalAhExpected = this.CONFIG.EXPECTED_CYCLES_EOL * this.CONFIG.NOMINAL_CAPACITY_AH * dodToUse;
        }
        
        return {
            current: data.ahAcumulados,
            total: totalAhExpected,
            percentage: Math.min(1.0, data.ahAcumulados / totalAhExpected)
        };
    },
    
    /**
     * Calcula el progreso de vida basado en ciclos
     */
    _calculateProgressByCycles: function(data) {
        if (!data.ciclosReportados) return null;
        
        return {
            current: data.ciclosReportados,
            total: this.CONFIG.EXPECTED_CYCLES_EOL,
            percentage: Math.min(1.0, data.ciclosReportados / this.CONFIG.EXPECTED_CYCLES_EOL)
        };
    },
    
    /**
     * Calcula el progreso de vida basado en edad
     */
    _calculateProgressByAge: function(data) {
        if (!data.edadAnios) return null;
        
        return {
            current: data.edadAnios,
            total: this.CONFIG.EXPECTED_LIFE_YEARS,
            percentage: Math.min(1.0, data.edadAnios / this.CONFIG.EXPECTED_LIFE_YEARS)
        };
    },
    
    /**
     * Calcula la degradación cíclica basada en Ah acumulados
     */
    _calculateCyclicDegradation: function(progressAh) {
        if (!progressAh) return 0;
        
        // Modelo de degradación no lineal
        const progress = progressAh.percentage;
        
        // Degradación sigue una curva: más rápida al final
        let degradation = 0;
        
        if (progress <= 0.5) {
            // Primera mitad: degradación lenta
            degradation = progress * 10; // Máximo 5% en primera mitad
        } else {
            // Segunda mitad: degradación acelerada
            const secondHalfProgress = (progress - 0.5) * 2;
            degradation = 5 + (secondHalfProgress * secondHalfProgress * 25); // 5% + hasta 25% acelerado
        }
        
        return Math.min(30, degradation); // Máximo 30% degradación cíclica
    },
    
    /**
     * Calcula la degradación calendario (calendar aging)
     */
    _calculateCalendarDegradation: function(edadAnios) {
        if (!edadAnios) return 0;
        
        // LiFePO4: ~1.5% por año, no lineal
        const degradationRate = this.CONFIG.CALENDAR_AGING.DEGRADATION_PER_YEAR;
        
        // Degradación calendar aging más rápida en los primeros años
        let degradation = 0;
        
        if (edadAnios <= 5) {
            degradation = edadAnios * degradationRate * 0.8; // 80% del rate en primeros 5 años
        } else {
            degradation = 5 * degradationRate * 0.8 + (edadAnios - 5) * degradationRate * 1.2;
        }
        
        return Math.min(20, degradation); // Máximo 20% degradación calendario
    },
    
    /**
     * Calcula el SOH estimado combinando degradaciones
     */
    _calculateEstimatedSOH: function(metrics) {
        const degradacionTotal = metrics.degradacionCiclica + 
                                (metrics.degradacionCalendario * this.CONFIG.CALENDAR_AGING.WEIGHT_FACTOR);
        
        const sohEstimado = 100 - degradacionTotal;
        return Math.max(0, Math.min(100, sohEstimado));
    },
    
    /**
     * Obtiene el estado de salud textual
     */
    _getHealthStatus: function(soh) {
        if (soh >= 90) return 'Excelente';
        if (soh >= 80) return 'Bueno';
        if (soh >= 70) return 'Regular';
        if (soh >= 50) return 'Deficiente';
        return 'Crítico';
    },
    
    /**
     * Calcula la tendencia de degradación
     */
    _calculateDegradationTrend: function(data, metrics) {
        if (!data.edadAnios || data.edadAnios < 0.5) {
            return 'Insuficiente historial';
        }
        
        const degradacionActual = 100 - metrics.sohEstimado;
        const rateDegradacion = degradacionActual / data.edadAnios;
        
        if (rateDegradacion < 1.5) return 'Lenta';
        if (rateDegradacion < 3.0) return 'Normal';
        if (rateDegradacion < 5.0) return 'Acelerada';
        return 'Muy rápida';
    },
    
    /**
     * Detecta inconsistencias en los datos
     */
    _detectInconsistencies: function(data, metrics) {
        const inconsistencies = [];
        
        // Inconsistencia SOH real vs estimado
        const sohDifference = Math.abs(data.sohReal - metrics.sohEstimado);
        if (sohDifference > 10) {
            inconsistencies.push({
                type: 'soh_mismatch',
                level: sohDifference > 20 ? 'critical' : 'warning',
                message: `SOH real (${data.sohReal}%) difiere significativamente del estimado (${metrics.sohEstimado.toFixed(1)}%)`,
                impact: 'Puede indicar calibración incorrecta o degradación no uniforme'
            });
        }
        
        // Inconsistencia Ah vs Ciclos
        if (data.ciclosReportados && metrics.ahPorCiclo) {
            const dodObservado = metrics.dodPromedio;
            if (dodObservado < 0.05 || dodObservado > 1.0) {
                inconsistencies.push({
                    type: 'dod_anomaly',
                    level: 'warning',
                    message: `DOD promedio anómalo: ${(dodObservado * 100).toFixed(1)}%`,
                    impact: 'Sugiere contadores incorrectos o patrón de uso inusual'
                });
            }
        }
        
        // Edad vs degradación
        if (data.edadAnios && data.edadAnios > 1) {
            const degradacionEsperada = data.edadAnios * 2; // 2% por año esperado
            const degradacionReal = 100 - data.sohReal;
            
            if (Math.abs(degradacionReal - degradacionEsperada) > 10) {
                inconsistencies.push({
                    type: 'age_degradation_mismatch',
                    level: 'info',
                    message: `Degradación por edad no coincide con la esperada`,
                    impact: 'Normal en baterías con patrones de uso específicos'
                });
            }
        }
        
        return inconsistencies;
    },
    
    /**
     * Calcula predicciones de vida útil
     */
    _calculateLifePredictions: function(data, metrics, usagePattern) {
        const predictions = {
            conservative: null,
            optimistic: null,
            realistic: null
        };
        
        // Predicción conservadora (basada en tendencia actual)
        if (data.edadAnios && data.edadAnios > 0.5) {
            const degradacionActual = 100 - metrics.sohEstimado;
            const rateDegradacion = degradacionActual / data.edadAnios;
            const degradacionRestante = metrics.sohEstimado - this.CONFIG.MIN_USEFUL_SOH;
            
            if (degradacionRestante > 0 && rateDegradacion > 0) {
                const aniosRestantes = degradacionRestante / rateDegradacion;
                predictions.conservative = {
                    years: Math.max(0, aniosRestantes),
                    confidence: 0.8,
                    method: 'Tendencia histórica de degradación'
                };
            }
        }
        
        // Predicción optimista (basada en uso actual)
        if (usagePattern.currentPhase === 'solar' && data.ciclosReportados > 10) {
            const ciclosRestantes = this.CONFIG.EXPECTED_CYCLES_EOL - data.ciclosReportados;
            const ciclosPorAnio = usagePattern.phases?.find(p => p.type === 'solar')?.cycles || 365;
            const aniosRestantes = ciclosRestantes / ciclosPorAnio;
            
            predictions.optimistic = {
                years: Math.max(0, aniosRestantes),
                confidence: 0.6,
                method: 'Proyección basada en ciclos restantes'
            };
        }
        
        // Predicción realista (promedio ponderado)
        if (predictions.conservative && predictions.optimistic) {
            const weightConservative = 0.7;
            const weightOptimistic = 0.3;
            
            predictions.realistic = {
                years: (predictions.conservative.years * weightConservative + 
                       predictions.optimistic.years * weightOptimistic),
                confidence: 0.75,
                method: 'Promedio ponderado de métodos'
            };
        } else if (predictions.conservative) {
            predictions.realistic = predictions.conservative;
        } else if (predictions.optimistic) {
            predictions.realistic = predictions.optimistic;
        }
        
        // Calcular fechas finales
        const now = new Date();
        Object.keys(predictions).forEach(key => {
            if (predictions[key]) {
                const endDate = new Date(now);
                endDate.setFullYear(endDate.getFullYear() + predictions[key].years);
                predictions[key].endDate = endDate;
            }
        });
        
        return predictions;
    },/**
     * Evalúa la calidad de los datos disponibles
     */
    _assessDataQuality: function(data, inconsistencies) {
        let score = 0;
        const factors = [];
        
        // Datos básicos (40 puntos)
        if (data.sohReal !== null) { score += 20; factors.push('SOH disponible'); }
        if (data.ahAcumulados !== null) { score += 20; factors.push('Ah acumulados disponibles'); }
        
        // Datos de validación (30 puntos)
        if (data.ciclosReportados !== null) { score += 15; factors.push('Ciclos disponibles'); }
        if (data.edadAnios !== null) { score += 15; factors.push('Fecha fabricación disponible'); }
        
        // Datos de celdas (20 puntos)
        if (data.voltajesCeldas.length > 0) { score += 10; factors.push('Voltajes de celdas'); }
        if (data.temperaturasCeldas.length > 0) { score += 10; factors.push('Temperaturas de celdas'); }
        
        // Penalización por inconsistencias (10 puntos)
        const criticalInconsistencies = inconsistencies.filter(i => i.level === 'critical').length;
        const warningInconsistencies = inconsistencies.filter(i => i.level === 'warning').length;
        
        score -= (criticalInconsistencies * 5 + warningInconsistencies * 2);
        score = Math.max(0, Math.min(100, score));
        
        let rating, description;
        if (score >= 85) {
            rating = 'excellent';
            description = 'Excelente';
        } else if (score >= 70) {
            rating = 'good';
            description = 'Buena';
        } else if (score >= 50) {
            rating = 'fair';
            description = 'Regular';
        } else {
            rating = 'poor';
            description = 'Limitada';
        }
        
        return {
            score: score,
            rating: rating,
            description: description,
            factors: factors
        };
    },
    
    /**
     * Genera recomendaciones basadas en el análisis
     */
    _generateRecommendations: function(healthMetrics, predictions, inconsistencies) {
        const recommendations = [];
        
        // Recomendaciones basadas en SOH
        if (healthMetrics.sohEstimado < 70) {
            recommendations.push({
                type: 'critical',
                message: 'Planificar reemplazo inmediato - SOH crítico',
                priority: 1
            });
        } else if (healthMetrics.sohEstimado < 80) {
            recommendations.push({
                type: 'warning',
                message: 'Considerar reemplazo en próximos 12 meses',
                priority: 2
            });
        }
        
        // Recomendaciones basadas en predicciones
        if (predictions.realistic && predictions.realistic.years < 2) {
            recommendations.push({
                type: 'planning',
                message: 'Iniciar proceso de adquisición de batería de reemplazo',
                priority: 2
            });
        }
        
        // Recomendaciones por inconsistencias
        if (inconsistencies.some(i => i.type === 'soh_mismatch')) {
            recommendations.push({
                type: 'maintenance',
                message: 'Verificar calibración del BMS - SOH inconsistente',
                priority: 3
            });
        }
        
        // Recomendaciones generales
        recommendations.push({
            type: 'maintenance',
            message: 'Mantener temperatura de operación entre 15-25°C',
            priority: 4
        });
        
        return recommendations.sort((a, b) => a.priority - b.priority);
    },
    
    /**
     * Genera datos estructurados para gráficos
     */
    _generateChartData: function(healthMetrics, predictions, data) {
        return {
            gaugeData: {
                value: healthMetrics.sohEstimado,
                max: 100,
                thresholds: [70, 80, 90],
                colors: ['#f44336', '#ff9800', '#ffc107', '#4caf50']
            },
            
            degradationCurve: this._generateDegradationCurveData(healthMetrics, data),
            
            comparisonData: {
                sohReal: data.sohReal,
                sohEstimado: healthMetrics.sohEstimado,
                diferencia: data.sohReal - healthMetrics.sohEstimado
            },
            
            predictionsData: {
                conservative: predictions.conservative,
                optimistic: predictions.optimistic,
                realistic: predictions.realistic
            }
        };
    },
    
    /**
     * Genera datos para la curva de degradación
     */
    _generateDegradationCurveData: function(metrics, data) {
        const points = [];
        const totalYears = this.CONFIG.EXPECTED_LIFE_YEARS;
        
        // Generar curva teórica
        for (let year = 0; year <= totalYears; year++) {
            const cyclicDeg = this._calculateCyclicDegradation({ percentage: year / totalYears });
            const calendarDeg = this._calculateCalendarDegradation(year);
            const totalDeg = cyclicDeg + (calendarDeg * this.CONFIG.CALENDAR_AGING.WEIGHT_FACTOR);
            const soh = Math.max(0, 100 - totalDeg);
            
            points.push({
                x: year,
                y: soh,
                type: 'theoretical'
            });
        }
        
        // Punto actual
        if (data.edadAnios) {
            points.push({
                x: data.edadAnios,
                y: metrics.sohEstimado,
                type: 'current'
            });
        }
        
        return points;
    }
};

// Exportar para uso global
window.BatteryHealthCalculations = BatteryHealthCalculations;