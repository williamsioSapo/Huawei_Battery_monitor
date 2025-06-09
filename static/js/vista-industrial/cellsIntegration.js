/**
 * cellsIntegration.js - Integración del Sistema de Celdas
 * Manejo completo de la sección de información de celdas con SVG
 */

/**
 * Inicializa la sección de información de celdas
 */
function initializeCellsInfoSection(batteryData) {
    console.log('Inicializando sección de información de celdas con SVG...');
    
    // Verificar que CellsAnalyzer y CellsSVG estén disponibles
    if (typeof CellsAnalyzer === 'undefined') {
        console.error('CellsAnalyzer no está disponible');
        displayCellsError('CellsAnalyzer no disponible');
        return;
    }
    
    if (typeof CellsSVG === 'undefined') {
        console.error('CellsSVG no está disponible');
        displayCellsError('CellsSVG no disponible');
        return;
    }
    
    // Configuración por defecto (22S1P para demostración)
    const configType = '22s1p';
    
    try {
        // Generar datos simulados
        const cellsData = CellsAnalyzer.generateSimulatedCellData(configType);
        console.log('Datos de celdas generados:', cellsData);
        
        // Analizar datos
        const analysis = CellsAnalyzer.analyzeCellsData(cellsData, configType);
        console.log('Análisis de celdas:', analysis);
        
        if (analysis.error) {
            console.error('Error en análisis de celdas:', analysis.error);
            displayCellsError(analysis.error);
            return;
        }
        
        // Renderizar la sección con SVG completo
        renderCellsInfoSectionSVG(analysis);
        
        // Configurar tooltips después del renderizado
        setTimeout(() => {
            setupCellsTooltipsSVG(analysis);
        }, 100);
        
        console.log('Sección de celdas SVG inicializada correctamente:', analysis);
        
    } catch (error) {
        console.error('Error durante inicialización de celdas:', error);
        displayCellsError(error.message);
    }
}

/**
 * Renderiza la sección de información de celdas
 */
function renderCellsInfoSectionSVG(analysis) {
    const cellsGrid = document.querySelector('.cells-info-section .cells-grid');
    if (!cellsGrid) {
        console.error('No se encontró el contenedor cells-grid');
        return;
    }
    
    // Limpiar contenido previo
    cellsGrid.innerHTML = '';
    
    // Crear contenedor principal del string
    const stringContainer = document.createElement('div');
    stringContainer.className = 'cell-bank';
    stringContainer.id = 'cells-bank-main';
    
    // Header del string - CORREGIDO (sin "CONECTADO")
    const balanceStatusText = {
        'excellent': 'ÓPTIMO',
        'good': 'BUENO', 
        'warning': 'ADVERTENCIA',
        'critical': 'CRÍTICO'
    };
    
    // Crear SVG completo con celdas integradas
    let svgContent = '';
    if (typeof CellsSVG !== 'undefined' && typeof CellsSVG.createBatterySVGWithCells === 'function') {
        svgContent = CellsSVG.createBatterySVGWithCells(analysis.configType, analysis.cells, 420, 200);
    } else {
        console.warn('CellsSVG.createBatterySVGWithCells no está disponible, usando SVG básico');
        svgContent = '<div style="width: 420px; height: 200px; background: #333; border: 2px solid #666; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #ccc;">SVG con celdas no disponible</div>';
    }
    
    // Determinar colores para las cards del grid 2x2
    const tempAvg = analysis.stats.temperature.avg;
    const voltageRange = analysis.stats.voltage.range;
    const temperatureRange = analysis.stats.temperature.range;
    
    // Clases de estado para cada card
    const tempAvgClass = tempAvg < 30 ? 'normal' : tempAvg <= 40 ? 'warning' : 'critical';
    const rangeVClass = voltageRange <= 0.05 ? 'balanced' : voltageRange <= 0.10 ? 'warning' : 'critical';
    const rangeTClass = temperatureRange <= 5 ? 'uniform' : temperatureRange <= 10 ? 'moderate' : 'critical';
    
    stringContainer.innerHTML = `
        <div class="bank-header">
            <span class="bank-title">${analysis.config.description}</span>
            <span class="bank-status ${analysis.balance}">${balanceStatusText[analysis.balance] || analysis.balance.toUpperCase()}</span>
        </div>
        
        <!-- SVG directo sin wrappers innecesarios -->
        ${svgContent}
        
        <!-- NUEVO: Grid de métricas 2x2 -->
        <div class="metrics-grid-2x2">
            <div class="metric-card-mini metric-card-voltage">
                <div class="metric-label">VOLTAJE AVG</div>
                <div class="metric-value">${analysis.stats.voltage.avg}V</div>
                <div class="metric-sublabel">promedio</div>
            </div>
            
            <div class="metric-card-mini metric-card-temp ${tempAvgClass}">
                <div class="metric-label">TEMP AVG</div>
                <div class="metric-value">${analysis.stats.temperature.avg}°C</div>
                <div class="metric-sublabel">promedio</div>
            </div>
            
            <div class="metric-card-mini metric-card-range-v ${rangeVClass}">
                <div class="metric-label">RANGO V</div>
                <div class="metric-value">${analysis.stats.voltage.min}-${analysis.stats.voltage.max}V</div>
                <div class="metric-sublabel">min-max</div>
            </div>
            
            <div class="metric-card-mini metric-card-range-t ${rangeTClass}">
                <div class="metric-label">RANGO T</div>
                <div class="metric-value">${analysis.stats.temperature.min}-${analysis.stats.temperature.max}°C</div>
                <div class="metric-sublabel">min-max</div>
            </div>
        </div>
    `;
    
    cellsGrid.appendChild(stringContainer);
    setTimeout(() => {
        setupCellsTooltipsSVG(analysis);
    }, 100);
}

