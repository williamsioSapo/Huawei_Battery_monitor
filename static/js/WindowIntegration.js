/**
 * WindowIntegration.js - Integración del sistema de ventanas con la aplicación de baterías
 * Añade funcionalidad para mostrar datos de baterías en ventanas
 */

// Ejecutar cuando el DOM esté listo
$(document).ready(function() {
    console.log('WindowIntegration inicializado');
    
    // Añadir botón de ventana a la sección de baterías múltiples
    addBatteryWindowButton();
    
    // Escuchar eventos de la aplicación
    listenForAppEvents();
});

/**
 * Añade un botón para abrir una ventana con los datos de baterías
 */
function addBatteryWindowButton() {
    // Verificar si la sección existe
    const $section = $('#multi-battery-section');
    if ($section.length === 0) {
        console.warn('No se encontró la sección de baterías múltiples');
        return;
    }
    
    // Crear botón y añadirlo después del título
    const $button = $(`
        <button id="open-battery-window" class="window-button">
            <i class="battery-icon">🪟</i> Ver en Ventana
        </button>
    `);
    
    // Insertar después del título
    $section.find('h2').after($button);
    
    // Estilos inline (temporales)
    $button.css({
        'padding': '8px 15px',
        'background-color': '#1a73e8',
        'color': 'white',
        'border': 'none',
        'border-radius': '4px',
        'cursor': 'pointer',
        'margin-bottom': '15px',
        'font-size': '14px',
        'display': 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'gap': '5px'
    });
    
    // Añadir evento
    $button.on('click', openBatteryDashboardWindow);
}

/**
 * Abre una ventana con el dashboard de baterías
 */
function openBatteryDashboardWindow() {
    // Verificar si el WindowManager está disponible
    if (typeof WindowManager === 'undefined') {
        console.error('WindowManager no está disponible');
        alert('Error: Sistema de ventanas no disponible');
        return;
    }
    
    // Verificar si hay datos de baterías disponibles
    fetchBatteryData().then(function(data) {
        if (!data || !data.batteries || data.batteries.length === 0) {
            WindowManager.createWindow({
                title: 'Estado de Baterías',
                width: 500,
                height: 300,
                content: `
                    <div style="padding: 20px; text-align: center;">
                        <h3 style="margin-top: 0;">No hay datos disponibles</h3>
                        <p>No se encontraron datos de baterías para mostrar.</p>
                        <p>Asegúrese de que la conexión esté activa y que haya iniciado el monitoreo.</p>
                    </div>
                `
            });
            return;
        }
        
        // Crear contenido de la ventana con los datos de baterías
        let batteryContent = `
            <div class="battery-dashboard-window">
                <div class="window-system-stats">
                    <h3>Resumen del Sistema</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Total Baterías:</span>
                            <span class="stat-value">${data.batteries.length}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Baterías Activas:</span>
                            <span class="stat-value">${countActiveBatteries(data.batteries)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">SOC Promedio:</span>
                            <span class="stat-value">${calculateAverageSOC(data.batteries)}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Última Actualización:</span>
                            <span class="stat-value">${formatTimestamp(data.last_updated)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="window-battery-grid">
                    <h3>Baterías Disponibles</h3>
                    <div class="battery-cards">
        `;
        
        // Añadir tarjeta para cada batería
        data.batteries.forEach(function(battery) {
            batteryContent += createBatteryCard(battery);
        });
        
        // Cerrar divs
        batteryContent += `
                    </div>
                </div>
            </div>
        `;
        
        // Crear la ventana
        WindowManager.createWindow({
            title: 'Dashboard de Baterías',
            width: 800,
            height: 600,
            content: batteryContent
        });
    }).catch(function(error) {
        // Mostrar ventana de error
        WindowManager.createWindow({
            title: 'Error al Obtener Datos',
            width: 500,
            height: 300,
            content: `
                <div style="padding: 20px; text-align: center;">
                    <h3 style="margin-top: 0; color: #e74c3c;">Error</h3>
                    <p>No se pudieron obtener los datos de las baterías.</p>
                    <p>Error: ${error.message || 'Desconocido'}</p>
                </div>
            `
        });
    });
}

/**
 * Crea una tarjeta HTML para mostrar los datos de una batería
 */
