// static/js/reactBatteryPanel.js
'use strict';

// Guarda la instancia root globalmente
let reactBatteryPanelRoot = null;
const batteryPanelContainerId = 'react-battery-panel'; // ID del div en index.html

/**
 * Componente React para mostrar el Panel de Control de Batería.
 * Utiliza JSX, requiere Babel para funcionar en el navegador.
 */
const BatteryPanel = ({ batteryData, deviceInfo, errorMessage }) => {

    // Si hay un mensaje de error prioritario, lo mostramos
    if (errorMessage) {
        // Usamos React.createElement aquí porque es JS simple, no JSX
        return React.createElement(
            'div',
            { className: 'message-area error', style: { margin: '10px' } }, // Añadir margen
            `Error en panel de batería: ${errorMessage}`
        );
    }

    // --- Funciones auxiliares para estilos dinámicos ---
    const getSocClass = (soc) => {
        if (soc === undefined || soc === null || soc === '--') return 'normal'; // Default
        const socValue = parseFloat(soc);
        if (isNaN(socValue)) return 'normal';
        if (socValue < 20) return 'critical';
        if (socValue < 40) return 'warning';
        return 'normal';
    };

    const getCurrentClass = (current) => {
        if (current === undefined || current === null || current === '--') return 'normal';
        const currentValue = parseFloat(current);
        if (isNaN(currentValue)) return 'normal';
        if (currentValue > 0.05) return 'charging'; // Pequeño umbral para carga
        if (currentValue < -0.05) return 'discharging'; // Pequeño umbral para descarga
        return 'normal'; // Considerar 0 como normal/inactivo
    };

    // --- Pre-calcular valores a mostrar con defaults seguros ---
    // Usamos el operador ternario para compatibilidad con Babel 6 Standalone
    const displayManufacturer = (deviceInfo && deviceInfo.manufacturer) ? deviceInfo.manufacturer : 'N/A';
    const displayModel = (deviceInfo && deviceInfo.model) ? deviceInfo.model : 'N/A';
    const displayBarcode = (deviceInfo && deviceInfo.barcode) ? deviceInfo.barcode : 'N/A';
    const displayManufacturedDate = (deviceInfo && deviceInfo.manufactured_date) ? deviceInfo.manufactured_date : 'N/A';

    const displayVoltage = (batteryData && batteryData.voltage !== undefined && batteryData.voltage !== null) ? batteryData.voltage : '--';
    const displayPackVoltage = (batteryData && batteryData.packVoltage !== undefined && batteryData.packVoltage !== null) ? batteryData.packVoltage : '--';
    const displayCurrent = (batteryData && batteryData.current !== undefined && batteryData.current !== null) ? batteryData.current : '--';
    const displaySoc = (batteryData && batteryData.soc !== undefined && batteryData.soc !== null) ? batteryData.soc : '--';
    const displaySoh = (batteryData && batteryData.soh !== undefined && batteryData.soh !== null) ? batteryData.soh : '--';
    const displayStatus = (batteryData && batteryData.status) ? batteryData.status : '--';

    // --- Renderizar el panel usando JSX ---
    return (
        <div className="dashboard-grid">
            {/* Tarjeta de Información del Dispositivo */}
            <div className="dashboard-item" style={{ gridColumn: "span 3" }}> {/* Ocupa más espacio */}
                <div className="metric-label">Información del Dispositivo</div>
                {/* Estilos para alinear texto y tamaño */}
                <div className="device-info-panel" style={{ textAlign: 'left', fontSize: '0.9em', paddingLeft: '10px', marginTop: '5px' }}>
                    <div><strong>Fabricante:</strong> {displayManufacturer}</div>
                    <div><strong>Modelo:</strong> {displayModel}</div>
                    <div><strong>Nº Serie:</strong> {displayBarcode}</div>
                    <div><strong>Fecha Fab.:</strong> {displayManufacturedDate}</div>
                </div>
            </div>

            {/* Tarjeta: Voltaje Batería */}
            <div className="dashboard-item">
                <div className="metric-label">Voltaje Batería</div>
                <div className="metric-value">{displayVoltage}</div>
                <div className="metric-unit">V</div>
            </div>

            {/* Tarjeta: Voltaje Pack */}
            <div className="dashboard-item">
                <div className="metric-label">Voltaje Pack</div>
                <div className="metric-value">{displayPackVoltage}</div>
                <div className="metric-unit">V</div>
            </div>

            {/* Tarjeta: Corriente */}
            <div className="dashboard-item">
                <div className="metric-label">Corriente</div>
                <div className={`metric-value ${getCurrentClass(displayCurrent)}`}>
                    {displayCurrent}
                </div>
                <div className="metric-unit">A</div>
            </div>

            {/* Tarjeta: SOC */}
            <div className="dashboard-item">
                <div className="metric-label">SOC</div>
                <div className={`metric-value ${getSocClass(displaySoc)}`}>
                    {displaySoc}
                </div>
                <div className="metric-unit">%</div>
            </div>

            {/* Tarjeta: SOH */}
            <div className="dashboard-item">
                <div className="metric-label">SOH</div>
                <div className="metric-value">{displaySoh}</div>
                <div className="metric-unit">%</div>
            </div>

             {/* Tarjeta: Estado */}
            <div className="dashboard-item">
                <div className="metric-label">Estado</div>
                <div className={`metric-value ${getCurrentClass(displayCurrent)}`}>{displayStatus}</div>
                 {/* Sin unidad para el estado */}
            </div>
        </div>
    );
};

