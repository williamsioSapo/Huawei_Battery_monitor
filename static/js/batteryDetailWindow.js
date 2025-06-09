/**
* BatteryDetailWindow refactorizado - Controlador principal
* Utiliza los componentes de pestañas para renderizar contenido
*/
const BatteryDetailWindow = (function($) {
   
   // Cache para datos de batería y evitar llamadas API innecesarias
   const batteryDataCache = {};
   const detailedInfoCache = {};
   
   // Registro de componentes de pestañas
   const tabComponents = {
       'tab-general': GeneralTab,
       'tab-technical': TechnicalTab,
	   'tab-health': HealthTab,
       'tab-cells': CellsTab,
       'tab-history': HistoryTab,
       'tab-advanced': AdvancedTab,
	   'tab-diagnostics': DiagnosticsTab  
   };
   
   // Preparación para Fase 2: Estados de carga de pestañas
   const tabLoadingStates = {
       // Estructura preparada para implementar carga asíncrona
       // loadedTabs: {},
       // lastUpdated: {},
       // cacheLifetime: 30000 // 30 segundos
   };
   
   /**
    * Abre la ventana de detalles de batería
    * @param {number} batteryId - ID de la batería
    */
   function showBatteryDetail(batteryId) {
       // Mostrar ventana de carga
       const loadingWindowId = WindowManager.createWindow({
           title: `Cargando información de batería ${batteryId}...`,
           width: 800,
           height: 600,
           content: `
               <div class="battery-detail-loading centered-content">
                   <div class="loading-spinner"></div>
                   <p>Obteniendo datos de la batería...</p>
               </div>
           `
       });
       
       // Fetch battery data
       fetchBatteryData(batteryId)
           .then(data => {
               // Almacenar en caché
               batteryDataCache[batteryId] = data.batteryData;
               if (data.detailedInfo) {
                   detailedInfoCache[batteryId] = data.detailedInfo;
               }
               
               // Cerrar ventana de carga
               WindowManager.closeWindow(loadingWindowId);
               
               // Crear ventana con datos completos
               createDetailWindow(data.batteryData, data.detailedInfo);
           })
           .catch(error => {
               // Mostrar error en la ventana de carga
               $(`#${loadingWindowId}`).find('.battery-detail-loading')
                   .html(`<div class="error-message">Error: ${error.message}</div>`);
           });
   }
   
   /**
    * Obtiene datos completos de la batería
    * @param {number} batteryId - ID de la batería para obtener datos
    * @returns {Promise} - Promesa que resuelve con los datos de la batería
    */
   function fetchBatteryData(batteryId) {
       return new Promise((resolve, reject) => {
           // Verificar si hay datos en caché
           if (batteryDataCache[batteryId] && detailedInfoCache[batteryId]) {
               resolve({
                   batteryData: batteryDataCache[batteryId],
                   detailedInfo: detailedInfoCache[batteryId]
               });
               return;
           }
           
           // Obtener datos básicos
           getAllBatteriesStatus()
               .then(response => {
                   if (response.status !== 'success' || !response.batteries) {
                       reject(new Error(response.message || 'No se pudieron obtener datos de baterías'));
                       return;
                   }
                   
                   // Encontrar la batería específica
                   const batteryData = response.batteries.find(b => b.id === parseInt(batteryId) || b.id === batteryId);
                   
                   if (!batteryData) {
                       reject(new Error(`No se encontraron datos para la batería ${batteryId}`));
                       return;
                   }
                   
                   // Obtener información detallada
                   getBatteryDetailedInfo(batteryId)
                       .then(detailedInfo => {
                           resolve({
                               batteryData: batteryData,
                               detailedInfo: detailedInfo
                           });
                       })
                       .catch(error => {
                           // Si falla la info detallada, aún continuamos con lo básico
                           console.warn(`No se pudo obtener información detallada para batería ${batteryId}:`, error);
                           resolve({
                               batteryData: batteryData,
                               detailedInfo: null
                           });
                       });
               })
               .catch(error => {
                   reject(error);
               });
       });
   }
   
   /**
    * Crea la ventana de detalle con jQuery UI Tabs usando componentes
    * @param {Object} batteryData - Datos de la batería
    * @param {Object} detailedInfo - Información detallada (opcional)
    */
   function createDetailWindow(batteryData, detailedInfo) {
       // Determinar título
       const customName = batteryData.device_info && batteryData.device_info.custom_name 
           ? batteryData.device_info.custom_name 
           : `Batería ${batteryData.id}`;
       
       // Crear contenido con estructura de tabs preparada para carga asíncrona
       const content = `
           <div class="battery-detail-container">
               <div id="battery-detail-tabs" class="battery-tabs">
                   <ul>
                       <li><a href="#tab-general"><i class="tab-icon general-icon"></i> General</a></li>
                       <li><a href="#tab-technical"><i class="tab-icon technical-icon"></i> Información Técnica</a></li>
					   <li><a href="#tab-health"><i class="tab-icon health-icon"></i> Salud</a></li>
                       <li><a href="#tab-cells"><i class="tab-icon cells-icon"></i> Celdas</a></li>
                       <li><a href="#tab-history"><i class="tab-icon history-icon"></i> Histórico</a></li>
                       <li><a href="#tab-advanced"><i class="tab-icon advanced-icon"></i> Avanzado</a></li>
					   <li><a href="#tab-diagnostics"><i class="tab-icon diagnostics-icon"></i> Diagnósticos</a></li>
                   </ul>
                   <div id="tab-general" class="tab-content">
                       <div class="tab-loading">Cargando información general...</div>
                   </div>
                   <div id="tab-technical" class="tab-content">
                       <div class="tab-loading">Cargando información técnica...</div>
                   </div>
				   <div id="tab-health" class="tab-content">
						<div class="tab-loading">Cargando análisis de salud...</div>
					</div>
                   <div id="tab-cells" class="tab-content">
                       <div class="tab-loading">Cargando información de celdas...</div>
                   </div>
                   <div id="tab-history" class="tab-content">
                       <div class="tab-loading">Cargando datos históricos...</div>
                   </div>
                   <div id="tab-advanced" class="tab-content">
                       <div class="tab-loading">Cargando opciones avanzadas...</div>
                   </div>
				   <div id="tab-diagnostics" class="tab-content">
					   <div class="tab-loading">Cargando diagnósticos...</div>
				   </div>
               </div>
           </div>
       `;
       
       // Crear ventana
       const windowId = WindowManager.createWindow({
           title: `Detalles de ${customName}`,
           width: 900,
           height: 650,
           content: content,
           position: { my: "center", at: "center", of: window }
       });
       
       // Inicializar tabs una vez creada la ventana
       initializeTabs(windowId, batteryData, detailedInfo);
       
       return windowId;
   }
   
   /**
    * Inicializa jQuery UI Tabs y carga contenido usando componentes
    * @param {string} windowId - ID de la ventana
    * @param {Object} batteryData - Datos de la batería
    * @param {Object} detailedInfo - Información detallada
    */
   function initializeTabs(windowId, batteryData, detailedInfo) {
       // Inicializar jQuery UI Tabs
       $(`#${windowId} #battery-detail-tabs`).tabs({
           animate: false,
           active: 0, // Mostrar primer tab al inicio
           activate: function(event, ui) {
               // Realizar acciones cuando se activa un tab
               const tabId = ui.newPanel.attr('id');
               
               // Verificar si ya se ha cargado el contenido (para evitar recargar)
               if (ui.newPanel.find('.tab-loading').length > 0) {
                   // Usar el componente correspondiente para renderizar
                   renderTabWithComponent(tabId, batteryData, detailedInfo, ui.newPanel);
               }
           }
       });
       
       // Añadir iconos a los tabs
       setupTabIcons();
       
       // Renderizar inmediatamente el primer tab (General)
       renderTabWithComponent('tab-general', batteryData, detailedInfo, $(`#${windowId} #tab-general`));
   }
   
   /**
    * Renderiza una pestaña usando su componente correspondiente
    * @param {string} tabId - ID de la pestaña
    * @param {Object} batteryData - Datos de la batería
    * @param {Object} detailedInfo - Información detallada
    * @param {jQuery} $container - Contenedor de la pestaña
    */
   function renderTabWithComponent(tabId, batteryData, detailedInfo, $container) {
       // Obtener el componente correspondiente
       const component = tabComponents[tabId];
       
       if (component && typeof component.render === 'function') {
           try {
               // Renderizar usando el componente
               component.render(batteryData, detailedInfo, $container);
           } catch (error) {
               console.error(`Error al renderizar componente ${tabId}:`, error);
               $container.html(`<div class="tab-error">Error al cargar contenido: ${error.message}</div>`);
           }
       } else {
           console.warn(`No se encontró componente para tab: ${tabId}`);
           $container.html(`<div class="tab-error">Componente no disponible</div>`);
       }
   }
   
   /**
    * Configura los iconos de los tabs
    */
   function setupTabIcons() {
       // Usando emojis como iconos para simplicidad
       $('.general-icon').html('📊');
       $('.technical-icon').html('🔧');
	   $('.health-icon').html('💚');  
       $('.cells-icon').html('🔋');
       $('.history-icon').html('📈');
       $('.advanced-icon').html('⚙️');
	   $('.diagnostics-icon').html('🔍');
   }
   
   // API pública
   return {
       showBatteryDetail: showBatteryDetail,
       
       // Métodos para gestión de caché
       clearCache: function(batteryId) {
           if (batteryId) {
               // Limpiar caché de una batería específica
               delete batteryDataCache[batteryId];
               delete detailedInfoCache[batteryId];
               console.log(`Caché limpiado para batería ${batteryId}`);
           } else {
               // Limpiar todo el caché
               Object.keys(batteryDataCache).forEach(key => delete batteryDataCache[key]);
               Object.keys(detailedInfoCache).forEach(key => delete detailedInfoCache[key]);
               console.log('Todo el caché de baterías ha sido limpiado');
           }
       },
       
       // Método para verificar estado del caché
       getCacheStatus: function(batteryId) {
           if (batteryId) {
               return {
                   batteryData: !!batteryDataCache[batteryId],
                   detailedInfo: !!detailedInfoCache[batteryId]
               };
           } else {
               return {
                   totalBatteries: Object.keys(batteryDataCache).length,
                   batteriesWithDetailedInfo: Object.keys(detailedInfoCache).length
               };
           }
       }
       
       // Preparación para Fase 2: Más métodos
       // invalidateTabCache: function(batteryId, tabId) { ... }
   };
   
})(jQuery);

