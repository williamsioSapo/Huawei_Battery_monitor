/**
 * WindowSystemInit.js - Inicialización del sistema de ventanas
 * 
 * Este script maneja la integración inicial del sistema de ventanas
 * con la interfaz de usuario de la aplicación principal.
 */

// Ejecutar cuando el DOM esté listo
$(document).ready(function() {
    console.log('WindowSystemInit: Inicializando integración del sistema de ventanas');
    
    // Configurar el botón de apertura del sistema de ventanas
    setupWindowSystemButton();
    
    // Configurar notificaciones del sistema
    setupSystemNotifications();
});

/**
 * Configura el botón principal de apertura del sistema de ventanas
 */
function setupWindowSystemButton() {
    const $button = $('#openWindowSystemBtn');
    
    // Si no existe, salir
    if ($button.length === 0) {
        console.warn('WindowSystemInit: Botón de apertura del sistema de ventanas no encontrado');
        return;
    }
    
    // Asignar evento al botón
    $button.on('click', function() {
        showWindowSystemDashboard();
    });
}

/**
 * Muestra un dashboard del sistema de ventanas
 */
function showWindowSystemDashboard() {
    // Verificar que el sistema de ventanas esté disponible
    if (typeof WindowManager === 'undefined') {
        showErrorNotification('Sistema de Ventanas no disponible', 
            'El sistema de ventanas no está cargado correctamente. Verifica la consola para más detalles.');
        console.error('ERROR: WindowManager no está disponible');
        return;
    }
    
    // Crear ventana del dashboard
    WindowManager.createWindow({
        title: "Sistema de Ventanas",
        width: 600,
        height: 400,
        content: `
            <div style="padding: 20px;">
                <h3 style="margin-top: 0;">Panel de Control del Sistema de Ventanas</h3>
                
                <div style="margin: 20px 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div style="background-color: #f8f9fa; border-radius: 6px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h4 style="margin-top: 0;">Ventanas de Demostración</h4>
                        <p>Prueba diferentes tipos de ventanas con distintos contenidos.</p>
                        <button id="btn-demo-basic" class="dashboard-button">Ventana Básica</button>
                        <button id="btn-demo-chart" class="dashboard-button">Ventana con Gráfico</button>
                        <button id="btn-demo-form" class="dashboard-button">Ventana con Formulario</button>
                    </div>
                    
                    <div style="background-color: #f8f9fa; border-radius: 6px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h4 style="margin-top: 0;">Ventanas de Batería</h4>
                        <p>Visualización de datos de baterías en ventanas.</p>
                        <button id="btn-battery-dash" class="dashboard-button">Dashboard de Baterías</button>
                        <button id="btn-battery-detail" class="dashboard-button">Detalle de Batería</button>
                    </div>
                </div>
                
                <div style="background-color: #f8f9fa; border-radius: 6px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 15px;">
                    <h4 style="margin-top: 0;">Sistema</h4>
                    <div style="display: flex; gap: 10px;">
                        <button id="btn-show-all-windows" class="dashboard-button system">Ver Ventanas Activas</button>
                        <button id="btn-run-tests" class="dashboard-button system">Ejecutar Pruebas</button>
                        <button id="btn-close-all" class="dashboard-button warning">Cerrar Todas las Ventanas</button>
                    </div>
                </div>
            </div>
        `
    });
    
    // Añadir estilos inline
    addDashboardStyles();
    
    // Asignar eventos a los botones
    $('#btn-demo-basic').on('click', function() {
        if (typeof openBasicWindow === 'function') {
            openBasicWindow();
        } else {
            showErrorNotification('Función no disponible', 'La función para abrir ventanas básicas no está disponible.');
        }
    });
    
    $('#btn-demo-chart').on('click', function() {
        if (typeof openChartWindow === 'function') {
            openChartWindow();
        } else {
            showErrorNotification('Función no disponible', 'La función para abrir ventanas con gráficos no está disponible.');
        }
    });
    
    $('#btn-demo-form').on('click', function() {
        if (typeof openFormWindow === 'function') {
            openFormWindow();
        } else {
            showErrorNotification('Función no disponible', 'La función para abrir ventanas con formularios no está disponible.');
        }
    });
    
    $('#btn-battery-dash').on('click', function() {
        if (typeof openBatteryDashboardWindow === 'function') {
            openBatteryDashboardWindow();
        } else {
            showErrorNotification('Función no disponible', 'La función para abrir el dashboard de baterías no está disponible.');
        }
    });
    
    $('#btn-battery-detail').on('click', function() {
        // Mostrar ventana para seleccionar una batería
        showBatterySelector();
    });
    
    $('#btn-show-all-windows').on('click', function() {
        if (typeof WindowTest !== 'undefined') {
            WindowTest.showWindowStats();
        } else {
            showErrorNotification('Función no disponible', 'La función para ver estadísticas no está disponible.');
        }
    });
    
    $('#btn-run-tests').on('click', function() {
        if (typeof WindowTest !== 'undefined') {
            WindowTest.runFullTest();
        } else {
            showErrorNotification('Función no disponible', 'La función para ejecutar pruebas no está disponible.');
        }
    });
    
    $('#btn-close-all').on('click', function() {
        const confirmClose = confirm("¿Está seguro que desea cerrar todas las ventanas?");
        if (confirmClose && typeof WindowManager !== 'undefined') {
            WindowManager.closeAllWindows();
        }
    });
}

