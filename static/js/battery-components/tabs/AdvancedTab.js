/**
* Componente para la pestaña Avanzada
* Muestra opciones avanzadas y datos crudos
*/
// static/js/battery-components/tabs/AdvancedTab.js
const AdvancedTab = {
   /**
    * Renderiza el contenido de la pestaña Avanzada
    * @param {Object} batteryData - Datos de la batería
    * @param {Object} detailedInfo - Información detallada opcional
    * @param {jQuery} $container - Contenedor donde renderizar
    */
   render: function(batteryData, detailedInfo, $container) {
       if (!batteryData) {
           $container.html('<div class="tab-error">No hay datos disponibles</div>');
           return;
       }
       
       // Estructura HTML del componente
       const html = `
           <div class="advanced-info-container">
               <div class="battery-header">
                   <h3>Funciones Avanzadas</h3>
                   <div class="advanced-controls">
                       <button class="action-btn refresh-data-btn">
                           <i class="action-icon">🔄</i> Actualizar Datos
                       </button>
                   </div>
               </div>
               
               <div class="advanced-info-section">
                   <h4>Valores Crudos de Registros</h4>
                   
                   <div class="raw-data-container">
                       <h5>Registros Principales</h5>
                       <pre>${JSON.stringify(batteryData.raw_values || [], null, 2)}</pre>
                   </div>
                   
                   <div class="register-mapping">
                       <h5>Mapeo de Registros</h5>
                       <table class="cells-table">
                           <thead>
                               <tr>
                                   <th>Registro</th>
                                   <th>Descripción</th>
                                   <th>Fórmula</th>
                                   <th>Valor Actual</th>
                               </tr>
                           </thead>
                           <tbody>
                               <tr>
                                   <td>0</td>
                                   <td>Voltaje de Batería</td>
                                   <td>Valor × 0.01</td>
                                   <td>${this._formatRegisterValue(batteryData.raw_values, 0, 0.01, 'V')}</td>
                               </tr>
                               <tr>
                                   <td>1</td>
                                   <td>Voltaje de Pack</td>
                                   <td>Valor × 0.01</td>
                                   <td>${this._formatRegisterValue(batteryData.raw_values, 1, 0.01, 'V')}</td>
                               </tr>
                               <tr>
                                   <td>2</td>
                                   <td>Corriente</td>
                                   <td>Valor × 0.01 (con signo)</td>
                                   <td>${this._formatCurrentValue(batteryData.raw_values, 2)}</td>
                               </tr>
                               <tr>
                                   <td>3</td>
                                   <td>Estado de Carga (SOC)</td>
                                   <td>Valor directo</td>
                                   <td>${this._formatRegisterValue(batteryData.raw_values, 3, 1, '%')}</td>
                               </tr>
                               <tr>
                                   <td>4</td>
                                   <td>Estado de Salud (SOH)</td>
                                   <td>Valor directo</td>
                                   <td>${this._formatRegisterValue(batteryData.raw_values, 4, 1, '%')}</td>
                               </tr>
                           </tbody>
                       </table>
                   </div>
               </div>
               
               <div class="advanced-actions">
                   <button class="action-btn verify-cells-btn">
                       <i class="action-icon">🔍</i> Verificar Celdas
                   </button>
                   <button class="action-btn show-raw-info-btn">
                       <i class="action-icon">📃</i> Ver Texto Dispositivo
                   </button>
               </div>
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
       // Evento para verificar celdas
       $container.find('.verify-cells-btn').on('click', function() {
           if (typeof handleVerifyCells === 'function') {
               handleVerifyCells(batteryData.id, $container);
           }
       });
       
       // Evento para actualizar datos
       $container.find('.refresh-data-btn').on('click', function() {
           if (typeof refreshBatteryData === 'function') {
               refreshBatteryData(batteryData.id, $container);
           }
       });
       
       // Evento para mostrar texto crudo
       $container.find('.show-raw-info-btn').on('click', function() {
           const combinedText = detailedInfo && 
                             (detailedInfo.detailed_info?.combined_text || 
                              detailedInfo.combined_text) || '';
           
           if (typeof showRawTextModal === 'function') {
               showRawTextModal(combinedText || 'No hay datos crudos disponibles', batteryData.id);
           }
       });
   },
   
   /**
    * Formatea un valor de registro con factor y unidad
    * @private
    */
   _formatRegisterValue: function(rawValues, index, factor, unit) {
       if (!rawValues || !Array.isArray(rawValues) || rawValues[index] === undefined) {
           return 'N/A';
       }
       
       const rawValue = rawValues[index];
       const calculatedValue = rawValue * factor;
       return `${rawValue} → ${calculatedValue.toFixed(2)} ${unit}`;
   },
   
   /**
    * Formatea un valor de corriente con signo
    * @private
    */
   _formatCurrentValue: function(rawValues, index) {
       if (!rawValues || !Array.isArray(rawValues) || rawValues[index] === undefined) {
           return 'N/A';
       }
       
       const rawValue = rawValues[index];
       let currentValue;
       
       if (rawValue > 32767) {  // Valor negativo en complemento a 2
           currentValue = (rawValue - 65536) * 0.01;
       } else {
           currentValue = rawValue * 0.01;
       }
       
       return `${rawValue} → ${currentValue.toFixed(2)} A`;
   }
};