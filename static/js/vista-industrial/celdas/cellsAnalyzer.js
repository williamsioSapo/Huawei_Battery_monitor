/**
 * cellsAnalyzer.js - Analizador de datos de celdas para vista moderna
 * Compatible con cellsInfoSection.css y batteryModernView.js
 */

const CellsAnalyzer = (function() {
    'use strict';
    
    /**
     * Configuraciones por tipo de batería (compatible con CellsSVG.js)
     */
    const BATTERY_CONFIGS = {
        '11s2p': {
            totalCells: 22,
            strings: 1,
            cellsPerString: 22,
            gridLayout: { rows: 2, cols: 6 },
            description: 'LFP-11S2P',
            svgType: '11s2p'
        },
        '16s1p': {
            totalCells: 16,
            strings: 1,
            cellsPerString: 16,
            gridLayout: { rows: 2, cols: 8 },
            description: 'LFP-16S1P',
            svgType: '16s1p'
        },
        '22s1p': {
            totalCells: 22,
            strings: 1,
            cellsPerString: 22,
            gridLayout: { rows: 2, cols: 11 },
            description: 'LFP-22S1P',
            svgType: '22s1p'
        }
    };
    
    /**
     * Rangos de voltaje para LiFePO4
     */
    const VOLTAGE_RANGES = {
        optimal: { min: 3.20, max: 3.35 },
        normal: { min: 3.10, max: 3.45 },
        warning: { min: 3.00, max: 3.55 },
        critical: { min: 2.50, max: 3.80 }
    };
    
    /**
     * Genera datos simulados realistas de celdas LiFePO4
     * @param {string} configType - Tipo de configuración
     * @returns {Array} - Array de datos de celdas
     */
    function generateSimulatedCellData(configType = '22s1p') {
        const config = BATTERY_CONFIGS[configType];
        if (!config) {
            console.error(`Configuración no válida: ${configType}`);
            return [];
        }
        
        const cells = [];
        const baseVoltage = 3.28; // Voltaje típico LiFePO4 al 60% SOC
        const baseTemp = 26.5; // Temperatura ambiente
        
        for (let i = 0; i < config.totalCells; i++) {
            // Variaciones realistas para LiFePO4
            const voltageVariation = (Math.random() - 0.5) * 0.15; // ±0.075V
            const tempVariation = (Math.random() - 0.5) * 8; // ±4°C
            
            // Simular algunas celdas con mayor desviación (realista)
            const isOutlier = Math.random() < 0.1; // 10% de probabilidad
            const outlierFactor = isOutlier ? (Math.random() - 0.5) * 0.4 : 0;
            
            const voltage = Math.max(3.0, Math.min(3.6, 
                baseVoltage + voltageVariation + outlierFactor));
            const temperature = Math.max(15, Math.min(45, 
                baseTemp + tempVariation));
            
            // Calcular fila y columna para el grid
            const totalCols = config.gridLayout.cols;
            const row = Math.floor(i / totalCols);
            const col = i % totalCols;
            
            cells.push({
                id: i + 1,
                voltage: Math.round(voltage * 1000) / 1000,
                temperature: Math.round(temperature * 10) / 10,
                string: 1, // Para esta demo, todo en un string
                position: i + 1,
                gridPosition: { row: row, col: col },
                isConnected: Math.random() > 0.02 // 98% conectadas
            });
        }
        
        return cells;
    }
    
    /**
     * Analiza los datos de celdas para determinar estados y extremos
     * @param {Array} cellsData - Datos de celdas
     * @param {string} configType - Tipo de configuración
     * @returns {Object} - Análisis completo
     */
    function analyzeCellsData(cellsData, configType = '22s1p') {
        if (!cellsData || !Array.isArray(cellsData) || cellsData.length === 0) {
            return {
                error: 'No hay datos de celdas disponibles',
                cells: [],
                stats: {},
                extremes: {},
                balance: 'unknown'
            };
        }
        
        const config = BATTERY_CONFIGS[configType];
        
        // Analizar cada celda
        const analyzedCells = cellsData.map(cell => ({
            ...cell,
            status: determineVoltageStatus(cell.voltage),
            tempStatus: determineTemperatureStatus(cell.temperature),
            isExtreme: false // Se determinará después
        }));
        
        // Encontrar extremos de voltaje
        const connectedCells = analyzedCells.filter(cell => cell.isConnected);
        const voltages = connectedCells.map(cell => cell.voltage);
        const temperatures = connectedCells.map(cell => cell.temperature);
        
        if (voltages.length === 0) {
            return {
                error: 'No hay celdas conectadas',
                cells: analyzedCells,
                stats: {},
                extremes: {},
                balance: 'critical'
            };
        }
        
        const minVoltage = Math.min(...voltages);
        const maxVoltage = Math.max(...voltages);
        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);
        
        // Marcar celdas extremas (solo entre las conectadas)
        analyzedCells.forEach(cell => {
            if (!cell.isConnected) return;
            
            if (cell.voltage === maxVoltage) {
                cell.isExtreme = 'highest-voltage';
            } else if (cell.voltage === minVoltage) {
                cell.isExtreme = 'lowest-voltage';
            } else if (cell.temperature === maxTemp) {
                cell.isExtreme = 'temp-highest';
            } else if (cell.temperature === minTemp) {
                cell.isExtreme = 'temp-lowest';
            }
        });
        
        // Calcular estadísticas
        const stats = calculateStatistics(connectedCells);
        
        // Información de extremos
        const extremes = {
            voltage: {
                highest: {
                    value: maxVoltage,
                    cells: analyzedCells.filter(c => c.voltage === maxVoltage && c.isConnected).map(c => c.id)
                },
                lowest: {
                    value: minVoltage,
                    cells: analyzedCells.filter(c => c.voltage === minVoltage && c.isConnected).map(c => c.id)
                },
                difference: Math.round((maxVoltage - minVoltage) * 1000) / 1000
            },
            temperature: {
                highest: {
                    value: maxTemp,
                    cells: analyzedCells.filter(c => c.temperature === maxTemp && c.isConnected).map(c => c.id)
                },
                lowest: {
                    value: minTemp,
                    cells: analyzedCells.filter(c => c.temperature === minTemp && c.isConnected).map(c => c.id)
                },
                difference: Math.round((maxTemp - minTemp) * 10) / 10
            }
        };
        
        // Estado de balance
        const balanceStatus = determineBalanceStatus(extremes.voltage.difference);
        
        return {
            cells: analyzedCells,
            config: config,
            stats: stats,
            extremes: extremes,
            balance: balanceStatus,
            configType: configType
        };
    }
    
    /**
     * Determina el estado de voltaje de una celda
     * @param {number} voltage - Voltaje de la celda
     * @returns {string} - Estado
     */
    function determineVoltageStatus(voltage) {
        if (voltage >= VOLTAGE_RANGES.optimal.min && voltage <= VOLTAGE_RANGES.optimal.max) {
            return 'normal'; // Verde
        } else if (voltage >= VOLTAGE_RANGES.normal.min && voltage <= VOLTAGE_RANGES.normal.max) {
            return 'warning'; // Amarillo
        } else {
            return 'critical'; // Rojo
        }
    }
    
    /**
     * Determina el estado de temperatura de una celda
     * @param {number} temperature - Temperatura de la celda
     * @returns {string} - Estado
     */
    function determineTemperatureStatus(temperature) {
        if (temperature >= 20 && temperature <= 35) {
            return 'normal';
        } else if (temperature > 35 && temperature <= 45) {
            return 'warning';
        } else if (temperature > 45) {
            return 'critical';
        } else if (temperature < 20 && temperature >= 10) {
            return 'cold';
        } else {
            return 'critical';
        }
    }
    
/**
 * Calcula estadísticas de las celdas conectadas
 * @param {Array} cellsData - Datos de celdas conectadas
 * @returns {Object} - Estadísticas calculadas
 */
	function calculateStatistics(cellsData) {
		if (!cellsData || cellsData.length === 0) {
			return {
				cellCount: 0,
				connectedCount: 0,
				voltage: { min: 0, max: 0, avg: 0, range: 0 },
				temperature: { min: 0, max: 0, avg: 0, range: 0 }
			};
		}
		
		const voltages = cellsData.map(cell => cell.voltage);
		const temperatures = cellsData.map(cell => cell.temperature);
		
		// Calcular promedios
		const avgVoltage = voltages.reduce((a, b) => a + b, 0) / voltages.length;
		const avgTemperature = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
		
		// Calcular min/max
		const minVoltage = Math.min(...voltages);
		const maxVoltage = Math.max(...voltages);
		const minTemperature = Math.min(...temperatures);
		const maxTemperature = Math.max(...temperatures);
		
		// Calcular rangos
		const voltageRange = maxVoltage - minVoltage;
		const temperatureRange = maxTemperature - minTemperature;
		
		return {
			cellCount: cellsData.length,
			connectedCount: cellsData.filter(c => c.isConnected).length,
			voltage: {
				min: Number(minVoltage.toFixed(2)),
				max: Number(maxVoltage.toFixed(2)),
				avg: Number(avgVoltage.toFixed(2)),
				range: Number(voltageRange.toFixed(2))
			},
			temperature: {
				min: Number(minTemperature.toFixed(1)),
				max: Number(maxTemperature.toFixed(1)),
				avg: Number(avgTemperature.toFixed(1)),
				range: Number(temperatureRange.toFixed(1))
			}
		};
	}
    
    /**
     * Determina el estado de balance de las celdas
     * @param {number} voltageDifference - Diferencia de voltaje entre extremos
     * @returns {string} - Estado de balance
     */
    function determineBalanceStatus(voltageDifference) {
        if (voltageDifference <= 0.02) {
            return 'excellent';
        } else if (voltageDifference <= 0.05) {
            return 'good';
        } else if (voltageDifference <= 0.10) {
            return 'warning';
        } else {
            return 'critical';
        }
    }
    
    /**
     * Convierte datos de celda para tooltip
     * @param {Object} cellData - Datos de una celda
     * @returns {Object} - Datos formateados para tooltip
     */
    function formatCellDataForTooltip(cellData) {
        const statusLabels = {
            'normal': 'NORMAL',
            'warning': 'ADVERTENCIA', 
            'critical': 'CRÍTICO'
        };
        
        const extremeLabels = {
            'highest-voltage': 'TENSIÓN MÁXIMA',
            'lowest-voltage': 'TENSIÓN MÍNIMA',
            'temp-highest': 'TEMP MÁXIMA',
            'temp-lowest': 'TEMP MÍNIMA'
        };
        
        let status = statusLabels[cellData.status] || 'DESCONOCIDO';
        let statusClass = cellData.status;
        
        if (cellData.isExtreme) {
            status = extremeLabels[cellData.isExtreme] || status;
            statusClass = cellData.isExtreme;
        }
        
        if (!cellData.isConnected) {
            status = 'DESCONECTADA';
            statusClass = 'critical';
        }
        
        return {
            title: `CELDA ${String(cellData.id).padStart(2, '0')}`,
            voltage: `${cellData.voltage.toFixed(3)}V`,
            temperature: `${cellData.temperature.toFixed(1)}°C`,
            status: status,
            statusClass: statusClass,
            connected: cellData.isConnected
        };
    }
    
    /**
     * Obtiene clase CSS para una celda según su estado
     * @param {Object} cellData - Datos de una celda
     * @returns {string} - Clase CSS
     */
    function getCellCssClass(cellData) {
        if (!cellData.isConnected) {
            return 'empty-cell';
        }
        
        if (cellData.isExtreme) {
            return cellData.isExtreme;
        }
        
        return cellData.status;
    }
    
    // API pública
    return {
        generateSimulatedCellData: generateSimulatedCellData,
        analyzeCellsData: analyzeCellsData,
        formatCellDataForTooltip: formatCellDataForTooltip,
        getCellCssClass: getCellCssClass,
        getConfig: function(configType) {
            return BATTERY_CONFIGS[configType] || null;
        },
        getAvailableConfigs: function() {
            return Object.keys(BATTERY_CONFIGS);
        },
        VOLTAGE_RANGES: VOLTAGE_RANGES,
        BATTERY_CONFIGS: BATTERY_CONFIGS
    };
})();

// Exportar para uso global
window.CellsAnalyzer = CellsAnalyzer;