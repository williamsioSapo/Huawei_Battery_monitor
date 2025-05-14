// static/js/batteryMiniPanel.js
'use strict';

/**
 * Componente para mostrar un mini panel de información de batería
 * Extrae la funcionalidad del panel individual de batería del dashboard múltiple
 */
const BatteryMiniPanel = (props) => {
    // Extraer propiedades
    const batteryData = props.batteryData;
    const onClick = props.onClick || function() {};
    const statusClass = props.statusClass || 'normal';
    
    if (!batteryData) return null;
    
    // Obtener el nombre de la batería de manera segura
    let customName = `Batería ${batteryData.id}`;
    if (batteryData.device_info && batteryData.device_info.custom_name) {
        customName = batteryData.device_info.custom_name;
    }
    
    return (
        <div 
            className={`battery-mini-panel ${statusClass}`}
            onClick={onClick}
        >
            <div className="mini-panel-header">
                <span className="battery-id">{customName}</span>
                <span className={`battery-status ${statusClass}`}>{batteryData.status || 'N/A'}</span>
            </div>
            <div className="mini-panel-body">
                <div className="mini-metric">
                    <span className="mini-label">SOC:</span>
                    <span className="mini-value">{batteryData.soc !== undefined ? batteryData.soc : 'N/A'}%</span>
                </div>
                <div className="mini-metric">
                    <span className="mini-label">Volt:</span>
                    <span className="mini-value">
                        {batteryData.voltage !== undefined ? batteryData.voltage.toFixed(2) : 'N/A'}V
                    </span>
                </div>
                <div className="mini-metric">
                    <span className="mini-label">Corriente:</span>
                    <span className="mini-value">
                        {batteryData.current !== undefined ? batteryData.current.toFixed(2) : 'N/A'}A
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
    // Para uso en navegador
    window.BatteryMiniPanel = BatteryMiniPanel;
}