/**
 * Añade estilos inline a los botones del dashboard
 */
function addDashboardStyles() {
    $('.dashboard-button').css({
        'padding': '8px 12px',
        'background-color': '#1a73e8',
        'color': 'white',
        'border': 'none',
        'border-radius': '4px',
        'cursor': 'pointer',
        'margin-top': '10px',
        'margin-right': '10px',
        'transition': 'background-color 0.2s'
    });
    
    $('.dashboard-button').hover(
        function() { $(this).css('background-color', '#2b7de9'); },
        function() { $(this).css('background-color', '#1a73e8'); }
    );
    
    $('.dashboard-button.system').css('background-color', '#34495e');
    $('.dashboard-button.system').hover(
        function() { $(this).css('background-color', '#3d5a6c'); },
        function() { $(this).css('background-color', '#34495e'); }
    );
    
    $('.dashboard-button.warning').css('background-color', '#e74c3c');
    $('.dashboard-button.warning').hover(
        function() { $(this).css('background-color', '#e95c4f'); },
        function() { $(this).css('background-color', '#e74c3c'); }
    );
}

/**
 * Muestra un selector de baterías para ver detalles
 */
function showBatterySelector() {
    // Obtener datos de baterías
    $.ajax({
        url: '/api/batteries/status',
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            if (data.status !== 'success' || !data.batteries || data.batteries.length === 0) {
                showErrorNotification('No hay datos disponibles', 
                    'No se encontraron datos de baterías para mostrar. Asegúrese de que la conexión esté activa y que haya iniciado el monitoreo.');
                return;
            }
            
            // Crear contenido con lista de baterías
            let content = `
                <div style="padding: 20px;">
                    <h3 style="margin-top: 0;">Seleccione una Batería</h3>
                    <div style="margin-top: 15px; max-height: 250px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #f0f0f0;">
                                    <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">ID</th>
                                    <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Nombre</th>
                                    <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Estado</th>
                                    <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">SOC</th>
                                    <th style="text-align: center; padding: 8px; border: 1px solid #ddd;">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            // Añadir fila para cada batería
            data.batteries.forEach(function(battery) {
                const customName = battery.device_info && battery.device_info.custom_name 
                    ? battery.device_info.custom_name 
                    : `Batería ${battery.id}`;
                
                content += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">${battery.id}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${customName}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${battery.status || 'Desconocido'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${battery.soc !== undefined ? battery.soc + '%' : 'N/A'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                            <button class="select-battery-btn" data-battery-id="${battery.id}" 
                                style="padding: 5px 10px; background-color: #1a73e8; color: white; border: none; border-radius: 3px; cursor: pointer;">
                                Ver Detalles
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            // Cerrar tabla y contenido
            content += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Crear ventana
            const selectorWindowId = WindowManager.createWindow({
                title: "Selector de Batería",
                width: 600,
                height: 400,
                content: content
            });
            
            // Añadir eventos a los botones
            $(`.select-battery-btn`).on('click', function() {
                const batteryId = $(this).data('battery-id');
                if (typeof openBatteryDetailWindow === 'function') {
                    openBatteryDetailWindow(batteryId);
                    // Cerrar ventana de selección
                    WindowManager.closeWindow(selectorWindowId);
                } else {
                    showErrorNotification('Función no disponible', 
                        'La función para ver detalles de batería no está disponible.');
                }
            });
        },
        error: function(xhr, status, error) {
            showErrorNotification('Error al obtener datos', 
                `No se pudieron obtener los datos de las baterías: ${error}`);
        }
    });
}

/**
 * Configura notificaciones del sistema
 */
function setupSystemNotifications() {
    // Este sistema podría expandirse en el futuro
    console.log('WindowSystemInit: Sistema de notificaciones configurado');
}

/**
 * Muestra una notificación de error
 */
function showErrorNotification(title, message) {
    if (typeof WindowManager === 'undefined') {
        alert(`Error: ${title}\n\n${message}`);
        return;
    }
    
    WindowManager.createWindow({
        title: "Error",
        width: 400,
        height: 250,
        content: `
            <div class="notification-window">
                <h3>${title}</h3>
                <div class="notification-content">
                    <p>${message}</p>
                </div>
                <div class="notification-actions">
                    <button class="notification-button primary close-notification">Aceptar</button>
                </div>
            </div>
        `
    });
    
    // Asignar evento al botón
    $('.close-notification').on('click', function() {
        const $window = $(this).closest('.ui-dialog-content');
        if ($window.length > 0) {
            $window.dialog('close');
        }
    });
}