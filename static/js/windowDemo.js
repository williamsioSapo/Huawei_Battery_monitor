/**
 * WindowDemo.js - Ejemplos de uso del sistema de ventanas
 * Este archivo contiene funciones para crear ventanas de demostración
 */

// Ejecutar cuando el DOM esté listo
$(document).ready(function() {
    console.log('WindowDemo inicializado');
    
    // Crear panel de botones de demostración
    createDemoPanel();
    
    // Comprobar si debemos iniciar automáticamente
    if (getUrlParameter('autostart') === 'true') {
        openWelcomeWindow();
    }
});

/**
 * Crea un panel flotante con botones de demostración
 */
function createDemoPanel() {
    // Verificar si ya existe
    if ($('#window-demo-panel').length > 0) {
        return;
    }
    
    // Crear el panel
    const $panel = $(`
        <div id="window-demo-panel">
            <h3>Demostración de Ventanas</h3>
            <div class="demo-buttons">
                <button id="btn-create-basic">Ventana Básica</button>
                <button id="btn-create-chart">Ventana con Gráfico</button>
                <button id="btn-create-form">Ventana con Formulario</button>
                <button id="btn-close-all">Cerrar Todas</button>
            </div>
        </div>
    `);
    
    // Añadir eventos a los botones
    $panel.find('#btn-create-basic').on('click', openBasicWindow);
    $panel.find('#btn-create-chart').on('click', openChartWindow);
    $panel.find('#btn-create-form').on('click', openFormWindow);
    $panel.find('#btn-close-all').on('click', function() {
        WindowManager.closeAllWindows();
    });
    
    // Añadir al DOM
    $('body').append($panel);
    
    // Estilos inline (temporales, idealmente deberían ir en CSS)
    $panel.css({
        'position': 'fixed',
        'top': '20px',
        'right': '20px',
        'width': '220px',
        'background-color': '#f8f9fa',
        'border': '1px solid #ddd',
        'border-radius': '8px',
        'padding': '15px',
        'box-shadow': '0 2px 10px rgba(0,0,0,0.2)',
        'z-index': '999'
    });
    
    $panel.find('h3').css({
        'margin': '0 0 15px 0',
        'font-size': '16px',
        'text-align': 'center'
    });
    
    $panel.find('.demo-buttons').css({
        'display': 'flex',
        'flex-direction': 'column',
        'gap': '8px'
    });
    
    $panel.find('button').css({
        'padding': '8px 12px',
        'background-color': '#1a73e8',
        'color': 'white',
        'border': 'none',
        'border-radius': '4px',
        'cursor': 'pointer',
        'transition': 'background-color 0.2s'
    });
    
    $panel.find('button').hover(
        function() { $(this).css('background-color', '#2b7de9'); },
        function() { $(this).css('background-color', '#1a73e8'); }
    );
    
    $panel.find('#btn-close-all').css('background-color', '#e74c3c');
    $panel.find('#btn-close-all').hover(
        function() { $(this).css('background-color', '#e95c4f'); },
        function() { $(this).css('background-color', '#e74c3c'); }
    );
	//agregado al vuelo como paso final.
	// Añadir después de los botones existentes
	$panel.find('.demo-buttons').append(`
		<button id="btn-run-tests" style="background-color: #9b59b6;">Ejecutar Pruebas</button>
		<button id="btn-show-stats" style="background-color: #34495e;">Ver Estadísticas</button>
	`);

	// Añadir eventos a los nuevos botones
	$panel.find('#btn-run-tests').on('click', function() {
		if (typeof WindowTest !== 'undefined') {
			WindowTest.runFullTest();
		} else {
			alert('Error: WindowTest no está disponible');
		}
	});

	$panel.find('#btn-show-stats').on('click', function() {
		if (typeof WindowTest !== 'undefined') {
			WindowTest.showWindowStats();
		} else {
			alert('Error: WindowTest no está disponible');
		}
	});

	// Aplicar estilos a los nuevos botones
	$panel.find('#btn-run-tests, #btn-show-stats').css({
		'padding': '8px 12px',
		'color': 'white',
		'border': 'none',
		'border-radius': '4px',
		'cursor': 'pointer',
		'transition': 'background-color 0.2s'
	});

	$panel.find('#btn-run-tests').hover(
		function() { $(this).css('background-color', '#a56bc1'); },
		function() { $(this).css('background-color', '#9b59b6'); }
	);

	$panel.find('#btn-show-stats').hover(
		function() { $(this).css('background-color', '#3d5a6c'); },
		function() { $(this).css('background-color', '#34495e'); }
	);
	
}

