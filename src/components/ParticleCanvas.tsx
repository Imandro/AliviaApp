/* ----------------------------------------------------
   ALIVIA - LIENZO DE PARTICULAS (ParticleCanvas)
   Efecto terapéutico de disolución de texto ("Dejar ir")
   ---------------------------------------------------- */

import React, { useRef, useEffect } from 'react';

interface ParticleCanvasProps {
  text: string;
  isDissolving: boolean;
  onComplete: () => void;
  theme: 'light' | 'dark';
}

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  text,
  isDissolving,
  onComplete,
  theme
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar el canvas al contenedor
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = (rect?.width || 350) * window.devicePixelRatio;
      canvas.height = (rect?.height || 220) * window.devicePixelRatio;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();

    // Pintar el texto estático inicial
    if (!isDissolving) {
      drawStaticText(ctx, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    } else {
      // Iniciar efecto de disolución si se activa
      initDissolve(ctx, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [text, isDissolving, theme]);

  // Dibujar el texto en el canvas
  const drawStaticText = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    
    // Configuración de texto
    ctx.font = "300 16px 'Inter', sans-serif";
    ctx.fillStyle = theme === 'dark' ? 'rgba(240, 247, 244, 0.75)' : 'rgba(27, 38, 34, 0.75)';
    ctx.textBaseline = 'top';

    // Dividir texto en líneas para ajustarlo al cuadro
    wrapAndDrawText(ctx, text, 20, 25, width - 40, 22);
  };

  // Envolver texto en líneas
  const wrapAndDrawText = (
    ctx: CanvasRenderingContext2D,
    textStr: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    const paragraphs = textStr.split('\n');
    let currentY = y;

    for (let p = 0; p < paragraphs.length; p++) {
      const words = paragraphs[p].split(' ');
      let line = '';

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    }
  };

  // Inicializar partículas a partir de los píxeles del texto dibujado
  const initDissolve = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (particlesRef.current.length > 0) return;

    // Primero dibujamos el texto para poder capturar sus píxeles
    ctx.clearRect(0, 0, width, height);
    drawStaticText(ctx, width, height);

    // Capturar datos de píxeles
    // Multiplicamos por ratio para tener la resolución real del canvas
    const realWidth = width * window.devicePixelRatio;
    const realHeight = height * window.devicePixelRatio;
    
    if (realWidth === 0 || realHeight === 0) {
      // Si el canvas no tiene dimensiones válidas, completar de inmediato
      onComplete();
      return;
    }

    const imgData = ctx.getImageData(0, 0, realWidth, realHeight);
    const data = imgData.data;
    const particles: Particle[] = [];

    // Muestrear píxeles para no sobrecargar el navegador (1 de cada 4 píxeles)
    const step = 4;
    const colorTheme = theme === 'dark' ? '#F2E3A0' : '#2C533D';
    const accentBlue = theme === 'dark' ? '#8CB08D' : '#8CB08D';

    for (let y = 0; y < realHeight; y += step) {
      for (let x = 0; x < realWidth; x += step) {
        const index = (y * realWidth + x) * 4;
        const alpha = data[index + 3];

        if (alpha > 50) { // Si el píxel tiene suficiente opacidad
          const canvasX = x / window.devicePixelRatio;
          const canvasY = y / window.devicePixelRatio;
          
          // Crear partícula en base al píxel
          particles.push({
            x: canvasX,
            y: canvasY,
            originX: canvasX,
            originY: canvasY,
            // Velocidad física: flotar hacia arriba y a la derecha (como humo)
            vx: (Math.random() - 0.3) * 0.7,
            vy: -Math.random() * 0.9 - 0.2,
            size: Math.random() * 1.5 + 0.8,
            alpha: 1.0,
            decay: Math.random() * 0.015 + 0.008, // Tiempo de vida
            color: Math.random() > 0.3 ? colorTheme : accentBlue
          });
        }
      }
    }

    particlesRef.current = particles;
    
    // Iniciar bucle de física y animación
    animateParticles(ctx, width, height);
  };

  // Animación física de las partículas
  const animateParticles = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    const particles = particlesRef.current;
    let activeParticlesCount = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.alpha <= 0) continue;

      activeParticlesCount++;

      // Simulación física básica
      p.x += p.vx;
      p.y += p.vy;
      
      // Simular brisa horizontal ligera a medida que suben
      p.vx += (Math.random() - 0.48) * 0.05;
      p.vy -= 0.005; // Leve aceleración hacia arriba
      
      p.alpha -= p.decay;

      if (p.alpha > 0) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1.0; // Restablecer canal alpha global

    // Si todavía quedan partículas activas, continuar
    if (activeParticlesCount > 10 && isDissolving) {
      animFrameRef.current = requestAnimationFrame(() => animateParticles(ctx, width, height));
    } else {
      // Limpiar y terminar
      particlesRef.current = [];
      onComplete();
    }
  };

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 5
      }} 
    />
  );
};
