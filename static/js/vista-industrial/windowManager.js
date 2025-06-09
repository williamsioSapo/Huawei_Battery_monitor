/**
 * windowManager.js - Gestión de Componentes de la Vista Moderna
 * Inicialización y configuración de todos los componentes
 */

/**
 * Inicializa todos los componentes de la vista moderna
 */
function initializeModernComponents(windowId, batteryData) {
    console.log('Inicializando componentes modernos...');
    
    // Inicializar SVG icons
    if (typeof SVGIcons !== 'undefined') {
        initializeSVGComponents(batteryData);
    }
    
    // Inicializar sistema de partículas
    if (typeof ParticleSystem !== 'undefined') {
        initializeParticleSystem();
    }
    
    // Inicializar gráfico de monitoreo
    if (typeof initializeMonitoringChart === 'function') {
        initializeMonitoringChart();
    }
    
    // Inicializar log de eventos
    if (typeof initializeEventsLog === 'function') {
        initializeEventsLog();
    }
    
    // Inicializar sección de celdas
    if (typeof initializeCellsInfoSection === 'function') {
        initializeCellsInfoSection(batteryData);
    }
    
    // Configurar eventos de la interfaz
    setupModernEvents(windowId, batteryData);
    
    // Configurar efectos de anillos dinámicos
    if (typeof setupRingEffects === 'function') {
        setupRingEffects(batteryData);
    }
    
    console.log('Componentes modernos inicializados correctamente');
}

/**
 * Inicializa los componentes SVG
 */
function initializeSVGComponents(batteryData) {
    // Insertar SVG de batería compacto
    const batteryVisual = document.getElementById('battery-visual-compact');
    if (batteryVisual && SVGIcons.createBatterySVG) {
        // Usar tamaño más compacto pero manteniendo proporciones
        batteryVisual.innerHTML = SVGIcons.createBatterySVG(batteryData.soc, 60, 120);
    }
    
     if (typeof PowerFlowSection !== 'undefined') {
        PowerFlowSection.initializePowerFlowSection('power-flow-placeholder', undefined, batteryData.soc);
    }
}

/**
 * Inicializa el sistema de partículas
 */
function initializeParticleSystem() {
    const powerFlowContainer = document.getElementById('power-flow-container');
    if (powerFlowContainer && ParticleSystem) {
        const particleSystem = new ParticleSystem(powerFlowContainer);
        particleSystem.start();
        
        // Guardar referencia global para limpieza posterior
        window.currentParticleSystem = particleSystem;
    }
}

/**
 * Configura eventos de la interfaz
 */
function setupModernEvents(windowId, batteryData) {
    // Botón de actualizar
    const refreshBtn = document.querySelector(`#${windowId} .refresh-modern`);
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (typeof refreshModernData === 'function') {
                refreshModernData(batteryData);
            }
        });
    }
}

// Exportar funciones para uso global
window.initializeModernComponents = initializeModernComponents;
window.initializeSVGComponents = initializeSVGComponents;
window.initializeParticleSystem = initializeParticleSystem;
window.setupModernEvents = setupModernEvents;