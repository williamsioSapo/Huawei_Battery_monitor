/**
 * Componente para la pestaña de Histórico
 * Muestra datos históricos y gráficos
 */
// static/js/battery-components/tabs/HistoryTab.js
const HistoryTab = {
    // Referencia al gráfico
    _chart: null,
    
    /**
     * Renderiza el contenido de la pestaña Histórico
     * @param {Object} batteryData - Datos de la batería
     * @param {Object} detailedInfo - Información detallada opcional
     * @param {jQuery} $container - Contenedor donde renderizar
     */
    render: function(batteryData, detailedInfo, $container) {
        if (!batteryData) {
            $container.html('<div class="tab-error">No hay datos disponibles</div>');
            return;
        }
        
        // Verificar disponibilidad de Chart.js
        const chartAvailable = typeof Chart !== 'undefined';
        
        // Generar ID único para el canvas
        const chartId = 'battery-history-chart-' + Date.now();
        
        // Estructura HTML del componente
        const html = `
            <div class="history-info-container">
                <div class="battery-header">
                    <h3>Datos Históricos</h3>
                    <div class="history-controls">
                        <select class="history-period-select">
                            <option value="day">Últimas 24 horas</option>
                            <option value="week">Última semana</option>
                            <option value="month">Último mes</option>
                        </select>
                    </div>
                </div>
                
                ${chartAvailable ? `
                    <div class="chart-container">
                        <canvas id="${chartId}"></canvas>
                    </div>
                ` : `
                    <div class="chart-not-available">
                        <p>La visualización de gráficos requiere Chart.js, que no está disponible actualmente.</p>
                    </div>
                `}
                
                <div class="history-info-section">
                    <h4>Nota sobre Datos Históricos</h4>
                    <div class="info-text">
                        <p>La funcionalidad de datos históricos es una vista previa. Actualmente se muestran datos simulados.</p>
                        <p>Para implementar esta funcionalidad se requiere habilitar el almacenamiento persistente de mediciones periódicas.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Añadir HTML al contenedor
        $container.html(html);
        
        // Configurar eventos y gráfico
        this._setupEvents(batteryData, chartId, $container);
        
        // Si Chart.js está disponible, crear gráfico
        if (chartAvailable) {
            this._createHistoryChart(batteryData.id, chartId);
        }
    },
    
    /**
     * Configura eventos para elementos interactivos
     * @private
     */
    _setupEvents: function(batteryData, chartId, $container) {
        const self = this;
        
        // Evento para selector de período
        $container.find('.history-period-select').on('change', function() {
            if (typeof Chart !== 'undefined') {
                const period = $(this).val();
                self._updateHistoryChart(batteryData.id, period, chartId);
            }
        });
    },
    
    /**
     * Crea un gráfico histórico simulado
     * @private
     */
    _createHistoryChart: function(batteryId, chartId) {
        // Datos simulados para el gráfico
        const data = this._generateHistoryData('day');
        
        // Obtener contexto del canvas
        const ctx = document.getElementById(chartId).getContext('2d');
        
        // Crear gráfico
        this._chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Voltaje (V)',
                        data: data.voltage,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        yAxisID: 'y-voltage',
                        fill: true,
                        tension: 0.2
                    },
                    {
                        label: 'SOC (%)',
                        data: data.soc,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        yAxisID: 'y-soc',
                        fill: true,
                        tension: 0.2
                    },
                    {
                        label: 'Corriente (A)',
                        data: data.current,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        yAxisID: 'y-current',
                        fill: true,
                        tension: 0.2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Tiempo'
                        }
                    },
                    'y-voltage': {
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Voltaje (V)'
                        },
                        suggestedMin: 48,
                        suggestedMax: 56
                    },
                    'y-soc': {
                        position: 'right',
                        title: {
                            display: true,
                            text: 'SOC (%)'
                        },
                        suggestedMin: 0,
                        suggestedMax: 100,
                        grid: {
                            drawOnChartArea: false
                        }
                    },
                    'y-current': {
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Corriente (A)'
                        },
                        suggestedMin: -25,
                        suggestedMax: 25,
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Historial Batería ${batteryId} - Últimas 24 horas`
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    },
    
    /**
     * Actualiza el gráfico histórico con nuevos datos según el período
     * @private
     */
    _updateHistoryChart: function(batteryId, period, chartId) {
        if (!this._chart) return;
        
        // Generar nuevos datos
        const data = this._generateHistoryData(period);
        
        // Actualizar título
        let titleText = `Historial Batería ${batteryId} - `;
        switch (period) {
            case 'day': titleText += 'Últimas 24 horas'; break;
            case 'week': titleText += 'Última semana'; break;
            case 'month': titleText += 'Último mes'; break;
        }
        
        this._chart.options.plugins.title.text = titleText;
        
        // Actualizar datos
        this._chart.data.labels = data.labels;
        this._chart.data.datasets[0].data = data.voltage;
        this._chart.data.datasets[1].data = data.soc;
        this._chart.data.datasets[2].data = data.current;
        
        // Actualizar gráfico
        this._chart.update();
    },
    
    /**
     * Genera datos históricos simulados según el período
     * @private
     */
    _generateHistoryData: function(period) {
        let points, interval;
        
        // Determinar número de puntos e intervalo según período
        switch (period) {
            case 'day':
                points = 24;
                interval = 'hora';
                break;
            case 'week':
                points = 7;
                interval = 'día';
                break;
            case 'month':
                points = 30;
                interval = 'día';
                break;
            default:
                points = 24;
                interval = 'hora';
        }
        
        // Generar etiquetas
        const labels = [];
        for (let i = 0; i < points; i++) {
            if (interval === 'hora') {
                labels.push(`${i}:00`);
            } else {
                labels.push(`Día ${i + 1}`);
            }
        }
        
        // Generar datos simulados
        // Comenzamos con valores base
        let baseVoltage = 52.5; // Voltaje inicial
		let baseSoc = 80; // SOC inicial
       let baseCurrent = 2; // Corriente inicial
       
       // Arrays para datos
       const voltage = [];
       const soc = [];
       const current = [];
       
       // Generar patrón para los datos
       for (let i = 0; i < points; i++) {
           // Simular ciclos de carga/descarga
           const timeOfDay = (i % 24) / 24; // 0 a 1 representando hora del día
           
           // Durante la noche (valores bajos de timeOfDay) simulamos carga
           // Durante el día simulamos descarga o uso
           const isCharging = timeOfDay < 0.3 || timeOfDay > 0.9;
           
           // Calcular fluctuaciones
           const voltageFluctuation = (Math.random() - 0.5) * 0.8;
           const socFluctuation = (Math.random() - 0.5) * 2;
           
           // Si está cargando, corriente positiva y aumento de SOC/voltaje
           // Si está descargando, corriente negativa y disminución de SOC/voltaje
           let currentValue, voltageChange, socChange;
           
           if (isCharging) {
               currentValue = 5 + (Math.random() * 3);
               voltageChange = 0.05 + (Math.random() * 0.1);
               socChange = 0.3 + (Math.random() * 0.5);
           } else {
               currentValue = -8 + (Math.random() * 5);
               voltageChange = -0.08 - (Math.random() * 0.12);
               socChange = -0.4 - (Math.random() * 0.6);
           }
           
           // Aplicar cambios
           baseVoltage += voltageChange + voltageFluctuation;
           baseSoc += socChange + socFluctuation;
           baseCurrent = currentValue;
           
           // Limitar valores a rangos realistas
           baseVoltage = Math.max(48, Math.min(56, baseVoltage));
           baseSoc = Math.max(20, Math.min(100, baseSoc));
           baseCurrent = Math.max(-20, Math.min(15, baseCurrent));
           
           // Añadir a arrays con redondeo adecuado
           voltage.push(parseFloat(baseVoltage.toFixed(2)));
           soc.push(Math.round(baseSoc));
           current.push(parseFloat(baseCurrent.toFixed(2)));
       }
       
       return { labels, voltage, soc, current };
   }
};