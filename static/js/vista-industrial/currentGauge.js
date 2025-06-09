/**
 * currentGauge.js - Gauge de Corriente Total del Sistema
 * Módulo independiente para mostrar flujo de corriente en tiempo real
 * Compatible con vista moderna de baterías - VERSIÓN COMPACTA
 */

class CurrentGauge {
    constructor(options = {}) {
        console.log('CurrentGauge: Inicializando módulo...');
        
        // Configuración por defecto
        this.config = {
            minValue: -100,          // Descarga máxima (-50A)
            maxValue: 100,           // Carga máxima (+50A)
            size: 200,              // Tamaño del SVG
            strokeWidth: 12,        // Grosor de los arcos
            animationDuration: 500, // Duración de animaciones (ms)
            animationEasing: 'ease-out',
            showLabels: true,       // Mostrar etiquetas (-50A, 0A, +50A)
            showTicks: true,        // Mostrar marcas menores
            showValue: true,        // Mostrar valor central
            neutralZone: 1,         // Zona neutral ±1A
            compact: false,         // NUEVO: Modo compacto
            
            // Colores (usando variables CSS)
            chargeColor: '#2ecc71',      // Verde para carga
            dischargeColor: '#e74c3c',   // Rojo para descarga
            neutralColor: 'rgba(255, 255, 255, 0.1)',
            needleColor: '#ffffff',
            accentColor: '#00d4ff',
            
            // Callbacks opcionales
            onUpdate: null,
            onRangeExceeded: null,
            
            // Sobrescribir con opciones proporcionadas
            ...options
        };
        
        // NUEVO: Ajustar configuración para modo compacto
        if (this.config.compact) {
            this.config.size = Math.min(this.config.size, 120);
            this.config.strokeWidth = Math.min(this.config.strokeWidth, 8);
            this.config.showLabels = false;  // Forzar ocultar etiquetas en compacto
            this.config.showValue = false;   // El valor se maneja externamente en modo compacto
            console.log('CurrentGauge: Modo compacto activado');
        }
        
		if (this.config.compact && this.config.headerMode) {
			this.config.size = Math.min(this.config.size, 110);
			this.config.strokeWidth = Math.min(this.config.strokeWidth, 6);
			this.config.showLabels = false;
			this.config.showValue = false; // Manejado externamente
			console.log('CurrentGauge: Modo header activado');
		}
				
        // Estado interno
        this.container = null;
        this.svgElement = null;
        this.needle = null;
        this.valueDisplay = null;
        this.currentValue = 0;
        this.isInitialized = false;
        
        console.log('CurrentGauge: Configuración cargada:', this.config);
    }
    
