// static/js/dashboard.js

// Referencias a elementos del DOM para el dashboard
const batteryDashboard = document.getElementById('battery-dashboard');
const batteryVoltageEl = document.getElementById('battery-voltage');
const packVoltageEl = document.getElementById('pack-voltage');
const batteryCurrentEl = document.getElementById('battery-current');
const batterySocEl = document.getElementById('battery-soc');
const batterySohEl = document.getElementById('battery-soh');
const batteryStatusEl = document.getElementById('battery-status');
const refreshDashboardBtn = document.getElementById('refreshDashboardBtn');
const startMonitoringBtn = document.getElementById('startMonitoringBtn');
const stopMonitoringBtn = document.getElementById('stopMonitoringBtn');
const dashboardMessageEl = document.getElementById('dashboardMessage');

// Variables de control para el monitoreo
let monitoringInterval = null;
const MONITORING_INTERVAL_MS = 8000; // 8 segundos entre actualizaciones

// --- Mapeo y funciones de conversión para la batería Huawei ---
const BATTERY_REGISTERS = {
    VOLTAGE: 0,        // Voltaje de batería (factor 0.01)
    PACK_VOLTAGE: 1,   // Voltaje de pack (factor 0.01)
    CURRENT: 2,        // Corriente (factor 0.01, con signo)
    SOC: 3,            // Estado de carga (%)
    SOH: 4,            // Estado de salud (%)
    UNKNOWN_5: 5,      // Registro desconocido
    UNKNOWN_6: 6       // Registro desconocido
};

// Funciones para convertir los valores brutos en valores interpretados
function convertBatteryVoltage(rawValue) {
    return (rawValue * 0.01).toFixed(2);
}

function convertPackVoltage(rawValue) {
    return (rawValue * 0.01).toFixed(2);
}

function convertBatteryCurrent(rawValue) {
    // Manejar valores con signo (convertir complemento a 2 si es necesario)
    if (rawValue > 32767) {
        rawValue = rawValue - 65536;
    }
    return (rawValue * 0.01).toFixed(2);
}

function convertPercentage(rawValue) {
    return rawValue.toString();
}

function determineBatteryStatus(soc, current) {
    // Determinar estado basado en el SOC y la corriente
    if (current > 0) {
        return "Cargando";
    } else if (current < 0) {
        return "Descargando";
    } else {
        return "Inactivo";
    }
}

// --- Funciones para actualizar el Dashboard ---
async function updateDashboard() {
    showDashboardMessage('Actualizando datos...', 'info');
    
    try {
        // Solicitar la lectura de los primeros 7 registros (0-6)
        const result = await readModbusRegisters({
            slaveId: 217, // ID fijo para la batería
            function: 'holding',
            address: 0,
            count: 7
        });
        
        if (result.status === 'success') {
            // Actualizar los valores del dashboard
            const data = result.data;
            
            // Voltaje de batería (Registro 0)
            batteryVoltageEl.textContent = convertBatteryVoltage(data[BATTERY_REGISTERS.VOLTAGE]);
            
            // Voltaje de pack (Registro 1)
            packVoltageEl.textContent = convertPackVoltage(data[BATTERY_REGISTERS.PACK_VOLTAGE]);
            
            // Corriente (Registro 2)
            const current = convertBatteryCurrent(data[BATTERY_REGISTERS.CURRENT]);
            batteryCurrentEl.textContent = current;
            
            // SOC (Registro 3)
            const soc = convertPercentage(data[BATTERY_REGISTERS.SOC]);
            batterySocEl.textContent = soc;
            
            // SOH (Registro 4)
            batterySohEl.textContent = convertPercentage(data[BATTERY_REGISTERS.SOH]);
            
            // Estado derivado de SOC y corriente
            batteryStatusEl.textContent = determineBatteryStatus(soc, parseFloat(current));
            
            // Estilos condicionales basados en el estado
            updateDashboardStyles(soc, current);
            
            showDashboardMessage('Datos actualizados', 'success');
        } else {
            showDashboardMessage(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        showDashboardMessage(`Error: ${error.message}`, 'error');
    }
}

function updateDashboardStyles(soc, current) {
    // Aplicar estilos condicionales según los valores
    
    // SOC - Cambiar color según nivel
    const socValue = parseInt(soc);
    if (socValue < 20) {
        batterySocEl.classList.add('critical');
        batterySocEl.classList.remove('warning', 'normal');
    } else if (socValue < 40) {
        batterySocEl.classList.add('warning');
        batterySocEl.classList.remove('critical', 'normal');
    } else {
        batterySocEl.classList.add('normal');
        batterySocEl.classList.remove('critical', 'warning');
    }
    
    // Corriente - Color según carga/descarga
    const currentValue = parseFloat(current);
    if (currentValue > 0) {
        batteryCurrentEl.classList.add('charging');
        batteryCurrentEl.classList.remove('discharging', 'normal');
    } else if (currentValue < 0) {
        batteryCurrentEl.classList.add('discharging');
        batteryCurrentEl.classList.remove('charging', 'normal');
    } else {
        batteryCurrentEl.classList.add('normal');
        batteryCurrentEl.classList.remove('charging', 'discharging');
    }
}

function showDashboardMessage(message, type = 'info') {
    dashboardMessageEl.textContent = message;
    dashboardMessageEl.className = `message-area ${type}`;
}

// --- Funciones de control de monitoreo ---
function startMonitoring() {
    if (monitoringInterval) {
        stopMonitoring(); // Detener si ya está activo
    }
    
    // Actualizar inmediatamente
    updateDashboard();
    
    // Configurar intervalo para actualizaciones periódicas
    monitoringInterval = setInterval(updateDashboard, MONITORING_INTERVAL_MS);
    
    // Actualizar estado de botones
    startMonitoringBtn.disabled = true;
    stopMonitoringBtn.disabled = false;
    
    showDashboardMessage('Monitoreo en tiempo real iniciado', 'success');
}

function stopMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        
        // Actualizar estado de botones
        startMonitoringBtn.disabled = false;
        stopMonitoringBtn.disabled = true;
        
        showDashboardMessage('Monitoreo detenido', 'info');
    }
}

// --- Inicialización del Dashboard ---
function initDashboard() {
    // Mostrar el dashboard cuando la conexión esté establecida
    document.addEventListener('connection-status-change', (e) => {
        if (e.detail.connected) {
            batteryDashboard.style.display = 'block';
            // Actualizar datos inmediatamente al conectar
            updateDashboard();
        } else {
            batteryDashboard.style.display = 'none';
            stopMonitoring();
        }
    });
    
    // Configurar event listeners
    refreshDashboardBtn.addEventListener('click', updateDashboard);
    startMonitoringBtn.addEventListener('click', startMonitoring);
    stopMonitoringBtn.addEventListener('click', stopMonitoring);
}