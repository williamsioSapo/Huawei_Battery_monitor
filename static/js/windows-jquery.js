// static/js/windows-jquery.js
'use strict';

/**
 * Sistema de ventanas basado en jQuery usando jquery.window
 * Reemplazo de los componentes WindowBase, WindowManager, etc.
 */
(function($) {
    // Verificar que jquery.window está disponible
    if (typeof $.fn.window !== 'function') {
        console.error('Error: jquery.window no está disponible. Asegúrate de haberlo incluido antes de este script.');
        return;
    }
    
    // Configuración global de ventanas
    const windowDefaults = {
        width: 600,
        height: 400,
        minWidth: 200,
        minHeight: 150,
        maximizable: true,
        minimizable: true,
        draggable: true,
        resizable: true,
        closable: true,
        onClose: function() {
            console.log('Ventana cerrada:', this.title);
        }
    };
    
    // Registro de ventanas activas
    const activeWindows = {};
    
    // Próximo ID de ventana
    let nextWindowId = 1;
    
    // Crear una ventana de prueba 1 (simple)
    function openTestWindow1() {
        const windowId = `window-${nextWindowId++}`;
        const containerId = `container-${windowId}`;
        
        // Crear contenedor para la ventana
        $('body').append(`<div id="${containerId}" class="window-container"></div>`);
        
        // Inicializar ventana
        $(`#${containerId}`).window($.extend({}, windowDefaults, {
            title: 'Ventana de Prueba 1',
            x: 100 + (Object.keys(activeWindows).length * 30),
            y: 100 + (Object.keys(activeWindows).length * 30),
            content: `
                <h3>Contenido de prueba - Ventana 1</h3>
                <p>Esta es una ventana de ejemplo que demuestra el sistema de ventanas arrastrable.</p>
                <ul>
                    <li>Arrastra desde la barra de título para mover la ventana</li>
                    <li>Redimensiona desde los bordes y esquinas</li>
                    <li>Haz clic en la ventana para traerla al frente</li>
                    <li>Usa los botones para minimizar o cerrar</li>
                </ul>
                <div style="margin-top: 20px;">
                    <button id="test-btn-${windowId}" style="padding: 8px 12px; margin-right: 10px;">Botón de prueba</button>
                    <input type="text" placeholder="Entrada de prueba" style="padding: 8px;">
                </div>
            `,
            afterOpen: function() {
                // Ejemplo de interacción con el contenido
                $(`#test-btn-${windowId}`).on('click', function() {
                    alert('Botón de prueba clickeado');
                });
            }
        }));
        
        // Almacenar referencia
        activeWindows[windowId] = {
            id: windowId,
            containerId: containerId,
            windowObj: $(`#${containerId}`).data('window')
        };
        
        console.log(`Ventana de prueba 1 creada con ID: ${windowId}`);
        return windowId;
    }
    
    // Crear una ventana de prueba 2 (con gráficas)
    function openTestWindow2() {
        const windowId = `window-${nextWindowId++}`;
        const containerId = `container-${windowId}`;
        const chartId = `chart-${windowId}`;
        
        // Crear contenedor para la ventana
        $('body').append(`<div id="${containerId}" class="window-container"></div>`);
        
        // Inicializar ventana
        $(`#${containerId}`).window($.extend({}, windowDefaults, {
            title: 'Ventana de Prueba 2 (con gráfica)',
            width: 750,
            height: 500,
            x: 150 + (Object.keys(activeWindows).length * 30),
            y: 150 + (Object.keys(activeWindows).length * 30),
            content: `
                <h3>Datos Históricos de Batería</h3>
                
                <div class="tab-container" style="display: flex; border-bottom: 1px solid #ddd; margin-bottom: 15px;">
                    <div class="tab active" data-tab="voltage" style="padding: 8px 16px; cursor: pointer; background-color: #f0f0f0; font-weight: bold; border-bottom: 2px solid #2ecc71;">
                        Voltaje
                    </div>
                    <div class="tab" data-tab="current" style="padding: 8px 16px; cursor: pointer;">
                        Corriente
                    </div>
                    <div class="tab" data-tab="soc" style="padding: 8px 16px; cursor: pointer;">
                        Estado de Carga
                    </div>
                </div>
                
                <div class="tab-content">
                    <div class="chart-container" style="height: 300px;">
                        <canvas id="${chartId}"></canvas>
                    </div>
                </div>
                
                <div style="margin-top: 15px; display: flex; justify-content: space-between;">
                    <button id="simulate-btn-${windowId}" style="padding: 8px 15px; background-color: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Simular Nueva Lectura
                    </button>
                    <div>
                        <select id="timerange-${windowId}" style="padding: 7px; margin-right: 10px;">
                            <option>Últimas 12 horas</option>
                            <option>Últimas 24 horas</option>
                            <option>Última semana</option>
                        </select>
                        <button style="padding: 8px 15px;">Exportar Datos</button>
                    </div>
                </div>
            `,
            afterOpen: function() {
                // Inicializar datos
                const batteryData = [
                    { time: '00:00', voltage: 50.2, current: 1.2, soc: 85 },
                    { time: '01:00', voltage: 49.8, current: 0.8, soc: 83 },
                    { time: '02:00', voltage: 49.5, current: -0.2, soc: 82 },
                    { time: '03:00', voltage: 49.3, current: -0.5, soc: 80 },
                    { time: '04:00', voltage: 49.0, current: -0.6, soc: 78 },
                    { time: '05:00', voltage: 48.8, current: -0.4, soc: 77 },
                    { time: '06:00', voltage: 49.1, current: 0.7, soc: 78 },
                    { time: '07:00', voltage: 49.5, current: 1.2, soc: 80 },
                    { time: '08:00', voltage: 50.0, current: 1.5, soc: 82 },
                    { time: '09:00', voltage: 50.5, current: 1.8, soc: 84 },
                    { time: '10:00', voltage: 51.0, current: 2.0, soc: 87 },
                    { time: '11:00', voltage: 51.5, current: 1.6, soc: 90 }
                ];
                
                // Almacenar datos en el objeto de la ventana
                activeWindows[windowId].data = batteryData;
                
                // Inicializar gráfica
                initChart(chartId, batteryData, 'voltage');
                
                // Manejar pestañas
                $(`#${containerId} .tab`).on('click', function() {
                    const tab = $(this).data('tab');
                    
                    // Actualizar estilos
                    $(`#${containerId} .tab`).removeClass('active').css({
                        'background-color': 'transparent',
                        'font-weight': 'normal',
                        'border-bottom': 'none'
                    });
                    
                    $(this).addClass('active').css({
                        'background-color': '#f0f0f0',
                        'font-weight': 'bold',
                        'border-bottom': '2px solid #2ecc71'
                    });
                    
                    // Actualizar gráfica
                    initChart(chartId, batteryData, tab);
                });
                
                // Manejar botón de simulación
                $(`#simulate-btn-${windowId}`).on('click', function() {
                    simulateNewReading(windowId, chartId);
                });
            }
        }));
        
        // Almacenar referencia
        activeWindows[windowId] = {
            id: windowId,
            containerId: containerId,
            windowObj: $(`#${containerId}`).data('window'),
            chartId: chartId
        };
        
        console.log(`Ventana de prueba 2 creada con ID: ${windowId}`);
        return windowId;
    }
    
    // Inicializar gráfica con Chart.js
    function initChart(chartId, data, dataType) {
        // Destruir gráfica existente si hay una
        if (window.charts && window.charts[chartId]) {
            window.charts[chartId].destroy();
        }
        
        // Configurar datos según el tipo
        let chartTitle, dataKey, yAxisLabel, lineColor;
        
        switch (dataType) {
            case 'current':
                chartTitle = 'Corriente de Batería';
                dataKey = 'current';
                yAxisLabel = 'Corriente (A)';
                lineColor = '#82ca9d';
                break;
            case 'soc':
                chartTitle = 'Estado de Carga';
                dataKey = 'soc';
                yAxisLabel = 'SOC (%)';
                lineColor = '#ffc658';
                break;
            case 'voltage':
            default:
                chartTitle = 'Voltaje de Batería';
                dataKey = 'voltage';
                yAxisLabel = 'Voltaje (V)';
                lineColor = '#8884d8';
                break;
        }
        
        // Preparar datos para Chart.js
        const times = data.map(item => item.time);
        const values = data.map(item => item[dataKey]);
        
        // Crear gráfica
        const ctx = document.getElementById(chartId).getContext('2d');
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: times,
                datasets: [{
                    label: chartTitle,
                    data: values,
                    borderColor: lineColor,
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: chartTitle
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw} ${dataType === 'soc' ? '%' : dataType === 'voltage' ? 'V' : 'A'}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Hora'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: yAxisLabel
                        }
                    }
                }
            }
        });
        
        // Almacenar referencia a la gráfica
        if (!window.charts) window.charts = {};
        window.charts[chartId] = chart;
        
        return chart;
    }
    
    // Simular nueva lectura
    function simulateNewReading(windowId, chartId) {
        if (!activeWindows[windowId] || !activeWindows[windowId].data) {
            console.error('No se encontraron datos para la ventana', windowId);
            return;
        }
        
        const data = activeWindows[windowId].data;
        const lastEntry = data[data.length - 1];
        
        // Obtener hora de la última entrada y calcular la siguiente
        const lastTime = lastEntry.time;
        const lastHour = parseInt(lastTime.split(':')[0]);
        const newHour = (lastHour + 1) % 24;
        const newTime = `${String(newHour).padStart(2, '0')}:00`;
        
        // Generar fluctuaciones aleatorias
        const newVoltage = Math.max(48, Math.min(52, lastEntry.voltage + (Math.random() - 0.5) * 0.8));
        const newCurrent = Math.max(-2, Math.min(3, lastEntry.current + (Math.random() - 0.5) * 0.7));
        const newSoc = Math.max(50, Math.min(100, lastEntry.soc + Math.round((newCurrent > 0 ? 1 : -1) * Math.random() * 3)));
        
        // Añadir nueva entrada
        const newEntry = {
            time: newTime,
            voltage: parseFloat(newVoltage.toFixed(1)),
            current: parseFloat(newCurrent.toFixed(1)),
            soc: newSoc
        };
        
        // Eliminar primera entrada y añadir la nueva
        data.shift();
        data.push(newEntry);
        
        // Actualizar gráfica
        const activeTab = $(`#container-${windowId} .tab.active`).data('tab') || 'voltage';
        initChart(chartId, data, activeTab);
        
        console.log('Nueva lectura simulada:', newEntry);
    }
    
    // Exportar funciones al objeto global
    window.WindowSystem = {
        openTestWindow1: openTestWindow1,
        openTestWindow2: openTestWindow2,
        getActiveWindows: function() {
            return Object.keys(activeWindows).length;
        }
    };
    
})(jQuery);

