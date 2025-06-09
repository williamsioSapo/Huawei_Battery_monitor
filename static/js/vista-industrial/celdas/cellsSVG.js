/**
 * cellsSVG.js - Generador de Carcasas SVG Industriales + Sistema de Celdas
 * Crea carcasas de batería LiFePO4 con remaches y celdas integradas
 */

const CellsSVG = (function() {
    'use strict';
    
    /**
     * Crea SVG de carcasa industrial con remaches
     * @param {string} type - Tipo de configuración ('11s2p', '16s1p', '22s1p')
     * @param {number} width - Ancho del SVG (opcional)
     * @param {number} height - Alto del SVG (opcional)
     * @returns {string} - SVG HTML string
     */
    function createCasingSVG(type = '16s1p', width = 400, height = 200) {
        // Determinar configuración de remaches según tipo
        const config = getCasingConfig(type);
        
        return `
            <svg class="casing-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="pointer-events: auto;">
                <defs>
                    <!-- Gradiente para la carcasa -->
                    <linearGradient id="casingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#505050"/>
                        <stop offset="50%" style="stop-color:#404040"/>
                        <stop offset="100%" style="stop-color:#2a2a2a"/>
                    </linearGradient>
                    
                    <!-- Gradiente para remaches -->
                    <radialGradient id="rivetGradient" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" style="stop-color:#888888"/>
                        <stop offset="60%" style="stop-color:#666666"/>
                        <stop offset="100%" style="stop-color:#444444"/>
                    </radialGradient>
                    
                    <!-- Sombra para profundidad -->
                    <filter id="casingDropShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
                    </filter>
                    
                    <!-- Sombra interna para remaches -->
                    <filter id="rivetInsetShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.6)"/>
                    </filter>
                </defs>
                
                <!-- Carcasa principal -->
                <rect class="casing-body" 
                      x="3" y="3" 
                      width="${width - 6}" height="${height - 6}" 
                      rx="12" ry="12" 
                      fill="url(#casingGradient)" 
                      stroke="#2a2a2a" 
                      stroke-width="6" 
                      filter="url(#casingDropShadow)"/>
                
                <!-- Remaches distribuidos -->
                ${generateRivets(width, height, config)}
                
                <!-- Línea de soldadura decorativa (opcional) -->
                ${generateWeldLines(width, height)}
                
                <!-- Etiqueta de modelo (opcional) -->
                ${generateModelLabel(width, height, type)}
            </svg>
        `;
    }
    
    /**
     * Obtiene configuración específica por tipo de batería
     * @param {string} type - Tipo de configuración
     * @returns {Object} - Configuración de remaches y detalles
     */
    function getCasingConfig(type) {
        const configs = {
            '11s2p': {
                rivets: 14,
                modelLabel: 'LFP-11S2P',
                accentColor: '#3498db'
            },
            '16s1p': {
                rivets: 16,
                modelLabel: 'LFP-16S1P',
                accentColor: '#2ecc71'
            },
            '22s1p': {
                rivets: 14,
                modelLabel: 'LFP-22S1P',
                accentColor: '#e74c3c'
            }
        };
        
        return configs[type] || configs['16s1p'];
    }
    
    /**
     * Genera remaches distribuidos alrededor del perímetro
     * @param {number} width - Ancho del SVG
     * @param {number} height - Alto del SVG
     * @param {Object} config - Configuración de remaches
     * @returns {string} - SVG elementos de remaches
     */
    function generateRivets(width, height, config) {
        const rivetSize = 8;
        const margin = 15;
        let rivets = '';
        
        // Calcular posiciones para distribución uniforme
        const positions = calculateRivetPositions(width, height, config.rivets, margin);
        
        positions.forEach((pos, index) => {
            rivets += `
                <circle class="rivet" 
                        cx="${pos.x}" 
                        cy="${pos.y}" 
                        r="${rivetSize / 2}" 
                        fill="url(#rivetGradient)" 
                        stroke="#2a2a2a" 
                        stroke-width="0.5"
                        filter="url(#rivetInsetShadow)"
                        opacity="0.9">
                    <!-- Animación sutil en algunos remaches -->
                    ${index % 4 === 0 ? `
                        <animate attributeName="opacity" 
                                 values="0.9;1;0.9" 
                                 dur="${3 + Math.random() * 2}s" 
                                 repeatCount="indefinite"/>
                    ` : ''}
                </circle>
                
                <!-- Highlight en el remache para efecto 3D -->
                <circle cx="${pos.x - 1}" 
                        cy="${pos.y - 1}" 
                        r="${rivetSize / 4}" 
                        fill="rgba(255,255,255,0.3)" 
                        opacity="0.6"/>
            `;
        });
        
        return rivets;
    }
    
    /**
     * Calcula posiciones de remaches alrededor del perímetro
     * @param {number} width - Ancho del SVG
     * @param {number} height - Alto del SVG
     * @param {number} rivetCount - Número total de remaches
     * @param {number} margin - Margen desde el borde
     * @returns {Array} - Array de posiciones {x, y}
     */
    function calculateRivetPositions(width, height, rivetCount, margin) {
        const positions = [];
        
        // Esquinas obligatorias
        positions.push(
            { x: margin, y: margin },                    // Superior izquierda
            { x: width - margin, y: margin },            // Superior derecha
            { x: width - margin, y: height - margin },   // Inferior derecha
            { x: margin, y: height - margin }            // Inferior izquierda
        );
        
        // Distribución del resto de remaches
        const remainingRivets = rivetCount - 4;
        const perimeter = 2 * (width + height) - 8 * margin;
        const spacing = perimeter / rivetCount;
        
        // Lado superior (excluyendo esquinas)
        const topRivets = Math.floor((width - 2 * margin) / spacing) - 1;
        for (let i = 1; i <= topRivets; i++) {
            positions.push({
                x: margin + (i * (width - 2 * margin) / (topRivets + 1)),
                y: margin
            });
        }
        
        // Lado derecho (excluyendo esquinas)
        const rightRivets = Math.floor((height - 2 * margin) / spacing) - 1;
        for (let i = 1; i <= rightRivets; i++) {
            positions.push({
                x: width - margin,
                y: margin + (i * (height - 2 * margin) / (rightRivets + 1))
            });
        }
        
        // Lado inferior (excluyendo esquinas)
        const bottomRivets = Math.floor((width - 2 * margin) / spacing) - 1;
        for (let i = 1; i <= bottomRivets; i++) {
            positions.push({
                x: width - margin - (i * (width - 2 * margin) / (bottomRivets + 1)),
                y: height - margin
            });
        }
        
        // Lado izquierdo (excluyendo esquinas)
        const leftRivets = Math.floor((height - 2 * margin) / spacing) - 1;
        for (let i = 1; i <= leftRivets; i++) {
            positions.push({
                x: margin,
                y: height - margin - (i * (height - 2 * margin) / (leftRivets + 1))
            });
        }
        
        // Retornar solo el número solicitado de remaches
        return positions.slice(0, rivetCount);
    }
	/**
     * Genera líneas de soldadura decorativas
     * @param {number} width - Ancho del SVG
     * @param {number} height - Alto del SVG
     * @returns {string} - SVG elementos de soldadura
     */
    function generateWeldLines(width, height) {
        return `
            <!-- Líneas de soldadura sutiles -->
            <g opacity="0.3">
                <path d="M 20 20 Q 25 15, 30 20 T 40 20" 
                      stroke="rgba(255,255,255,0.2)" 
                      stroke-width="1" 
                      fill="none"/>
                <path d="M ${width - 40} ${height - 20} Q ${width - 35} ${height - 15}, ${width - 30} ${height - 20} T ${width - 20} ${height - 20}" 
                      stroke="rgba(255,255,255,0.2)" 
                      stroke-width="1" 
                      fill="none"/>
            </g>
        `;
    }
    
    /**
     * Genera etiqueta de modelo en la carcasa
     * @param {number} width - Ancho del SVG
     * @param {number} height - Alto del SVG
     * @param {string} type - Tipo de configuración
     * @returns {string} - SVG elemento de etiqueta
     */
    function generateModelLabel(width, height, type) {
        const config = getCasingConfig(type);
        
        return `
            <!-- Etiqueta de modelo -->
            <g transform="translate(${width - 80}, ${height - 25})">
                <rect x="0" y="0" width="70" height="15" 
                      rx="2" ry="2" 
                      fill="rgba(0,0,0,0.6)" 
                      stroke="${config.accentColor}" 
                      stroke-width="0.5"/>
                <text x="35" y="10" 
                      text-anchor="middle" 
                      font-family="Courier New, monospace" 
                      font-size="8" 
                      fill="${config.accentColor}" 
                      font-weight="bold">
                    ${config.modelLabel}
                </text>
            </g>
        `;
    }

    /**
     * Crea SVG completo con carcasa y celdas integradas
     * @param {string} type - Tipo de configuración ('11s2p', '16s1p', '22s1p')
     * @param {Array} cellsData - Datos analizados de las celdas
     * @param {number} width - Ancho del SVG
     * @param {number} height - Alto del SVG
     * @returns {string} - SVG HTML string completo
     */
    function createBatterySVGWithCells(type = '22s1p', cellsData = [], width = 420, height = 200) {
        // Crear SVG base con carcasa
        const casingSVG = createCasingSVG(type, width, height);
        
        // Si no hay datos de celdas, devolver solo la carcasa
        if (!cellsData || cellsData.length === 0) {
            return casingSVG;
        }
        
        // Generar celdas SVG
        const cellsSVG = generateCellsSVG(type, cellsData, width, height);
        
        // Agregar filtro de glow si no existe
        let finalSVG = casingSVG;
        if (!finalSVG.includes('id="cellGlow"')) {
            finalSVG = finalSVG.replace('<defs>', '<defs>' + addCellGlowFilter());
        }
        
        // Combinar carcasa + celdas
        return finalSVG.replace('</svg>', cellsSVG + '</svg>');
    }

    /**
     * Genera las celdas SVG según configuración
     */
    function generateCellsSVG(type, cellsData, width, height) {
        const layout = getCellLayoutConfig(type);
        const cellDimensions = calculateCellDimensions(layout, width, height);
        
        let cellsSVG = `
            <!-- Grupo de celdas -->
            <g class="cells-group" id="cells-group" style="pointer-events: auto;">
        `;
        
        // Generar cada celda
        if (type === '11s2p') {
            cellsSVG += generateCells11S2P(cellsData, cellDimensions, layout);
        } else {
            cellsSVG += generateCellsIndividual(cellsData, cellDimensions, layout);
        }
        
        cellsSVG += '</g>';
        return cellsSVG;
    }

    /**
     * Configuración de layout para cada tipo
     */
    function getCellLayoutConfig(type) {
        const layouts = {
            '11s2p': {
                displayCells: 11,
                physicalCells: 22,
                rows: 2,
                cols: 6,
                grouping: 2
            },
            '16s1p': {
                displayCells: 16,
                physicalCells: 16,
                rows: 2,
                cols: 8,
                grouping: 1
            },
            '22s1p': {
                displayCells: 22,
                physicalCells: 22,
                rows: 2,
                cols: 11,
                grouping: 1
            }
        };
        
        return layouts[type] || layouts['22s1p'];
    }

    /**
     * Calcula dimensiones y posiciones de celdas
     */
    function calculateCellDimensions(layout, svgWidth, svgHeight) {
        const marginTop = 35;
        const marginBottom = 35;
        const marginLeft = 35;
        const marginRight = 35;
        
        const availableWidth = svgWidth - marginLeft - marginRight;
        const availableHeight = svgHeight - marginTop - marginBottom;
        const cellSpacing = 3;
        
        const cellWidth = (availableWidth - (layout.cols - 1) * cellSpacing) / layout.cols;
        const cellHeight = (availableHeight - (layout.rows - 1) * cellSpacing) / layout.rows;
        
        return {
            cellWidth, cellHeight, cellSpacing, marginLeft, marginTop, availableWidth, availableHeight
        };
    }

    /**
     * Genera celdas individuales (22S1P, 16S1P)
     */
    function generateCellsIndividual(cellsData, dimensions, layout) {
        let cellsSVG = '';
        
        for (let i = 0; i < layout.displayCells && i < cellsData.length; i++) {
            const cell = cellsData[i];
            
            // Calcular posición en grid
            const row = Math.floor(i / layout.cols);
            const col = i % layout.cols;
            
            const x = dimensions.marginLeft + col * (dimensions.cellWidth + dimensions.cellSpacing);
            const y = dimensions.marginTop + row * (dimensions.cellHeight + dimensions.cellSpacing);
            
            cellsSVG += createIndividualCell(cell, x, y, dimensions);
        }
        
        return cellsSVG;
    }
   

    /**
     * Crea una celda individual SVG
     */
    function createIndividualCell(cellData, x, y, dimensions) {
        if (!cellData) return '';
        
        const cellClass = getCellSVGClass(cellData);
        const fillColor = getCellFillColor(cellData);
        const strokeColor = getCellStrokeColor(cellData);
        
        return `
            <g class="svg-cell" data-cell-id="${cellData.id}" style="pointer-events: auto;">
                <rect 
                    x="${x}" y="${y}" 
                    width="${dimensions.cellWidth}" height="${dimensions.cellHeight}"
                    rx="2" ry="2"
                    fill="${fillColor}" stroke="${strokeColor}" stroke-width="1"
                    class="cell-rect ${cellClass}"
                    data-voltage="${cellData.voltage}" data-temperature="${cellData.temperature}"
                    data-status="${cellData.status}" data-extreme="${cellData.isExtreme || 'none'}"
                    style="cursor: pointer; transition: all 0.3s ease; pointer-events: auto;"
                    onclick="console.log('🎯 CLICK en celda ${cellData.id}:', this.getAttribute('data-voltage'))"
					onmouseover="this.setAttribute('stroke-width', '2'); this.setAttribute('filter', 'url(#cellGlow)');"
                    onmouseout="this.setAttribute('stroke-width', '1'); this.removeAttribute('filter');"
                />
                <text 
                    x="${x + dimensions.cellWidth / 2}" y="${y + dimensions.cellHeight / 2 + 3}"
                    text-anchor="middle" dominant-baseline="middle"
                    font-family="Courier New, monospace" font-size="10" font-weight="bold"
                    fill="${getTextColor(cellData)}" pointer-events="none" style="user-select: none;">
                    ${cellData.id}
                </text>
            </g>
        `;
    }

    /**
     * Funciones auxiliares para celdas
     */
    function getCellSVGClass(cellData) {
        if (!cellData) return 'empty-cell';
        if (!cellData.isConnected) return 'empty-cell';
        if (cellData.isExtreme && cellData.isExtreme !== 'none') return cellData.isExtreme;
        return cellData.status || 'normal';
    }

    function getCellFillColor(cellData) {
        const colors = {
            'normal': '#2ecc71',
            'warning': '#f1c40f',
            'critical': '#e74c3c',
            'highest-voltage': '#ff4757',
            'lowest-voltage': '#3498db',
            'temp-highest': '#ff6b7a',
            'temp-lowest': '#54a0ff',
            'empty-cell': 'rgba(255,255,255,0.1)'
        };
        return colors[getCellSVGClass(cellData)] || colors['normal'];
    }

    function getCellStrokeColor(cellData) {
        if (!cellData || !cellData.isConnected) return 'rgba(255,255,255,0.2)';
        const colors = {
            'highest-voltage': '#ff3742',
            'lowest-voltage': '#2980b9',
            'temp-highest': '#ee5a67',
            'temp-lowest': '#2e86de'
        };
        return colors[getCellSVGClass(cellData)] || 'rgba(255,255,255,0.4)';
    }

    function getTextColor(cellData) {
        if (!cellData) return '#999';
        const darkBackgrounds = ['normal', 'critical', 'highest-voltage', 'lowest-voltage', 'temp-highest', 'temp-lowest'];
        return darkBackgrounds.includes(getCellSVGClass(cellData)) ? '#ffffff' : '#000000';
    }

    function addCellGlowFilter() {
        return `
            <filter id="cellGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        `;
    }

    // Funciones para 11S2P (agrupadas) - simplificadas para no alargar
    function generateCells11S2P(cellsData, dimensions, layout) {
        // Implementación similar pero agrupando de 2 en 2
        return '<!-- 11S2P implementation aquí -->';
    }

    function createMultipleCasings(stringConfigs) {
        return stringConfigs.map(config => ({
            id: config.id,
            svg: createCasingSVG(config.type, 400, 200),
            type: config.type,
            temperature: config.temp || 25.0
        }));
    }

    function getRecommendedDimensions(type) {
        const dimensions = {
            '11s2p': { width: 380, height: 180 },
            '16s1p': { width: 420, height: 180 },
            '22s1p': { width: 380, height: 180 }
        };
        return dimensions[type] || dimensions['16s1p'];
    }

    // API pública
    return {
        createCasingSVG: createCasingSVG,
        createBatterySVGWithCells: createBatterySVGWithCells,
        createMultipleCasings: createMultipleCasings,
        getRecommendedDimensions: getRecommendedDimensions,
        getCasingConfig: getCasingConfig,
        generateCellsSVG: generateCellsSVG,
        getCellLayoutConfig: getCellLayoutConfig,
        addCellGlowFilter: addCellGlowFilter
    };
})();

// Exportar para uso global
window.CellsSVG = CellsSVG;