// static/js/dashboard.js
console.log("Dashboard.js: Script cargado.");

// --- Referencias a elementos del DOM (Solo necesarios fuera del panel React) ---
const batteryDashboard = document.getElementById('battery-dashboard'); // La sección completa
const refreshDashboardBtn = document.getElementById('refreshDashboardBtn');
const startMonitoringBtn = document.getElementById('startMonitoringBtn');
const stopMonitoringBtn = document.getElementById('stopMonitoringBtn');
const dashboardMessageEl = document.getElementById('dashboardMessage');

// --- Variables de control ---
let monitoringInterval = null;
const MONITORING_INTERVAL_MS = 8000;

// --- Mapeo y funciones de conversión (Sin cambios) ---
const BATTERY_REGISTERS = {
    VOLTAGE: 0, PACK_VOLTAGE: 1, CURRENT: 2, SOC: 3, SOH: 4, UNKNOWN_5: 5, UNKNOWN_6: 6
};
function convertBatteryVoltage(rawValue) { return (rawValue * 0.01).toFixed(2); }
function convertPackVoltage(rawValue) { return (rawValue * 0.01).toFixed(2); }
function convertBatteryCurrent(rawValue) {
    if (rawValue > 32767) rawValue -= 65536;
    return (rawValue * 0.01).toFixed(2);
}
function convertPercentage(rawValue) { return rawValue.toString(); }
function determineBatteryStatus(currentValue) { // Based on numeric current
    if (currentValue > 0.05) return "Cargando";
    if (currentValue < -0.05) return "Descargando";
    return "Inactivo";
}

