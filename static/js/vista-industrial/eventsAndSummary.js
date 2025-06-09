/**
 * eventsAndSummary.js - Log de Eventos y Resumen Mensual
 * Gestión del registro de eventos y estadísticas del resumen mensual
 */

/**
 * Inicializa el log de eventos
 */
function initializeEventsLog() {
    const eventsContainer = document.getElementById('events-container');
    if (!eventsContainer) return;
    
    // Generar eventos simulados
    const events = generateSimulatedEvents();
    
    eventsContainer.innerHTML = events.map(event => `
        <div class="event-item ${event.type}">
            <div class="event-time">${event.time}</div>
            <div class="event-message">${event.message}</div>
        </div>
    `).join('');
}

/**
 * Genera eventos simulados para el log
 */
function generateSimulatedEvents() {
    const eventTypes = [
        { type: 'info', message: 'Batería conectada correctamente' },
        { type: 'charging', message: 'Iniciando proceso de carga' },
        { type: 'discharging', message: 'Iniciando descarga de batería' },
        { type: 'warning', message: 'Temperatura elevada detectada' },
        { type: 'success', message: 'Carga completada al 100%' },
        { type: 'info', message: 'Balanceo de celdas activado' },
        { type: 'normal', message: 'Sistema funcionando normalmente' }
    ];
    
    const events = [];
    const now = new Date();
    
    for (let i = 0; i < 15; i++) {
        const eventTime = new Date(now - i * 15 * 60 * 1000); // Cada 15 minutos
        const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        
        events.push({
            time: eventTime.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            }),
            type: randomEvent.type,
            message: randomEvent.message
        });
    }
    
    return events;
}

/**
 * Añade un nuevo evento al log
 * @param {string} type - Tipo de evento (info, warning, error, etc.)
 * @param {string} message - Mensaje del evento
 */
function addEventToLog(type, message) {
    const eventsContainer = document.getElementById('events-container');
    if (!eventsContainer) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Crear nuevo elemento de evento
    const eventElement = document.createElement('div');
    eventElement.className = `event-item ${type}`;
    eventElement.innerHTML = `
        <div class="event-time">${timeString}</div>
        <div class="event-message">${message}</div>
    `;
    
    // Añadir al principio del contenedor
    eventsContainer.insertBefore(eventElement, eventsContainer.firstChild);
    
    // Mantener solo los últimos 15 eventos
    const eventItems = eventsContainer.querySelectorAll('.event-item');
    if (eventItems.length > 15) {
        for (let i = 15; i < eventItems.length; i++) {
            eventItems[i].remove();
        }
    }
    
    // Auto-scroll al nuevo evento
    eventsContainer.scrollTop = 0;
}

/**
 * Actualiza las estadísticas del resumen mensual
 * @param {Object} stats - Nuevas estadísticas
 */
function updateMonthlySummaryStats(stats) {
    // Actualizar total cargado
    const totalChargedElement = document.querySelector('.summary-metric.charging .summary-value');
    if (totalChargedElement && stats.totalCharged !== undefined) {
        totalChargedElement.textContent = `${stats.totalCharged} kWh`;
    }
    
    // Actualizar total descargado
    const totalDischargedElement = document.querySelector('.summary-metric.discharging .summary-value');
    if (totalDischargedElement && stats.totalDischarged !== undefined) {
        totalDischargedElement.textContent = `${stats.totalDischarged} kWh`;
    }
    
    // Actualizar eficiencia
    const efficiencyElement = document.querySelector('.efficiency-value');
    if (efficiencyElement && stats.efficiency !== undefined) {
        efficiencyElement.textContent = `${stats.efficiency}%`;
    }
    
    // Actualizar días activos
    const activeDaysElement = document.querySelector('.stat-item:first-child .stat-value');
    if (activeDaysElement && stats.activeDays !== undefined) {
        activeDaysElement.textContent = stats.activeDays;
    }
    
    // Actualizar ciclos completados
    const cyclesElement = document.querySelector('.stat-item:last-child .stat-value');
    if (cyclesElement && stats.completedCycles !== undefined) {
        cyclesElement.textContent = stats.completedCycles;
    }
}

/**
 * Genera estadísticas simuladas para el resumen mensual
 * @returns {Object} Estadísticas simuladas
 */
function generateMonthlySummaryStats() {
    const baseCharged = 1247;
    const baseDischarged = 1089;
    
    // Añadir variación aleatoria pequeña
    const totalCharged = baseCharged + Math.round((Math.random() - 0.5) * 100);
    const totalDischarged = baseDischarged + Math.round((Math.random() - 0.5) * 80);
    
    // Calcular eficiencia
    const efficiency = Math.round((totalDischarged / totalCharged) * 100 * 100) / 100;
    
    return {
        totalCharged: totalCharged.toLocaleString(),
        totalDischarged: totalDischarged.toLocaleString(),
        efficiency: efficiency,
        activeDays: `${28 + Math.floor(Math.random() * 3)}/31`,
        completedCycles: 42 + Math.floor(Math.random() * 10)
    };
}

/**
 * Actualiza el período del resumen mensual
 * @param {string} period - Nuevo período (ej: "Enero 2025")
 */
function updateSummaryPeriod(period) {
    const periodElement = document.querySelector('.period-label');
    if (periodElement) {
        periodElement.textContent = period;
    }
}

/**
 * Limpia el log de eventos
 */
function clearEventsLog() {
    const eventsContainer = document.getElementById('events-container');
    if (eventsContainer) {
        eventsContainer.innerHTML = '';
    }
}

// Exportar funciones para uso global
window.initializeEventsLog = initializeEventsLog;
window.generateSimulatedEvents = generateSimulatedEvents;
window.addEventToLog = addEventToLog;
window.updateMonthlySummaryStats = updateMonthlySummaryStats;
window.generateMonthlySummaryStats = generateMonthlySummaryStats;
window.updateSummaryPeriod = updateSummaryPeriod;
window.clearEventsLog = clearEventsLog;