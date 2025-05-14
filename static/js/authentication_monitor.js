// static/js/authentication_monitor.js
'use strict';

// Declarar la variable global AuthMonitor inmediatamente,
// antes de definir cualquier componente
(function() {
    // Inicializar el objeto de control global
    window.AuthMonitor = {
        show: function() { 
            console.log("API: Mostrando monitor de autenticación"); 
            if (window._showMonitorCallback) {
                window._showMonitorCallback();
            }
            
            // Si el contenedor existe, modificar estilos para hacerlo visible
            const container = document.getElementById('auth-monitor-container');
            if (container) {
                container.style.display = 'block';
                container.style.position = 'fixed';
                container.style.top = '120px';
                container.style.left = '50%';
                container.style.transform = 'translateX(-50%)';
                container.style.zIndex = '9999';
                container.style.backgroundColor = 'white';
                container.style.border = '2px solid #3498db';
                container.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
                container.style.width = '80%';
                container.style.maxWidth = '800px';
            }
        },
        hide: function() { 
            console.log("API: Ocultando monitor de autenticación"); 
            if (window._hideMonitorCallback) {
                window._hideMonitorCallback();
            }
            
            // Ocultar el contenedor
            const container = document.getElementById('auth-monitor-container');
            if (container) {
                container.style.display = 'none';
            }
        },
        initialized: false
    };
})();

/**
 * Componente React para monitorear el proceso de autenticación de baterías.
 * Muestra un panel simple con barras de progreso para las tres fases del proceso.
 */
