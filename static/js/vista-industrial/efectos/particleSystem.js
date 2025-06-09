/**
 * particleSystem.js - Sistema de Partículas para Flujo de Energía
 * Crea y anima partículas que fluyen entre componentes del sistema eléctrico
 */

class ParticleSystem {
    constructor(containerElement, options = {}) {
        this.container = containerElement;
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = null;
        this.isRunning = false;
        
        // Configuración por defecto
        this.config = {
            // Configuración de partículas
            particleCount: 12,
            particleSize: { min: 2, max: 4 },
            particleSpeed: { min: 1, max: 3 },
            particleLifetime: 3000, // ms
            
            // Configuración de rutas
            routes: [
                {
                    name: 'solar-to-battery',
                    start: { x: 200, y: 190 },
                    end: { x: 350, y: 190 },
                    color: '#f1c40f',
                    intensity: 1.0, // 0-2, controla cantidad de partículas
                    direction: 1 // 1 = normal, -1 = reverso
                },
                {
                    name: 'battery-to-building',
                    start: { x: 450, y: 190 },
                    end: { x: 600, y: 190 },
                    color: '#2ecc71',
                    intensity: 0.8,
                    direction: 1
                }
            ],
            
            // Efectos visuales
            glowEffect: true,
            trailEffect: true,
            sparkles: true,
            
            // Configuración de canvas
            backgroundColor: 'transparent',
            
            ...options
        };
        
        this.init();
    }
    
