/**
 * powerFlowSection.js - Lógica y Estructura del Flujo de Energía
 * Sistema dedicado para manejar la sección completa de flujo de energía
 */

const PowerFlowSection = (function() {
    'use strict';
    
    // Estado interno
    let currentFlowData = {
        solar: 1.2,
        battery: -0.8,
        building: 2.0
    };
    
    /**
     * Genera el HTML completo de la sección de flujo de energía
     * @param {Object} flowData - Datos iniciales del flujo
     * @returns {string} - HTML string de la sección completa
     */
    function generatePowerFlowHTML(flowData = currentFlowData) {
        return `
            <h3 class="section-title">FLUJO DE ENERGÍA</h3>
                <div class="power-flow-container" id="power-flow-container">
                    <!-- SVG del flujo de energía se insertará aquí -->
                </div>
                <div class="flow-metrics">
                    <div class="flow-metric">
                        <span class="flow-label">Paneles</span>
                        <span class="flow-value" id="solar-flow">${formatFlowValue(flowData.solar)} kW</span>
                    </div>
                    <div class="flow-metric">
                        <span class="flow-label">Batería</span>
                        <span class="flow-value" id="battery-flow">${formatFlowValue(flowData.battery)} kW</span>
                    </div>
                    <div class="flow-metric">
                        <span class="flow-label">Edificio</span>
                        <span class="flow-value" id="building-flow">${formatFlowValue(flowData.building)} kW</span>
                    </div>
                </div>
            
        `;
    }
    
    /**
     * Inicializa la sección de flujo de energía
     * @param {string} containerId - ID del contenedor donde insertar la sección
     * @param {Object} flowData - Datos iniciales del flujo
     */
    function initializePowerFlowSection(containerId, flowData = currentFlowData, batterySOC = 50) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('PowerFlow: Contenedor no encontrado:', containerId);
            return;
        }
        
        // Insertar HTML
        container.innerHTML = generatePowerFlowHTML(flowData);
        
        // Insertar SVG
        const powerFlowContainer = document.getElementById('power-flow-container');
		if (powerFlowContainer && typeof PowerFlowSVG !== 'undefined') {
			powerFlowContainer.innerHTML = PowerFlowSVG.createPowerFlowSVG(800, 400, batterySOC);
		} else {
			console.warn('PowerFlow: PowerFlowSVG no disponible');
		}
        
        // Actualizar estado interno
        currentFlowData = { ...flowData };
        
        console.log('PowerFlow: Sección inicializada correctamente');
    }
    
    /**
     * Actualiza los datos del flujo de energía
     * @param {Object} newFlowData - Nuevos datos del flujo
     */
    function updateFlowData(newFlowData) {
        // Actualizar estado interno
        currentFlowData = { ...currentFlowData, ...newFlowData };
        
        // Actualizar valores en la UI
        updateFlowMetrics(currentFlowData);
        
        // Actualizar SVG si está disponible
        if (typeof PowerFlowSVG !== 'undefined' && PowerFlowSVG.updatePowerFlow) {
            PowerFlowSVG.updatePowerFlow(currentFlowData);
        }
        
        console.log('PowerFlow: Datos actualizados:', currentFlowData);
    }
    
    /**
     * Actualiza las métricas visuales del flujo
     * @param {Object} flowData - Datos del flujo
     */
    function updateFlowMetrics(flowData) {
        // Actualizar valor solar
        const solarElement = document.getElementById('solar-flow');
        if (solarElement && flowData.solar !== undefined) {
            solarElement.textContent = `${formatFlowValue(flowData.solar)} kW`;
            solarElement.className = getFlowValueClass(flowData.solar);
        }
        
        // Actualizar valor batería
        const batteryElement = document.getElementById('battery-flow');
        if (batteryElement && flowData.battery !== undefined) {
            batteryElement.textContent = `${formatFlowValue(flowData.battery)} kW`;
            batteryElement.className = getFlowValueClass(flowData.battery);
        }
        
        // Actualizar valor edificio
        const buildingElement = document.getElementById('building-flow');
        if (buildingElement && flowData.building !== undefined) {
            buildingElement.textContent = `${formatFlowValue(flowData.building)} kW`;
            buildingElement.className = getFlowValueClass(flowData.building);
        }
    }
    
    /**
     * Formatea un valor de flujo para mostrar
     * @param {number} value - Valor a formatear
     * @returns {string} - Valor formateado con signo
     */
    function formatFlowValue(value) {
        if (value > 0) {
            return `+${value.toFixed(1)}`;
        } else if (value < 0) {
            return `${value.toFixed(1)}`;
        } else {
            return '0.0';
        }
    }
    
    /**
     * Obtiene la clase CSS según el valor del flujo
     * @param {number} value - Valor del flujo
     * @returns {string} - Clase CSS
     */
    function getFlowValueClass(value) {
        if (value > 0) {
            return 'flow-value positive';
        } else if (value < 0) {
            return 'flow-value negative';
        } else {
            return 'flow-value zero';
        }
    }
    
    /**
     * Genera datos de flujo simulados para demo
     * @returns {Object} - Datos simulados
     */
    function generateSimulatedFlowData() {
        const baseTime = Date.now() / 1000;
        
        // Simular patrones realistas de flujo de energía
        const solar = Math.max(0, 2.5 + Math.sin(baseTime / 300) * 1.5 + (Math.random() - 0.5) * 0.5);
        const consumption = 1.8 + Math.sin(baseTime / 600) * 0.8 + (Math.random() - 0.5) * 0.3;
        const battery = solar - consumption;
        
        return {
            solar: Math.round(solar * 10) / 10,
            battery: Math.round(battery * 10) / 10,
            building: Math.round(consumption * 10) / 10
        };
    }
    
    /**
     * Inicia simulación automática del flujo
     * @param {number} interval - Intervalo en milisegundos (default: 5000)
     */
    function startFlowSimulation(interval = 5000) {
        setInterval(() => {
            const simulatedData = generateSimulatedFlowData();
            updateFlowData(simulatedData);
        }, interval);
        
        console.log('PowerFlow: Simulación iniciada');
    }
    
    /**
     * Obtiene los datos actuales del flujo
     * @returns {Object} - Datos actuales
     */
    function getCurrentFlowData() {
        return { ...currentFlowData };
    }
    
    /**
     * Refresca completamente la sección
     */
    function refreshPowerFlowSection() {
        const container = document.querySelector('.power-flow-section');
        if (container && container.parentElement) {
            const containerId = container.parentElement.id;
            if (containerId) {
                initializePowerFlowSection(containerId, currentFlowData);
            }
        }
    }
    /**
	 * Actualiza el SOC de la batería horizontal en el flujo de energía
	 * @param {number} newSOC - Nuevo nivel de SOC (0-100)
	 */
	function updateHorizontalBatterySOC(newSOC) {
		const powerFlowContainer = document.getElementById('power-flow-container');
		if (powerFlowContainer && typeof PowerFlowSVG !== 'undefined') {
			// Regenerar el SVG completo con el nuevo SOC
			powerFlowContainer.innerHTML = PowerFlowSVG.createPowerFlowSVG(800, 400, newSOC);
			
			console.log('Batería horizontal actualizada a SOC:', newSOC + '%');
		}
	}
	
    // API pública
    return {
        generatePowerFlowHTML: generatePowerFlowHTML,
        initializePowerFlowSection: initializePowerFlowSection,
        updateFlowData: updateFlowData,
        updateFlowMetrics: updateFlowMetrics,
        formatFlowValue: formatFlowValue,
        generateSimulatedFlowData: generateSimulatedFlowData,
        startFlowSimulation: startFlowSimulation,
        getCurrentFlowData: getCurrentFlowData,
        refreshPowerFlowSection: refreshPowerFlowSection
    };
})();

// Exportar para uso global
window.PowerFlowSection = PowerFlowSection;
window.updateHorizontalBatterySOC = updateHorizontalBatterySOC;