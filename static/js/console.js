// Variables para la consola
let lastConsoleId = 0;
let consoleUpdateInterval = null;
let consolePaused = false;

// Elementos del DOM
const consoleModal = document.getElementById('consoleModal');
const consoleToggleBtn = document.getElementById('consoleToggleBtn');
const consoleCloseBtn = document.getElementById('consoleCloseBtn');
const consoleOutput = document.getElementById('console-output');
const clearConsoleBtn = document.getElementById('clearConsoleBtn');
const pauseConsoleBtn = document.getElementById('pauseConsoleBtn');

// Inicializar la consola
function initConsole() {
    if (!consoleOutput) return;
    
    // Control de visibilidad del modal
    consoleToggleBtn.addEventListener('click', () => {
        consoleModal.style.display = 'block';
        // Actualizar inmediatamente al abrir
        updateConsole();
    });
    
    consoleCloseBtn.addEventListener('click', () => {
        consoleModal.style.display = 'none';
    });
    
    // Cerrar modal si se hace clic fuera del contenido
    window.addEventListener('click', (event) => {
        if (event.target === consoleModal) {
            consoleModal.style.display = 'none';
        }
    });
    
    // Botones de control
    clearConsoleBtn.addEventListener('click', () => {
        consoleOutput.innerHTML = '';
    });
    
    pauseConsoleBtn.addEventListener('click', () => {
        consolePaused = !consolePaused;
        pauseConsoleBtn.textContent = consolePaused ? 'Reanudar' : 'Pausar';
    });
    
    // Iniciar actualización periódica
    consoleUpdateInterval = setInterval(updateConsole, 1000);
    
    // Añadir botón de verificación de celdas (temporal)
    addVerifyCellsButton();
}

// Añadir botón de verificación de celdas (función auxiliar)
function addVerifyCellsButton() {
    // Verificar si ya existe en el DOM
    if (document.getElementById('verifyCellsBtn')) return;
    
    // Obtener el pie de la consola
    const consoleFooter = document.querySelector('.console-modal-footer');
    if (!consoleFooter) return;
    
    // Crear el botón
    const verifyCellsBtn = document.createElement('button');
    verifyCellsBtn.id = 'verifyCellsBtn';
    verifyCellsBtn.textContent = 'Verificar Celdas';
    verifyCellsBtn.style.backgroundColor = '#2ecc71'; // Verde distintivo
    
    // Añadir el botón al pie
    consoleFooter.appendChild(verifyCellsBtn);
    
    // Añadir evento de clic
    verifyCellsBtn.addEventListener('click', async () => {
        try {
            // Deshabilitar el botón durante la verificación
            verifyCellsBtn.disabled = true;
            verifyCellsBtn.textContent = 'Verificando...';
            
            // Llamar a la API (definida en modbusApi.js)
            if (typeof verifyCellData === 'function') {
                // Usar el ID de esclavo predeterminado (217) si no esta seteado el valor
                const activeSlaveId = parseInt(document.getElementById('slaveId')?.value || '217');
                const result = await verifyCellData(activeSlaveId);
                
                // Mostrar mensaje de éxito
                const message = document.createElement('div');
                message.className = 'console-line console-success';
                message.textContent = `Verificación de celdas iniciada. Ver resultados a continuación...`;
                consoleOutput.appendChild(message);
                
                // Auto-scroll al final
                consoleOutput.scrollTop = consoleOutput.scrollHeight;
            } else {
                console.error('Error: función verifyCellData no encontrada');
                const errorMsg = document.createElement('div');
                errorMsg.className = 'console-line console-error';
                errorMsg.textContent = 'Error: función verifyCellData no encontrada';
                consoleOutput.appendChild(errorMsg);
            }
        } catch (error) {
            // Mostrar error en la consola
            const errorMsg = document.createElement('div');
            errorMsg.className = 'console-line console-error';
            errorMsg.textContent = `Error al verificar celdas: ${error.message}`;
            consoleOutput.appendChild(errorMsg);
            
            // Auto-scroll al final
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        } finally {
            // Restablecer el botón
            verifyCellsBtn.disabled = false;
            verifyCellsBtn.textContent = 'Verificar Celdas';
        }
    });
}

// Actualizar contenido de la consola
async function updateConsole() {
    if (consolePaused || consoleModal.style.display !== 'block') return;
    
    try {
        const response = await fetch(`/api/console?last_id=${lastConsoleId}`);
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
            // Añadir nuevos mensajes
            data.messages.forEach(message => {
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
            lastConsoleId = data.last_id;
            
            // Auto-scroll al final
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
    } catch (error) {
        console.error('Error al actualizar consola:', error);
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', initConsole);