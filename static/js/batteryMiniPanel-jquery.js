// static/js/batteryMiniPanel-jquery.js
'use strict';

/**
 * Implementación jQuery para BatteryMiniPanel - VISTA MODERNA COMPACTA
 * Genera paneles con badges flotantes y diseño optimizado
 */
(function($) {
    // Si jQuery no está disponible, mostrar advertencia
    if (typeof $ !== 'function') {
        console.error("jQuery no está disponible. El componente BatteryMiniPanel no funcionará correctamente.");
        return;
    }

    console.log("Inicializando BatteryMiniPanel con Vista Moderna Compacta");

    /**
     * ========================================================================
     * FUNCIÓN PRINCIPAL - VISTA MODERNA COMPACTA
     * ========================================================================
     */
    
    /**
     * Crea un nuevo panel de información de batería con diseño moderno compacto
     * @param {string|HTMLElement} container - Selector o elemento donde añadir el panel
     * @param {object} batteryData - Datos de la batería
     * @param {string} [statusClass] - Clase CSS para el estado (opcional)
     * @param {function} [onClick] - Función a llamar cuando se haga clic en el panel
     * @return {jQuery} - El elemento jQuery creado
     */
    function createBatteryPanel(container, batteryData, statusClass, onClick) {
        // Usar vista moderna compacta
        return createModernBatteryPanel(container, batteryData, statusClass, onClick);
    }

    /**
     * ========================================================================
     * VISTA MODERNA COMPACTA - CON BADGES FLOTANTES
     * ========================================================================
     */
    
    /**
     * Crea panel con diseño moderno compacto y badges flotantes
     * @param {string|HTMLElement} container - Contenedor donde insertar
     * @param {object} batteryData - Datos de la batería
     * @param {string} [statusClass] - Clase CSS para el estado
     * @param {function} [onClick] - Callback al hacer clic
     * @return {jQuery} - Panel creado
     */
    function createModernBatteryPanel(container, batteryData, statusClass, onClick) {
        if (!batteryData) {
            console.warn("BatteryMiniPanel: No se proporcionaron datos de batería");
            return null;
        }

        // Obtener nombre personalizado
       let customName = batteryData.id.toString(); 

        // Determinar clase de estado
        const statusInfo = Utils.formatBatteryStatus(batteryData.status, true);
        const displayStatusText = statusInfo.text;
        const finalStatusClass = statusClass || statusInfo.class || 'normal';

        // ====================================================================
        // CONTENEDOR PRINCIPAL CON POSICIÓN RELATIVA PARA BADGES
        // ====================================================================
        const $panel = $('<div>')
            .addClass(`battery-panel-container ${finalStatusClass}`)
            .attr('data-battery-id', batteryData.id)
            .css('position', 'relative'); // Para badges absolutos

        // ====================================================================
        // BADGES FLOTANTES (Estado y SOH en esquinas superiores)
        // ====================================================================
        const $infoBadges = $('<div>').addClass('info-badges');
        
        // Badge de Estado (esquina superior izquierda)
        const $statusBadge = $('<div>')
            .addClass(`badge status-badge ${finalStatusClass}`)
            .text(`⚡ ${displayStatusText}`);
        
        // Badge de SOH (esquina superior derecha)  
        const $sohBadge = $('<div>')
            .addClass('badge soh-badge')
            .text(`SOH: ${batteryData.soh || 'N/A'}%`);

        $infoBadges.append($statusBadge).append($sohBadge);

        // ====================================================================
        // SECCIÓN DE ESTADO DE CARGA - IGUAL QUE VISTA MODERNA
        // ====================================================================
        const $chargeSection = $('<div>').addClass('charge-state-section');
        
        // Contenedor de Voltaje (Izquierda)
        const $voltageContainer = $('<div>').addClass('voltage-container');
        const $voltageRing = $('<div>').addClass('metric-ring voltage-ring');
        const $voltageContent = $('<div>').addClass('ring-content');
        
        const $voltageValue = $('<span>')
            .addClass('ring-value')
            .attr('id', `voltage-ring-value-${batteryData.id}`)
            .text(`${Utils.formatValueWithUnit(batteryData.voltage, 'V', 1)}`);
        const $voltageLabel = $('<span>').addClass('ring-label').text('VOLTAJE');
        
        $voltageContent.append($voltageValue).append($voltageLabel);
        $voltageRing.append($voltageContent);
        $voltageContainer.append($voltageRing);

        // Contenedor Central (Número + Batería + SOC)
        const $batteryCentralContainer = $('<div>').addClass('battery-central-container');
        
        // Número de batería (en la parte superior)
        const $batteryNumber = $('<div>').addClass('battery-number').text(customName);
        
        // SVG de batería
        const $batteryVisual = $('<div>')
            .addClass('battery-visual-compact')
            .attr('id', `battery-visual-compact-${batteryData.id}`);
            
        if (typeof window.SVGIcons !== 'undefined' && window.SVGIcons.createBatterySVG) {
            $batteryVisual.html(window.SVGIcons.createBatterySVG(batteryData.soc, 60, 120));
        } else {
            // Fallback si SVGIcons no está disponible
            $batteryVisual.html(`
                <div class="battery-fallback" style="
                    width: 60px; height: 120px; border: 2px solid #333; 
                    display: flex; align-items: center; justify-content: center;
                    background: linear-gradient(to top, #2ecc71 ${batteryData.soc}%, #ecf0f1 ${batteryData.soc}%);
                ">
                    ${batteryData.soc}%
                </div>
            `);
        }

        // SOC Display
        const $socDisplay = $('<div>').addClass('soc-display-compact');
        const $socValue = $('<span>')
            .addClass('soc-value-compact')
            .attr('id', `soc-value-compact-${batteryData.id}`)
            .text(`${batteryData.soc}%`);
        const $socLabel = $('<span>').addClass('soc-label-compact').text('STATE OF CHARGE');
        
        $socDisplay.append($socValue).append($socLabel);
        $batteryCentralContainer.append($batteryNumber).append($batteryVisual).append($socDisplay);

        // Contenedor de Corriente (Derecha)
        const $currentContainer = $('<div>').addClass('current-container');
        const $currentRing = $('<div>').addClass('metric-ring current-ring');
        const $currentContent = $('<div>').addClass('ring-content');
        
        const $currentValue = $('<span>')
            .addClass('ring-value')
            .attr('id', `current-ring-value-${batteryData.id}`)
            .text(`${Utils.formatValueWithUnit(batteryData.current, 'A', 1)}`);
        const $currentLabel = $('<span>').addClass('ring-label').text('CORRIENTE');
        
        $currentContent.append($currentValue).append($currentLabel);
        $currentRing.append($currentContent);
        $currentContainer.append($currentRing);

        // Ensamblar sección de carga completa
        $chargeSection.append($voltageContainer)
                     .append($batteryCentralContainer)
                     .append($currentContainer);

        // ====================================================================
        // BOTONES DE ACCIÓN (Parte inferior)
        // ====================================================================
        const $controls = $('<div>').addClass('panel-controls');
        
        const $detailBtn = $('<button>')
            .addClass('panel-btn detail-btn')
            .html('<span class="btn-icon">📊</span> Detalles')
            .attr('title', 'Ver información detallada');

        const $modernBtn = $('<button>')
            .addClass('panel-btn modern-btn')
            .html('<span class="btn-icon">🎛️</span> Vista Comp')
            .attr('title', 'Abrir vista moderna completa');

        $controls.append($detailBtn).append($modernBtn);

        // ====================================================================
        // ENSAMBLAR PANEL COMPLETO
        // ====================================================================
        $panel.append($infoBadges)      // Badges flotantes arriba
              .append($chargeSection)   // Contenido principal
              .append($controls);       // Botones abajo

        // ====================================================================
        // EVENT HANDLERS
        // ====================================================================
        
        // Click en botón detalles (comportamiento original)
        if (typeof onClick === 'function') {
            $detailBtn.on('click', function(e) {
                e.stopPropagation();
                onClick(batteryData.id);
            });
        }

        // Click en botón vista moderna completa
        $modernBtn.on('click', function(e) {
            e.stopPropagation();
            if (typeof window.BatteryModernView !== 'undefined') {
                window.BatteryModernView.openModernView(batteryData.id);
            } else {
                console.warn("BatteryModernView no está disponible");
            }
        });

        // Hover ya no es necesario porque los badges muestran los valores directamente
        // Los badges son informativos, no interactivos para mostrar más detalles

        // Click en todo el panel (fallback para detalles)
        $panel.on('click', function(e) {
            // Solo si no se clickeó en un botón o badge
            if (!$(e.target).closest('.panel-btn, .badge').length) {
                if (typeof onClick === 'function') {
                    onClick(batteryData.id);
                }
            }
        });

        // ====================================================================
        // INSERTAR EN CONTENEDOR
        // ====================================================================
        if (container) {
            $(container).append($panel);
        }

        return $panel;
    }

    /**
     * ========================================================================
     * FUNCIONES DE ACTUALIZACIÓN
     * ========================================================================
     */

    /**
     * Actualiza un panel existente con nuevos datos
     * @param {jQuery} $panel - Panel a actualizar
     * @param {object} newBatteryData - Nuevos datos
     */
    function updateModernPanel($panel, newBatteryData) {
        if (!$panel || !newBatteryData) return;

        const batteryId = newBatteryData.id;

        // Actualizar SOC
        $panel.find(`#soc-value-compact-${batteryId}`).text(`${newBatteryData.soc}%`);
        
        // Actualizar voltaje
        $panel.find(`#voltage-ring-value-${batteryId}`)
              .text(Utils.formatValueWithUnit(newBatteryData.voltage, 'V', 1));
        
        // Actualizar corriente
        $panel.find(`#current-ring-value-${batteryId}`)
              .text(Utils.formatValueWithUnit(newBatteryData.current, 'A', 1));

        // Actualizar SVG de batería si es posible
        if (typeof window.SVGIcons !== 'undefined' && window.SVGIcons.createBatterySVG) {
            $panel.find(`#battery-visual-compact-${batteryId}`)
                  .html(window.SVGIcons.createBatterySVG(newBatteryData.soc, 60, 120));
        }

        // Actualizar clases de estado en panel y badges
        const statusInfo = Utils.formatBatteryStatus(newBatteryData.status, true);
        $panel.removeClass('normal charging discharging critical warning error')
              .addClass(statusInfo.class);
        
        // Actualizar badge de estado
        const newStatusInfo = Utils.formatBatteryStatus(newBatteryData.status, true);
        $panel.find('.status-badge')
              .removeClass('normal charging discharging critical warning error')
              .addClass(newStatusInfo.class)
              .text(`⚡ ${newStatusInfo.text}`);

        // Actualizar badge de SOH
        $panel.find('.soh-badge')
              .text(`SOH: ${newBatteryData.soh || 'N/A'}%`);
    }

    /**
     * ========================================================================
     * ESTILOS CSS INLINE PARA BADGES (Si no están en CSS externo)
     * ========================================================================
     */
    
    // Agregar estilos CSS si no existen
    if (!document.getElementById('battery-panel-styles')) {
        const styles = `
            <style id="battery-panel-styles">
                .info-badges {
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    right: 8px;
                    display: flex;
                    justify-content: space-between;
                    z-index: 10;
                    pointer-events: none;
                }
                
                .badge {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: bold;
                    color: white;
                    background-color: #e74c3c;
                    cursor: pointer;
                    pointer-events: auto;
                    transition: all 0.3s ease;
                    min-width: 40px;
                    text-align: center;
                }
                
                .badge:hover {
                    transform: scale(1.05);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                }
                
                .status-badge.charging { background-color: #27ae60; }
                .status-badge.discharging { background-color: #f39c12; }
                .status-badge.critical { background-color: #e74c3c; }
                .status-badge.warning { background-color: #e67e22; }
                .status-badge.normal { background-color: #3498db; }
                
                .soh-badge {
                    background-color: #9b59b6;
                }
                
                .panel-controls {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                    margin-top: 15px;
                    padding: 10px;
                }
                
                .panel-btn {
                    padding: 6px 12px;
                    font-size: 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    background-color: #34495e;
                    color: white;
                    transition: background-color 0.3s ease;
                }
                
                .panel-btn:hover {
                    background-color: #2c3e50;
                }
                
                .battery-number {
                    text-align: center;
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 8px;
                    color: #2c3e50;
                }
            </style>
        `;
        $('head').append(styles);
    }

    /**
     * ========================================================================
     * EXPORTACIÓN GLOBAL
     * ========================================================================
     */

    // Exportar función principal globalmente (compatibilidad)
    window.createBatteryPanel = createBatteryPanel;
    
    // Exportar funciones adicionales para uso avanzado
    window.createModernBatteryPanel = createModernBatteryPanel;
    window.updateModernPanel = updateModernPanel;

    console.log("BatteryMiniPanel con Vista Moderna Compacta inicializado correctamente");

})(jQuery);