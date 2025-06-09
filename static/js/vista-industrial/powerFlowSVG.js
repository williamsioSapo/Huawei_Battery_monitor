/**
 * powerFlowSVG.js - Generador de SVG para Flujo de Energía
 * Sistema dedicado para crear y manejar el SVG del flujo de energía
 */

const PowerFlowSVG = (function() {
    'use strict';
    
    /**
     * Crea SVG del flujo de energía con paneles, batería y edificio
     * @param {number} width - Ancho del SVG
     * @param {number} height - Alto del SVG
     * @returns {string} - SVG HTML string
     */
    function createPowerFlowSVG(width = 800, height = 400, batterySOC = 50) {
        const svg = `
            <svg width="${width}" height="${height}" viewBox="40 250 800 220" class="power-flow-svg">
                <defs>
                    <!-- Gradientes para cada elemento -->
                    <radialGradient id="solarGradient" cx="50%" cy="30%" r="70%">
                        <stop offset="0%" style="stop-color:#f1c40f;stop-opacity:1" />
                        <stop offset="70%" style="stop-color:#f39c12;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#d35400;stop-opacity:0.8" />
                    </radialGradient>
                    
                    <radialGradient id="batteryFlowGradient" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" style="stop-color:#27ae60;stop-opacity:1" />
                        <stop offset="70%" style="stop-color:#2ecc71;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#58d68d;stop-opacity:0.8" />
                    </radialGradient>
                    
                    <radialGradient id="buildingGradient" cx="50%" cy="30%" r="70%">
                        <stop offset="0%" style="stop-color:#3498db;stop-opacity:1" />
                        <stop offset="70%" style="stop-color:#2980b9;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#1f618d;stop-opacity:0.8" />
                    </radialGradient>
                    
                    <!-- Filtros para efectos -->
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge> 
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    
                    <!-- Marcador para flechas -->
                    <defs>
                        <marker id="arrowhead" markerWidth="12" markerHeight="8" 
                                refX="11" refY="4" orient="auto" markerUnits="strokeWidth">
                            <path d="M0,0 L0,8 L12,4 z" fill="#ffffff" opacity="0.9"/>
                        </marker>
                    </defs>
                </defs>
                
                <!-- Panel Solar (Izquierda) -->
                <g class="solar-panel-group" transform="translate(50, 120) scale(0.9)">
					<!-- SVG del panel solar detallado -->
					${createDetailedSolarPanelSVG()}
                </g>
                
                <!-- Batería (Centro) -->
					<g class="battery-flow-group" transform="translate(450, 275)">
						${createHorizontalBatterySVG(batterySOC, 100, 60)}
						
						<!-- Etiqueta -->
						<text x="50" y="80" text-anchor="middle" font-size="12" fill="#2c3e50" font-weight="bold">
							BATERÍA
						</text>
					</g>
                
                <!-- Edificio (Derecha) -->
                <g class="building-group" transform="translate(750, 240)">
					${createDetailedBuildingSVG()}
					
					<!-- Etiqueta -->
					<text x="25" y="130" text-anchor="middle" font-size="12" fill="#2c3e50" font-weight="bold">
						EDIFICIO
					</text>
				</g>
                
                <!-- Líneas de conexión y flechas -->
                <g class="connection-lines">
                    <!-- Línea Panel -> Batería -->
                    <line x1="300" y1="230" x2="450" y2="290" 
                          stroke="#ffffff" 
                          stroke-width="4" 
                          opacity="0.8"
                          stroke-dasharray="10,5"
                          marker-end="url(#arrowhead)">
                        <animate attributeName="stroke-dashoffset" 
                                 values="0;-15" 
                                 dur="1s" 
                                 repeatCount="indefinite"/>
                    </line>
                    
                    <!-- Línea Batería -> Edificio -->
                    <line x1="550" y1="290" x2="700" y2="230"
                          stroke="#ffffff" 
                          stroke-width="4" 
                          opacity="0.8"
                          stroke-dasharray="10,5"
                          marker-end="url(#arrowhead)">
                        <animate attributeName="stroke-dashoffset" 
                                 values="0;-15" 
                                 dur="1.2s" 
                                 repeatCount="indefinite"/>
                    </line>
                </g>
                
                <!-- Partículas de energía -->
                <g class="energy-particles">
                    <!-- Partículas que se moverán con JavaScript -->
                    <circle class="particle" cx="220" cy="190" r="3" fill="#f1c40f" opacity="0.8"/>
                    <circle class="particle" cx="240" cy="185" r="2" fill="#e74c3c" opacity="0.6"/>
                    <circle class="particle" cx="260" cy="195" r="2.5" fill="#2ecc71" opacity="0.7"/>
                    <circle class="particle" cx="470" cy="190" r="3" fill="#3498db" opacity="0.8"/>
                    <circle class="particle" cx="490" cy="185" r="2" fill="#9b59b6" opacity="0.6"/>
                    <circle class="particle" cx="510" cy="195" r="2.5" fill="#1abc9c" opacity="0.7"/>
                </g>
            </svg>
        `;
        
        return svg;
    }
    
	/**
 * Crea una batería horizontal con indicador de carga dinámico
 * @param {number} socLevel - Nivel de carga (0-100)
 * @param {number} width - Ancho del SVG
 * @param {number} height - Alto del SVG
 * @returns {string} - SVG HTML string de batería horizontal
 */
	function createHorizontalBatterySVG(socLevel = 50, width = 100, height = 60) {
		// Calcular dimensiones internas
		const bodyPadding = 4;
		const innerWidth = width - (bodyPadding * 2);
		const innerHeight = height - (bodyPadding * 2);
		const innerX = bodyPadding;
		const innerY = bodyPadding;
		
		// Calcular anchuras para cada sección (horizontal: izquierda a derecha)
		const chargeWidth = (socLevel / 100) * innerWidth;
		const emptyWidth = innerWidth - chargeWidth;
		
		// Posiciones X
		const chargeX = innerX;
		const emptyX = innerX + chargeWidth;
		
		// Reutilizar función de gradientes del módulo SVGIcons
		const gradientStops = window.SVGIcons.getBatteryGradientStops(socLevel);
		
		return `
			<g class="horizontal-battery-group">
				<defs>
					<!-- Gradiente para el contorno del cuerpo -->
					<linearGradient id="horizontalStrokeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" style="stop-color:#666666"/>
						<stop offset="50%" style="stop-color:#999999"/>
						<stop offset="100%" style="stop-color:#CCCCCC"/>
					</linearGradient>
					
					<!-- Gradiente para la parte vacía (gris claro) -->
					<linearGradient id="horizontalEmptyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" style="stop-color:#f0f0f0"/>
						<stop offset="100%" style="stop-color:#e0e0e0"/>
					</linearGradient>
					
					<!-- Gradiente para la carga (colores dinámicos según nivel) -->
					<linearGradient id="horizontalChargeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
						${gradientStops}
					</linearGradient>
				</defs>
				
				<!-- Contorno del cuerpo principal (sin terminal) -->
				<rect x="0" y="0" width="${width}" height="${height}" rx="8" ry="8" 
					fill="none" stroke="url(#horizontalStrokeGradient)" stroke-width="3"/>
				
				<!-- Parte cargada (izquierda) - solo si hay carga -->
				${chargeWidth > 0 ? `
					<rect x="${chargeX}" y="${innerY}" width="${chargeWidth}" height="${innerHeight}" 
						rx="3" ry="3" fill="url(#horizontalChargeGradient)" class="horizontal-battery-charge">
						<animate attributeName="opacity" 
								values="0.9;1;0.9" 
								dur="3s" 
								repeatCount="indefinite"/>
					</rect>
					
					<!-- Efecto de brillo en la zona cargada -->
					<rect x="${chargeX + 2}" y="${innerY + 2}" width="2" height="${Math.max(0, innerHeight - 4)}" 
						rx="1" ry="1" fill="rgba(255,255,255,0.4)" class="horizontal-battery-shine">
						<animate attributeName="opacity" 
								values="0.2;0.6;0.2" 
								dur="3.5s" 
								repeatCount="indefinite"/>
					</rect>
				` : ''}
				
				<!-- Parte vacía (derecha) - solo si hay espacio -->
				${emptyWidth > 0 ? `
					<rect x="${emptyX}" y="${innerY}" width="${emptyWidth}" height="${innerHeight}" 
						rx="3" ry="3" fill="url(#horizontalEmptyGradient)" class="horizontal-battery-empty">
						<animate attributeName="opacity" 
								values="0.7;0.9;0.7" 
								dur="4s" 
								repeatCount="indefinite"/>
					</rect>
				` : ''}
			</g>
		`;
	}
	
    /**
     * Genera celdas solares para el panel
     */
    function generateSolarCells() {
        let cells = '';
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                const x = 10 + (col * 16);
                const y = 10 + (row * 15);
                cells += `
                    <rect x="${x}" y="${y}" width="14" height="12" rx="2" ry="2" 
                          fill="rgba(52, 73, 94, 0.3)" 
                          stroke="rgba(52, 73, 94, 0.5)" 
                          stroke-width="0.5">
                        <animate attributeName="fill" 
                                 values="rgba(52, 73, 94, 0.3);rgba(241, 196, 15, 0.2);rgba(52, 73, 94, 0.3)" 
                                 dur="${2 + Math.random()}s" 
                                 repeatCount="indefinite"/>
                    </rect>
                `;
            }
        }
        return cells;
    }
    
    /**
     * Genera ventanas para el edificio
     */
    function generateBuildingWindows() {
        let windows = '';
        const windowPositions = [
            [15, 60], [50, 60], // Piso superior
            [15, 85], [50, 85], // Piso medio
        ];
        
        windowPositions.forEach(([x, y], index) => {
            const isLit = Math.random() > 0.3; // 70% de probabilidad de estar encendida
            const lightColor = isLit ? '#ffeaa7' : '#ddd';
            
            windows += `
                <rect x="${x}" y="${y}" width="12" height="12" rx="1" ry="1" 
                      fill="${lightColor}" 
                      stroke="#2c3e50" 
                      stroke-width="1">
                    ${isLit ? `
                        <animate attributeName="opacity" 
                                 values="0.7;1;0.7" 
                                 dur="${3 + Math.random() * 2}s" 
                                 repeatCount="indefinite"/>
                    ` : ''}
                </rect>
            `;
        });
        
        return windows;
    }
    
    /**
     * Actualiza las líneas del flujo de energía
     * @param {Object} flowData - Datos del flujo {solar: number, battery: number, building: number}
     */
    function updatePowerFlow(flowData) {
        const lines = document.querySelectorAll('.connection-lines line');
        lines.forEach((line, index) => {
            const intensity = Math.abs(flowData.solar || 1) + Math.abs(flowData.battery || 1);
            const opacity = Math.max(0.3, Math.min(1, intensity / 5));
            line.setAttribute('opacity', opacity);
        });
    }
    