/**
 * Configura tooltips para celdas SVG
 */
function setupCellsTooltipsSVG(analysis) {
    console.log('🔧 setupCellsTooltipsSVG CALLED!', analysis);
    const svgCells = document.querySelectorAll('.casing-svg .svg-cell');
    console.log('🔧 Found cells:', svgCells.length);
    let activeTooltip = null;
    let lastMouseEvent = null; // Guardar último evento de mouse
    
    svgCells.forEach(cellElement => {
        // Obtener datos de la celda
        let tooltipData = null;
        
        if (cellElement.classList.contains('svg-cell')) {
            // Celda individual
            const cellId = parseInt(cellElement.dataset.cellId);
            const cellData = analysis.cells.find(c => c.id === cellId);
            if (cellData) {
                tooltipData = CellsAnalyzer.formatCellDataForTooltip(cellData);
            }
        } else if (cellElement.classList.contains('svg-cell-group')) {
            // Celda agrupada (11S2P)
            const cellIds = cellElement.dataset.cells;
            const rect = cellElement.querySelector('.cell-rect');
            tooltipData = {
                title: `CELDAS ${cellIds}`,
                voltage: rect?.dataset.voltage || 'N/A',
                temperature: rect?.dataset.temperature || 'N/A',
                status: 'AGRUPADAS',
                statusClass: 'normal'
            };
        }
        
        if (!tooltipData) return;
        
        // Eventos de hover
        cellElement.addEventListener('mouseenter', (e) => {
            lastMouseEvent = e;
            showCellTooltipSVG(e, tooltipData);
        });
        
        cellElement.addEventListener('mouseleave', () => {
            hideCellTooltipSVG();
            lastMouseEvent = null;
        });
        
        // NUEVO: mousemove para reposicionar tooltip en tiempo real
        cellElement.addEventListener('mousemove', (e) => {
            lastMouseEvent = e;
            if (activeTooltip) {
                updateTooltipPositionSVG(e);
            }
        });
    });
    
    function showCellTooltipSVG(event, tooltipData) {
        hideCellTooltipSVG(); // Limpiar tooltip anterior
        
        const tooltip = document.createElement('div');
        tooltip.className = 'cell-tooltip show';
        tooltip.style.zIndex = '99999';
        tooltip.style.position = 'fixed';
        tooltip.innerHTML = `
            <div class="tooltip-title">${tooltipData.title}</div>
            <div class="tooltip-line">
                <span class="tooltip-label">Voltaje:</span>
                <span class="tooltip-value">${tooltipData.voltage}</span>
            </div>
            <div class="tooltip-line">
                <span class="tooltip-label">Temperatura:</span>
                <span class="tooltip-value">${tooltipData.temperature}</span>
            </div>
            <div class="tooltip-line">
                <span class="tooltip-label">Estado:</span>
                <span class="tooltip-status ${tooltipData.statusClass}">${tooltipData.status}</span>
            </div>
        `;
        
        document.body.appendChild(tooltip);
        activeTooltip = tooltip;
        updateTooltipPositionSVG(event);
    }
    
    function hideCellTooltipSVG() {
        if (activeTooltip) {
            activeTooltip.remove();
            activeTooltip = null;
        }
    }
    
    function updateTooltipPositionSVG(event) {
        if (!activeTooltip) return;
        
        // Obtener dimensiones del tooltip (primero debe estar en DOM)
        const tooltipRect = activeTooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Posición del mouse (coordenadas globales)
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        // Calcular posición inicial: mouse + offset
        let left = mouseX + 15;
        let top = mouseY - tooltipRect.height - 10;
        
        // Ajustes para mantener tooltip dentro del viewport
        
        // Si se sale por la derecha, mover a la izquierda del mouse
        if (left + tooltipRect.width > viewportWidth) {
            left = mouseX - tooltipRect.width - 15;
        }
        
        // Si se sale por la izquierda, pegar al borde izquierdo
        if (left < 5) {
            left = 5;
        }
        
        // Si se sale por arriba, mover debajo del mouse
        if (top < 5) {
            top = mouseY + 15;
        }
        
        // Si se sale por abajo, pegar al borde inferior
        if (top + tooltipRect.height > viewportHeight - 5) {
            top = viewportHeight - tooltipRect.height - 5;
        }
        
        // Aplicar posición final
        activeTooltip.style.left = left + 'px';
        activeTooltip.style.top = top + 'px';
    }
}

/**
 * Muestra un mensaje de error en la sección de celdas
 */
function displayCellsError(errorMessage) {
    const cellsGrid = document.querySelector('.cells-info-section .cells-grid');
    if (cellsGrid) {
        cellsGrid.innerHTML = `
            <div class="cells-error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">Error al cargar información de celdas</div>
                <div class="error-details">${errorMessage}</div>
                <div class="error-hint">Verifique que CellsAnalyzer y CellsSVG estén cargados correctamente.</div>
            </div>
        `;
    }
}

// Exportar funciones para uso global
window.initializeCellsInfoSection = initializeCellsInfoSection;
window.renderCellsInfoSectionSVG = renderCellsInfoSectionSVG;
window.setupCellsTooltipsSVG = setupCellsTooltipsSVG;
window.displayCellsError = displayCellsError;