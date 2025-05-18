// static/js/batteryDetailView.js
'use strict';

/**
 * Componente para mostrar la vista detallada de una batería.
 * Recibe los datos de la batería y maneja la visualización detallada.
 */
const BatteryDetailView = (props) => {
    // Estado para controlar la visualización de datos en bruto
    const [showRawData, setShowRawData] = React.useState(false);
    
    // Datos de entrada vía props
    const batteryData = props.batteryData;
    const detailedInfo = props.detailedInfo; // Info detallada
    const loadingDetailedInfo = props.loadingDetailedInfo; // Estado de carga
    const onClose = props.onClose || function() {};
    const getBatteryStatusClass = props.getBatteryStatusClass || function() { return ''; };

    /**
     * Maneja la verificación de celdas individuales
     */
    const handleVerifyCells = async () => {
        if (!batteryData || !batteryData.id) return;
        
        try {
            Utils.logInfo(`Iniciando verificación de celdas para batería ${batteryData.id}`, 'BatteryDetailView');
            
            // Mostrar mensaje de proceso
            const detailBody = document.querySelector('.detail-body');
            if (!detailBody) return;
            
            let messageArea = document.querySelector('.detail-message');
            if (!messageArea) {
                messageArea = document.createElement('div');
                messageArea.className = 'detail-message info';
                detailBody.appendChild(messageArea);
            }
            
            messageArea.className = 'detail-message info';
            messageArea.textContent = 'Verificando celdas individuales...';
            
            // Llamar a la API de verificación de celdas
            if (typeof verifyCellData === 'function') {
                const result = await verifyCellData(batteryData.id);
                
                if (result && result.status === 'success') {
                    messageArea.className = 'detail-message success';
                    messageArea.textContent = 'Verificación iniciada. Revise la consola para ver resultados detallados.';
                } else {
                    messageArea.className = 'detail-message error';
					messageArea.textContent = `Error: ${(result && result.message) ? result.message : 'No se pudo verificar las celdas'}`;                    
                }
            } else {
                messageArea.className = 'detail-message error';
                messageArea.textContent = 'Error: función de verificación no disponible';
            }
            
            // Eliminar el mensaje después de 5 segundos
            setTimeout(() => {
                if (messageArea && messageArea.parentNode) {
                    messageArea.parentNode.removeChild(messageArea);
                }
            }, 5000);
            
        } catch (error) {
            Utils.logError(`Error al verificar celdas: ${error.message}`, 'BatteryDetailView');
        }
    };
    
    /**
     * Alterna la visualización de datos en bruto
     */
    const toggleRawData = () => {
        setShowRawData(!showRawData);
    };

    // Función auxiliar para formatear timestamp
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        // Usar la función de Utils para formato consistente
        return Utils.formatTimestamp(timestamp, true);
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
                    <div className="loading-spinner"></div>
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
    
    // Función para renderizar la sección de datos en bruto
    const renderRawData = () => {
        if (!showRawData) return null;
        
        const rawData = detailedInfo && detailedInfo.status === "success" && detailedInfo.combined_text ? 
                        detailedInfo.combined_text : 'No hay datos en bruto disponibles';
        
        return (
            <div className="detail-section raw-data-section">
                <h4>Datos en Bruto</h4>
                <pre className="raw-data-content">{rawData}</pre>
            </div>
        );
    };
    
    return (
        <div className="battery-detail-modal">
            <div className="battery-detail-content">
                <div className="detail-header">
                    <h3>{customName}</h3>
                    <button className="battery-detail-close-btn" onClick={onClose}>×</button>
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
                    
                    {/* Sección de información detallada */}
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
                    
                    {/* Nueva sección para acciones */}
                    <div className="detail-section actions-section">
                        <h4>Acciones</h4>
                        <div className="detail-actions">
                            <button 
                                className="action-btn verify-cells-btn" 
                                onClick={handleVerifyCells}
                            >
                                <i className="action-icon">🔍</i> Verificar Celdas
                            </button>
                            <button 
                                className={`action-btn raw-data-btn ${showRawData ? 'active' : ''}`} 
                                onClick={toggleRawData}
                            >
                                <i className="action-icon">📋</i> {showRawData ? 'Ocultar Datos Brutos' : 'Ver Datos Brutos'}
                            </button>
                        </div>
                    </div>
                    
                    {/* Sección condicional para mostrar datos en bruto */}
                    {renderRawData()}
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