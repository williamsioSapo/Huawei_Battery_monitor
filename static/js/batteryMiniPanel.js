// static/js/batteryMiniPanel.js
'use strict';

/**
 * Componente para mostrar un mini panel de información de batería
 * Extrae la funcionalidad del panel individual de batería del dashboard múltiple
 */
const BatteryMiniPanel = (props) => {
    const batteryData = props.batteryData;
    const onClick = props.onClick || function() {};
    // La clase de estado puede ser pasada o derivada
    const statusClassFromProps = props.statusClass;

    if (!batteryData) return null;

    let customName = `Batería ${batteryData.id}`;
    if (batteryData.device_info && batteryData.device_info.custom_name) {
        customName = batteryData.device_info.custom_name;
    }

    const statusInfo = Utils.formatBatteryStatus(batteryData.status, true);
    const displayStatusText = statusInfo.text;
    // Priorizar la clase pasada por props si existe, sino usar la derivada de Utils
    const finalStatusClass = statusClassFromProps || statusInfo.class || 'normal';

    return (
        <div
            className={`battery-mini-panel ${finalStatusClass}`}
            onClick={onClick}
        >
            <div className="mini-panel-header">
                <span className="battery-id">{customName}</span>
                <span className={`battery-status ${finalStatusClass}`}>{displayStatusText}</span>
            </div>
            <div className="mini-panel-body">
                <div className="mini-metric">
                    <span className="mini-label">SOC:</span>
                    <span className="mini-value">
                        {Utils.formatValueWithUnit(batteryData.soc, '%', 0)}
                    </span>
                </div>
                <div className="mini-metric">
                    <span className="mini-label">Volt:</span>
                    <span className="mini-value">
                        {Utils.formatValueWithUnit(batteryData.voltage, 'V', 2)}
                    </span>
                </div>
                <div className="mini-metric">
                    <span className="mini-label">Corriente:</span>
                    <span className="mini-value">
                        {Utils.formatValueWithUnit(batteryData.current, 'A', 2)}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Exportar el componente para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatteryMiniPanel;
} else {
    window.BatteryMiniPanel = BatteryMiniPanel;
}