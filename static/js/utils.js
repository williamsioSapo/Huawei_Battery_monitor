/**
 * Utilidades centralizadas para la aplicación de monitoreo de baterías
 */
const Utils = (function() {
  /**
   * -------------------------------------------------------------------------
   * FORMATTING UTILITIES
   * -------------------------------------------------------------------------
   */
  
  /**
   * Formatea un timestamp a fecha y/u hora local
   * @param {number} timestamp - Timestamp en segundos o milisegundos
   * @param {boolean} [includeDate=false] - Si se debe incluir la fecha además de la hora
   * @param {string} [defaultValue='N/A'] - Valor por defecto si timestamp es inválido
   * @return {string} - Timestamp formateado
   */
  function formatTimestamp(timestamp, includeDate = false, defaultValue = 'N/A') {
    if (!timestamp) return defaultValue;
    
    // Normalizar timestamp a milisegundos
    const ts = timestamp > 9999999999 ? timestamp : timestamp * 1000;
    
    try {
      const date = new Date(ts);
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return defaultValue;
      }
      
      return includeDate ? date.toLocaleString() : date.toLocaleTimeString();
    } catch (e) {
      logError(`Error al formatear timestamp: ${e.message}`, 'Utils');
      return defaultValue;
    }
  }
  
  /**
   * Formatea un valor numérico con unidad opcional
   * @param {number} value - Valor a formatear
   * @param {string} [unit=''] - Unidad a agregar (ej: 'V', 'A', '%')
   * @param {number} [decimals=2] - Cantidad de decimales
   * @param {boolean} [removeTrailingZeros=true] - Eliminar ceros finales
   * @param {string} [defaultValue='N/A'] - Valor por defecto si value es inválido
   * @return {string} - Valor formateado con unidad
   */
	function formatValueWithUnit(value, unit = '', decimals = 2, removeTrailingZeros = true, defaultValue = 'N/A') {
		if (value === null || value === undefined || isNaN(value)) return defaultValue;

		try {
			let num = Number(value);
			let formatted = num.toFixed(decimals); // E.g., 100 -> "100" (con decimals=0)
												 // E.g., 12.3400 -> "12.3400" (con decimals=4)
												 // E.g., 12.00 -> "12.00" (con decimals=2)

			if (removeTrailingZeros && decimals > 0 && formatted.includes('.')) {
				// Solo intentamos quitar ceros si hay decimales y un punto.
				// No queremos tocar "100" si decimals es 0.
				
				let pointIndex = formatted.indexOf('.');
				let nonZeroFractionIndex = -1;

				// Buscar el último dígito fraccionario que no sea cero
				for (let i = formatted.length - 1; i > pointIndex; i--) {
					if (formatted[i] !== '0') {
						nonZeroFractionIndex = i;
						break;
					}
				}

				if (nonZeroFractionIndex === -1) {
					// Todos los dígitos fraccionarios son cero (o no hay dígitos fraccionarios si decimals era 0 pero formatted.includes('.') dio true por alguna razón extraña)
					// E.g., "12.000" -> queremos "12"
					formatted = formatted.substring(0, pointIndex);
				} else {
					// Hay dígitos fraccionarios no nulos
					// E.g., "12.30400", nonZeroFractionIndex apunta a '4'
					// Queremos hasta el índice nonZeroFractionIndex inclusive.
					formatted = formatted.substring(0, nonZeroFractionIndex + 1);
				}
			}
			
			return unit ? `${formatted} ${unit}` : formatted;
		} catch (e) {
			console.error(`[Utils] Error al formatear valor: ${e.message}`, value);
			return defaultValue;
		}
	}
  
  /**
   * Formatea el estado de una batería con clase CSS opcional
   * @param {string} status - Estado ('Cargando', 'Descargando', etc.)
   * @param {boolean} [includeClass=false] - Si se debe devolver la clase CSS
   * @return {string|Object} - Estado formateado o objeto {text, class}
   */
  function formatBatteryStatus(status, includeClass = false) {
    let cssClass = 'normal';
    
    if (!status) {
      status = 'Desconocido';
      cssClass = 'unknown';
    } else if (status === 'Cargando') {
      cssClass = 'charging';
    } else if (status === 'Descargando') {
      cssClass = 'discharging';
    } else if (status === 'Error') {
      cssClass = 'error';
    } else if (status === 'Crítico') {
      cssClass = 'critical';
    } else if (status === 'Advertencia') {
      cssClass = 'warning';
    }
    
    return includeClass ? { text: status, class: cssClass } : status;
  }
		/**
	 * Muestra un mensaje en un elemento específico
	 * @param {HTMLElement} element - Elemento donde mostrar el mensaje
	 * @param {string} message - Mensaje a mostrar
	 * @param {string} type - Tipo de mensaje (success, error, info)
	 */
	function showMessage(element, message, type = 'info') {
	  if (!element) {
		logWarn("showMessage: Elemento no encontrado", "Utils");
		return;
	  }
	  
	  // Limpiar timeout anterior si existe
	  if (element.timeoutId) {
		clearTimeout(element.timeoutId);
	  }
	  
	  // Actualizar contenido y clase
	  element.textContent = message;
	  element.className = `message-area ${type}`;
	  
	  // Auto-limpiar después de un tiempo
	  element.timeoutId = setTimeout(() => {
		if (element.textContent === message) {
		  element.textContent = '';
		  element.className = 'message-area';
		}
	  }, 5000);
	  
	  // Log del mensaje para depuración
	  logInfo(`Mensaje (${type}): ${message}`, 'Utils');
	}
	
  /**
   * -------------------------------------------------------------------------
   * REGISTER INTERPRETATION
   * -------------------------------------------------------------------------
   */
  
  /**
   * Mapa de registros conocidos de baterías Huawei
   */
  const HUAWEI_BATTERY_REGISTERS = {
    0: { name: "Battery Voltage", unit: "V", factor: 0.01, signed: false },
    1: { name: "Pack Voltage", unit: "V", factor: 0.01, signed: false },
    2: { name: "Battery Current", unit: "A", factor: 0.01, signed: true },
    3: { name: "Battery SOC", unit: "%", factor: 1, signed: false },
    4: { name: "Battery SOH", unit: "%", factor: 1, signed: false },
    5: { name: "Reg Unknown 5", unit: "", factor: 1, signed: false },
    6: { name: "Reg Unknown 6", unit: "", factor: 1, signed: false }
  };
  
  /**
   * Interpreta un valor de registro según su dirección
   * @param {number} address - Dirección del registro
   * @param {number} value - Valor crudo del registro
   * @return {Object} - Información interpretada
   */
  function interpretRegisterValue(address, value) {
    if (!HUAWEI_BATTERY_REGISTERS[address]) {
      return { 
        name: `Registro ${address}`, 
        rawValue: value, 
        unit: '', 
        interpretedValue: value.toString() 
      };
    }
    
    const register = HUAWEI_BATTERY_REGISTERS[address];
    let processedValue = value;
    
    if (register.signed && value > 32767) {
      processedValue = value - 65536;
    }
    
    const scaledValue = processedValue * register.factor;
    return { 
      name: register.name, 
      rawValue: value, 
      unit: register.unit, 
      interpretedValue: formatValueWithUnit(scaledValue, register.unit)
    };
  }
  
  /**
   * Convierte el valor crudo de corriente a valor real con signo
   * @param {number} rawCurrent - Valor crudo de corriente
   * @return {number} - Valor de corriente con signo
   */
  function convertCurrentValue(rawCurrent) {
    if (rawCurrent === null || rawCurrent === undefined) return null;
    
    if (rawCurrent > 32767) {  // Valor negativo en complemento a 2
      return (rawCurrent - 65536) * 0.01;
    }
    return rawCurrent * 0.01;
  }
  
  /**
   * Determina el estado de una batería basado en el valor de corriente
   * @param {number} current - Valor de corriente (ya convertido)
   * @return {string} - Estado de la batería ('Cargando', 'Descargando', 'Inactivo')
   */
  function determineBatteryStatus(current) {
    if (current === null || current === undefined) return 'Desconocido';
    
    if (current > 0.05) return 'Cargando';
    if (current < -0.05) return 'Descargando';
    return 'Inactivo';
  }
  
  /**
   * Determina la clase de estado de una batería según varios parámetros
   * @param {Object} batteryData - Datos de la batería
   * @return {string} - Clase CSS correspondiente al estado
   */
  function getBatteryStatusClass(batteryData) {
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
  }
  
  /**
   * Procesa datos crudos de registros y los muestra en una tabla
   * @param {string|HTMLElement} tableBodyId - ID o elemento del cuerpo de la tabla
   * @param {Array} data - Datos crudos de registros
   * @param {number} baseAddress - Dirección base de los registros
   * @param {boolean} [clearTable=true] - Si se debe limpiar la tabla antes de actualizar
   */
  function displayRegisterData(tableBodyId, data, baseAddress, clearTable = true) {
    if (!data || !Array.isArray(data)) {
      logError('displayRegisterData: Datos inválidos', 'Utils');
      return;
    }
    
    const tableBody = typeof tableBodyId === 'string' ? 
                      document.getElementById(tableBodyId) : tableBodyId;
    
    if (!tableBody) {
      logError(`displayRegisterData: No se encontró el elemento: ${tableBodyId}`, 'Utils');
      return;
    }
    
    // Limpiar tabla si se requiere
    if (clearTable) {
      tableBody.innerHTML = '';
    }
    
    // Procesar cada registro
    data.forEach((value, index) => {
      const address = baseAddress + index;
      const row = tableBody.insertRow();
      const interpretedData = interpretRegisterValue(address, value);
      
      row.insertCell().textContent = `${address} - ${interpretedData.name}`;
      row.insertCell().textContent = value.toString();
      row.insertCell().textContent = (typeof value === 'boolean') 
        ? (value ? 'TRUE' : 'FALSE') 
        : '0x' + value.toString(16).toUpperCase().padStart(4, '0');
      row.insertCell().textContent = interpretedData.unit 
        ? `${interpretedData.interpretedValue}` 
        : interpretedData.interpretedValue;
    });
  }

  /**
   * -------------------------------------------------------------------------
   * LOGGING UTILITIES
   * -------------------------------------------------------------------------
   */
  
  /**
   * Niveles de log disponibles
   */
  const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };
  
  /**
   * Nivel de log actual (configurable)
   */
  let currentLogLevel = LOG_LEVELS.INFO;
  
  /**
   * Establece el nivel de log
   * @param {number} level - Nivel de log (usar constantes LOG_LEVELS)
   */
  function setLogLevel(level) {
    currentLogLevel = level;
  }
  
  /**
   * Función de log genérica
   * @param {string} message - Mensaje a loguear
   * @param {number} level - Nivel de log
   * @param {string} module - Nombre del módulo que genera el log
   * @param {*} [data=null] - Datos adicionales opcional
   */
  function log(message, level, module = 'App', data = null) {
    if (level < currentLogLevel) return;
    
    const prefix = `[${module}]`;
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
    const formattedMessage = `${timestamp} ${prefix} ${message}`;
    
    switch (level) {
      case LOG_LEVELS.DEBUG:
        console.log(formattedMessage, data || '');
        break;
      case LOG_LEVELS.INFO:
        console.info(formattedMessage, data || '');
        break;
      case LOG_LEVELS.WARN:
        console.warn(formattedMessage, data || '');
        break;
      case LOG_LEVELS.ERROR:
        console.error(formattedMessage, data || '');
        break;
    }
  }
  
  /**
   * Log de nivel debug
   * @param {string} message - Mensaje
   * @param {string} [module='App'] - Nombre del módulo
   * @param {*} [data=null] - Datos adicionales
   */
  function logDebug(message, module = 'App', data = null) {
    log(message, LOG_LEVELS.DEBUG, module, data);
  }
  
  /**
   * Log de nivel info
   * @param {string} message - Mensaje
   * @param {string} [module='App'] - Nombre del módulo
   * @param {*} [data=null] - Datos adicionales
   */
  function logInfo(message, module = 'App', data = null) {
    log(message, LOG_LEVELS.INFO, module, data);
  }
  
  /**
   * Log de nivel advertencia
   * @param {string} message - Mensaje
   * @param {string} [module='App'] - Nombre del módulo
   * @param {*} [data=null] - Datos adicionales
   */
  function logWarn(message, module = 'App', data = null) {
    log(message, LOG_LEVELS.WARN, module, data);
  }
  
  /**
   * Log de nivel error
   * @param {string} message - Mensaje
   * @param {string} [module='App'] - Nombre del módulo
   * @param {*} [data=null] - Datos adicionales
   */
  function logError(message, module = 'App', data = null) {
    log(message, LOG_LEVELS.ERROR, module, data);
  }

  /**
   * -------------------------------------------------------------------------
   * API PÚBLICA
   * -------------------------------------------------------------------------
   */
  return {
    // Formatting
    formatTimestamp,
    formatValueWithUnit,
    formatBatteryStatus,
    
    // Register Interpretation
    HUAWEI_BATTERY_REGISTERS,
    interpretRegisterValue,
    convertCurrentValue,
    determineBatteryStatus,
    getBatteryStatusClass,
    displayRegisterData,
    // UI Utilities
	showMessage,
    // Logging
    LOG_LEVELS,
    setLogLevel,
    log,
    logDebug,
    logInfo,
    logWarn,
    logError
  };
})();

// Exportar para uso global
window.Utils = Utils;