// --- Funciones para actualizar el Dashboard ---
async function updateDashboard() {
    console.log("Dashboard: updateDashboard - Iniciando actualización de datos.");
    showDashboardMessage('Actualizando datos...', 'info');
    let propsForReact = {
        batteryData: {},
        deviceInfo: {},
        errorMessage: null
     };

    try {
        // Ejecutar ambas peticiones en paralelo
        console.log("Dashboard: updateDashboard - Realizando llamadas API (read y device_info)...");
        const [modbusResult, deviceInfoResponse] = await Promise.all([
            readModbusRegisters({ slaveId: 217, function: 'holding', address: 0, count: 7 }),
            fetch('/api/device_info')
        ]);
        console.log("Dashboard: updateDashboard - Llamadas API completadas.");

        // Procesar Device Info
        console.log("Dashboard: updateDashboard - Procesando deviceInfoResponse...");
        if (!deviceInfoResponse.ok) {
            console.warn(`Dashboard: updateDashboard - Falló fetch device info: ${deviceInfoResponse.status}`);
            propsForReact.deviceInfo = { manufacturer: 'Error', model: `HTTP ${deviceInfoResponse.status}`, barcode: 'N/A', manufactured_date: 'N/A' };
        } else {
            const fetchedInfo = await deviceInfoResponse.json();
            if (fetchedInfo.status === 'success' && fetchedInfo.parsed_info) {
                propsForReact.deviceInfo = fetchedInfo.parsed_info;
                console.log("Dashboard: updateDashboard - Device info procesado:", propsForReact.deviceInfo);
            } else {
                console.warn(`Dashboard: updateDashboard - Device info API status: ${fetchedInfo.status}, Msg: ${fetchedInfo.message}`);
                propsForReact.deviceInfo = { manufacturer: 'N/A', model: 'N/A', barcode: 'N/A', manufactured_date: 'N/A' };
            }
        }

        // Procesar Modbus Data
        console.log("Dashboard: updateDashboard - Procesando modbusResult...");
        if (modbusResult.status === 'success' && Array.isArray(modbusResult.data) && modbusResult.data.length >= 5) {
            const rawData = modbusResult.data;
            const numericCurrent = parseFloat(convertBatteryCurrent(rawData[BATTERY_REGISTERS.CURRENT]));

            propsForReact.batteryData = {
                voltage: convertBatteryVoltage(rawData[BATTERY_REGISTERS.VOLTAGE]),
                packVoltage: convertPackVoltage(rawData[BATTERY_REGISTERS.PACK_VOLTAGE]),
                current: convertBatteryCurrent(rawData[BATTERY_REGISTERS.CURRENT]),
                soc: convertPercentage(rawData[BATTERY_REGISTERS.SOC]),
                soh: convertPercentage(rawData[BATTERY_REGISTERS.SOH]),
                status: determineBatteryStatus(numericCurrent)
            };
            propsForReact.errorMessage = null;
            console.log("Dashboard: updateDashboard - Modbus data procesado:", propsForReact.batteryData);
            showDashboardMessage('Datos actualizados', 'success');

        } else {
            const errorMsg = modbusResult.message || "Respuesta Modbus inválida";
            console.error(`Dashboard: updateDashboard - Error al leer Modbus: ${errorMsg}`);
            showDashboardMessage(`Error al leer datos: ${errorMsg}`, 'error');
            propsForReact.errorMessage = errorMsg;
            propsForReact.batteryData = { voltage: 'ERR', packVoltage: 'ERR', current: 'ERR', soc: 'ERR', soh: 'ERR', status: 'Error' };
        }

    } catch (error) {
        const errorMsg = error.message || "Error desconocido durante la actualización";
        console.error(`Dashboard: updateDashboard - Excepción: ${errorMsg}`, error);
        showDashboardMessage(`Excepción: ${errorMsg}`, 'error');
        propsForReact.errorMessage = errorMsg;
        propsForReact.batteryData = { voltage: 'EXC', packVoltage: 'EXC', current: 'EXC', soc: 'EXC', soh: 'EXC', status: 'Excepción' };
    }

    // Render React Component
    console.log("Dashboard: updateDashboard - Intentando llamar a window.updateBatteryPanel...");
    if (typeof window.updateBatteryPanel === 'function') {
        window.updateBatteryPanel(propsForReact);
        console.log("Dashboard: updateDashboard - Llamada a window.updateBatteryPanel realizada.");
    } else {
        // Este log es importante si todavía hay problemas de tiempo
        console.error("Dashboard: updateDashboard - ERROR FATAL: window.updateBatteryPanel NO está definida al intentar actualizar con datos.");
        showDashboardMessage('Error interno: Función de renderizado del panel no encontrada', 'error');
    }
}

// --- Función para mostrar mensajes en el área designada ---
function showDashboardMessage(message, type = 'info') {
    if (!dashboardMessageEl) return; // Salir si el elemento no existe
     if (dashboardMessageEl.timeoutId) clearTimeout(dashboardMessageEl.timeoutId);
     dashboardMessageEl.textContent = message;
     dashboardMessageEl.className = `message-area ${type}`;
     dashboardMessageEl.timeoutId = setTimeout(() => {
         if (dashboardMessageEl.textContent === message) {
             dashboardMessageEl.textContent = '';
             dashboardMessageEl.className = 'message-area';
         }
     }, 5000);
}

// --- Funciones de control de monitoreo ---
function startMonitoring() {
    console.log("Dashboard: startMonitoring - Iniciando monitoreo...");
    if (monitoringInterval) stopMonitoring();
    updateDashboard();
    monitoringInterval = setInterval(updateDashboard, MONITORING_INTERVAL_MS);
    if (startMonitoringBtn) startMonitoringBtn.disabled = true;
    if (stopMonitoringBtn) stopMonitoringBtn.disabled = false;
    showDashboardMessage('Monitoreo en tiempo real iniciado', 'success');
}
function stopMonitoring() {
    console.log("Dashboard: stopMonitoring - Deteniendo monitoreo...");
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        if (startMonitoringBtn) startMonitoringBtn.disabled = false;
        if (stopMonitoringBtn) stopMonitoringBtn.disabled = true;
        showDashboardMessage('Monitoreo detenido', 'info');
    }
}

