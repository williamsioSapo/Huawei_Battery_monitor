// static/js/multiBatteryDashboard.js
'use strict';

// Componente principal para el dashboard múltiple de baterías
const MultiBatteryDashboard = (props) => {
    // Estado para almacenar datos de todas las baterías
    const [batteriesData, setBatteriesData] = React.useState([]);
    // Estado para el tiempo de la última actualización
    const [lastUpdate, setLastUpdate] = React.useState(null);
    // Estado de monitoreo (activo/inactivo)
    const [isMonitoring, setIsMonitoring] = React.useState(false);
    // Estado para errores
    const [error, setError] = React.useState(props && props.error ? props.error : null);
    // Estado para batería seleccionada (vista detallada)
    const [selectedBattery, setSelectedBattery] = React.useState(null);
    // Estado para filtro de visualización
    const [viewFilter, setViewFilter] = React.useState('all'); // 'all', 'active', 'charging', 'discharging', 'critical'
    // Estado para carga inicial
    const [isInitialLoading, setIsInitialLoading] = React.useState(props && props.initialLoading ? props.initialLoading : false);
    // Estado para la información detallada
    const [detailedInfo, setDetailedInfo] = React.useState(null);
    // Estado para indicar si se está cargando la información detallada
    const [loadingDetailedInfo, setLoadingDetailedInfo] = React.useState(false);
    // Estado para el progreso de carga
    const [loadingProgress, setLoadingProgress] = React.useState(props && props.loadingProgress ? props.loadingProgress : null);

    // Efecto para manejar props externos (forceUpdate, error, etc.)
    React.useEffect(() => {
        console.log("MultiBatteryDashboard: useEffect para props externos, props=", props);
        
        // Si recibimos error desde props, actualizamos el estado
        if (props && props.error !== undefined && props.error !== error) {
            setError(props.error);
            console.log("MultiBatteryDashboard: Actualizando estado de error:", props.error);
            
            // Si hay error, detener monitoreo si está activo
            if (props.error && isMonitoring) {
                stopMonitoring();
            }
        }
        
        // Si recibimos forceUpdate, actualizar datos
        if (props && props.forceUpdate) {
            console.log("MultiBatteryDashboard: Recibida solicitud de forceUpdate");
            updateBatteriesData();
        }
        
        // Si recibimos initialLoading, actualizar estado
        if (props && props.initialLoading !== undefined) {
            setIsInitialLoading(props.initialLoading);
            console.log("MultiBatteryDashboard: Actualizando estado de carga inicial:", props.initialLoading);
        }

        // Si recibimos loadingProgress, actualizar estado
        if (props && props.loadingProgress) {
            setLoadingProgress(props.loadingProgress);
            console.log("MultiBatteryDashboard: Actualizando progreso de carga:", props.loadingProgress);
            
            // Si está cargando, verificar estado periódicamente
            if (!loadingProgress) {
                checkLoadingProgress();
            }
        }
    }, [props]);

    // Efecto para cargar la información detallada cuando se selecciona una batería
    React.useEffect(() => {
        if (selectedBattery !== null) {
            loadBatteryDetailedInfo(selectedBattery);
        }
    }, [selectedBattery]);

    // Función para iniciar el monitoreo
	const startMonitoring = async () => {
		try {
			console.log("MultiBatteryDashboard: ========= INICIO DE STARTMONITORING =========");
			setError(null);
			setIsInitialLoading(true);
			
			// Verificar si hay una carga en progreso
			console.log("MultiBatteryDashboard: Verificando si hay una carga de información detallada en progreso...");
			const loadingStatus = await getDetailedInfoLoadingStatus();
			console.log("MultiBatteryDashboard: Resultado getDetailedInfoLoadingStatus:", loadingStatus);
			
			if (loadingStatus.status === 'success' && loadingStatus.loading_active) {
				console.log("MultiBatteryDashboard: Hay una carga en progreso, configurando progreso:", loadingStatus.progress);
				setLoadingProgress(loadingStatus.progress);
				checkLoadingProgress();  // Iniciar verificación periódica
			}
			
			// Primero obtener la lista de baterías disponibles
			console.log("MultiBatteryDashboard: Obteniendo lista de baterías disponibles desde /api/batteries...");
			const availableBatteriesResponse = await fetch('/api/batteries');
			console.log("MultiBatteryDashboard: Respuesta API Baterías - Status:", availableBatteriesResponse.status);
			
			if (!availableBatteriesResponse.ok) {
				throw new Error(`Error obteniendo baterías disponibles: ${availableBatteriesResponse.status} ${availableBatteriesResponse.statusText}`);
			}
			
			const availableBatteries = await availableBatteriesResponse.json();
			console.log("MultiBatteryDashboard: Datos de baterías disponibles:", availableBatteries);
			
			// Extraer los IDs de batería
			const battery_ids = availableBatteries.batteries || [];
			
			console.log(`MultiBatteryDashboard: Encontradas ${battery_ids.length} baterías disponibles: ${battery_ids.join(', ')}`);
			
			if (battery_ids.length === 0) {
				console.error("MultiBatteryDashboard: ERROR - No se encontraron baterías disponibles para monitorear");
				setError("No se encontraron baterías disponibles para monitorear. Verifique la configuración.");
				setIsInitialLoading(false);
				return;
			}
			
			// Iniciar monitoreo con los IDs obtenidos
			console.log(`MultiBatteryDashboard: Iniciando monitoreo para ${battery_ids.length} baterías con IDs: ${battery_ids.join(', ')}...`);
			const response = await fetch('/api/batteries/start_monitoring', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ battery_ids: battery_ids })
			});
			
			console.log("MultiBatteryDashboard: Respuesta start_monitoring - Status:", response.status);
			
			if (!response.ok) {
				throw new Error(`Error al iniciar monitoreo: ${response.status} ${response.statusText}`);
			}
			
			const data = await response.json();
			console.log("MultiBatteryDashboard: Respuesta completa start_monitoring:", data);
			
			if (data.status === 'success') {
				console.log("MultiBatteryDashboard: Monitoreo iniciado exitosamente para IDs:", data.battery_ids);
				setIsMonitoring(true);
				setIsInitialLoading(false);
				
				// Verificar si hay algún error o advertencia
				if (data.message && data.message.includes("warning")) {
					console.warn("MultiBatteryDashboard: Advertencia durante inicio de monitoreo:", data.message);
				}
				
				// Iniciar actualizaciones periódicas
				console.log("MultiBatteryDashboard: Iniciando actualizaciones periódicas de datos...");
				startPeriodicUpdates();
				
				// Verificar que tenemos datos inmediatamente
				console.log("MultiBatteryDashboard: Realizando actualización inicial de datos...");
				await updateBatteriesData();
				
				// Verificar si se obtuvieron datos
				console.log("MultiBatteryDashboard: Estado actual de batteriesData:", batteriesData);
				if (batteriesData.length === 0) {
					console.warn("MultiBatteryDashboard: No se obtuvieron datos de baterías después de iniciar monitoreo");
				}
			} else {
				console.error(`MultiBatteryDashboard: Error al iniciar monitoreo: ${data.message || 'Error desconocido'}`);
				setError(data.message || 'Error al iniciar monitoreo');
				setIsInitialLoading(false);
			}
		} catch (err) {
			console.error("MultiBatteryDashboard: Excepción durante startMonitoring:", err);
			setError(`Error: ${err.message}`);
			setIsInitialLoading(false);
		} finally {
			console.log("MultiBatteryDashboard: ========= FIN DE STARTMONITORING =========");
		}
	};

    // Función para detener el monitoreo
    const stopMonitoring = async () => {
        try {
            console.log("MultiBatteryDashboard: Deteniendo monitoreo...");
            const response = await fetch('/api/batteries/stop_monitoring', {
                method: 'POST'
            });
            
            const data = await response.json();
            console.log("MultiBatteryDashboard: Respuesta stop_monitoring:", data);
            
            if (data.status === 'success') {
                setIsMonitoring(false);
                // Detener actualizaciones periódicas
                stopPeriodicUpdates();
            } else {
                setError(data.message || 'Error al detener monitoreo');
            }
        } catch (err) {
            console.error("MultiBatteryDashboard: Error al detener monitoreo:", err);
            setError(`Error: ${err.message}`);
        }
    };

    // Referencia para almacenar el ID del intervalo
    const intervalRef = React.useRef(null);

    // Función para iniciar actualizaciones periódicas
    const startPeriodicUpdates = () => {
        console.log("MultiBatteryDashboard: Iniciando actualizaciones periódicas");
        // Limpiar intervalo existente si hay alguno
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        
        // Actualizar inmediatamente
        updateBatteriesData();
        
        // Configurar actualización periódica cada 5 segundos
        intervalRef.current = setInterval(updateBatteriesData, 5000);
    };

    // Función para detener actualizaciones periódicas
    const stopPeriodicUpdates = () => {
        console.log("MultiBatteryDashboard: Deteniendo actualizaciones periódicas");
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    // Función para verificar el progreso de carga de información detallada
    const checkLoadingProgress = async () => {
        try {
            const result = await getDetailedInfoLoadingStatus();
            
            if (result.status === 'success') {
                setLoadingProgress(result.progress);
                
                // Si la carga está activa, programar otra verificación
                if (result.loading_active) {
                    setTimeout(checkLoadingProgress, 2000);
                } else {
                    // Si la carga ha terminado, actualizar baterías
                    updateBatteriesData();
                    setLoadingProgress(null);
                }
            }
        } catch (error) {
            console.error("Error al verificar progreso de carga:", error);
        }
    };

    // Función para actualizar datos de todas las baterías
    const updateBatteriesData = async () => {
        try {
            console.log("MultiBatteryDashboard: Actualizando datos de baterías...");
            const response = await fetch('/api/batteries/status');
            
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log("MultiBatteryDashboard: Respuesta status:", data);
            
            if (data.batteries && Array.isArray(data.batteries)) {
                setBatteriesData(data.batteries);
                setLastUpdate(new Date());
                // Si había un error de conexión, limpiarlo
                if (error && error.includes("Error HTTP")) {
                    setError(null);
                }
            } else {
                console.warn("MultiBatteryDashboard: La respuesta no contiene datos de baterías válidos");
                if (data.status === "error") {
                    setError(data.message || "Error al obtener datos de baterías");
                }
            }
        } catch (err) {
            console.error('MultiBatteryDashboard: Error al actualizar datos de baterías:', err);
            setError(`Error al actualizar: ${err.message}`);
        }
    };

    // Función para cargar la información detallada de una batería
    const loadBatteryDetailedInfo = async (batteryId) => {
        try {
            setLoadingDetailedInfo(true);
            const result = await getBatteryDetailedInfo(batteryId);
            
            if (result.status === 'success' && result.detailed_info) {
                setDetailedInfo(result.detailed_info);
            } else {
                console.warn(`No se pudo obtener información detallada para batería ${batteryId}: ${result.message}`);
                setDetailedInfo(null);
            }
        } catch (error) {
            console.error(`Error al cargar información detallada para batería ${batteryId}:`, error);
            setDetailedInfo(null);
        } finally {
            setLoadingDetailedInfo(false);
        }
    };

    // Función para formatear timestamp
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString();
    };

    // Función para determinar clase de estado de batería
    const getBatteryStatusClass = (batteryData) => {
        if (!batteryData) return 'unknown';
        
        // Verificar si hay error
        if (batteryData.error) return 'error';
        
        // Verificar SOC para estado crítico
        const socValue = batteryData.soc !== undefined ? batteryData.soc : null;
        if (socValue !== null) {
            if (socValue < 20) return 'critical';
            if (socValue < 40) return 'warning';
        }
        
        // Verificar estado basado en corriente
        const status = batteryData.status !== undefined ? batteryData.status : '';
        if (status === 'Cargando') return 'charging';
        if (status === 'Descargando') return 'discharging';
        
        return 'normal';
    };

    // Función para determinar si una batería debe mostrarse según el filtro
    const shouldShowBattery = (batteryData) => {
        if (viewFilter === 'all') return true;
        
        const statusClass = getBatteryStatusClass(batteryData);
        
        switch (viewFilter) {
            case 'active':
                return statusClass === 'charging' || statusClass === 'discharging';
            case 'charging':
                return statusClass === 'charging';
            case 'discharging':
                return statusClass === 'discharging';
            case 'critical':
                return statusClass === 'critical' || statusClass === 'warning';
            default:
                return true;
        }
    };

    // Función para mostrar vista detallada de una batería
    const showBatteryDetail = (batteryId) => {
        setSelectedBattery(batteryId);
    };

    // Función para cerrar vista detallada
    const closeBatteryDetail = () => {
        setSelectedBattery(null);
    };

    // Limpiar intervalo cuando el componente se desmonte
    React.useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // Renderizar el panel de sistema
    const renderSystemOverview = () => {
        // Calcular estadísticas del sistema
        const totalBatteries = batteriesData.length;
        const activeBatteries = batteriesData.filter(function(b) {
            return b.status === 'Cargando' || b.status === 'Descargando';
        }).length;
        
        const criticalBatteries = batteriesData.filter(function(b) {
            return b.soc !== undefined && b.soc < 20;
        }).length;
        
        let avgSOC = 'N/A';
        if (totalBatteries > 0) {
            const totalSOC = batteriesData.reduce(function(sum, b) {
                const socValue = b.soc !== undefined ? b.soc : 0;
                return sum + socValue;
            }, 0);
            avgSOC = (totalSOC / totalBatteries).toFixed(1);
        }
        
        return (
            React.createElement("div", { className: "system-overview" },
                React.createElement("h3", null, "Resumen del Sistema"),
                React.createElement("div", { className: "system-metrics" },
                    React.createElement("div", { className: "metric" },
                        React.createElement("span", { className: "metric-label" }, "Total de Baterías:"),
                        React.createElement("span", { className: "metric-value" }, totalBatteries)
                    ),
                    React.createElement("div", { className: "metric" },
                        React.createElement("span", { className: "metric-label" }, "Baterías Activas:"),
                        React.createElement("span", { className: "metric-value" }, activeBatteries)
                    ),
                    React.createElement("div", { className: "metric" },
                        React.createElement("span", { className: "metric-label" }, "Baterías Críticas:"),
                        React.createElement("span", { 
                            className: "metric-value " + (criticalBatteries > 0 ? 'critical' : '') 
                        }, criticalBatteries)
                    ),
                    React.createElement("div", { className: "metric" },
                        React.createElement("span", { className: "metric-label" }, "SOC Promedio:"),
                        React.createElement("span", { className: "metric-value" }, avgSOC + "%")
                    ),
                    React.createElement("div", { className: "metric" },
                        React.createElement("span", { className: "metric-label" }, "Última Actualización:"),
                        React.createElement("span", { className: "metric-value" }, 
                            lastUpdate ? formatTimestamp(lastUpdate/1000) : 'N/A'
                        )
                    )
                )
            )
        );
    };

    // Obtener la batería seleccionada para la vista detallada
    const getSelectedBatteryData = () => {
        if (selectedBattery === null) return null;
        return batteriesData.find(b => b.id === selectedBattery);
    };

    // Renderizar el indicador de progreso de carga
    const renderLoadingProgress = () => {
        if (!loadingProgress) return null;
        
        const { total, completed, current_battery } = loadingProgress;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return (
            <div className="loading-progress">
                <h3>Cargando información detallada de baterías...</h3>
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${percent}%` }}></div>
                </div>
                <p>{completed} de {total} baterías completadas ({percent}%)</p>
                {current_battery && <p>Procesando batería ID: {current_battery}</p>}
            </div>
        );
    };
		React.useEffect(() => {
			console.log("MultiBatteryDashboard: Exponiendo startMonitoring globalmente como window.startMultiBatteryMonitoring");
			window.startMultiBatteryMonitoring = startMonitoring;
			
			return () => {
				console.log("MultiBatteryDashboard: Eliminando referencia global a startMultiBatteryMonitoring");
				window.startMultiBatteryMonitoring = null;
			};
		}, []);
    // Renderizado principal del componente
    return (
        <div className="multi-battery-dashboard">
            <div className="dashboard-header">
                <h2>Panel de Monitorización de Baterías</h2>
                <div className="control-buttons">
                    <button 
                        onClick={isMonitoring ? stopMonitoring : startMonitoring}
                        className={isMonitoring ? 'stop-btn' : 'start-btn'}
                        disabled={isInitialLoading}
                    >
                        {isInitialLoading ? 'Cargando...' : isMonitoring ? 'Detener Monitoreo' : 'Iniciar Monitoreo'}
                    </button>
                    <button onClick={updateBatteriesData} className="refresh-btn" disabled={isInitialLoading}>
                        Actualizar Ahora
                    </button>
                </div>
                
                <div className="view-filters">
                    <span>Filtrar: </span>
                    <select 
                        value={viewFilter} 
                        onChange={(e) => setViewFilter(e.target.value)}
                        disabled={isInitialLoading}
                    >
                        <option value="all">Todas</option>
                        <option value="active">Activas</option>
                        <option value="charging">Cargando</option>
                        <option value="discharging">Descargando</option>
                        <option value="critical">Estado Crítico</option>
                    </select>
                </div>
            </div>
            
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}
            
            {/* Indicador de progreso de carga */}
            {loadingProgress && renderLoadingProgress()}
            
            {isInitialLoading ? 
                <div className="loading-container">
                    <p>Cargando datos de baterías...</p>
                </div> : 
                <div>
                    {renderSystemOverview()}
                    
                    <div className="batteries-grid">
                        {batteriesData.length === 0 ? 
                            <div className="no-data-message">
                                No hay datos de baterías disponibles. 
                                {isMonitoring ? 'Esperando datos...' : 'Inicie el monitoreo para comenzar.'}
                            </div> : 
                            batteriesData
                                .filter(shouldShowBattery)
                                .map(batteryData => {
                                    // Usar el componente BatteryMiniPanel
                                    const statusClass = getBatteryStatusClass(batteryData);
                                    return <window.BatteryMiniPanel 
                                        key={batteryData.id}
                                        batteryData={batteryData}
                                        statusClass={statusClass}
                                        onClick={() => showBatteryDetail(batteryData.id)}
                                    />;
                                })
                        }
                    </div>
                </div>
            }
            
            {/* Usar el componente existente para la vista detallada */}
            {selectedBattery !== null && window.BatteryDetailView && 
                <window.BatteryDetailView 
                    batteryData={getSelectedBatteryData()}
                    detailedInfo={detailedInfo}
                    loadingDetailedInfo={loadingDetailedInfo}
                    onClose={closeBatteryDetail}
                    getBatteryStatusClass={getBatteryStatusClass}
                />
            }
        </div>
    );
};

// Crear el root para el dashboard múltiple
let multiBatteryDashboardRoot = null;

/**
 * Función GLOBAL para actualizar el estado del panel múltiple
 * @param {object} props - Propiedades para actualizar el estado (opcional)
 */
window.updateMultiBatteryDashboard = function(props) {
    // Verificar si el root está inicializado
    if (!multiBatteryDashboardRoot) {
        console.error("ERROR: updateMultiBatteryDashboard llamado pero el root no está inicializado");
        // Intentar inicializar de nuevo
        initializeMultiBatteryDashboardImmediately();
        return;
    }
    
    // Asegurarse de que props sea un objeto
    props = props || {};
    
    // Por ahora, solo actualizamos la vista
    console.log("Actualizando panel multi-batería con props:", props);
    
    // Renderizar el componente (esto forzará una actualización)
    try {
        multiBatteryDashboardRoot.render(React.createElement(MultiBatteryDashboard, props));
    } catch (error) {
        console.error("Error al renderizar MultiBatteryDashboard:", error);
    }
};

/**
 * Intenta inicializar el panel React inmediatamente al cargar el script
 * Similar a la función en reactBatteryPanel.js
 */
function initializeMultiBatteryDashboardImmediately() {
    try {
        const container = document.getElementById('multi-battery-dashboard');
        if (container) {
            // Crear el root solo si no existe
            if (!multiBatteryDashboardRoot) {
                multiBatteryDashboardRoot = ReactDOM.createRoot(container);
                console.log("Panel múltiple React: Root creado inmediatamente.");

                // Renderizado inicial
                multiBatteryDashboardRoot.render(React.createElement(MultiBatteryDashboard));
                console.log("Panel múltiple React: Renderizado inicial realizado.");
            }
        } else {
            // Si el contenedor no está listo, reintentar en DOMContentLoaded
            console.warn("Panel múltiple React: Contenedor #multi-battery-dashboard no encontrado inicialmente. Reintentando en DOMContentLoaded.");
            document.addEventListener('DOMContentLoaded', initializeMultiBatteryDashboardImmediately);
        }
    } catch (error) {
        console.error("Error durante la inicialización inmediata del panel múltiple React:", error);
    }
}

// Iniciar el proceso de inicialización inmediata
initializeMultiBatteryDashboardImmediately();

// También mantener el listener de DOMContentLoaded como respaldo
document.addEventListener('DOMContentLoaded', function() {
    if (!multiBatteryDashboardRoot) {
        console.log("Panel múltiple React: Inicializando desde DOMContentLoaded");
        initializeMultiBatteryDashboardImmediately();
    }
});