function createDetailedSolarPanelSVG() {
    return `
        <g transform="scale(0.75) translate(-50, -150)">
            <!-- GRUPO PANEL TRASERO COMPLETO (CON DESPLAZAMIENTO) -->
            <g id="panelTrasero_conjunto" transform="translate(0, 10)">
                <g id="panelTrasero_estructura">
                    <!-- Estructura del panel trasero (soportes y marco) -->
                    <path d="M75 331 L96 388 L54 388 Z" fill="none" stroke="#000000" stroke-width="2.1"/>
                    <path d="M250 331 L271 388 L229 388 Z" fill="none" stroke="#000000" stroke-width="2.1"/>
                    <rect x="70" y="321" width="11" height="7" fill="none" stroke="#000000" stroke-width="1.4"/>
                    <rect x="245" y="321" width="11" height="7" fill="none" stroke="#000000" stroke-width="1.4"/>
                    <line x1="44" y1="388" x2="281" y2="388" stroke="#000000" stroke-width="2.8"/>
                    <path d="M40 230 L215 230 L250 321 L75 321 Z" fill="none" stroke="#000000" stroke-width="2.1"/>
                    
                    <!-- Grid del panel trasero (lineas de referencia) -->
                    <line x1="47" y1="248.2" x2="222" y2="248.2" stroke="#000000" stroke-width="0.7"/>
                    <line x1="54" y1="266.4" x2="229" y2="266.4" stroke="#000000" stroke-width="0.7"/>
                    <line x1="61" y1="284.6" x2="236" y2="284.6" stroke="#000000" stroke-width="0.7"/>
                    <line x1="68" y1="302.8" x2="243" y2="302.8" stroke="#000000" stroke-width="0.7"/>
                    <line x1="83.75" y1="230" x2="118.75" y2="321" stroke="#000000" stroke-width="0.7"/>
                    <line x1="127.5" y1="230" x2="162.5" y2="321" stroke="#000000" stroke-width="0.7"/>
                    <line x1="171.25" y1="230" x2="206.25" y2="321" stroke="#000000" stroke-width="0.7"/>
                </g>

                <g id="panelTrasero_celdas">
                    <!-- CELDAS DEL PANEL TRASERO -->
                    <!-- Fila 0 -->
                    <path d="M42.8 232 L81.8 232 L88.0 246.2 L49.0 246.2 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M85.8 232 L125.5 232 L131.7 246.2 L92.7 246.2 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M129.5 232 L169.2 232 L175.5 246.2 L136.5 246.2 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M173.2 232 L213.0 232 L219.2 246.2 L180.2 246.2 Z" fill="#D3D3D3" stroke="none"/>
                    <!-- Fila 1 -->
                    <path d="M49.8 250.2 L88.8 250.2 L95.0 264.4 L56.0 264.4 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M92.8 250.2 L132.5 250.2 L138.7 264.4 L99.7 264.4 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M136.5 250.2 L176.2 250.2 L182.5 264.4 L143.5 264.4 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M180.2 250.2 L220.0 250.2 L226.2 264.4 L187.2 264.4 Z" fill="#D3D3D3" stroke="none"/>
                    <!-- Fila 2 -->
                    <path d="M56.8 268.4 L95.8 268.4 L102.0 282.6 L63.0 282.6 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M99.8 268.4 L139.5 268.4 L145.7 282.6 L106.7 282.6 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M143.5 268.4 L183.2 268.4 L189.5 282.6 L150.5 282.6 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M187.2 268.4 L227.0 268.4 L233.2 282.6 L194.2 282.6 Z" fill="#D3D3D3" stroke="none"/>
                    <!-- Fila 3 -->
                    <path d="M63.8 286.6 L102.8 286.6 L109.0 300.8 L70.0 300.8 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M106.8 286.6 L146.5 286.6 L152.7 300.8 L113.7 300.8 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M150.5 286.6 L190.2 286.6 L196.5 300.8 L157.5 300.8 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M194.2 286.6 L234.0 286.6 L240.2 300.8 L201.2 300.8 Z" fill="#D3D3D3" stroke="none"/>
                    <!-- Fila 4 -->
                    <path d="M70.8 304.8 L109.8 304.8 L116.0 319 L77.0 319 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M113.8 304.8 L153.5 304.8 L159.7 319 L120.7 319 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M157.5 304.8 L197.2 304.8 L203.5 319 L164.5 319 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M201.2 304.8 L241.0 304.8 L247.2 319 L208.2 319 Z" fill="#D3D3D3" stroke="none"/>
                </g>
            </g>

            <!-- GRUPO PANEL FRONTAL COMPLETO -->
            <g id="panelFrontal_conjunto">
                <g id="panelFrontal_estructura">
                    <!-- Estructura del panel frontal -->
                    <path d="M258 390 L288 470 L228 470 Z" fill="none" stroke="#000000" stroke-width="3"/>
                    <path d="M492 390 L522 470 L462 470 Z" fill="none" stroke="#000000" stroke-width="3"/>
                    <rect x="250" y="380" width="16" height="10" fill="none" stroke="#000000" stroke-width="2"/>
                    <rect x="484" y="380" width="16" height="10" fill="none" stroke="#000000" stroke-width="2"/>
                    <line x1="210" y1="470" x2="540" y2="470" stroke="#000000" stroke-width="4"/>
                    
                    <!-- Superficie del panel frontal CON FONDO BLANCO -->
                    <path d="M200 250 L450 250 L500 380 L250 380 Z" fill="#FFFFFF" stroke="#000000" stroke-width="3"/>
                    
                    <!-- Grid del panel frontal -->
                    <line x1="210" y1="276" x2="460" y2="276" stroke="#000000" stroke-width="1"/>
                    <line x1="220" y1="302" x2="470" y2="302" stroke="#000000" stroke-width="1"/>
                    <line x1="230" y1="328" x2="480" y2="328" stroke="#000000" stroke-width="1"/>
                    <line x1="240" y1="354" x2="490" y2="354" stroke="#000000" stroke-width="1"/>
                    <line x1="275" y1="250" x2="325" y2="380" stroke="#000000" stroke-width="1"/>
                    <line x1="325" y1="250" x2="375" y2="380" stroke="#000000" stroke-width="1"/>
                    <line x1="375" y1="250" x2="425" y2="380" stroke="#000000" stroke-width="1"/>
                </g>

                <g id="panelFrontal_celdas">
                    <!-- CELDAS DEL PANEL FRONTAL -->
                    <!-- Fila 0 -->
                    <path d="M202.8 252 L273.8 252 L282.2 274 L211.2 274 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M277.8 252 L323.8 252 L332.2 274 L286.2 274 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M327.8 252 L373.8 252 L382.2 274 L336.2 274 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M377.8 252 L448.8 252 L457.2 274 L386.2 274 Z" fill="#D3D3D3" stroke="none"/>
                    <!-- Fila 1 -->
                    <path d="M212.8 278 L283.8 278 L292.2 300 L221.2 300 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M287.8 278 L333.8 278 L342.2 300 L296.2 300 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M337.8 278 L383.8 278 L392.2 300 L346.2 300 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M387.8 278 L458.8 278 L467.2 300 L396.2 300 Z" fill="#D3D3D3" stroke="none"/>
                    <!-- Fila 2 -->
                    <path d="M222.8 304 L293.8 304 L302.2 326 L231.2 326 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M297.8 304 L343.8 304 L352.2 326 L306.2 326 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M347.8 304 L393.8 304 L402.2 326 L356.2 326 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M397.8 304 L468.8 304 L477.2 326 L406.2 326 Z" fill="#D3D3D3" stroke="none"/>
                    <!-- Fila 3 -->
                    <path d="M232.8 330 L303.8 330 L312.2 352 L241.2 352 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M307.8 330 L353.8 330 L362.2 352 L316.2 352 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M357.8 330 L403.8 330 L412.2 352 L366.2 352 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M407.8 330 L478.8 330 L487.2 352 L416.2 352 Z" fill="#D3D3D3" stroke="none"/>
                    <!-- Fila 4 -->
                    <path d="M242.8 356 L313.8 356 L322.2 378 L251.2 378 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M317.8 356 L363.8 356 L372.2 378 L326.2 378 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M367.8 356 L413.8 356 L422.2 378 L376.2 378 Z" fill="#D3D3D3" stroke="none"/>
                    <path d="M417.8 356 L488.8 356 L497.2 378 L426.2 378 Z" fill="#D3D3D3" stroke="none"/>
                </g>
            </g>

            <!-- GRUPO SOL -->
            <g id="sol" stroke-width="2.5" stroke="#FFD700">
                <circle cx="530" cy="200" r="30" fill="#FFD700" stroke="none"/>
                <!-- Rayos del sol -->
                <line x1="530" y1="165" x2="530" y2="145"/>
                <line x1="565" y1="200" x2="585" y2="200"/>
                <line x1="530" y1="235" x2="530" y2="255"/>
                <line x1="495" y1="200" x2="475" y2="200"/>
                <line x1="554.7" y1="175.3" x2="568.9" y2="161.1"/>
                <line x1="554.7" y1="224.7" x2="568.9" y2="238.9"/>
                <line x1="505.3" y1="224.7" x2="491.1" y2="238.9"/>
                <line x1="505.3" y1="175.3" x2="491.1" y2="161.1"/>
            </g>
        </g>
    `;
}

