/**
 * Componente para la pestaña de Información Técnica
 * Muestra detalles técnicos y especificaciones
 */
// static/js/battery-components/tabs/TechnicalTab.js
const TechnicalTab = {
    /**
     * Renderiza el contenido de la pestaña Técnica
     * @param {Object} batteryData - Datos de la batería
     * @param {Object} detailedInfo - Información detallada opcional
     * @param {jQuery} $container - Contenedor donde renderizar
     */
    render: function(batteryData, detailedInfo, $container) {
        if (!batteryData) {
            $container.html('<div class="tab-error">No hay datos disponibles</div>');
            return;
        }
        
        // Verificar si hay información detallada disponible
        const hasDetailedInfo = detailedInfo && 
                               (detailedInfo.status === 'success') && 
                               ((detailedInfo.detailed_info && detailedInfo.detailed_info.info) || 
                                detailedInfo.info);
        
        // Obtener la información técnica
        let techInfo = {};
        if (hasDetailedInfo) {
            techInfo = detailedInfo.detailed_info?.info || detailedInfo.info || {};
        }
        
        // Estructura HTML del componente
        const html = `
            <div class="technical-info-container">
                <div class="battery-header">
                    <h3>Información Técnica</h3>
                    <span class="battery-type">
                        ${techInfo.manufacturer || batteryData.device_info?.manufacturer || ''} 
                        ${techInfo.model || batteryData.device_info?.model || ''}
                    </span>
                </div>
                
                <div class="technical-info-section">
                    <h4>Especificaciones</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Fabricante:</span>
                            <span class="info-value">${techInfo.manufacturer || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Modelo:</span>
                            <span class="info-value">${techInfo.model || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">N° Serie:</span>
                            <span class="info-value">${techInfo.barcode || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Fecha Fabricación:</span>
                            <span class="info-value">${techInfo.manufactured_date || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Descripción:</span>
                            <span class="info-value">${techInfo.description || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Versión Info:</span>
                            <span class="info-value">${techInfo.info_version || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">E-Label:</span>
                            <span class="info-value">${techInfo.elabel_version || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Pack Voltage:</span>
                            <span class="info-value">${batteryData.pack_voltage !== undefined ? batteryData.pack_voltage.toFixed(2) + ' V' : 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                ${hasDetailedInfo ? `
                    <div class="technical-info-section">
                        <h4>Información Adicional</h4>
                        <div class="info-text">
                            <p>Esta batería cuenta con información detallada proveniente de su eLabel.</p>
                            <p>Los datos fueron obtenidos mediante el protocolo Modbus usando la función personalizada FC41.</p>
                        </div>
                        <button class="action-btn show-raw-info-btn">
                            <i class="action-icon">📃</i> Ver Texto Completo
                        </button>
                    </div>
                ` : `
                    <div class="technical-info-section">
                        <h4>Información Adicional</h4>
                        <div class="info-text">
                            <p>No se dispone de información detallada para esta batería.</p>
                            <p>Puede intentar obtener la información detallada utilizando el botón de actualización.</p>
                        </div>
                    </div>
                `}
            </div>
        `;
        
        // Añadir HTML al contenedor
        $container.html(html);
        
        // Configurar eventos
        this._setupEvents(batteryData, detailedInfo, $container);
    },
    
    /**
     * Configura eventos para elementos interactivos
     * @private
     */
    _setupEvents: function(batteryData, detailedInfo, $container) {
        // Evento para mostrar texto completo
        if (detailedInfo) {
            $container.find('.show-raw-info-btn').on('click', function() {
                const combinedText = detailedInfo.detailed_info?.combined_text || 
                                    detailedInfo.combined_text || '';
                
                if (typeof showRawTextModal === 'function') {
                    showRawTextModal(combinedText, batteryData.id);
                }
            });
        }
    }
};