const AuthenticationMonitor = (props) => {
    console.log("AuthenticationMonitor: componente inicializado");
    
    // Estado para almacenar datos de autenticación de todas las baterías
    const [batteriesAuth, setBatteriesAuth] = React.useState({});
    
    // Estado para controlar si está visible
    const [isVisible, setIsVisible] = React.useState(false);
    
    // Estado para controlar si está cargando datos
    const [isLoading, setIsLoading] = React.useState(false);
    
    // Referencia para el intervalo de actualización
    const updateIntervalRef = React.useRef(null);
    
    // Función para mostrar el monitor
    const showMonitor = React.useCallback(() => {
        console.log("AuthenticationMonitor: showMonitor llamado");
        setIsVisible(true);
    }, []);
    
    // Función para ocultar el monitor
    const hideMonitor = React.useCallback(() => {
        console.log("AuthenticationMonitor: hideMonitor llamado");
        setIsVisible(false);
        
        // Si hay una actualización automática activa, detenerla
        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
        }
    }, []);
    
    // Al montar el componente, registrar las funciones en el objeto global
    React.useEffect(() => {
        console.log("AuthenticationMonitor: Registrando callbacks en window.AuthMonitor");
        window._showMonitorCallback = showMonitor;
        window._hideMonitorCallback = hideMonitor;
        window.AuthMonitor.initialized = true;
        
        // Limpieza al desmontar
        return () => {
            console.log("AuthenticationMonitor: Limpiando callbacks");
            window._showMonitorCallback = null;
            window._hideMonitorCallback = null;
            window.AuthMonitor.initialized = false;
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
                updateIntervalRef.current = null;
            }
        };
    }, [showMonitor, hideMonitor]);
    
    // Efecto para iniciar actualización automática - Solo cuando está visible
    React.useEffect(() => {
        // Función para actualizar estado
        const updateStatus = async () => {
            // No actualizar si no está visible
            if (!isVisible) return;
            
            try {
                setIsLoading(true);
                console.log("AuthenticationMonitor: Consultando estado de autenticación...");
                const response = await fetch('/api/auth_status');
                
                if (!response.ok) {
                    console.error(`AuthenticationMonitor: Error HTTP ${response.status}`);
                    throw new Error(`Error HTTP ${response.status}`);
                }
                
                const data = await response.json();
                console.log("AuthenticationMonitor: Datos recibidos:", data);
                
                if (data.status === 'success') {
                    setBatteriesAuth(data.batteries.reduce((acc, battery) => {
                        acc[battery.battery_id] = battery;
                        return acc;
                    }, {}));
                }
            } catch (error) {
                console.error('Error al actualizar estado de autenticación:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        // Solo actualizar si está visible
        if (isVisible) {
            console.log("AuthenticationMonitor: Iniciando actualizaciones periódicas");
            
            // Actualizar inmediatamente
            updateStatus();
            
            // Configurar actualización periódica cada 2 segundos
            updateIntervalRef.current = setInterval(updateStatus, 2000);
        } else if (updateIntervalRef.current) {
            // Detener actualizaciones si no está visible
            console.log("AuthenticationMonitor: Deteniendo actualizaciones periódicas");
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
        }
        
        // Función de limpieza al desmontar o cambiar isVisible
        return () => {
            if (updateIntervalRef.current) {
                console.log("AuthenticationMonitor: Deteniendo actualizaciones periódicas");
                clearInterval(updateIntervalRef.current);
                updateIntervalRef.current = null;
            }
        };
    }, [isVisible]); // Dependencia en isVisible para reiniciar/detener cuando cambie
    
    // Si no está visible, no renderizar nada
    if (!isVisible) {
        return null;
    }
    
    // Función para convertir estado a clase CSS
    const getStateClass = (state) => {
        switch (state) {
            case 'success': return 'success';
            case 'in_progress': return 'in-progress';
            case 'failed': return 'failed';
            default: return 'not-started';
        }
    };
    
    // Función para generar mensaje de fase
    const getPhaseMessage = (battery, phase) => {
        if (battery.messages && battery.messages[phase]) {
            return battery.messages[phase];
        }
        return phase === 'wake_up' ? 'Despertar' : 
               phase === 'authenticate' ? 'Autenticar' : 'Leer Info';
    };
    
    // Renderizado del componente
    return (
        <div className="auth-monitor" style={{
            position: 'fixed',
            top: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: 'white',
            border: '2px solid #3498db',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            width: '80%',
            maxWidth: '800px',
            padding: '10px',
            overflow: 'auto',
            maxHeight: '80vh'
        }}>
            <div className="auth-monitor-header">
                <h3>Monitor de Autenticación de Baterías</h3>
                <button 
                    onClick={() => window.AuthMonitor.hide()} 
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#3498db',
                        cursor: 'pointer'
                    }}
                >
                    ×
                </button>
            </div>
            
            {isLoading && Object.keys(batteriesAuth).length === 0 && (
                <div className="auth-monitor-loading">Cargando información de autenticación...</div>
            )}
            
            {Object.keys(batteriesAuth).length > 0 ? (
                <div className="auth-monitor-list">
                    <table className="auth-monitor-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr>
                                <th style={{padding: '8px', borderBottom: '1px solid #ddd'}}>ID</th>
                                <th style={{padding: '8px', borderBottom: '1px solid #ddd'}}>Despertar</th>
                                <th style={{padding: '8px', borderBottom: '1px solid #ddd'}}>Autenticar</th>
                                <th style={{padding: '8px', borderBottom: '1px solid #ddd'}}>Leer Info</th>
                                <th style={{padding: '8px', borderBottom: '1px solid #ddd'}}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.values(batteriesAuth).map(battery => (
                                <tr key={battery.battery_id} className={`auth-row ${getStateClass(battery.state)}`} style={{borderBottom: '1px solid #eee'}}>
                                    <td style={{padding: '8px', fontWeight: 'bold'}}>{battery.battery_id}</td>
                                    <td className={`phase ${getStateClass(battery.phases.wake_up)}`} style={{padding: '8px', textAlign: 'center'}}>
                                        <div style={{fontSize: '18px', fontWeight: 'bold'}}>
                                            {battery.phases.wake_up === 'success' ? '✓' : 
                                             battery.phases.wake_up === 'in_progress' ? '...' :
                                             battery.phases.wake_up === 'failed' ? '✗' : ''}
                                        </div>
                                        <div style={{fontSize: '12px'}}>{getPhaseMessage(battery, 'wake_up')}</div>
                                    </td>
                                    <td className={`phase ${getStateClass(battery.phases.authenticate)}`} style={{padding: '8px', textAlign: 'center'}}>
                                        <div style={{fontSize: '18px', fontWeight: 'bold'}}>
                                            {battery.phases.authenticate === 'success' ? '✓' : 
                                             battery.phases.authenticate === 'in_progress' ? '...' :
                                             battery.phases.authenticate === 'failed' ? '✗' : ''}
                                        </div>
                                        <div style={{fontSize: '12px'}}>{getPhaseMessage(battery, 'authenticate')}</div>
                                    </td>
                                    <td className={`phase ${getStateClass(battery.phases.read_info)}`} style={{padding: '8px', textAlign: 'center'}}>
                                        <div style={{fontSize: '18px', fontWeight: 'bold'}}>
                                            {battery.phases.read_info === 'success' ? '✓' : 
                                             battery.phases.read_info === 'in_progress' ? '...' :
                                             battery.phases.read_info === 'failed' ? '✗' : ''}
                                        </div>
                                        <div style={{fontSize: '12px'}}>{getPhaseMessage(battery, 'read_info')}</div>
                                    </td>
                                    <td style={{
                                        padding: '8px', 
                                        fontWeight: 'bold',
                                        color: battery.state === 'success' ? '#27ae60' :
                                              battery.state === 'in_progress' ? '#2980b9' :
                                              battery.state === 'failed' ? '#c0392b' : '#7f8c8d'
                                    }}>
                                        {battery.state === 'success' ? 'Completado' :
                                         battery.state === 'in_progress' ? 'En proceso' :
                                         battery.state === 'failed' ? 'Fallido' : 'Esperando'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : !isLoading ? (
                <div className="auth-monitor-empty" style={{padding: '20px', textAlign: 'center', color: '#7f8c8d'}}>
                    No hay información de autenticación disponible.
                    <div style={{marginTop: '10px', fontStyle: 'italic'}}>
                        Revisar si el endpoint /api/auth_status está respondiendo correctamente.
                    </div>
                </div>
            ) : null}

            <div style={{marginTop: '10px', textAlign: 'center', fontSize: '12px', color: '#7f8c8d'}}>
                Última actualización: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};

// Inicializar el componente
console.log("AuthenticationMonitor: Inicializando");

// Función para intentar renderizar el componente
function renderMonitor() {
    const container = document.getElementById('auth-monitor-container');
    if (container) {
        try {
            console.log("AuthenticationMonitor: Encontrado contenedor, intentando renderizar");
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(AuthenticationMonitor));
            console.log('Monitor de autenticación inicializado con éxito');
        } catch (error) {
            console.error('Error al inicializar monitor de autenticación:', error);
        }
    } else {
        console.warn('No se encontró el contenedor para el monitor de autenticación');
        console.log("AuthenticationMonitor: Creando contenedor dinámicamente");
        
        // Crear contenedor dinámicamente
        const newContainer = document.createElement('div');
        newContainer.id = 'auth-monitor-container';
        newContainer.className = 'auth-monitor-container';
        newContainer.style.display = 'none'; // Inicialmente oculto
        
        // Agregar al body
        document.body.appendChild(newContainer);
        
        // Intentar renderizar después de crear
        setTimeout(renderMonitor, 100);
    }
}

// Intentar renderizar inmediatamente
renderMonitor();

// También intentar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', renderMonitor);

// Para asegurar que el componente esté disponible globalmente
window.AuthenticationMonitor = AuthenticationMonitor;