function createBatteryCard(battery) {
    // Determinar clase de estado
    let statusClass = 'status-normal';
    
    if (battery.status === 'Cargando') {
        statusClass = 'status-charging';
    } else if (battery.status === 'Descargando') {
        statusClass = 'status-discharging';
    }
    
    // Si SOC es bajo, añadir clase crítica
    if (battery.soc !== undefined && battery.soc < 20) {
        statusClass = 'status-critical';
    }
    
    // Determinar nombre personalizado
    const customName = battery.device_info && battery.device_info.custom_name 
        ? battery.device_info.custom_name 
        : `Batería ${battery.id}`;
    
    // Crear HTML de la tarjeta
    return `
        <div class="battery-card ${statusClass}" data-battery-id="${battery.id}">
            <div class="card-header">
                <h4>${customName}</h4>
                <span class="battery-status">${battery.status || 'Desconocido'}</span>
            </div>
            <div class="card-body">
                <div class="metric">
                    <span class="metric-label">SOC:</span>
                    <span class="metric-value">${formatValue(battery.soc, '%')}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Voltaje:</span>
                    <span class="metric-value">${formatValue(battery.voltage, 'V', 2)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Corriente:</span>
                    <span class="metric-value">${formatValue(battery.current, 'A', 2)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">SOH:</span>
                    <span class="metric-value">${formatValue(battery.soh, '%')}</span>
                </div>
            </div>
            <button class="card-detail-btn" onclick="openBatteryDetailWindow(${battery.id})">Detalles</button>
        </div>
    `;
}

/**
 * Abre una ventana con detalles de una batería específica
 */
function openBatteryDetailWindow(batteryId) {
    // Obtener datos de batería específica
    $.ajax({
        url: `/api/batteries/status/${batteryId}`,
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.status !== 'success' || !response.battery_data) {
                showErrorWindow(`No se pudo obtener información para la batería ${batteryId}`);
                return;
            }
            
            const battery = response.battery_data;
            
            // Obtener información detallada si está disponible
            $.ajax({
                url: `/api/batteries/detailed_info/${batteryId}`,
                method: 'GET',
                dataType: 'json',
                success: function(detailResponse) {
                    const detailedInfo = detailResponse.status === 'success' ? detailResponse.detailed_info : null;
                    showBatteryDetailWindow(battery, detailedInfo);
                },
                error: function() {
                    // Mostrar ventana con datos básicos si no se puede obtener info detallada
                    showBatteryDetailWindow(battery, null);
                }
            });
        },
        error: function(xhr, status, error) {
            showErrorWindow(`Error al obtener datos: ${error}`);
        }
    });
}

/**
 * Muestra la ventana de detalle de batería
 */