/**
 * Función GLOBAL para actualizar el contenido del panel React.
 * Es llamada por dashboard.js cuando llegan nuevos datos.
 * @param {object} props - Objeto que contiene batteryData, deviceInfo y errorMessage.
 */
window.updateBatteryPanel = function (props = {}) { // Asegurar que props sea un objeto
    // Comprobar si el root de React está listo
    if (reactBatteryPanelRoot) {
        // Define los props por defecto por si faltan en el objeto recibido
        const defaultProps = {
            batteryData: { voltage: '--', packVoltage: '--', current: '--', soc: '--', soh: '--', status: '--' },
            deviceInfo: { manufacturer: '...', model: '...', barcode: '...', manufactured_date: '...' },
            errorMessage: null
        };
        // Mezcla los defaults con los props recibidos
        const mergedProps = { ...defaultProps, ...props };

        try {
            // Usa React.createElement para renderizar, es más seguro sin JSX aquí
            reactBatteryPanelRoot.render(React.createElement(BatteryPanel, mergedProps));
        } catch (renderError) {
            console.error("Error al renderizar BatteryPanel:", renderError);
            // Intenta mostrar un error directamente en el HTML como fallback
            const container = document.getElementById(batteryPanelContainerId);
            if (container) container.innerHTML = `<div class="message-area error" style="margin: 10px;">Error de renderizado React: ${renderError.message}</div>`;
        }
    } else {
        // Este log indica un problema si se llama antes de la inicialización
        console.error("ERROR CRÍTICO: updateBatteryPanel llamado pero reactBatteryPanelRoot es null. El script puede haberse cargado en mal orden o fallado la inicialización.");
    }
};

/**
 * Intenta inicializar el panel React inmediatamente al cargar el script.
 */
function initializeReactPanelImmediately() {
    try {
        const container = document.getElementById(batteryPanelContainerId);
        if (container) {
            // Crear el root solo si no existe
            if (!reactBatteryPanelRoot) {
                reactBatteryPanelRoot = ReactDOM.createRoot(container);
                console.log("Panel de batería React: Root creado inmediatamente.");

                // Renderizado inicial usando la función global
                const initialProps = {
                    // No necesitamos definir defaults aquí si updateBatteryPanel los maneja
                    errorMessage: "Inicializando..."
                };
                window.updateBatteryPanel(initialProps); // Llama a la función global
                console.log("Panel de batería React: Renderizado inicial solicitado.");
            }
        } else {
            // Si el contenedor no está listo, reintentar en DOMContentLoaded
            console.warn(`Panel React: Contenedor #${batteryPanelContainerId} no encontrado inicialmente. Reintentando en DOMContentLoaded.`);
            document.addEventListener('DOMContentLoaded', initializeReactPanelImmediately); // Llama a esta misma función de nuevo más tarde
        }
    } catch (error) {
        console.error("Error durante la inicialización inmediata de React:", error);
    }
}

// --- Ejecutar la inicialización inmediata ---
initializeReactPanelImmediately();