// Reemplazar la implementación anterior manteniendo la compatibilidad
window.showBatteryDetail = BatteryDetailWindow.showBatteryDetail;

// Funciones auxiliares para mantener compatibilidad con funciones existentes
function handleVerifyCells(batteryId, $container) {
   // Mostrar loading
   const $resultArea = $('<div class="verify-cells-result loading">Verificando celdas...</div>');
   $container.append($resultArea);
   
   // Llamar API de verificación
   verifyCellData(batteryId)
       .then(result => {
           $resultArea.removeClass('loading');
           
           if (result.status === 'success' || result.status === 'partial') {
               $resultArea.html(`
                   <div class="success-message">
                       <p>Verificación completada. Ver detalles en la consola.</p>
                       <p>Resumen: ${result.summary.cells_count} celdas verificadas.</p>
                   </div>
               `);
           } else {
               $resultArea.html(`
                   <div class="error-message">
                       <p>Error: ${result.message || 'No se pudieron verificar las celdas'}</p>
                   </div>
               `);
           }
       })
       .catch(error => {
           $resultArea.removeClass('loading').html(`
               <div class="error-message">
                   <p>Error: ${error.message}</p>
               </div>
           `);
       });
}

function refreshBatteryData(batteryId, $container) {
   // Mostrar mensaje de recarga
   const $refreshMessage = $('<div class="refresh-message loading">Actualizando datos...</div>');
   $container.prepend($refreshMessage);
   
   // CORREGIDO: Limpiar caché usando la API pública
   BatteryDetailWindow.clearCache(batteryId);
   
   // Mostrar mensaje temporal y cerrar/reabrir ventana
   setTimeout(() => {
       $refreshMessage.html('<div class="success-message">Datos actualizados. Cerrando ventana...</div>');
       
       setTimeout(() => {
           // Cerrar ventana actual y abrir nueva
           const windowId = $container.closest('.ui-dialog-content').attr('id');
           WindowManager.closeWindow(windowId);
           BatteryDetailWindow.showBatteryDetail(batteryId);
       }, 1000);
   }, 500);
}

function showRawTextModal(text, batteryId) {
   WindowManager.createWindow({
       title: `Texto Crudo - Batería ${batteryId}`,
       width: 800,
       height: 600,
       content: `
           <div class="raw-text-container">
               <div class="raw-text-header">
                   <p>Texto crudo obtenido del dispositivo mediante función FC41:</p>
               </div>
               <div class="raw-text-content">
                   <pre>${text || 'No hay datos disponibles'}</pre>
               </div>
           </div>
       `
   });
}