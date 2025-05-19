// static/js/batteryMiniPanel.js
'use strict';

/**
 * Implementación jQuery para BatteryMiniPanel
 * Reemplazo del componente React original
 */
(function($) {
    // Si jQuery no está disponible, mostrar advertencia
    if (typeof $ !== 'function') {
        console.error("jQuery no está disponible. El componente BatteryMiniPanel no funcionará correctamente.");
        return;
    }

    console.log("Inicializando BatteryMiniPanel con jQuery");

    /**
     * Crea un nuevo panel de información de batería
     * @param {string|HTMLElement} container - Selector o elemento donde añadir el panel
     * @param {object} batteryData - Datos de la batería
     * @param {string} [statusClass] - Clase CSS para el estado (opcional)
     * @param {function} [onClick] - Función a llamar cuando se haga clic en el panel
     * @return {jQuery} - El elemento jQuery creado
     */
    function createBatteryPanel(container, batteryData, statusClass, onClick) {
        if (!batteryData) {
            console.warn("BatteryMiniPanel: No se proporcionaron datos de batería");
            return null;
        }

        // Obtener nombre personalizado
        let customName = `Batería ${batteryData.id}`;
        if (batteryData.device_info && batteryData.device_info.custom_name) {
            customName = batteryData.device_info.custom_name;
        }

        // Determinar clase de estado
        const statusInfo = Utils.formatBatteryStatus(batteryData.status, true);
        const displayStatusText = statusInfo.text;
        const finalStatusClass = statusClass || statusInfo.class || 'normal';

        // Crear estructura HTML
        const $panel = $('<div>')
            .addClass(`battery-mini-panel ${finalStatusClass}`)
            .attr('data-battery-id', batteryData.id);

        const $header = $('<div>').addClass('mini-panel-header');
        const $batteryId = $('<span>').addClass('battery-id').text(customName);
        const $batteryStatus = $('<span>')
            .addClass(`battery-status ${finalStatusClass}`)
            .text(displayStatusText);

        $header.append($batteryId).append($batteryStatus);

        const $body = $('<div>').addClass('mini-panel-body');

        // Métricas
        const $socMetric = createMetric('SOC:', Utils.formatValueWithUnit(batteryData.soc, '%', 0));
        const $voltMetric = createMetric('Volt:', Utils.formatValueWithUnit(batteryData.voltage, 'V', 2));
        const $currentMetric = createMetric('Corriente:', Utils.formatValueWithUnit(batteryData.current, 'A', 2));

        $body.append($socMetric).append($voltMetric).append($currentMetric);
        $panel.append($header).append($body);

        // Añadir al contenedor si se proporcionó
        if (container) {
            $(container).append($panel);
        }

        // Añadir manejador de evento si se proporcionó
        if (typeof onClick === 'function') {
            $panel.on('click', function() {
                onClick(batteryData.id);
            });
        }

        return $panel;
    }

    // Función auxiliar para crear una métrica
    function createMetric(label, value) {
        const $metric = $('<div>').addClass('mini-metric');
        const $label = $('<span>').addClass('mini-label').text(label);
        const $value = $('<span>').addClass('mini-value').text(value);
        return $metric.append($label).append($value);
    }

    // Exportar función globalmente
    window.createBatteryPanel = createBatteryPanel;

})(jQuery);