    /**
     * Inicializa el gauge en un contenedor específico
     * @param {string} containerId - ID del contenedor DOM
     */
    init(containerId) {
        console.log(`CurrentGauge: Inicializando en contenedor '${containerId}'`);
        
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`CurrentGauge: No se encontró el contenedor '${containerId}'`);
            return false;
        }
        
        try {
            // Limpiar contenedor
            this.container.innerHTML = '';
            
            // Crear estructura HTML
            this._createContainer();
            
            // Crear SVG del gauge
            this._createSVG();
            
            // Crear aguja
            this._createNeedle();
            
            // Crear etiquetas si están habilitadas (no en modo compacto)
            if (this.config.showLabels && !this.config.compact) {
                this._createLabels();
            }
            
            // Crear marcas si están habilitadas
            if (this.config.showTicks) {
                this._createTicks();
            }
            
            // Crear display de valor (solo si no es compacto)
            if (this.config.showValue && !this.config.compact) {
                this._createValueDisplay();
            }
            
            // Marcar como inicializado
            this.isInitialized = true;
            
            // Establecer valor inicial
            this.updateValue(0);
            
            console.log('CurrentGauge: Inicialización completada exitosamente');
            return true;
            
        } catch (error) {
            console.error('CurrentGauge: Error durante la inicialización:', error);
            return false;
        }
    }
    
    /**
     * MODIFICADO: Crear contenedor con soporte para modo compacto
     * @private
     */
    _createContainer() {
        const containerClass = this.config.compact ? 
            'current-gauge-container compact' : 
            'current-gauge-container';
            
        this.container.className = containerClass;
        
        // Estructura HTML diferente según modo
        if (this.config.compact) {
            this.container.innerHTML = `
                <div class="gauge-svg-wrapper compact">
                    <!-- SVG se insertará aquí -->
                </div>
            `;
        } else {
            this.container.innerHTML = `
                <div class="gauge-svg-wrapper">
                    <!-- SVG se insertará aquí -->
                </div>
                <div class="gauge-value-section">
                    <!-- Valor se insertará aquí -->
                </div>
            `;
        }
    }
    
    /**
     * MODIFICADO: Crear SVG con dimensiones apropiadas para el modo
     * @private
     */
    _createSVG() {
        const svgWrapper = this.container.querySelector('.gauge-svg-wrapper');
        
        // Ajustar altura para modo compacto
        const svgHeight = this.config.compact ? 
            this.config.size * 0.6 : 
            this.config.size * 0.6;
            
        this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgElement.setAttribute('class', 'current-gauge-svg');
        this.svgElement.setAttribute('width', this.config.size);
        this.svgElement.setAttribute('height', svgHeight);
        this.svgElement.setAttribute('viewBox', `0 0 ${this.config.size} ${svgHeight}`);
        
        // Crear arcos de fondo
        this._createArcs();
        
        svgWrapper.appendChild(this.svgElement);
    }
    
    /**
     * MODIFICADO: Crear arcos con grosor apropiado para el modo
     * @private
     */
    _createArcs() {
        const centerX = this.config.size / 2;
        const centerY = this.config.size / 2;
        const radius = (this.config.size / 2) - (this.config.strokeWidth / 2) - 10;
        
        // Grupo para arcos
        const arcsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        arcsGroup.setAttribute('class', 'gauge-arcs');
        
        // Arco de fondo (semicírculo completo)
        const backgroundArc = this._createArc(centerX, centerY, radius, -180, 0, 'none', this.config.neutralColor, this.config.strokeWidth);
        backgroundArc.setAttribute('class', 'gauge-background');
        arcsGroup.appendChild(backgroundArc);
        
        // Arco de descarga (lado izquierdo, de -180° a -90°)
        const dischargeArc = this._createArc(centerX, centerY, radius, -180, -90, 'none', this.config.dischargeColor, this.config.strokeWidth);
        dischargeArc.setAttribute('class', 'gauge-discharge');
        dischargeArc.setAttribute('opacity', '0.3');
        arcsGroup.appendChild(dischargeArc);
        
        // Arco de carga (lado derecho, de -90° a 0°)
        const chargeArc = this._createArc(centerX, centerY, radius, -90, 0, 'none', this.config.chargeColor, this.config.strokeWidth);
        chargeArc.setAttribute('class', 'gauge-charge');
        chargeArc.setAttribute('opacity', '0.3');
        arcsGroup.appendChild(chargeArc);
        
        this.svgElement.appendChild(arcsGroup);
    }
    
    /**
     * Crea un arco SVG
     * @private
     */
    _createArc(centerX, centerY, radius, startAngle, endAngle, fill, stroke, strokeWidth) {
        const startAngleRad = (startAngle * Math.PI) / 180;
        const endAngleRad = (endAngle * Math.PI) / 180;
        
        const x1 = centerX + radius * Math.cos(startAngleRad);
        const y1 = centerY + radius * Math.sin(startAngleRad);
        const x2 = centerX + radius * Math.cos(endAngleRad);
        const y2 = centerY + radius * Math.sin(endAngleRad);
        
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`);
        path.setAttribute('fill', fill);
        path.setAttribute('stroke', stroke);
        path.setAttribute('stroke-width', strokeWidth);
        path.setAttribute('stroke-linecap', 'round');
        
        return path;
    }
    
    /**
     * MODIFICADO: Crear aguja con tamaño apropiado para el modo
     * @private
     */
    _createNeedle() {
        const centerX = this.config.size / 2;
        const centerY = this.config.size / 2;
        const needleLength = this.config.compact ? 
            (this.config.size / 2) - 25 : 
            (this.config.size / 2) - 20;
        
        // Grupo para la aguja
        const needleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        needleGroup.setAttribute('class', 'gauge-needle');
        needleGroup.setAttribute('transform-origin', `${centerX} ${centerY}`);
        
        // Línea de la aguja
        const needleLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        needleLine.setAttribute('class', 'needle-line');
        needleLine.setAttribute('x1', centerX);
        needleLine.setAttribute('y1', centerY);
        needleLine.setAttribute('x2', centerX);
        needleLine.setAttribute('y2', centerY - needleLength);
        needleLine.setAttribute('stroke', this.config.needleColor);
        needleLine.setAttribute('stroke-width', this.config.compact ? '2' : '3');
        needleLine.setAttribute('stroke-linecap', 'round');
        
        // Centro de la aguja
        const needleCenter = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        needleCenter.setAttribute('class', 'needle-center');
        needleCenter.setAttribute('cx', centerX);
        needleCenter.setAttribute('cy', centerY);
        needleCenter.setAttribute('r', this.config.compact ? '3' : '4');
        needleCenter.setAttribute('fill', this.config.accentColor);
        
        needleGroup.appendChild(needleLine);
        needleGroup.appendChild(needleCenter);
        
        this.svgElement.appendChild(needleGroup);
        this.needle = needleGroup;
    }
    
    /**
     * MODIFICADO: Crear marcas con densidad apropiada para el modo
     * @private
     */
    _createTicks() {
        const centerX = this.config.size / 2;
        const centerY = this.config.size / 2;
        const outerRadius = (this.config.size / 2) - 15;
        const innerRadius = outerRadius - (this.config.compact ? 8 : 12);
        
        const ticksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        ticksGroup.setAttribute('class', 'gauge-ticks');
        
        // Menos marcas en modo compacto
        const tickCount = this.config.compact ? 9 : 17; // 9 vs 17 marcas
        const angleStep = 180 / (tickCount - 1);
        
        for (let i = 0; i < tickCount; i++) {
            const angle = -180 + (i * angleStep);
            const angleRad = (angle * Math.PI) / 180;
            
            const outer = {
                x: centerX + outerRadius * Math.cos(angleRad),
                y: centerY + outerRadius * Math.sin(angleRad)
            };
            
            const inner = {
                x: centerX + innerRadius * Math.cos(angleRad),
                y: centerY + innerRadius * Math.sin(angleRad)
            };
            
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tick.setAttribute('x1', outer.x);
            tick.setAttribute('y1', outer.y);
            tick.setAttribute('x2', inner.x);
            tick.setAttribute('y2', inner.y);
            tick.setAttribute('stroke', 'rgba(255, 255, 255, 0.3)');
            tick.setAttribute('stroke-width', this.config.compact ? '0.5' : '1');
            
            ticksGroup.appendChild(tick);
        }
        
        this.svgElement.appendChild(ticksGroup);
    }
    
    /**
     * Crear etiquetas (solo en modo normal)
     * @private
     */
    _createLabels() {
        if (this.config.compact) return; // No crear etiquetas en modo compacto
        
        const centerX = this.config.size / 2;
        const centerY = this.config.size / 2;
        const labelRadius = (this.config.size / 2) - 35;
        
        const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        labelsGroup.setAttribute('class', 'gauge-labels');
        
        const labels = [
            { text: `${this.config.minValue}A`, angle: -180 },
            { text: '0A', angle: -90 },
            { text: `${this.config.maxValue}A`, angle: 0 }
        ];
        
        labels.forEach(label => {
            const angleRad = (label.angle * Math.PI) / 180;
            const x = centerX + labelRadius * Math.cos(angleRad);
            const y = centerY + labelRadius * Math.sin(angleRad) + 5; // +5 para centrar verticalmente
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('class', 'gauge-label');
            text.setAttribute('x', x);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#cccccc');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.textContent = label.text;
            
            labelsGroup.appendChild(text);
        });
        
        this.svgElement.appendChild(labelsGroup);
    }
    
    /**
     * Crea el display del valor central (solo en modo normal)
     * @private
     */
    _createValueDisplay() {
        if (this.config.compact) return; // No crear display en modo compacto
        
        const valueSection = this.container.querySelector('.gauge-value-section');
        
        valueSection.innerHTML = `
            <div class="gauge-value">
                <span class="current-value" id="current-value-${Date.now()}">0.0A</span>
                <span class="gauge-subtitle">Corriente Total</span>
            </div>
        `;
        
        this.valueDisplay = valueSection.querySelector('.current-value');
    }
    
    /**
     * Actualiza el valor del gauge con animación
     * @param {number} current - Nuevo valor de corriente
     */
    updateValue(current) {
        if (!this.isInitialized) {
            console.warn('CurrentGauge: Gauge no inicializado, ignorando actualización');
            return;
        }
        
        // Validar y limitar valor
        const clampedValue = Math.max(this.config.minValue, 
                                    Math.min(this.config.maxValue, current));
        
        // Verificar si se excedió el rango
        if (current !== clampedValue && this.config.onRangeExceeded) {
            this.config.onRangeExceeded(current, clampedValue);
        }
        
        // Guardar valor actual
        this.currentValue = clampedValue;
        
        // Calcular ángulo de la aguja
        const angle = this._calculateAngle(clampedValue);
        
        // Animar aguja
        this._animateNeedle(angle);
        
        // Actualizar display de valor (solo en modo normal)
        if (!this.config.compact) {
            this._updateValueDisplay(clampedValue);
            this._updateStateColors(clampedValue);
        }
        
        // Callback de actualización
        if (this.config.onUpdate) {
            this.config.onUpdate(clampedValue);
        }
    }
    
    /**
     * Calcula el ángulo de la aguja basado en el valor
     * @private
     */
    _calculateAngle(value) {
        const normalizedValue = (value - this.config.minValue) / (this.config.maxValue - this.config.minValue);
        return -90 + (normalizedValue * 180); // -180° a 0°
    }
    
    /**
     * Anima la aguja a una nueva posición
     * @private
     */
    _animateNeedle(angle) {
        if (!this.needle) return;
        
        this.needle.style.transition = `transform ${this.config.animationDuration}ms ${this.config.animationEasing}`;
        this.needle.style.transform = `rotate(${angle}deg)`;
    }
    
    /**
     * Actualiza el display del valor (solo modo normal)
     * @private
     */
    _updateValueDisplay(value) {
        if (!this.valueDisplay || this.config.compact) return;
        
        const sign = value >= 0 ? '+' : '';
        this.valueDisplay.textContent = `${sign}${value.toFixed(1)}A`;
    }
    
    /**
     * Actualiza los colores según el estado (solo modo normal)
     * @private
     */
    _updateStateColors(value) {
        if (!this.valueDisplay || this.config.compact) return;
        
        // Remover clases de estado previas
        this.valueDisplay.classList.remove('charging', 'discharging', 'neutral');
        
        // Añadir clase según valor
        if (value > this.config.neutralZone) {
            this.valueDisplay.classList.add('charging');
        } else if (value < -this.config.neutralZone) {
            this.valueDisplay.classList.add('discharging');
        } else {
            this.valueDisplay.classList.add('neutral');
        }
    }
    
    /**
     * NUEVO: Destruye el gauge y limpia recursos
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.container = null;
        this.svgElement = null;
        this.needle = null;
        this.valueDisplay = null;
        this.isInitialized = false;
        
        console.log('CurrentGauge: Recursos liberados');
    }
    
    /**
     * Obtiene el estado actual del gauge
     * @returns {Object} Estado actual
     */
    getState() {
        return {
            currentValue: this.currentValue,
            isInitialized: this.isInitialized,
            isCompact: this.config.compact,
            config: { ...this.config }
        };
    }
}

// Exportar para uso global
window.CurrentGauge = CurrentGauge;

// Log de carga del módulo
console.log('CurrentGauge: Módulo cargado correctamente con soporte compacto');