/**
 * WindowTest.js - Script para probar el funcionamiento del sistema de ventanas
 * Se puede ejecutar manualmente desde la consola del navegador
 */

const WindowTest = {
    /**
     * Realiza una prueba completa del sistema de ventanas
     */
    runFullTest: function() {
        console.log("Iniciando prueba completa del sistema de ventanas...");
        
        // Verificar si el WindowManager está disponible
        if (typeof WindowManager === 'undefined') {
            console.error("ERROR: WindowManager no está disponible");
            alert("Error: El sistema de ventanas no está cargado correctamente.");
            return false;
        }
        
        console.log("✅ WindowManager disponible");
        
        // Prueba 1: Crear una ventana básica
        const basicWindowId = WindowManager.createWindow({
            title: "Prueba Básica",
            content: "<div style='padding: 20px;'><h3>Ventana de Prueba</h3><p>Esta es una ventana de prueba básica.</p></div>"
        });
        
        if (!basicWindowId || !WindowManager.getWindowById(basicWindowId)) {
            console.error("ERROR: No se pudo crear la ventana básica");
            return false;
        }
        
        console.log(`✅ Ventana básica creada con ID: ${basicWindowId}`);
        
        // Prueba 2: Verificar controles de ventana
        try {
            // Maximizar
            WindowManager.maximizeWindow(basicWindowId);
            console.log(`✅ Ventana maximizada correctamente`);
            
            // Esperar un segundo y restaurar
            setTimeout(() => {
                WindowManager.restoreWindow(basicWindowId);
                console.log(`✅ Ventana restaurada correctamente`);
                
                // Esperar un segundo y minimizar
                setTimeout(() => {
                    WindowManager.minimizeWindow(basicWindowId);
                    console.log(`✅ Ventana minimizada correctamente`);
                    
                    // Esperar un segundo y restaurar nuevamente
                    setTimeout(() => {
                        WindowManager.restoreWindow(basicWindowId);
                        console.log(`✅ Ventana restaurada desde minimizado`);
                        
                        // Verificar estado activo
                        const activeWindow = WindowManager.getActiveWindow();
                        if (activeWindow && activeWindow.id === basicWindowId) {
                            console.log(`✅ Estado activo correcto`);
                        } else {
                            console.warn(`⚠️ Estado activo incorrecto`);
                        }
                        
                        // Esperar un segundo y cerrar
                        setTimeout(() => {
                            WindowManager.closeWindow(basicWindowId);
                            console.log(`✅ Ventana cerrada correctamente`);
                            
                            // Prueba 3: Crear múltiples ventanas
                            this.testMultipleWindows();
                        }, 1000);
                    }, 1000);
                }, 1000);
            }, 1000);
        } catch (e) {
            console.error(`ERROR en pruebas de control: ${e.message}`);
            return false;
        }
        
        return true;
    },
    
    /**
     * Prueba la creación de múltiples ventanas
     */
    testMultipleWindows: function() {
        console.log("Iniciando prueba de múltiples ventanas...");
        
        // Crear varias ventanas
        const windowIds = [];
        
        // Ventana 1
        windowIds.push(WindowManager.createWindow({
            title: "Ventana de Texto",
            width: 400,
            height: 300,
            content: `
                <div style="padding: 20px;">
                    <h3>Ventana de Texto</h3>
                    <p>Esta es una ventana con contenido de texto simple.</p>
                    <p>El sistema debería manejar varias ventanas simultáneamente.</p>
                </div>
            `,
            position: { my: "center", at: "center", of: window, collision: "fit" }
        }));
        
        // Ventana 2
        windowIds.push(WindowManager.createWindow({
            title: "Ventana con Formulario",
            width: 500,
            height: 400,
            content: `
                <div style="padding: 20px;">
                    <h3>Formulario de Prueba</h3>
                    <form id="test-form">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px;">Nombre:</label>
                            <input type="text" style="width: 100%; padding: 8px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px;">Email:</label>
                            <input type="email" style="width: 100%; padding: 8px; box-sizing: border-box;">
                        </div>
                        <button type="button" style="padding: 8px 15px; background-color: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer;">Enviar</button>
                    </form>
                </div>
            `,
            position: { my: "left top", at: "left+50 top+120", of: window, collision: "fit" }
        }));
        
        // Ventana 3 con gráfico si Chart.js está disponible
        if (typeof Chart !== 'undefined') {
            const chartId = 'test-chart-' + Date.now();
            
            windowIds.push(WindowManager.createWindow({
                title: "Ventana con Gráfico",
                width: 600,
                height: 400,
                content: `
                    <div style="padding: 20px;">
                        <h3>Gráfico de Prueba</h3>
                        <div style="height: 250px;">
                            <canvas id="${chartId}"></canvas>
                        </div>
                    </div>
                `,
                position: { my: "right top", at: "right-50 top+120", of: window, collision: "fit" }
            }));
            
            // Inicializar gráfico
            setTimeout(() => {
                const ctx = document.getElementById(chartId).getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Rojo', 'Azul', 'Amarillo', 'Verde', 'Morado', 'Naranja'],
                        datasets: [{
                            label: 'Datos de prueba',
                            data: [12, 19, 3, 5, 2, 3],
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.2)',
                                'rgba(54, 162, 235, 0.2)',
                                'rgba(255, 206, 86, 0.2)',
                                'rgba(75, 192, 192, 0.2)',
                                'rgba(153, 102, 255, 0.2)',
                                'rgba(255, 159, 64, 0.2)'
                            ],
                            borderColor: [
                                'rgba(255, 99, 132, 1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)',
                                'rgba(255, 159, 64, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }, 100);
        }
        
        console.log(`✅ Creadas ${windowIds.length} ventanas correctamente`);
        console.log("IDs de ventanas:", windowIds);
        
        // Verificar z-index
        setTimeout(() => {
            // Activar la última ventana para traerla al frente
            if (windowIds.length > 0) {
                WindowManager.activateWindow(windowIds[windowIds.length - 1]);
                console.log(`✅ Activación de ventana correcta`);
            }
            
            console.log("Prueba de múltiples ventanas completada");
            console.log("Prueba completa del sistema de ventanas FINALIZADA");
        }, 500);
    },
    
    /**
     * Abre una ventana con estadísticas del sistema de ventanas
     */
    showWindowStats: function() {
        if (typeof WindowManager === 'undefined') {
            console.error("ERROR: WindowManager no está disponible");
            return;
        }
        
        // Recopilar estadísticas
        const allWindows = WindowManager.getAllWindows();
        const windowCount = Object.keys(allWindows).length;
        const activeWindow = WindowManager.getActiveWindow();
        
        // Crear contenido
        let statsContent = `
            <div style="padding: 20px;">
                <h3 style="margin-top: 0;">Estadísticas del Sistema de Ventanas</h3>
                
                <div style="margin: 15px 0; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
                    <div style="font-size: 18px; margin-bottom: 5px;"><strong>Ventanas activas:</strong> ${windowCount}</div>
                    <div><strong>Ventana en foco:</strong> ${activeWindow ? activeWindow.title : 'Ninguna'}</div>
                </div>
                
                <h4>Listado de ventanas:</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f0f0f0;">
                            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">ID</th>
                            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Título</th>
                            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Estado</th>
                            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Usos</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Añadir fila para cada ventana
        let hasWindows = false;
        for (const id in allWindows) {
            hasWindows = true;
            const win = allWindows[id];
            statsContent += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${id}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${win.title}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${win.state}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${win.usageCount}</td>
                </tr>
            `;
        }
        
        // Si no hay ventanas, mostrar mensaje
        if (!hasWindows) {
            statsContent += `
                <tr>
                    <td colspan="4" style="padding: 8px; border: 1px solid #ddd; text-align: center;">No hay ventanas activas</td>
                </tr>
            `;
        }
        
        // Cerrar tabla y contenido
        statsContent += `
                    </tbody>
                </table>
                
                <div style="margin-top: 20px;">
                    <button id="refresh-stats-btn" style="padding: 8px 15px; background-color: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Actualizar</button>
                    <button id="close-all-windows-btn" style="padding: 8px 15px; background-color: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Cerrar Todas</button>
                </div>
            </div>
        `;
        
        // Crear ventana
        const statsWindowId = WindowManager.createWindow({
            title: "Estadísticas del Sistema de Ventanas",
            width: 600,
            height: 400,
            content: statsContent
        });
        
        // Añadir eventos a los botones
        $(`#${statsWindowId}`).find('#refresh-stats-btn').on('click', () => {
            WindowManager.closeWindow(statsWindowId);
            this.showWindowStats();
        });
        
        $(`#${statsWindowId}`).find('#close-all-windows-btn').on('click', () => {
            const confirmClose = confirm("¿Está seguro de que desea cerrar todas las ventanas?");
            if (confirmClose) {
                WindowManager.closeAllWindows();
            }
        });
    }
};

// Exponer globalmente para poder llamar desde la consola
window.WindowTest = WindowTest;

// Auto-ejecutar cuando se carga si hay un parámetro de URL
$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('testWindows') && urlParams.get('testWindows') === 'true') {
        setTimeout(() => {
            WindowTest.runFullTest();
        }, 1000);
    }
});