// Inicializar los botones del sistema de ventanas cuando se carga el documento
$(document).ready(function() {
    // Crear panel de botones de demostración si no existe
    if ($('#window-buttons-panel').length === 0) {
        const panel = $(`
            <div id="window-buttons-panel" style="position: fixed; top: 80px; right: 20px; z-index: 9999; 
                 background-color: #f8f8f8; border-radius: 8px; padding: 15px; box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3); 
                 border: 1px solid #ddd;">
                <h4 style="margin: 0 0 10px 0; text-align: center; font-size: 16px; color: #333;">Prueba de Ventanas</h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button id="btn-window1" style="padding: 10px 15px; background-color: #3498db; color: white; 
                            border: none; border-radius: 4px; cursor: pointer; font-weight: bold; 
                            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);">
                        Abrir Ventana 1
                    </button>
                    <button id="btn-window2" style="padding: 10px 15px; background-color: #2ecc71; color: white; 
                            border: none; border-radius: 4px; cursor: pointer; font-weight: bold; 
                            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);">
                        Abrir Ventana 2 (Gráfica)
                    </button>
                    <div id="windows-count" style="font-size: 12px; margin-top: 10px; text-align: center; color: #666;">
                        Ventanas abiertas: 0
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(panel);
    }
    
    // Asignar eventos a los botones
    $('#btn-window1').on('click', function() {
        window.WindowSystem.openTestWindow1();
        updateWindowCount();
    });
    
    $('#btn-window2').on('click', function() {
        window.WindowSystem.openTestWindow2();
        updateWindowCount();
    });
    
    // Función para actualizar contador de ventanas
    function updateWindowCount() {
        $('#windows-count').text(`Ventanas abiertas: ${window.WindowSystem.getActiveWindows()}`);
    }
});