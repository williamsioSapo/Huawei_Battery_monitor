/**
 * svgIcons.js - Generador de SVG Personalizados
 * Crea iconos vectoriales bonitos para la vista moderna de baterías
 */

const SVGIcons = (function() {
    'use strict';
    
    // Referencias para actualización dinámica
    let batteryElement = null;
    let powerFlowElements = {
        solarPanel: null,
        battery: null,
        building: null,
        arrows: []
    };
    
    /**
     * Crea un SVG de batería con indicador de carga animado
     * @param {number} socLevel - Nivel de carga (0-100)
     * @param {number} width - Ancho del SVG (opcional)
     * @param {number} height - Alto del SVG (opcional)
     * @returns {string} - SVG HTML string
     */
	 
	function createBatterySVG(socLevel = 50, width = 80, height = 160) {
        const bodyY = 15;
        const bodyHeight = 130;
        const bodyPadding = 6; // Espacio entre el contorno y el interior
        const innerY = bodyY + bodyPadding;
        const innerHeight = bodyHeight - (bodyPadding * 2);
        const innerWidth = 55; // 67 - (6 * 2) del padding
        const innerX = 12.5; // 6.5 + 6 del padding
        
        // Calcular alturas para cada sección
        const chargeHeight = (socLevel / 100) * innerHeight;
        const emptyHeight = innerHeight - chargeHeight;
        
        // Posiciones Y
        const emptyY = innerY;
        const chargeY = innerY + emptyHeight;
        
        return `
            <svg width="${width}" height="${height}" viewBox="0 0 80 160" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <!-- Gradiente para el contorno del cuerpo -->
                    <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#666666"/>
                        <stop offset="50%" style="stop-color:#999999"/>
                        <stop offset="100%" style="stop-color:#CCCCCC"/>
                    </linearGradient>
                    
                    <!-- Gradiente para el terminal superior -->
                    <linearGradient id="terminalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#888888"/>
                        <stop offset="100%" style="stop-color:#DDDDDD"/>
                    </linearGradient>
                    
                    <!-- Gradiente para la parte vacía (gris claro) -->
                    <linearGradient id="emptyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#f0f0f0"/>
                        <stop offset="100%" style="stop-color:#e0e0e0"/>
                    </linearGradient>
                    
                    <!-- Gradiente para la carga (verde dinámico según nivel) -->
                    <linearGradient id="chargeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        ${getBatteryGradientStops(socLevel)}
                    </linearGradient>
                </defs>
                
                <!-- Contorno del cuerpo (mantenemos igual) -->
                <rect x="6.5" y="15" width="67" height="130" rx="10" ry="10" 
                    fill="none" stroke="url(#strokeGradient)" stroke-width="6"/>
                
                <!-- Terminal superior (mantenemos igual) -->
                <rect x="30" y="0" width="20" height="15" rx="4" ry="4" 
                    fill="url(#terminalGradient)"/>
                
                <!-- INTERIOR REDISEÑADO -->
                
                <!-- Parte vacía (superior) - solo si hay espacio -->
                ${emptyHeight > 0 ? `
                    <rect x="${innerX}" y="${emptyY}" width="${innerWidth}" height="${emptyHeight}" 
                        rx="4" ry="4" fill="url(#emptyGradient)" class="battery-empty">
                        <!-- Animación sutil de respiración -->
                        <animate attributeName="opacity" 
                                values="0.7;0.9;0.7" 
                                dur="4s" 
                                repeatCount="indefinite"/>
                    </rect>
                ` : ''}
                
                <!-- Parte cargada (inferior) - solo si hay carga -->
                ${chargeHeight > 0 ? `
                    <rect x="${innerX}" y="${chargeY}" width="${innerWidth}" height="${chargeHeight}" 
                        rx="4" ry="4" fill="url(#chargeGradient)" class="battery-charge">
                        <!-- Animación de respiración en la carga -->
                        <animate attributeName="opacity" 
                                values="0.9;1;0.9" 
                                dur="3s" 
                                repeatCount="indefinite"/>
                        
                        <!-- Animación sutil de altura -->
                        <animate attributeName="height" 
                                values="${chargeHeight};${chargeHeight + 1};${chargeHeight}" 
                                dur="2s" 
                                repeatCount="indefinite"/>
                    </rect>
                    
                    <!-- Efecto de brillo en la zona cargada -->
                    <rect x="${innerX + 3}" y="${chargeY + 3}" width="3" height="${Math.max(0, chargeHeight - 6)}" 
                        rx="1.5" ry="1.5" fill="rgba(255,255,255,0.4)" class="battery-shine">
                        <animate attributeName="opacity" 
                                values="0.2;0.6;0.2" 
                                dur="3.5s" 
                                repeatCount="indefinite"/>
                    </rect>
                ` : ''}
                
                <!-- Separador visual sutil entre las dos zonas (solo si hay ambas) -->
                ${emptyHeight > 0 && chargeHeight > 0 ? `
                    <line x1="${innerX}" y1="${chargeY}" x2="${innerX + innerWidth}" y2="${chargeY}" 
                        stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>
                ` : ''}
            </svg>
        `;
    }

    /**
     * Genera gradiente de relleno según el nivel de carga
     */
    function getBatteryGradientStops(socLevel) {
        if (socLevel >= 80) {
            // Verde brillante para carga alta (80-100%)
            return `
                <stop offset="0%" style="stop-color:#22c55e"/>
                <stop offset="50%" style="stop-color:#16a34a"/>
                <stop offset="100%" style="stop-color:#15803d"/>
            `;
        } else if (socLevel >= 60) {
            // Verde-amarillo para carga media-alta (60-79%)
            return `
                <stop offset="0%" style="stop-color:#65a30d"/>
                <stop offset="50%" style="stop-color:#84cc16"/>
                <stop offset="100%" style="stop-color:#22c55e"/>
            `;
        } else if (socLevel >= 40) {
            // Amarillo para carga media (40-59%)
            return `
                <stop offset="0%" style="stop-color:#eab308"/>
                <stop offset="50%" style="stop-color:#facc15"/>
                <stop offset="100%" style="stop-color:#65a30d"/>
            `;
        } else if (socLevel >= 20) {
            // Naranja para carga baja (20-39%)
            return `
                <stop offset="0%" style="stop-color:#ea580c"/>
                <stop offset="50%" style="stop-color:#f97316"/>
                <stop offset="100%" style="stop-color:#eab308"/>
            `;
        } else {
            // Rojo para carga crítica (0-19%)
            return `
                <stop offset="0%" style="stop-color:#dc2626"/>
                <stop offset="50%" style="stop-color:#ef4444"/>
                <stop offset="100%" style="stop-color:#ea580c"/>
            `;
        }
    }
    //-------------------------------------------------------------------------------------------------------------
       
    /**
     * Genera marcadores de nivel en la batería
     */
    function generateLevelMarkers() {
        let markers = '';
        for (let i = 1; i <= 4; i++) {
            const y = 55 + (i * 36); // Cada 25% de altura
            markers += `
                <line x1="45" y1="${y}" x2="155" y2="${y}" 
                      stroke="rgba(108, 117, 125, 0.3)" 
                      stroke-width="1" 
                      stroke-dasharray="2,2"/>
            `;
        }
        return markers;
    }
    
    /**
     * Genera indicadores de estado visuales
     */
    function generateStatusIndicators(socLevel) {
        const color = socLevel >= 80 ? '#27ae60' : 
                     socLevel >= 50 ? '#f39c12' : 
                     socLevel >= 20 ? '#e67e22' : '#e74c3c';
        
        return `
            <!-- Indicador LED izquierdo -->
            <circle cx="30" cy="145" r="4" fill="${color}" opacity="0.8">
                <animate attributeName="opacity" 
                         values="0.4;1;0.4" 
                         dur="2s" 
                         repeatCount="indefinite"/>
            </circle>
            
            <!-- Indicador LED derecho -->
            <circle cx="170" cy="145" r="4" fill="${color}" opacity="0.8">
                <animate attributeName="opacity" 
                         values="1;0.4;1" 
                         dur="2s" 
                         repeatCount="indefinite"/>
            </circle>
        `;
    }
    
      
    
    /**
     * Actualiza el SVG de la batería con un nuevo nivel de carga
     * @param {number} newSocLevel - Nuevo nivel de SOC
     */
	function updateBatterySVG(newSocLevel) {
        console.log('Actualizando batería SVG a:', newSocLevel + '%');
        
        // Buscar los elementos existentes
        const batteryEmptyElement = document.querySelector('.battery-empty');
        const batteryChargeElement = document.querySelector('.battery-charge');
        const batteryShineElement = document.querySelector('.battery-shine');
        const chargeGradientElement = document.querySelector('#chargeGradient');
        
        if (!batteryEmptyElement && !batteryChargeElement) {
            console.error('No se encontraron elementos de batería para actualizar');
            return;
        }
        
        // Usar las mismas dimensiones que createBatterySVG()
        const bodyY = 15;
        const bodyHeight = 130;
        const bodyPadding = 6;
        const innerY = bodyY + bodyPadding;
        const innerHeight = bodyHeight - (bodyPadding * 2);
        const innerWidth = 55;
        const innerX = 12.5;
        
        // Calcular nuevas alturas
        const chargeHeight = (newSocLevel / 100) * innerHeight;
        const emptyHeight = innerHeight - chargeHeight;
        
        // Calcular posiciones Y
        const emptyY = innerY;
        const chargeY = innerY + emptyHeight;
        
        // Actualizar zona vacía
        if (batteryEmptyElement) {
            if (emptyHeight > 0) {
                batteryEmptyElement.setAttribute('y', emptyY);
                batteryEmptyElement.setAttribute('height', emptyHeight);
                batteryEmptyElement.style.display = 'block';
            } else {
                batteryEmptyElement.style.display = 'none';
            }
        }
        
        // Actualizar zona cargada
        if (batteryChargeElement) {
            if (chargeHeight > 0) {
                batteryChargeElement.setAttribute('y', chargeY);
                batteryChargeElement.setAttribute('height', chargeHeight);
                batteryChargeElement.style.display = 'block';
                
                // Recrear animaciones para el nuevo tamaño
                const existingAnimations = batteryChargeElement.querySelectorAll('animate');
                existingAnimations.forEach(anim => anim.remove());
                
                // Animación de opacidad (respiración)
                const opacityAnim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
                opacityAnim.setAttribute('attributeName', 'opacity');
                opacityAnim.setAttribute('values', '0.9;1;0.9');
                opacityAnim.setAttribute('dur', '3s');
                opacityAnim.setAttribute('repeatCount', 'indefinite');
                batteryChargeElement.appendChild(opacityAnim);
                
                // Animación de altura (solo si hay suficiente altura)
                if (chargeHeight > 5) {
                    const heightAnim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
                    heightAnim.setAttribute('attributeName', 'height');
                    heightAnim.setAttribute('values', `${chargeHeight};${chargeHeight + 1};${chargeHeight}`);
                    heightAnim.setAttribute('dur', '2s');
                    heightAnim.setAttribute('repeatCount', 'indefinite');
                    batteryChargeElement.appendChild(heightAnim);
                }
            } else {
                batteryChargeElement.style.display = 'none';
            }
        }
        
        // Actualizar brillo
        if (batteryShineElement) {
            if (chargeHeight > 6) {
                const shineHeight = Math.max(0, chargeHeight - 6);
                batteryShineElement.setAttribute('y', chargeY + 3);
                batteryShineElement.setAttribute('height', shineHeight);
                batteryShineElement.style.display = 'block';
            } else {
                batteryShineElement.style.display = 'none';
            }
        }
        
        // Actualizar gradiente de color
        if (chargeGradientElement) {
            chargeGradientElement.innerHTML = getBatteryGradientStops(newSocLevel);
        }
        
        console.log('✅ Batería actualizada:', {
            socLevel: newSocLevel + '%',
            chargeHeight: chargeHeight.toFixed(1),
            emptyHeight: emptyHeight.toFixed(1)
        });
    }

    
    /**
     * Crea SVG para medidores circulares (como los de la imagen original)
     * @param {number} value - Valor actual
     * @param {number} max - Valor máximo
     * @param {string} label - Etiqueta del medidor
     * @param {string} color - Color del medidor
     * @returns {string} - SVG HTML string
     */
    function createCircularMeter(value, max, label, color = '#3498db', size = 120) {
        const radius = 45;
        const circumference = 2 * Math.PI * radius;
        const percentage = (value / max) * 100;
        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
        
        return `
            <svg width="${size}" height="${size}" viewBox="0 0 120 120" class="circular-meter">
                <defs>
                    <linearGradient id="meterGradient-${label}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${adjustBrightness(color, -20)};stop-opacity:1" />
                    </linearGradient>
                </defs>
                
                <!-- Círculo de fondo -->
                <circle cx="60" cy="60" r="${radius}" 
                        fill="none" 
                        stroke="rgba(255,255,255,0.1)" 
                        stroke-width="8"/>
                
                <!-- Círculo de progreso -->
                <circle cx="60" cy="60" r="${radius}" 
                        fill="none" 
                        stroke="url(#meterGradient-${label})" 
                        stroke-width="8"
                        stroke-linecap="round"
                        transform="rotate(-90 60 60)"
                        stroke-dasharray="${strokeDasharray}"
                        opacity="0.9">
                    <animate attributeName="stroke-dasharray" 
                             values="${strokeDasharray};${(percentage / 100) * circumference + 5} ${circumference};${strokeDasharray}" 
                             dur="2s" 
                             repeatCount="indefinite"/>
                </circle>
                
                <!-- Valor central -->
                <text x="60" y="65" text-anchor="middle" font-size="18" fill="#ffffff" font-weight="bold">
                    ${value}
                </text>
                
                <!-- Etiqueta -->
                <text x="60" y="85" text-anchor="middle" font-size="10" fill="#cccccc">
                    ${label}
                </text>
            </svg>
        `;
    }
    
    /**
     * Ajusta el brillo de un color hexadecimal
     * @param {string} color - Color en formato hex
     * @param {number} amount - Cantidad a ajustar (-100 a 100)
     * @returns {string} - Color ajustado
     */
    function adjustBrightness(color, amount) {
        const usePound = color[0] === '#';
        const col = usePound ? color.slice(1) : color;
        const num = parseInt(col, 16);
        
        let r = (num >> 16) + amount;
        let g = ((num >> 8) & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;
        
        r = r > 255 ? 255 : r < 0 ? 0 : r;
        g = g > 255 ? 255 : g < 0 ? 0 : g;
        b = b > 255 ? 255 : b < 0 ? 0 : b;
        
        return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
    }
    
    // API pública
    return {
        createBatterySVG: createBatterySVG,
        createCircularMeter: createCircularMeter,
        updateBatterySVG: updateBatterySVG,
        adjustBrightness: adjustBrightness,
		getBatteryGradientStops: getBatteryGradientStops
    };
})();

// Exportar para uso global
window.SVGIcons = SVGIcons;