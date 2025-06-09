/**
 * chartsAndFlow.js - Gráficos de Monitoreo y Flujo de Energía
 * Configuración de Chart.js y visualización de datos en tiempo real
 */

let monitoringChart = null;

/**
 * Inicializa el gráfico de monitoreo
 */
function initializeMonitoringChart() {
    const canvas = document.getElementById('monitoring-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    
    const ctx = canvas.getContext('2d');
    
    // Datos simulados para el gráfico
    const timeLabels = [];
    const socData = [];
    const voltageData = [];
    const currentData = [];
    
    // Generar datos de las últimas 24 horas
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
        const time = new Date(now - i * 60 * 60 * 1000);
        timeLabels.push(time.getHours().toString().padStart(2, '0') + ':00');
        
        // Simular patrones realistas
        socData.push(Math.max(20, Math.min(100, 61.47 + (Math.random() - 0.5) * 20)));
        voltageData.push(Math.max(48, Math.min(56, 52.8 + (Math.random() - 0.5) * 4)));
        currentData.push(Math.max(-15, Math.min(15, -8.5 + (Math.random() - 0.5) * 10)));
    }
    
    monitoringChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: 'SOC (%)',
                    data: socData,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    yAxisID: 'y-soc',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Voltaje (V)',
                    data: voltageData,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    yAxisID: 'y-voltage',
                    fill: false,
                    tension: 0.3
                },
                {
                    label: 'Corriente (A)',
                    data: currentData,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    yAxisID: 'y-current',
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Usaremos leyenda personalizada
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                },
                'y-soc': {
                    type: 'linear',
                    position: 'left',
                    min: 0,
                    max: 100,
                    grid: {
                        color: 'rgba(46, 204, 113, 0.2)'
                    },
                    ticks: {
                        color: '#2ecc71'
                    }
                },
                'y-voltage': {
                    type: 'linear',
                    position: 'right',
                    min: 45,
                    max: 58,
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#3498db'
                    }
                },
                'y-current': {
                    type: 'linear',
                    position: 'right',
                    min: -20,
                    max: 20,
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#e74c3c'
                    }
                }
            }
        }
    });
    
    // Crear leyenda personalizada
    createCustomLegend();
}

/**
 * Crea leyenda personalizada para el gráfico
 */
function createCustomLegend() {
    const legendContainer = document.getElementById('chart-legend');
    if (!legendContainer) return;
    
    legendContainer.innerHTML = `
        <div class="legend-item">
            <div class="legend-color" style="background: #2ecc71;"></div>
            <span class="legend-label">SOC (%)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #3498db;"></div>
            <span class="legend-label">Voltaje (V)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #e74c3c;"></div>
            <span class="legend-label">Corriente (A)</span>
        </div>
    `;
}

/**
 * Actualiza los datos del gráfico de monitoreo
 * @param {Object} newData - Nuevos datos para actualizar
 */
function updateMonitoringChart(newData) {
    if (!monitoringChart) return;
    
    // Agregar nuevos datos y mantener solo las últimas 24 horas
    const datasets = monitoringChart.data.datasets;
    const labels = monitoringChart.data.labels;
    
    // Añadir nueva etiqueta de tiempo
    const now = new Date();
    const timeLabel = now.getHours().toString().padStart(2, '0') + ':' + 
                     now.getMinutes().toString().padStart(2, '0');
    
    labels.push(timeLabel);
    if (labels.length > 24) {
        labels.shift(); // Remover el más antiguo
    }
    
    // Actualizar datasets
    if (newData.soc !== undefined) {
        datasets[0].data.push(newData.soc);
        if (datasets[0].data.length > 24) {
            datasets[0].data.shift();
        }
    }
    
    if (newData.voltage !== undefined) {
        datasets[1].data.push(newData.voltage);
        if (datasets[1].data.length > 24) {
            datasets[1].data.shift();
        }
    }
    
    if (newData.current !== undefined) {
        datasets[2].data.push(newData.current);
        if (datasets[2].data.length > 24) {
            datasets[2].data.shift();
        }
    }
    
    // Actualizar el gráfico
    monitoringChart.update();
}

/**
 * Destruye el gráfico de monitoreo
 */
function destroyMonitoringChart() {
    if (monitoringChart) {
        monitoringChart.destroy();
        monitoringChart = null;
    }
}

// Exportar funciones para uso global
window.initializeMonitoringChart = initializeMonitoringChart;
window.createCustomLegend = createCustomLegend;
window.updateMonitoringChart = updateMonitoringChart;
window.destroyMonitoringChart = destroyMonitoringChart;