/**
 * Abre una ventana de bienvenida
 */
function openWelcomeWindow() {
    WindowManager.createWindow({
        title: "Bienvenido al Sistema de Ventanas",
        width: 500,
        height: 300,
        content: `
            <div style="padding: 20px; text-align: center;">
                <h2 style="margin-top: 0;">Sistema de Ventanas</h2>
                <p>Esta es una demostración del sistema de ventanas estilo Windows 10.</p>
                <p>Características:</p>
                <ul style="text-align: left; display: inline-block;">
                    <li>Arrastrar ventanas</li>
                    <li>Redimensionar ventanas</li>
                    <li>Minimizar/Maximizar</li>
                    <li>Barra de tareas</li>
                </ul>
                <p>Utiliza los botones en el panel de la derecha para crear diferentes tipos de ventanas.</p>
            </div>
        `
    });
}

/**
 * Abre una ventana básica
 */
function openBasicWindow() {
    const windowId = WindowManager.createWindow({
        title: "Ventana Básica",
        width: 400,
        height: 300,
        content: `
            <div style="padding: 15px;">
                <h3 style="margin-top: 0;">Esta es una ventana básica</h3>
                <p>Puedes arrastrarla desde la barra de título, redimensionarla desde los bordes y utilizar los botones para minimizar, maximizar o cerrar.</p>
                <button id="test-button" style="padding: 8px 15px; margin-top: 10px;">Botón de prueba</button>
            </div>
        `,
        position: { my: "center", at: "center", of: window }
    });
    
    // Añadir evento al botón después de que la ventana esté creada
    $(`#${windowId}`).find('#test-button').on('click', function() {
        alert('¡El botón funciona!');
    });
}

/**
 * Abre una ventana con un gráfico
 */
function openChartWindow() {
    // Generar ID único para el canvas
    const chartId = 'chart-' + Date.now();
    
    const windowId = WindowManager.createWindow({
        title: "Gráfico de Ejemplo",
        width: 600,
        height: 400,
        content: `
            <div style="padding: 15px;">
                <h3 style="margin-top: 0;">Gráfico de Datos</h3>
                <div style="height: 250px;">
                    <canvas id="${chartId}"></canvas>
                </div>
            </div>
        `,
        position: { my: "center", at: "center", of: window }
    });
    
    // Inicializar el gráfico después de que la ventana esté creada
    setTimeout(function() {
        const ctx = document.getElementById(chartId).getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'],
                datasets: [{
                    label: 'Ventas 2023',
                    data: [12, 19, 3, 5, 2, 3],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }, 100);
}

/**
 * Abre una ventana con un formulario
 */
function openFormWindow() {
    WindowManager.createWindow({
        title: "Formulario de Ejemplo",
        width: 500,
        height: 400,
        content: `
            <div style="padding: 20px;">
                <h3 style="margin-top: 0;">Formulario de Contacto</h3>
                <form id="demo-form">
                    <div style="margin-bottom: 15px;">
                        <label for="name" style="display: block; margin-bottom: 5px;">Nombre:</label>
                        <input type="text" id="name" style="width: 100%; padding: 8px; box-sizing: border-box;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="email" style="display: block; margin-bottom: 5px;">Email:</label>
                        <input type="email" id="email" style="width: 100%; padding: 8px; box-sizing: border-box;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="message" style="display: block; margin-bottom: 5px;">Mensaje:</label>
                        <textarea id="message" rows="4" style="width: 100%; padding: 8px; box-sizing: border-box;"></textarea>
                    </div>
                    
                    <div>
                        <button type="submit" style="padding: 8px 20px; background-color: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer;">Enviar</button>
                        <button type="reset" style="padding: 8px 20px; background-color: #f1f1f1; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; margin-left: 10px;">Limpiar</button>
                    </div>
                </form>
            </div>
        `,
        position: { my: "center", at: "center", of: window }
    });
    
    // Prevenir envío del formulario
    $('#demo-form').on('submit', function(e) {
        e.preventDefault();
        alert('Formulario enviado (simulación)');
    });
}

/**
 * Obtiene un parámetro de la URL por su nombre
 */
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}