function createDetailedBuildingSVG() {
    return `
        <g transform="scale(2) translate(-50, -50)">
            <!-- Contorno Principal de los Edificios -->
            <path d="M 5 95 L 5 5 L 48 5 L 48 19 L 95 19 L 95 95 Z" 
                  fill="none" stroke="#2c3e50" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter"/>
            
            <!-- Línea vertical que separa los dos edificios -->
            <line x1="48" y1="19" x2="48" y2="95" 
                  stroke="#2c3e50" stroke-width="2"/>
            
            <!-- Puerta 1 (Edificio Izquierdo) -->
            <path d="M 17.5 95 L 17.5 80 A 9 9 0 0 1 35.5 80 L 35.5 95" 
                  fill="none" stroke="#2c3e50" stroke-width="2"/>
            
            <!-- Ventanas Edificio 1 (4 filas, 2 columnas) -->
            <rect x="14" y="10" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            <rect x="29" y="10" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            <rect x="14" y="25" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            <rect x="29" y="25" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            <rect x="14" y="40" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            <rect x="29" y="40" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            <rect x="14" y="55" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            <rect x="29" y="55" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            
            <!-- Puerta 2 (Edificio Derecho) -->
            <path d="M 62.5 95 L 62.5 80 A 9 9 0 0 1 80.5 80 L 80.5 95" 
                  fill="none" stroke="#2c3e50" stroke-width="2"/>
            
            <!-- Ventanas Edificio 2 (3 filas, 2 columnas) -->
            <rect x="59" y="24" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            <rect x="74" y="24" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            <rect x="59" y="39" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            <rect x="74" y="39" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            <rect x="59" y="54" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
            <rect x="74" y="54" width="10" height="10" fill="none" stroke="#2c3e50" stroke-width="2"/>
        </g>
    `;
}	
	
    // API pública
    return {
        createPowerFlowSVG: createPowerFlowSVG,
        updatePowerFlow: updatePowerFlow,
		createHorizontalBatterySVG: createHorizontalBatterySVG
    };
})();

// Exportar para uso global
window.PowerFlowSVG = PowerFlowSVG;