    /**
     * Inicializa el sistema de partículas
     */
    init() {
        this.createCanvas();
        this.setupParticles();
        
        // Configurar resize observer para responsive
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.handleResize();
            });
            this.resizeObserver.observe(this.container);
        }
        
        console.log('ParticleSystem inicializado correctamente');
    }
    
    /**
     * Crea el canvas para las partículas
     */
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '10';
        
        // Configurar tamaño del canvas
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width || 800;
        this.canvas.height = rect.height || 400;
        
        this.ctx = this.canvas.getContext('2d');
        
        // Añadir al contenedor
        this.container.style.position = 'relative';
        this.container.appendChild(this.canvas);
        
        console.log(`Canvas creado: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    /**
     * Configura las partículas iniciales
     */
    setupParticles() {
        this.particles = [];
        
        // Crear partículas para cada ruta
        this.config.routes.forEach(route => {
            if (route.intensity > 0) {
                const particlesForRoute = Math.ceil(this.config.particleCount * route.intensity);
                
                for (let i = 0; i < particlesForRoute; i++) {
                    this.createParticle(route, i / particlesForRoute);
                }
            }
        });
        
        console.log(`${this.particles.length} partículas inicializadas`);
    }
    
    /**
     * Crea una nueva partícula
     * @param {Object} route - Configuración de la ruta
     * @param {number} progress - Progreso inicial en la ruta (0-1)
     */
    createParticle(route, progress = 0) {
        const particle = {
            id: Math.random().toString(36).substr(2, 9),
            route: route.name,
            
            // Posición y movimiento
            progress: progress,
            speed: this.randomBetween(this.config.particleSpeed.min, this.config.particleSpeed.max),
            
            // Apariencia
            size: this.randomBetween(this.config.particleSize.min, this.config.particleSize.max),
            color: route.color,
            opacity: this.randomBetween(0.6, 1.0),
            
            // Efectos
            glow: this.config.glowEffect,
            trail: this.config.trailEffect ? [] : null,
            sparkle: this.config.sparkles ? Math.random() > 0.7 : false,
            
            // Variación para movimiento natural
            offsetY: this.randomBetween(-5, 5),
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: this.randomBetween(0.02, 0.05),
            
            // Control de vida
            birthTime: Date.now(),
            lifetime: this.config.particleLifetime + this.randomBetween(-500, 500),
            
            // Referencias
            startPoint: { ...route.start },
            endPoint: { ...route.end },
            direction: route.direction || 1
        };
        
        // Calcular posición inicial
        this.updateParticlePosition(particle);
        
        this.particles.push(particle);
        return particle;
    }
    
    /**
     * Actualiza la posición de una partícula basada en su progreso
     * @param {Object} particle - La partícula a actualizar
     */
    updateParticlePosition(particle) {
        const { startPoint, endPoint, progress, offsetY, wobble, wobbleSpeed } = particle;
        
        // Interpolación lineal básica
        let t = progress;
        
        // Aplicar easing suave para movimiento más natural
        t = this.easeInOutCubic(t);
        
        // Calcular posición base
        particle.x = startPoint.x + (endPoint.x - startPoint.x) * t;
        particle.y = startPoint.y + (endPoint.y - startPoint.y) * t;
        
        // Añadir variaciones para movimiento natural
        particle.y += offsetY;
        particle.y += Math.sin(wobble + Date.now() * wobbleSpeed) * 2;
        particle.x += Math.cos(wobble + Date.now() * wobbleSpeed * 0.7) * 1;
        
        // Actualizar trail si está habilitado
        if (particle.trail) {
            particle.trail.push({ x: particle.x, y: particle.y, time: Date.now() });
            
            // Mantener solo los últimos puntos del trail
            const maxTrailLength = 8;
            if (particle.trail.length > maxTrailLength) {
                particle.trail = particle.trail.slice(-maxTrailLength);
            }
        }
    }
    
    /**
     * Función de easing para movimiento suave
     * @param {number} t - Valor de 0 a 1
     * @returns {number} - Valor easeado
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }
    
    /**
     * Inicia la animación del sistema de partículas
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.animate();
        console.log('Sistema de partículas iniciado');
    }
    
    /**
     * Detiene la animación del sistema de partículas
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        console.log('Sistema de partículas detenido');
    }
    
    /**
     * Loop principal de animación
     */
    animate() {
        if (!this.isRunning) return;
        
        this.update();
        this.render();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    /**
     * Actualiza todas las partículas
     */
    update() {
        const currentTime = Date.now();
        
        // Actualizar partículas existentes
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Verificar si la partícula ha expirado
            if (currentTime - particle.birthTime > particle.lifetime) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // Actualizar progreso
            const route = this.config.routes.find(r => r.name === particle.route);
            if (route) {
                particle.progress += (particle.speed * particle.direction) / 1000;
                
                // Si la partícula completó su ruta, reiniciarla o eliminarla
                if (particle.progress >= 1.0) {
                    if (route.intensity > 0) {
                        // Reiniciar la partícula
                        particle.progress = 0;
                        particle.birthTime = currentTime;
                        particle.wobble = Math.random() * Math.PI * 2;
                    } else {
                        // Eliminar la partícula
                        this.particles.splice(i, 1);
                        continue;
                    }
                } else if (particle.progress < 0) {
                    particle.progress = 1.0;
                }
                
                // Actualizar posición
                this.updateParticlePosition(particle);
                
                // Actualizar efectos
                this.updateParticleEffects(particle, currentTime);
            }
        }
        
        // Generar nuevas partículas si es necesario
        this.generateNewParticles();
    }
    
    /**
     * Actualiza efectos especiales de las partículas
     * @param {Object} particle - La partícula
     * @param {number} currentTime - Tiempo actual
     */
    updateParticleEffects(particle, currentTime) {
        // Actualizar sparkle
        if (particle.sparkle) {
            particle.sparklePhase = (currentTime * 0.01) % (Math.PI * 2);
        }
        
        // Actualizar opacity basada en la edad de la partícula
        const age = (currentTime - particle.birthTime) / particle.lifetime;
        if (age > 0.8) {
            // Fade out en los últimos 20% de vida
            particle.currentOpacity = particle.opacity * (1 - (age - 0.8) / 0.2);
        } else {
            particle.currentOpacity = particle.opacity;
        }
    }
    
    /**
     * Genera nuevas partículas según sea necesario
     */
    generateNewParticles() {
        this.config.routes.forEach(route => {
            if (route.intensity <= 0) return;
            
            const routeParticles = this.particles.filter(p => p.route === route.name);
            const targetCount = Math.ceil(this.config.particleCount * route.intensity);
            
            if (routeParticles.length < targetCount && Math.random() < 0.1) {
                this.createParticle(route, 0);
            }
        });
    }
    
    /**
     * Renderiza todas las partículas
     */
    render() {
        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Configurar contexto para efectos
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Renderizar partículas
        this.particles.forEach(particle => {
            this.renderParticle(particle);
        });
    }
    
    /**
     * Renderiza una partícula individual
     * @param {Object} particle - La partícula a renderizar
     */
    renderParticle(particle) {
        const ctx = this.ctx;
        
        ctx.save();
        
        // Renderizar trail si está habilitado
        if (particle.trail && particle.trail.length > 1) {
            this.renderTrail(particle);
        }
        
        // Configurar transparencia
        ctx.globalAlpha = particle.currentOpacity || particle.opacity;
        
        // Renderizar glow si está habilitado
        if (particle.glow) {
            this.renderGlow(particle);
        }
        
        // Renderizar partícula principal
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Renderizar sparkle si está habilitado
        if (particle.sparkle) {
            this.renderSparkle(particle);
        }
        
        ctx.restore();
    }
    
    /**
     * Renderiza el trail de una partícula
     * @param {Object} particle - La partícula
     */
    renderTrail(particle) {
        const ctx = this.ctx;
        const trail = particle.trail;
        
        if (trail.length < 2) return;
        
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        
        for (let i = 1; i < trail.length; i++) {
            const alpha = i / trail.length * 0.3; // Trail se desvanece
            ctx.globalAlpha = alpha;
            
            ctx.beginPath();
            ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
            ctx.lineTo(trail[i].x, trail[i].y);
            ctx.stroke();
        }
    }
    
    /**
     * Renderiza el efecto de brillo de una partícula
     * @param {Object} particle - La partícula
     */
    renderGlow(particle) {
        const ctx = this.ctx;
        
        // Crear gradiente radial para el glow
        const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 3
        );
        
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(0.7, this.hexToRgba(particle.color, 0.2));
        gradient.addColorStop(1, this.hexToRgba(particle.color, 0));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Renderiza el efecto sparkle de una partícula
     * @param {Object} particle - La partícula
     */
    renderSparkle(particle) {
        const ctx = this.ctx;
        const sparkleSize = particle.size * 0.5;
        const sparkleIntensity = Math.sin(particle.sparklePhase || 0) * 0.5 + 0.5;
        
        ctx.globalAlpha = sparkleIntensity * 0.8;
        ctx.fillStyle = '#ffffff';
        
        // Crear pequeñas líneas de sparkle
        const sparkleLines = 4;
        for (let i = 0; i < sparkleLines; i++) {
            const angle = (i / sparkleLines) * Math.PI * 2;
            const x1 = particle.x + Math.cos(angle) * sparkleSize * 0.5;
            const y1 = particle.y + Math.sin(angle) * sparkleSize * 0.5;
            const x2 = particle.x + Math.cos(angle) * sparkleSize * 1.5;
            const y2 = particle.y + Math.sin(angle) * sparkleSize * 1.5;
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
    
    /**
     * Actualiza la intensidad y dirección del flujo
     * @param {Object} flowData - Datos del flujo {solar: number, battery: number, building: number}
     */
    updateFlow(flowData) {
        // Actualizar ruta solar -> batería
        const solarRoute = this.config.routes.find(r => r.name === 'solar-to-battery');
        if (solarRoute && flowData.solar !== undefined) {
            solarRoute.intensity = Math.abs(flowData.solar) / 10; // Normalizar
            solarRoute.direction = flowData.solar >= 0 ? 1 : -1;
        }
        
        // Actualizar ruta batería -> edificio
        const batteryRoute = this.config.routes.find(r => r.name === 'battery-to-building');
        if (batteryRoute && flowData.battery !== undefined) {
            batteryRoute.intensity = Math.abs(flowData.battery) / 10; // Normalizar
            batteryRoute.direction = flowData.battery >= 0 ? 1 : -1;
        }
        
        console.log('Flujo actualizado:', flowData);
    }
    
    /**
     * Maneja el redimensionamiento del contenedor
     */
    handleResize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width || 800;
        this.canvas.height = rect.height || 400;
        
        console.log(`Canvas redimensionado: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    /**
     * Convierte color hex a rgba
     * @param {string} hex - Color hexadecimal
     * @param {number} alpha - Valor alpha (0-1)
     * @returns {string} - Color rgba
     */
    hexToRgba(hex, alpha) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return `rgba(255,255,255,${alpha})`;
        
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        
        return `rgba(${r},${g},${b},${alpha})`;
    }
    
    /**
     * Genera número aleatorio entre min y max
     * @param {number} min - Valor mínimo
     * @param {number} max - Valor máximo
     * @returns {number} - Número aleatorio
     */
    randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    /**
     * Limpia recursos y detiene el sistema
     */
    destroy() {
        this.stop();
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        this.particles = [];
        this.canvas = null;
        this.ctx = null;
        
        console.log('ParticleSystem destruido');
    }
    
    /**
     * Obtiene estadísticas del sistema
     * @returns {Object} - Estadísticas
     */
    getStats() {
        return {
            particleCount: this.particles.length,
            isRunning: this.isRunning,
            routes: this.config.routes.map(route => ({
                name: route.name,
                intensity: route.intensity,
                direction: route.direction,
                particleCount: this.particles.filter(p => p.route === route.name).length
            }))
        };
    }
}

// Exportar para uso global
window.ParticleSystem = ParticleSystem;