function showBatteryDetailWindow(battery, detailedInfo) {
    // Determinar nombre de la batería
    const customName = battery.device_info && battery.device_info.custom_name 
        ? battery.device_info.custom_name 
        : `Batería ${battery.id}`;
    
    // Crear contenido de la ventana
    let detailContent = `
        <div class="battery-detail-window">
            <div class="detail-header">
                <h3>${customName}</h3>
                <span class="battery-type">${getBatteryType(battery)}</span>
            </div>
            
            <div class="detail-section">
                <h4>Métricas Actuales</h4>
                <div class="metrics-grid">
                    <div class="metric">
                        <span class="metric-label">Estado:</span>
                        <span class="metric-value ${getStatusClass(battery)}">${battery.status || 'Desconocido'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">SOC:</span>
                        <span class="metric-value">${formatValue(battery.soc, '%')}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Voltaje:</span>
                        <span class="metric-value">${formatValue(battery.voltage, 'V', 2)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Corriente:</span>
                        <span class="metric-value">${formatValue(battery.current, 'A', 2)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Voltaje Pack:</span>
                        <span class="metric-value">${formatValue(battery.pack_voltage, 'V', 2)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">SOH:</span>
                        <span class="metric-value">${formatValue(battery.soh, '%')}</span>
                    </div>
                </div>
            </div>
    `;
    
    // Añadir información detallada si está disponible
    if (detailedInfo && detailedInfo.status === 'success' && detailedInfo.info) {
        const info = detailedInfo.info;
        
        detailContent += `
            <div class="detail-section">
                <h4>Información Detallada</h4>
                <div class="detailed-info-grid">
                    <div class="info-item">
                        <span class="info-label">Fabricante:</span>
                        <span class="info-value">${info.manufacturer || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Modelo:</span>
                        <span class="info-value">${info.model || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">N° Serie:</span>
                        <span class="info-value">${info.barcode || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Fabricación:</span>
                        <span class="info-value">${info.manufactured_date || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Descripción:</span>
                        <span class="info-value">${info.description || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Versión:</span>
                        <span class="info-value">${info.info_version || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Añadir valores crudos si existen
    if (battery.raw_values && Array.isArray(battery.raw_values)) {
        detailContent += `
            <div class="detail-section">
                <h4>Valores Crudos</h4>
                <div class="raw-values">
                    <pre>${JSON.stringify(battery.raw_values, null, 2)}</pre>
                </div>
            </div>
        `;
    }
    
    // Cerrar div principal
    detailContent += `
        </div>
    `;
    
    // Crear ventana
    WindowManager.createWindow({
        title: `Detalle de ${customName}`,
        width: 700,
        height: 500,
        content: detailContent
    });
}

/**
 * Muestra una ventana de error
 */
function showErrorWindow(message) {
    WindowManager.createWindow({
        title: 'Error',
        width: 400,
        height: 250,
        content: `
            <div style="padding: 20px; text-align: center;">
                <h3 style="margin-top: 0; color: #e74c3c;">Error</h3>
                <p>${message}</p>
            </div>
        `
    });
}

/**
 * Obtiene datos de baterías desde la API
 */
function fetchBatteryData() {
    return new Promise(function(resolve, reject) {
        $.ajax({
            url: '/api/batteries/status',
            method: 'GET',
            dataType: 'json',
            success: function(data) {
                if (data.status === 'success') {
                    resolve(data);
                } else {
                    reject(new Error(data.message || 'Error desconocido'));
                }
            },
            error: function(xhr, status, error) {
                reject(new Error(error));
            }
        });
    });
}

/**
 * Escucha eventos de la aplicación
 */
function listenForAppEvents() {
    // Escuchar cambios de conexión
    $(document).on('modbus-connection-status-change', function(e) {
        if (e.detail && e.detail.connected) {
            console.log('Conexión Modbus establecida, sistema de ventanas listo');
        }
    });
    
    // Escuchar cambios de vista
    $(document).on('view-changed', function(e) {
        if (e.detail && e.detail.view === 'multi') {
            console.log('Vista múltiple activada, preparando integración de ventanas');
            
            // Asegurarse de que el botón existe
            if ($('#open-battery-window').length === 0) {
                addBatteryWindowButton();
            }
        }
    });
}

// Funciones auxiliares

/**
 * Cuenta las baterías activas (cargando o descargando)
 */
function countActiveBatteries(batteries) {
    if (!batteries || !Array.isArray(batteries)) return 0;
    
    return batteries.filter(function(battery) {
        return battery.status === 'Cargando' || battery.status === 'Descargando';
    }).length;
}

/**
 * Calcula el SOC promedio de todas las baterías
 */
function calculateAverageSOC(batteries) {
    if (!batteries || !Array.isArray(batteries) || batteries.length === 0) return 'N/A';
    
    let totalSOC = 0;
    let count = 0;
    
    batteries.forEach(function(battery) {
        if (battery.soc !== undefined) {
            totalSOC += battery.soc;
            count++;
        }
    });
    
    return count > 0 ? Math.round(totalSOC / count) : 'N/A';
}

/**
 * Formatea un valor con unidad
 */
function formatValue(value, unit, decimals) {
    if (value === undefined || value === null) return 'N/A';
    
    if (typeof decimals === 'number') {
        value = parseFloat(value).toFixed(decimals);
    }
    
    return `${value}${unit}`;
}

/**
 * Formatea un timestamp en fecha/hora local
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
}

/**
 * Obtiene el tipo de batería basado en metadata
 */
function getBatteryType(battery) {
    if (!battery.device_info) return 'Batería Estándar';
    
    const info = battery.device_info;
    return `${info.manufacturer || ''} ${info.model || ''}`.trim() || 'Batería Estándar';
}

/**
 * Obtiene la clase CSS para el estado de la batería
 */
function getStatusClass(battery) {
    if (!battery) return '';
    
    if (battery.status === 'Cargando') return 'status-charging';
    if (battery.status === 'Descargando') return 'status-discharging';
    
    if (battery.soc !== undefined && battery.soc < 20) return 'status-critical';
    if (battery.soc !== undefined && battery.soc < 40) return 'status-warning';
    
    return 'status-normal';
}