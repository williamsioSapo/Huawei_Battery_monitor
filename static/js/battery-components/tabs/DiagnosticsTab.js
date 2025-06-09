/**
 * Componente para la pestaña de Diagnósticos
 * Muestra lecturas crudas de todos los registros mapeados para validación
 * ACTUALIZADO para trabajar con el nuevo formato del backend
 */
const DiagnosticsTab = {
    // Variable para almacenar los datos de registros para exportación
    _lastRegisterData: null,
    
    /**
     * Renderiza el contenido de la pestaña Diagnósticos
     * @param {Object} batteryData - Datos de la batería
     * @param {Object} detailedInfo - Información detallada opcional
     * @param {jQuery} $container - Contenedor donde renderizar
     */
    render: function(batteryData, detailedInfo, $container) {
        if (!batteryData) {
            $container.html('<div class="tab-error">No hay datos disponibles</div>');
            return;
        }
        
        // Estructura HTML del componente
        const html = `
            <div class="diagnostics-info-container">
                <div class="battery-header">
                    <h3>Diagnóstico de Registros - Batería ${batteryData.id}</h3>
                    <div class="diagnostics-controls">
                        <button class="action-btn refresh-registers-btn">
                            <i class="action-icon">🔄</i> Actualizar Lecturas
                        </button>
                        <button class="action-btn export-data-btn" disabled>
                            <i class="action-icon">📊</i> Exportar Datos
                        </button>
                    </div>
                </div>
                
                <div class="diagnostics-status" id="diagnostics-status">
                    <p>Haga clic en "Actualizar Lecturas" para obtener los valores actuales de todos los registros mapeados.</p>
                </div>
                
                <div class="diagnostics-content" id="diagnostics-content">
                    <!-- Aquí se cargarán las tablas de registros -->
                </div>
            </div>
        `;
        
        // Añadir HTML al contenedor
        $container.html(html);
        
        // Configurar eventos
        this._setupEvents(batteryData, $container);
    },
    
    /**
     * Configura eventos para elementos interactivos
     * @private
     */
    _setupEvents: function(batteryData, $container) {
        const self = this;
        
        // Evento para actualizar registros
        $container.find('.refresh-registers-btn').on('click', function() {
            self._refreshAllRegisters(batteryData.id, $container);
        });
        
        // Evento para exportar datos
        $container.find('.export-data-btn').on('click', function() {
            self._exportRegisterData(batteryData.id);
        });
    },
    
    /**
     * Actualiza todas las lecturas de registros
     * @private
     */
    _refreshAllRegisters: function(batteryId, $container) {
        const self = this;
        const $status = $container.find('#diagnostics-status');
        const $content = $container.find('#diagnostics-content');
        const $exportBtn = $container.find('.export-data-btn');
        
        // Mostrar estado de carga
        $status.html(`
            <div class="loading-status">
                <div class="loading-spinner"></div>
                <p>Leyendo registros mapeados de la batería ${batteryId}...</p>
                <div class="progress-info">
                    <span id="current-register">Conectando con dispositivo...</span>
                    <span id="progress-counter">Preparando...</span>
                </div>
            </div>
        `);
        
        // Limpiar contenido anterior y deshabilitar exportación
        $content.empty();
        $exportBtn.prop('disabled', true);
        
        // Llamar API para obtener todos los registros
        if (typeof getAllMappedRegisters === 'function') {
            getAllMappedRegisters(batteryId)
                .then(result => {
                    if (result.status === 'success' || result.status === 'partial') {
                        // Almacenar datos para exportación
                        self._lastRegisterData = {
                            batteryId: batteryId,
                            timestamp: new Date().toISOString(),
                            data: result
                        };
                        
                        // Renderizar con nuevo formato
                        self._renderNewFormatData(result, $content);
                        
                        // Mostrar estado de éxito
                        $status.html(`
                            <div class="success-status">
                                <p>✅ ${result.message}</p>
                                <p><strong>Total:</strong> ${result.summary.successful_reads} registros leídos, ${result.summary.failed_reads} errores</p>
                                <p><small>Última actualización: ${new Date().toLocaleString()}</small></p>
                            </div>
                        `);
                        
                        // Habilitar exportación
                        $exportBtn.prop('disabled', false);
                    } else {
                        $status.html(`
                            <div class="error-status">
                                <p>❌ Error: ${result.message || 'Error desconocido'}</p>
                            </div>
                        `);
                    }
                })
                .catch(error => {
                    console.error('Error al obtener registros:', error);
                    $status.html(`
                        <div class="error-status">
                            <p>❌ Error de conexión: ${error.message}</p>
                            <p><small>Verifique la conexión con el dispositivo</small></p>
                        </div>
                    `);
                });
        } else {
            $status.html(`
                <div class="error-status">
                    <p>❌ API getAllMappedRegisters no disponible</p>
                    <p><small>Verifique que modbusApi.js esté cargado correctamente</small></p>
                </div>
            `);
        }
    },
    
    /**
     * Renderiza los datos en el nuevo formato estructurado
     */
    _renderNewFormatData: function(result, $container) {
        // Debug: Log completo de datos recibidos
        console.log('Datos completos recibidos:', result);
        console.log('Datos de celdas específicos:', result.cell_data);
        
        // Crear secciones para cada tipo de datos
        
        // 1. Registros Básicos
        if (result.basic_registers && Object.keys(result.basic_registers).length > 0) {
            const $basicSection = this._createNewFormatSection(
                'Registros Básicos',
                'Voltajes, corrientes, SOC, SOH y estados principales',
                result.basic_registers,
                'basic'
            );
            $container.append($basicSection);
        }
        
        // 2. Datos de Celdas
        if (result.cell_data && Object.keys(result.cell_data).length > 0) {
            const $cellSection = this._createCellDataSection(result.cell_data);
            $container.append($cellSection);
        }
        
        // 3. Strings ASCII
        if (result.ascii_strings && Object.keys(result.ascii_strings).length > 0) {
            const $asciiSection = this._createAsciiSection(result.ascii_strings);
            $container.append($asciiSection);
        }
        
        // 4. Registros Experimentales
        if (result.experimental_registers && Object.keys(result.experimental_registers).length > 0) {
            const $expSection = this._createNewFormatSection(
                'Registros Experimentales',
                'Registros en investigación o con significado incierto',
                result.experimental_registers,
                'experimental'
            );
            $container.append($expSection);
        }
        
        // 5. Errores si los hay
        if (result.errors && result.errors.length > 0) {
            const $errorSection = this._createErrorSection(result.errors);
            $container.append($errorSection);
        }
    },
    
    /**
     * Crea una sección para registros básicos o experimentales
     */
    _createNewFormatSection: function(title, description, registers, type) {
        const $section = $('<div class="register-category"></div>');
        
        $section.append(`
            <h4 class="category-title">
                ${title}
                <br><small style="font-weight: normal; color: #6c757d;">${description}</small>
            </h4>
        `);
        
        const $table = $(`
            <table class="registers-table">
                <thead>
                    <tr>
                        <th>Registro</th>
                        <th>Valor Crudo</th>
                        <th>Valor Procesado</th>
                        <th>Unidad</th>
                        <th>Campo JSON</th>
                        <th>Detalles</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        `);
        
        const $tbody = $table.find('tbody');
        
        // Ordenar por dirección
        const sortedKeys = Object.keys(registers).sort((a, b) => {
            const addrA = parseInt(a.replace('0x', ''), 16);
            const addrB = parseInt(b.replace('0x', ''), 16);
            return addrA - addrB;
        });
        
        sortedKeys.forEach(key => {
            const register = registers[key];
            const $row = this._createNewFormatRow(register, type);
            $tbody.append($row);
        });
        
        $section.append($table);
        return $section;
    },
    
    /**
     * Crea una fila para un registro en el nuevo formato
     */
    _createNewFormatRow: function(register, type) {
        const is32bit = register.is_32bit || false;
        const statusClass = 'success';
        const statusIcon = '✅';
        
        return $(`
            <tr class="register-row ${statusClass}">
                <td class="register-address">
                    <strong>0x${register.address.toString(16).toUpperCase().padStart(4, '0')}</strong>
                    <br><small>${register.name}</small>
                </td>
                <td class="raw-value">
                    ${this._formatRawValue(register.raw_value)}
                    ${is32bit ? '<br><small class="bit32-indicator">32-bit</small>' : ''}
                </td>
                <td class="processed-value">
                    <strong>${this._formatProcessedValue(register.processed_value, register.unit)}</strong>
                </td>
                <td class="unit">
                    ${register.unit || '-'}
                </td>
                <td class="json-field">
                    <code>${register.json_field || '-'}</code>
                </td>
                <td class="details">
                    ${statusIcon}
                    ${is32bit ? `<br><small>MSW: ${register.msw}, LSW: ${register.lsw}</small>` : ''}
                </td>
            </tr>
        `);
    },
    
    /**
     * Crea sección para datos de celdas
     */
    _createCellDataSection: function(cellData) {
        const $section = $('<div class="register-category"></div>');
        
        $section.append(`
            <h4 class="category-title">
                Datos de Celdas
                <br><small style="font-weight: normal; color: #6c757d;">Voltajes y temperaturas individuales por celda</small>
            </h4>
        `);
        
        // Debug: Log para verificar datos recibidos
        console.log('Datos de celdas recibidos:', cellData);
        
        Object.keys(cellData).forEach(arrayName => {
            const arrayInfo = cellData[arrayName];
            
            // Debug: Log para cada array
            console.log(`Procesando array: ${arrayName}`, arrayInfo);
            
            if (arrayInfo.success && arrayInfo.cells && arrayInfo.cells.length > 0) {
                const $arrayDiv = $('<div class="cell-array-container"></div>');
                
                $arrayDiv.append(`<h5>${arrayInfo.description}</h5>`);
                
                const $table = $(`
                    <table class="cell-table">
                        <thead>
                            <tr>
                                <th>Celda</th>
                                <th>Valor Crudo</th>
                                <th>Valor Procesado</th>
                                <th>Unidad</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                `);
                
                const $tbody = $table.find('tbody');
                
                arrayInfo.cells.forEach(cell => {
                    let statusClass, statusIcon, displayValue;
                    
                    if (cell.status === 'N/A') {
                        if (cell.raw_value === 65535) {  // 0xFFFF - voltaje
                            statusIcon = '⚠️';
                            displayValue = 'N/A (celda no presente)';
                        } else if (cell.raw_value === 64537) {  // 0xFC19 - temperatura
                            statusIcon = '🔌';
                            displayValue = 'N/A (sensor desconectado)';
                        } else {
                            statusIcon = '⚠️';
                            displayValue = 'N/A';
                        }
                        statusClass = 'warning';
                    } else {
                        statusIcon = '✅';
                        displayValue = this._formatProcessedValue(cell.processed_value, arrayInfo.unit);
                        statusClass = 'success';
                    }
                    
                    $tbody.append(`
                        <tr class="cell-row ${statusClass}">
                            <td><strong>Celda ${cell.cell_number}</strong></td>
                            <td>${this._formatRawValue(cell.raw_value)}</td>
                            <td><strong>${displayValue}</strong></td>
                            <td>${arrayInfo.unit}</td>
                            <td>${statusIcon} ${cell.status}</td>
                        </tr>
                    `);
                });
                
                $arrayDiv.append($table);
                $section.append($arrayDiv);
                
            } else {
                // Debug: Log para arrays fallidos
                console.log(`Array ${arrayName} no tiene datos válidos:`, arrayInfo);
                
                const $errorDiv = $('<div class="cell-array-error"></div>');
                $errorDiv.append(`
                    <h5>${arrayInfo.description || arrayName}</h5>
                    <p class="error-message">
                        ${arrayInfo.success ? 'No hay datos de celdas disponibles' : `Error: ${arrayInfo.error || 'Desconocido'}`}
                    </p>
                `);
                $section.append($errorDiv);
            }
        });
        
        return $section;
    },
    
    /**
     * Crea sección para strings ASCII
     */
    _createAsciiSection: function(asciiStrings) {
        const $section = $('<div class="register-category"></div>');
        
        $section.append(`
            <h4 class="category-title">
                Información del Dispositivo (ASCII)
                <br><small style="font-weight: normal; color: #6c757d;">Códigos de barras, modelos y identificadores</small>
            </h4>
        `);
        
        const $table = $(`
            <table class="ascii-table">
                <thead>
                    <tr>
                        <th>Campo</th>
                        <th>Dirección Inicio</th>
                        <th>Longitud</th>
                        <th>Texto Decodificado</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        `);
        
        const $tbody = $table.find('tbody');
        
        Object.keys(asciiStrings).forEach(key => {
            const stringInfo = asciiStrings[key];
            const statusClass = stringInfo.success ? 'success' : 'error';
            const statusIcon = stringInfo.success ? '✅' : '❌';
            
            $tbody.append(`
                <tr class="ascii-row ${statusClass}">
                    <td><strong>${stringInfo.description}</strong></td>
                    <td><code>${stringInfo.start_address}</code></td>
                    <td>${stringInfo.length} registros</td>
                    <td class="ascii-text">
                        ${stringInfo.success ? `<strong>"${stringInfo.ascii_string}"</strong>` : 'Error'}
                    </td>
                    <td>${statusIcon}</td>
                </tr>
            `);
        });
        
        $section.append($table);
        return $section;
    },
    
    /**
     * Crea sección para errores
     */
    _createErrorSection: function(errors) {
        const $section = $('<div class="register-category error-section"></div>');
        
        $section.append(`
            <h4 class="category-title error">
                Errores de Lectura
                <br><small style="font-weight: normal; color: #6c757d;">Registros que no pudieron ser leídos</small>
            </h4>
        `);
        
        const $list = $('<ul class="error-list"></ul>');
        
        errors.forEach(error => {
            $list.append(`
                <li class="error-item">
                    <strong>${error.address || error.array || error.string}</strong>
                    ${error.name ? ` (${error.name})` : ''}
                    : ${error.error}
                </li>
            `);
        });
        
        $section.append($list);
        return $section;
    },
    
    /**
     * Formatea el valor crudo
     */
    _formatRawValue: function(rawValue) {
        if (rawValue === null || rawValue === undefined) return 'N/A';
        const numValue = parseInt(rawValue);
        return `${numValue} (0x${numValue.toString(16).toUpperCase().padStart(4, '0')})`;
    },
    
    /**
     * Formatea el valor procesado
     */
    _formatProcessedValue: function(processedValue, unit) {
        if (processedValue === null || processedValue === undefined) return 'N/A';
        
        if (typeof processedValue === 'string') {
            return processedValue; // Para casos como versión de software
        }
        
        const numValue = parseFloat(processedValue);
        if (Number.isInteger(numValue)) {
            return numValue.toString();
        } else {
            return numValue.toFixed(3);
        }
    },
    
    /**
     * Exporta los datos en el nuevo formato
     */
    _exportRegisterData: function(batteryId) {
        if (!this._lastRegisterData) {
            alert('No hay datos para exportar. Actualice las lecturas primero.');
            return;
        }
        
        try {
            const csvData = [];
            const headers = ['Categoría', 'Dirección', 'Nombre', 'Valor Crudo', 'Valor Procesado', 'Unidad', 'Campo JSON', 'Es 32bit', 'Estado'];
            csvData.push(headers.join(','));
            
            const data = this._lastRegisterData.data;
            
            // Procesar registros básicos
            this._addRegistersToCSV(csvData, data.basic_registers, 'Básicos');
            
            // Procesar registros experimentales
            this._addRegistersToCSV(csvData, data.experimental_registers, 'Experimentales');
            
            // Procesar datos de celdas
            if (data.cell_data) {
                Object.keys(data.cell_data).forEach(arrayName => {
                    const arrayInfo = data.cell_data[arrayName];
                    if (arrayInfo.success && arrayInfo.cells) {
                        arrayInfo.cells.forEach(cell => {
                            const row = [
                                'Celdas',
                                `${arrayInfo.start_address}+${cell.cell_number-1}`,
                                `${arrayInfo.description} - Celda ${cell.cell_number}`,
                                cell.raw_value || 'N/A',
                                cell.processed_value || 'N/A',
                                arrayInfo.unit,
                                `cell_${arrayName}_${cell.cell_number}`,
                                'No',
                                cell.status
                            ];
                            csvData.push(row.join(','));
                        });
                    }
                });
            }
            
            // Crear y descargar archivo
            const csvContent = csvData.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `registros_bateria_${batteryId}_${new Date().toISOString().slice(0,10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Error al exportar datos:', error);
            alert('Error al exportar datos: ' + error.message);
        }
    },
    
    /**
     * Añade registros al CSV
     */
    _addRegistersToCSV: function(csvData, registers, category) {
        if (!registers) return;
        
        Object.keys(registers).forEach(key => {
            const register = registers[key];
            const row = [
                category,
                `0x${register.address.toString(16).toUpperCase().padStart(4, '0')}`,
                `"${register.name}"`,
                register.raw_value || 'N/A',
                register.processed_value || 'N/A',
                register.unit || '-',
                register.json_field || '-',
                register.is_32bit ? 'Sí' : 'No',
                'OK'
            ];
            csvData.push(row.join(','));
        });
    }
};