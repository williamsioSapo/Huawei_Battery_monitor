// static/js/batteryDetailView.js
'use strict';

/**
 * Componente para mostrar la vista detallada de una batería.
 * Recibe los datos de la batería y maneja la visualización detallada.
 */
const BatteryDetailView = (props) => {
    // Datos de entrada vía props
    const batteryData = props.batteryData;
    const detailedInfo = props.detailedInfo; // Nueva prop para info detallada
    const loadingDetailedInfo = props.loadingDetailedInfo; // Nueva prop para estado de carga
    const onClose = props.onClose || function() {};
    const getBatteryStatusClass = props.getBatteryStatusClass || function() { return ''; };

    // Función auxiliar para formatear timestamp
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString();
    };

    // Si no hay datos de batería, no renderizar nada
    if (!batteryData) return null;
    
    // Obtener el nombre de la batería de manera segura
    let customName = `Batería ${batteryData.id}`;
    if (batteryData.device_info && batteryData.device_info.custom_name) {
        customName = batteryData.device_info.custom_name;
    }
    
    // Obtener datos del dispositivo de manera segura
    const manufacturer = batteryData.device_info && batteryData.device_info.manufacturer ? 
                         batteryData.device_info.manufacturer : 'N/A';
    const model = batteryData.device_info && batteryData.device_info.model ? 
                  batteryData.device_info.model : 'N/A';
    const discoveryDate = batteryData.device_info && batteryData.device_info.discovery_date ? 
                          batteryData.device_info.discovery_date : 'N/A';
    
    // Función para renderizar la sección de información detallada
    const renderDetailedInfo = () => {
        if (loadingDetailedInfo) {
            return (
                <div className="loading-info">
                    <p>Cargando información detallada...</p>
                </div>
            );
        }

        if (!detailedInfo || detailedInfo.status !== "success") {
            return (
                <div className="no-detailed-info">
                    <p>No hay información detallada disponible para esta batería.</p>
                </div>
            );
        }

        const info = detailedInfo.info || {};
        
        return (
            <div className="detailed-info-section">
                <h4>Información Detallada del Dispositivo</h4>
                <div className="info-grid">
                    <div className="info-item">
                        <span className="info-label">Fabricante:</span>
                        <span className="info-value">{info.manufacturer || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Modelo:</span>
                        <span className="info-value">{info.model || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">N° Serie:</span>
                        <span className="info-value">{info.barcode || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Fabricación:</span>
                        <span className="info-value">{info.manufactured_date || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Descripción:</span>
                        <span className="info-value">{info.description || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Versión Info:</span>
                        <span className="info-value">{info.info_version || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Versión E-Label:</span>
                        <span className="info-value">{info.elabel_version || 'N/A'}</span>
                    </div>
                </div>
            </div>
        );
    };
    
    return (
        <div className="battery-detail-modal">
            <div className="battery-detail-content">
                <div className="detail-header">
                    <h3>{customName}</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="detail-body">
                    <div className="detail-section">
                        <h4>Información de la Batería</h4>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">ID:</span>
                                <span className="info-value">{batteryData.id}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Fabricante:</span>
                                <span className="info-value">{manufacturer}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Modelo:</span>
                                <span className="info-value">{model}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Descubierto:</span>
                                <span className="info-value">{discoveryDate}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Nueva sección de información detallada */}
                    {renderDetailedInfo()}
                    
                    <div className="detail-section">
                        <h4>Métricas Actuales</h4>
                        <div className="metrics-grid">
                            <div className="detail-metric">
                                <span className="metric-label">Estado:</span>
                                <span className={`metric-value ${getBatteryStatusClass ? getBatteryStatusClass(batteryData) : ''}`}>
                                    {batteryData.status || 'N/A'}
                                </span>
                            </div>
                            <div className="detail-metric">
                                <span className="metric-label">SOC:</span>
                                <span className={`metric-value ${batteryData.soc < 20 ? 'critical' : batteryData.soc < 40 ? 'warning' : ''}`}>
                                    {batteryData.soc !== undefined ? batteryData.soc : 'N/A'}%
                                </span>
                            </div>
                            <div className="detail-metric">
                                <span className="metric-label">SOH:</span>
                                <span className="metric-value">
                                    {batteryData.soh !== undefined ? batteryData.soh : 'N/A'}%
                                </span>
                            </div>
                            <div className="detail-metric">
                                <span className="metric-label">Voltaje:</span>
                                <span className="metric-value">
                                    {batteryData.voltage !== undefined ? batteryData.voltage.toFixed(2) : 'N/A'} V
                                </span>
                            </div>
                            <div className="detail-metric">
                                <span className="metric-label">Voltaje Pack:</span>
                                <span className="metric-value">
                                    {batteryData.pack_voltage !== undefined ? batteryData.pack_voltage.toFixed(2) : 'N/A'} V
                                </span>
                            </div>
                            <div className="detail-metric">
                                <span className="metric-label">Corriente:</span>
                                <span className={`metric-value ${batteryData.current > 0 ? 'charging' : batteryData.current < 0 ? 'discharging' : ''}`}>
                                    {batteryData.current !== undefined ? batteryData.current.toFixed(2) : 'N/A'} A
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="detail-section">
                        <h4>Información Técnica</h4>
                        <div className="tech-info">
                            <div className="info-item">
                                <span className="info-label">Última Actualización:</span>
                                <span className="info-value">{formatTimestamp(batteryData.last_updated)}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Valores Crudos:</span>
                                <pre className="raw-values">{JSON.stringify(batteryData.raw_values, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Exportar el componente para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatteryDetailView;
} else {
    // Para uso en navegador
    window.BatteryDetailView = BatteryDetailView;
}