// --- Inicialización del Dashboard ---
function initDashboard() {
    console.log("Dashboard: initDashboard - Iniciando...");
    // No necesitamos la referencia a batteryDashboardSection aquí si la obtenemos en handleConnectionChange

    // Estado inicial o de desconexión para el panel React
    const disconnectedProps = {
        batteryData: { voltage: '--', packVoltage: '--', current: '--', soc: '--', soh: '--', status: 'Desconectado' },
        deviceInfo: { manufacturer: '-', model: '-', barcode: '-', manufactured_date: '-' },
        errorMessage: "No conectado"
    };

    // --- Función para manejar el cambio de estado de conexión ---
    const handleConnectionChange = (connected) => {
        // Obtener la sección aquí, dentro del handler
        const batteryDashboardSection = document.getElementById('battery-dashboard');
        if (!batteryDashboardSection) {
            console.error("Dashboard: handleConnectionChange - No se encontró la sección #battery-dashboard");
            return;
        }

        if (connected) {
            console.log("Dashboard: handleConnectionChange - Estado cambiado a CONECTADO.");
            batteryDashboardSection.style.display = 'block';

            console.log("Dashboard: handleConnectionChange - Intentando actualizar panel a 'Cargando...'");
            // Intentar actualizar panel a estado inicial/cargando
            if (typeof window.updateBatteryPanel === 'function') {
                 const loadingProps = {
                     ...disconnectedProps,
                     batteryData: { ...disconnectedProps.batteryData, status: 'Cargando...' }, // Indicar carga
                     errorMessage: null // Borra error de desconexión
                 };
                window.updateBatteryPanel(loadingProps);
                console.log("Dashboard: handleConnectionChange - Llamada a updateBatteryPanel (Cargando) realizada.");
            } else {
                // Log si la función no está lista AÚN en el evento 'true'
                console.warn("Dashboard: handleConnectionChange - updateBatteryPanel no definido al conectar (estado 'Cargando').");
            }

            console.log("Dashboard: handleConnectionChange - Llamando a updateDashboard para obtener datos reales.");
            updateDashboard();

        } else {
            console.log("Dashboard: handleConnectionChange - Estado cambiado a DESCONECTADO.");
            batteryDashboardSection.style.display = 'none';
            stopMonitoring();

            console.log("Dashboard: handleConnectionChange - Intentando actualizar panel a estado 'Desconectado'.");
            // Actualizar panel a estado desconectado
            if (typeof window.updateBatteryPanel === 'function') {
                window.updateBatteryPanel(disconnectedProps);
                console.log("Dashboard: handleConnectionChange - Llamada a updateBatteryPanel (Desconectado) realizada.");
            } else {
                 // Log si la función no está lista en el evento 'false' (puede pasar al inicio)
                 console.warn("Dashboard: handleConnectionChange - updateBatteryPanel no definido al desconectar.");
            }
        }
    };

    // Escuchar el evento personalizado de main.js
    console.log("Dashboard: initDashboard - Añadiendo listener para 'connection-status-change'.");
    document.addEventListener('connection-status-change', (e) => {
        console.log("Dashboard: Evento 'connection-status-change' recibido:", e.detail); // Log para ver el evento
        if (e && e.detail && typeof e.detail.connected !== 'undefined') {
            handleConnectionChange(e.detail.connected);
        } else {
            console.error("Dashboard: Evento 'connection-status-change' recibido sin detalle válido.", e);
        }
    });

    // Configurar listeners de botones
    if (refreshDashboardBtn) refreshDashboardBtn.addEventListener('click', updateDashboard);
    if (startMonitoringBtn) startMonitoringBtn.addEventListener('click', startMonitoring);
    if (stopMonitoringBtn) stopMonitoringBtn.addEventListener('click', stopMonitoring);

    console.log("Dashboard: initDashboard - completado.");
}

// --- ELIMINADO EL LISTENER DOMCONTENTLOADED REDUNDANTE ---
// La inicialización ahora es llamada por main.js