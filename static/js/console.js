// static/js/console.js
'use strict';

/**
 * Módulo para gestionar la consola de depuración
 * Encapsula toda la funcionalidad relacionada con la consola
 */
const ConsoleManager = (function() {
    // Variables privadas del módulo
    let lastConsoleId = 0;
    let consoleUpdateInterval = null;
    let consolePaused = false;
    
    // Referencias a elementos DOM
    let consoleModal = null;
    let consoleToggleBtn = null;
    let consoleCloseBtn = null;
    let consoleOutput = null;
    let clearConsoleBtn = null;
    let pauseConsoleBtn = null;
    
    /**
     * Actualiza el contenido de la consola desde el servidor
     */
    async function updateConsole() {
        if (consolePaused || !consoleModal || consoleModal.style.display !== 'block') return;
        
        try {
            const response = await fetch(`/api/console?last_id=${lastConsoleId}`);
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
                // Añadir nuevos mensajes
                data.messages.forEach(message => {
                    if (typeof message !== 'string') return; // Asegurar que es un string
                    
                    const line = document.createElement('div');
                    line.className = 'console-line';
                    
                    // Aplicar estilo según el contenido del mensaje
                    if (message.includes('ERROR') || message.includes('Error') || message.includes('error')) {
                        line.classList.add('console-error');
                    } else if (message.includes('WARNING') || message.includes('Warning') || message.includes('warning')) {
                        line.classList.add('console-warning');
                    } else if (message.includes('Success') || message.includes('success') || message.includes('exitosa')) {
                        line.classList.add('console-success');
                    } else if (message.includes('INFO') || message.includes('Info') || message.includes('info')) {
                        line.classList.add('console-info');
                    }
                    
                    line.textContent = message;
                    consoleOutput.appendChild(line);
                });
                
                // Actualizar ID del último mensaje
                if (typeof data.last_id === 'number') {
                    lastConsoleId = data.last_id;
                }
                
                // Auto-scroll al final
                consoleOutput.scrollTop = consoleOutput.scrollHeight;
            }
        } catch (error) {
            Utils.logError(`Error al actualizar consola: ${error.message}`, 'ConsoleManager');
            
            // Añadir mensaje de error a la consola
            if (consoleOutput) {
                const errorLine = document.createElement('div');
                errorLine.className = 'console-line console-error';
                errorLine.textContent = `Error de conexión: ${error.message}`;
                consoleOutput.appendChild(errorLine);
            }
        }
    }
    
    /**
     * Inicializa los eventos y configuración de la consola
     */
    function initConsole() {
        // Obtener referencias a los elementos DOM
        consoleModal = document.getElementById('consoleModal');
        consoleToggleBtn = document.getElementById('consoleToggleBtn');
        consoleCloseBtn = document.getElementById('consoleCloseBtn');
        consoleOutput = document.getElementById('console-output');
        clearConsoleBtn = document.getElementById('clearConsoleBtn');
        pauseConsoleBtn = document.getElementById('pauseConsoleBtn');
        
        if (!consoleOutput) {
            Utils.logWarn("Console output element not found", "ConsoleManager");
            return;
        }
        
        Utils.logInfo("Inicializando consola de depuración", "ConsoleManager");
        
        // Control de visibilidad del modal
        if (consoleToggleBtn) {
            consoleToggleBtn.addEventListener('click', () => {
                if (consoleModal) {
                    consoleModal.style.display = 'block';
                    // Actualizar inmediatamente al abrir
                    updateConsole();
                }
            });
        }
        
        if (consoleCloseBtn) {
            consoleCloseBtn.addEventListener('click', () => {
                if (consoleModal) {
                    consoleModal.style.display = 'none';
                }
            });
        }
        
        // Cerrar modal si se hace clic fuera del contenido
        window.addEventListener('click', (event) => {
            if (event.target === consoleModal) {
                consoleModal.style.display = 'none';
            }
        });
        
        // Botones de control
        if (clearConsoleBtn) {
            clearConsoleBtn.addEventListener('click', () => {
                if (consoleOutput) {
                    consoleOutput.innerHTML = '';
                }
            });
        }
        
        if (pauseConsoleBtn) {
            pauseConsoleBtn.addEventListener('click', () => {
                consolePaused = !consolePaused;
                pauseConsoleBtn.textContent = consolePaused ? 'Reanudar' : 'Pausar';
            });
        }
        
        // Iniciar actualización periódica
        consoleUpdateInterval = setInterval(updateConsole, 1000);
        
        Utils.logInfo("Consola de depuración inicializada", "ConsoleManager");
    }
    
    /**
     * Limpia recursos cuando se destruye el módulo
     */
    function cleanup() {
        if (consoleUpdateInterval) {
            clearInterval(consoleUpdateInterval);
            consoleUpdateInterval = null;
        }
    }
    
    // API pública
    return {
        init: initConsole,
        cleanup: cleanup,
        update: updateConsole
    };
})();

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', ConsoleManager.init);

// Limpieza cuando se descarga la página
window.addEventListener('beforeunload', ConsoleManager.cleanup);