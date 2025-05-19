/**
 * WindowManager.js - Sistema de gestión de ventanas estilo Windows 10
 * Basado en jQuery UI Dialog con extensiones personalizadas
 */

const WindowManager = (function($) {
    'use strict';
    
    // ========== VARIABLES PRIVADAS ==========
    
    // Registro de ventanas
    const windows = {};
    
    // Ventana activa actualmente
    let activeWindowId = null;
    
    // ID para la próxima ventana
    let nextWindowId = 1;
    
    // Z-Index base para ventanas
    let baseZIndex = 1000;
    let nextZIndex = baseZIndex;
    
    // Referencia a contenedor de ventanas minimizadas (taskbar)
    let $taskbar = null;
    
    // ========== MÉTODOS PRIVADOS ==========
    
    /**
     * Trae una ventana al frente (z-index) y la activa
     */
    function _bringToFront(windowId) {
        // Actualizar z-index para esta ventana
        if (windows[windowId] && windows[windowId].$element) {
            windows[windowId].$element.css('z-index', nextZIndex++);
        }
        
        // Actualizar estado de activación para todas las ventanas
        for (const id in windows) {
            if (id === windowId) {
                windows[id].$element.addClass('window-active');
            } else {
                windows[id].$element.removeClass('window-active');
            }
        }
        
        // Actualizar referencia a ventana activa
        activeWindowId = windowId;
    }
    
    /**
     * Crea los botones de control de la ventana
     */
    function _createWindowControls(windowId, options) {
        const $controls = $('<div class="window-controls"></div>');
        
        // Botón de minimizar (si está habilitado)
        if (options.minimizable !== false) {
            const $minimizeBtn = $('<button type="button" class="window-control-button window-button-minimize" title="Minimizar"></button>');
            $minimizeBtn.on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                WindowManager.minimizeWindow(windowId);
            });
            $controls.append($minimizeBtn);
        }
        
        // Botón de maximizar (si está habilitado)
        if (options.maximizable !== false) {
            const $maximizeBtn = $('<button type="button" class="window-control-button window-button-maximize" title="Maximizar"></button>');
            $maximizeBtn.on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (windows[windowId].state === 'maximized') {
                    WindowManager.restoreWindow(windowId);
                } else {
                    WindowManager.maximizeWindow(windowId);
                }
            });
            $controls.append($maximizeBtn);
        }
        
        // Botón de cerrar (siempre presente)
        const $closeBtn = $('<button type="button" class="window-control-button window-button-close" title="Cerrar"></button>');
        $closeBtn.on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            WindowManager.closeWindow(windowId);
        });
        $controls.append($closeBtn);
        
        return $controls;
    }
    
    /**
     * Guarda la posición y tamaño original de la ventana
     */
    function _saveWindowDimensions(windowId) {
        if (!windows[windowId]) return;
        
        const $element = windows[windowId].$element;
        
        // Verificar que el elemento existe y es un diálogo válido
        if (!$element || !$element.hasClass('ui-dialog')) {
            console.error(`Error: Ventana ${windowId} no es un diálogo válido`);
            return;
        }
        
        try {
            // Obtener posición del elemento directamente
            const position = {
                left: parseInt($element.css('left')) || 0,
                top: parseInt($element.css('top')) || 0
            };
            
            // Obtener tamaño del elemento directamente
            const width = $element.width() || 400;
            const height = $element.height() || 300;
            
            // Guardar dimensiones
            windows[windowId].originalPosition = position;
            windows[windowId].originalSize = {
                width: width,
                height: height
            };
            
            console.log(`Dimensiones guardadas para ventana ${windowId}: ${JSON.stringify(windows[windowId].originalSize)}`);
        } catch (e) {
            console.error(`Error al guardar dimensiones para ventana ${windowId}: ${e.message}`);
        }
    }
    
    /**
     * Crea el contenedor para la barra de tareas si no existe
     */
    function _initTaskbar() {
        if (!$taskbar) {
            $taskbar = $('#windows-taskbar');
            
            // Si no existe, crearla
            if ($taskbar.length === 0) {
                $taskbar = $('<div id="windows-taskbar"></div>');
                $('body').append($taskbar);
            }
        }
        
        return $taskbar;
    }
    
    /**
     * Actualiza la entrada en la barra de tareas para una ventana
     */
    function _updateTaskbarItem(windowId) {
        _initTaskbar();
        
        // Buscar si ya existe una entrada para esta ventana
        let $item = $taskbar.find(`[data-window-id="${windowId}"]`);
        
        // Si la ventana está cerrada, eliminar su entrada
        if (!windows[windowId]) {
            if ($item.length > 0) {
                $item.remove();
            }
            return;
        }
        
        const windowData = windows[windowId];
        
        // Si no existe, crear una nueva entrada
        if ($item.length === 0) {
            $item = $('<div class="taskbar-item"></div>')
                .attr('data-window-id', windowId)
                .text(windowData.title)
                .on('click', function() {
                    if (windowData.state === 'minimized') {
                        WindowManager.restoreWindow(windowId);
                    } else {
                        WindowManager.minimizeWindow(windowId);
                    }
                });
            
            $taskbar.append($item);
        }
        
        // Actualizar estado
        $item.toggleClass('taskbar-item-active', windowId === activeWindowId);
        $item.toggleClass('taskbar-item-minimized', windowData.state === 'minimized');
    }
    
    // ========== API PÚBLICA ==========
    
    return {
        /**
         * Crea una nueva ventana
         * @param {Object} options - Opciones de configuración
         * @returns {string} ID de la ventana creada
         */
        createWindow: function(options) {
            // Generar ID único para esta ventana
            const windowId = 'window-' + (nextWindowId++);
            
            // Opciones por defecto
            const defaultOptions = {
                title: 'Ventana',
                width: 600,
                height: 400,
                minWidth: 200,
                minHeight: 150,
                autoOpen: true,
                draggable: true,
                resizable: true,
                closeOnEscape: true,
                position: { my: "center", at: "center", of: window },
                maximizable: true,
                minimizable: true,
                // Añadir función de limpieza al cerrar
                close: function(event, ui) {
                    // Esta función se ejecuta cuando el diálogo se cierra con dialog('close')
                    $(this).dialog('destroy').remove();
                }
            };
            
            // Combinar opciones
            const windowOptions = $.extend({}, defaultOptions, options);
            
            // Si había una función close original, la preservamos
            const originalClose = options.close;
            
            // Modificar función close para hacer limpieza completa
            windowOptions.close = function(event, ui) {
                try {
                    // Limpiar todos los temporizadores y observadores si existen
                    $(this).find('*').off();
                    
                    // Si hay una función close original, la llamamos
                    if (typeof originalClose === 'function') {
                        originalClose.call(this, event, ui);
                    }
                    
                    // Destruir y remover - importantes para evitar contenido huérfano
                    $(this).dialog('destroy').remove();
                } catch (e) {
                    console.warn(`Error en función close: ${e.message}`);
                }
            };
            
            try {
                // Crear contenedor DOM para la ventana
                const $windowElement = $('<div>', {
                    id: windowId,
                    class: 'window-container',
                    title: windowOptions.title
                });
                
                // Si hay contenido, añadirlo
                if (windowOptions.content) {
                    if (typeof windowOptions.content === 'string') {
                        $windowElement.html(windowOptions.content);
                    } else {
                        $windowElement.append(windowOptions.content);
                    }
                }
                
                // Añadir a la página
                $('body').append($windowElement);
                
                // Inicializar como Dialog de jQuery UI con manejo de errores
                try {
                    $windowElement.dialog({
                        ...windowOptions,
                        // Sobrescribir crear para añadir nuestros botones
                        create: function(event, ui) {
                            // Añadir clase de ventana personalizada
                            $(this).parent().addClass('custom-window window-active');
                            
                            // Añadir botones personalizados
                            const $controls = _createWindowControls(windowId, windowOptions);
                            $(this).parent().find('.ui-dialog-titlebar').append($controls);
                            
                            // Permitir que se propague el evento create original
                            if (typeof windowOptions.create === 'function') {
                                windowOptions.create.call(this, event, ui);
                            }
                        },
                        // Evento de foco
                        focus: function(event, ui) {
                            WindowManager.activateWindow(windowId);
                        }
                    });
                } catch (e) {
                    console.error(`Error al inicializar diálogo para ventana ${windowId}: ${e.message}`);
                    // Intentar limpiar
                    $windowElement.remove();
                    return null;
                }
                
                // Obtener el contenedor de diálogo padre
                const $dialogContainer = $windowElement.parent('.ui-dialog');
                
                // Registrar ventana en nuestro sistema
                windows[windowId] = {
                    id: windowId,
                    title: windowOptions.title,
                    $element: $dialogContainer, // El elemento padre es el contenedor completo
                    dialogInstance: $windowElement.dialog('instance'),
                    dialogContent: $windowElement, // Guardar referencia al contenido
                    state: 'normal',
                    originalPosition: {
                        left: parseInt($dialogContainer.css('left')) || 0,
                        top: parseInt($dialogContainer.css('top')) || 0
                    },
                    originalSize: {
                        width: $dialogContainer.width() || windowOptions.width,
                        height: $dialogContainer.height() || windowOptions.height
                    },
                    usageCount: 0,
                    createdAt: new Date()
                };
                
                // Activar esta ventana
                this.activateWindow(windowId);
                
                // Actualizar barra de tareas
                _updateTaskbarItem(windowId);
                
                // Devolver el ID para referencia
                return windowId;
            } catch (e) {
                console.error(`Error al crear ventana: ${e.message}`);
                return null;
            }
        },
        
        /**
         * Activa una ventana (la trae al frente)
         * @param {string} windowId - ID de la ventana
         */
        activateWindow: function(windowId) {
            if (!windows[windowId]) return;
            
            // Incrementar contador de uso
            windows[windowId].usageCount++;
            
            // Si estaba minimizada, restaurarla
            if (windows[windowId].state === 'minimized') {
                this.restoreWindow(windowId);
                return;
            }
            
            // Traer al frente
            _bringToFront(windowId);
            
            // Actualizar barra de tareas
            _updateTaskbarItem(windowId);
        },
        
        /**
         * Cierra una ventana
         * @param {string} windowId - ID de la ventana
         */
        closeWindow: function(windowId) {
            if (!windows[windowId]) return;
            
            try {
                // Referencia a elementos importantes
                const dialogContent = windows[windowId].dialogContent;
                const $element = windows[windowId].$element;
                
                // Primero, intentar usar el método dialog('destroy') que limpia mejor que close
                if (dialogContent && dialogContent.hasClass('ui-dialog-content')) {
                    try {
                        // Primero intentamos el método más limpio: destroy
                        dialogContent.dialog('destroy');
                    } catch (e) {
                        console.warn(`No se pudo destruir el diálogo: ${e.message}, intentando cerrar...`);
                        try {
                            dialogContent.dialog('close');
                        } catch (e2) {
                            console.warn(`Tampoco se pudo cerrar el diálogo: ${e2.message}`);
                        }
                    }
                }
                
                // Limpieza manual completa para asegurar que no queden rastros en el DOM
                
                // 1. Eliminar el contenido original y guardarlo temporalmente
                let originalContent = null;
                if (dialogContent && dialogContent.length) {
                    try {
                        // Importante: Detener todos los temporizadores y eventos asociados
                        dialogContent.find('*').off();
                        
                        // Obtener el contenido original (opcional, si quieres reutilizarlo)
                        originalContent = dialogContent.contents().detach();
                        
                        // Vaciar el contenido
                        dialogContent.empty();
                    } catch (e) {
                        console.warn(`Error al limpiar contenido: ${e.message}`);
                    }
                }
                
                // 2. Eliminar el elemento del diálogo y su contenedor
                if ($element && $element.length) {
                    try {
                        // Primero quitar todos los eventos para evitar memory leaks
                        $element.find('*').off();
                        $element.off();
                        
                        // Luego eliminar del DOM
                        $element.remove();
                    } catch (e) {
                        console.warn(`Error al eliminar elemento del DOM: ${e.message}`);
                    }
                }
                
                // 3. Buscar y eliminar cualquier otro elemento relacionado que pudiera haber quedado
                $(`#${windowId}`).remove();
                $(`.ui-dialog-content[aria-describedby="${windowId}"]`).remove();
                
                // 4. Limpieza adicional de cualquier elemento huérfano
                $('.ui-dialog:not(:has(.ui-dialog-content))').remove();
                
                // Eliminar de nuestro registro
                delete windows[windowId];
                
                // Si era la ventana activa, limpiar referencia
                if (activeWindowId === windowId) {
                    activeWindowId = null;
                    
                    // Activar la última ventana abierta si hay alguna
                    const remainingWindows = Object.keys(windows);
                    if (remainingWindows.length > 0) {
                        this.activateWindow(remainingWindows[remainingWindows.length - 1]);
                    }
                }
                
                // Actualizar barra de tareas
                _updateTaskbarItem(windowId);
                
                // Forzar recolección de basura (no es seguro que funcione, pero puede ayudar)
                if (window.gc) window.gc();
                
                return originalContent; // Por si necesitas reutilizar el contenido
            } catch (e) {
                console.error(`Error al cerrar ventana ${windowId}: ${e.message}`);
                
                // Intento de limpieza de emergencia
                try {
                    if (windows[windowId]) {
                        if (windows[windowId].$element) {
                            windows[windowId].$element.remove();
                        }
                        if (windows[windowId].dialogContent) {
                            windows[windowId].dialogContent.remove();
                        }
                        $(`#${windowId}`).remove();
                        delete windows[windowId];
                    }
                    
                    // Limpieza adicional
                    $('.ui-dialog:not(:has(.ui-dialog-content))').remove();
                } catch (cleanupError) {
                    console.error(`Error durante limpieza de emergencia: ${cleanupError.message}`);
                }
            }
        },
        
        /**
         * Minimiza una ventana
         * @param {string} windowId - ID de la ventana
         */
        minimizeWindow: function(windowId) {
            if (!windows[windowId] || windows[windowId].state === 'minimized') return;
            
            try {
                // Guardar estado actual (solo si no estamos ya maximizados)
                if (windows[windowId].state === 'normal') {
                    _saveWindowDimensions(windowId);
                }
                
                // Actualizar estado
                windows[windowId].state = 'minimized';
                windows[windowId].$element.addClass('window-minimized');
                
                // Si era la ventana activa, activar otra
                if (activeWindowId === windowId) {
                    activeWindowId = null;
                    
                    // Encontrar otra ventana para activar
                    const visibleWindows = Object.keys(windows).filter(id => 
                        windows[id].state !== 'minimized');
                    
                    if (visibleWindows.length > 0) {
                        this.activateWindow(visibleWindows[visibleWindows.length - 1]);
                    }
                }
                
                // Actualizar barra de tareas
                _updateTaskbarItem(windowId);
            } catch (e) {
                console.error(`Error al minimizar ventana ${windowId}: ${e.message}`);
            }
        },
        
        /**
         * Maximiza una ventana
         * @param {string} windowId - ID de la ventana
         */
        maximizeWindow: function(windowId) {
            if (!windows[windowId] || windows[windowId].state === 'maximized') return;
            
            try {
                // Si estaba minimizada, primero restaurar visibilidad
                if (windows[windowId].state === 'minimized') {
                    windows[windowId].$element.removeClass('window-minimized');
                }
                
                // Guardar dimensiones previas si no tenemos guardadas y está en estado normal
                if (windows[windowId].state === 'normal') {
                    _saveWindowDimensions(windowId);
                }
                
                // Actualizar estado
                windows[windowId].state = 'maximized';
                windows[windowId].$element.addClass('window-maximized');
                
                // Activar esta ventana
                this.activateWindow(windowId);
                
                // Actualizar barra de tareas
                _updateTaskbarItem(windowId);
            } catch (e) {
                console.error(`Error al maximizar ventana ${windowId}: ${e.message}`);
            }
        },
        
        /**
         * Restaura una ventana (desde minimizado o maximizado)
         * @param {string} windowId - ID de la ventana
         */
        restoreWindow: function(windowId) {
            if (!windows[windowId] || windows[windowId].state === 'normal') return;
            
            try {
                // Quitar clases especiales
                windows[windowId].$element.removeClass('window-minimized window-maximized');
                
                // Si estaba maximizada, restaurar tamaño original
                if (windows[windowId].state === 'maximized' && 
                    windows[windowId].originalPosition && 
                    windows[windowId].originalSize) {
                    
                    // Restaurar posición y tamaño directamente con CSS
                    const pos = windows[windowId].originalPosition;
                    const size = windows[windowId].originalSize;
                    
                    windows[windowId].$element.css({
                        'left': pos.left + 'px',
                        'top': pos.top + 'px',
                        'width': size.width + 'px',
                        'height': size.height + 'px'
                    });
                }
                
                // Actualizar estado
                windows[windowId].state = 'normal';
                
                // Activar esta ventana
                this.activateWindow(windowId);
                
                // Actualizar barra de tareas
                _updateTaskbarItem(windowId);
            } catch (e) {
                console.error(`Error al restaurar ventana ${windowId}: ${e.message}`);
            }
        },
        
        /**
         * Obtiene la ventana actualmente activa
         * @returns {Object|null} Datos de la ventana activa o null
         */
        getActiveWindow: function() {
            return activeWindowId ? windows[activeWindowId] : null;
        },
        
        /**
         * Obtiene una ventana por su ID
         * @param {string} windowId - ID de la ventana
         * @returns {Object|null} Datos de la ventana o null
         */
        getWindowById: function(windowId) {
            return windows[windowId] || null;
        },
        
        /**
         * Obtiene todas las ventanas
         * @returns {Object} Todas las ventanas registradas
         */
        getAllWindows: function() {
            return {...windows};
        },
        
        /**
         * Obtiene el estado de una ventana
         * @param {string} windowId - ID de la ventana
         * @returns {string|null} Estado ('normal', 'minimized', 'maximized') o null
         */
        getWindowState: function(windowId) {
            return windows[windowId] ? windows[windowId].state : null;
        },
        
        /**
         * Cierra todas las ventanas
         */
        closeAllWindows: function() {
            // Hacer una copia para evitar problemas al modificar durante iteración
            const windowIds = Object.keys(windows);
            for (const id of windowIds) {
                this.closeWindow(id);
            }
        }
    };
})(jQuery);

// Asegurar que esté disponible globalmente
window.WindowManager = WindowManager;