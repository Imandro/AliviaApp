/* ----------------------------------------------------
   ALIVIA - SINTETIZADOR DE AUDIO DE CALMA (Web Audio API)
   Generación matemática de paisajes sonoros offline (0 bytes)
   ---------------------------------------------------- */

class CalmaAudioEngine {
  private ctx: AudioContext | null = null;
  
  // Nodos para Ruido Marrón (Brownian Noise)
  private brownNoiseNode: ScriptProcessorNode | null = null;
  private brownGain: GainNode | null = null;
  
  // Nodos para Olas del Océano (Ocean Waves)
  private oceanNoiseNode: ScriptProcessorNode | null = null;
  private oceanFilter: BiquadFilterNode | null = null;
  private oceanLfo: OscillatorNode | null = null;
  private oceanGain: GainNode | null = null;
  
  // Nodos para Tonos Binaurales (432Hz - Calma de Ondas Delta/Theta)
  private oscLeft: OscillatorNode | null = null;
  private oscRight: OscillatorNode | null = null;
  private pannerLeft: StereoPannerNode | null = null;
  private pannerRight: StereoPannerNode | null = null;
  private binauralGain: GainNode | null = null;

  // Inicializar contexto de audio al interactuar (requerido por navegadores modernos)
  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- 1. RUIDO MARRÓN (Calma de pensamientos acelerados) ---
  public startBrownNoise(volume: number = 0.5) {
    this.initContext();
    if (!this.ctx) return;
    
    if (this.brownNoiseNode) {
      this.setBrownNoiseVolume(volume);
      return;
    }

    const bufferSize = 4096;
    let lastOut = 0.0;
    
    // Generar Ruido Marrón mediante fórmula matemática en ScriptProcessor
    this.brownNoiseNode = this.ctx.createScriptProcessor(bufferSize, 1, 1);
    this.brownNoiseNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // El ruido marrón es un acumulador con fuga del ruido blanco
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Compensar volumen del filtro
      }
    };

    this.brownGain = this.ctx.createGain();
    this.brownGain.gain.setValueAtTime(volume * 0.4, this.ctx.currentTime); // El ruido marrón es potente

    this.brownNoiseNode.connect(this.brownGain);
    this.brownGain.connect(this.ctx.destination);
  }

  public setBrownNoiseVolume(volume: number) {
    if (this.brownGain && this.ctx) {
      this.brownGain.gain.linearRampToValueAtTime(volume * 0.4, this.ctx.currentTime + 0.1);
    }
  }

  public stopBrownNoise() {
    if (this.brownNoiseNode) {
      this.brownNoiseNode.disconnect();
      this.brownNoiseNode = null;
    }
    if (this.brownGain) {
      this.brownGain.disconnect();
      this.brownGain = null;
    }
  }

  // --- 2. OLAS DEL OCÉANO (Respiración sincronizada) ---
  public startOceanWaves(volume: number = 0.5) {
    this.initContext();
    if (!this.ctx) return;

    if (this.oceanNoiseNode) {
      this.setOceanWavesVolume(volume);
      return;
    }

    // Usar Ruido Rosa/Blanco filtrado por un paso de banda oscilante
    const bufferSize = 4096;
    this.oceanNoiseNode = this.ctx.createScriptProcessor(bufferSize, 1, 1);
    this.oceanNoiseNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Filtro de ruido rosa para olas más suaves que el blanco
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        output[i] = pink * 0.11;
      }
    };

    // Crear filtro dinámico para simular el vaivén del agua
    this.oceanFilter = this.ctx.createBiquadFilter();
    this.oceanFilter.type = 'lowpass';
    this.oceanFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);
    this.oceanFilter.frequency.setValueAtTime(350, this.ctx.currentTime);

    // Oscilador LFO para mover el filtro de frecuencia simulando olas (10 seg por ciclo)
    this.oceanLfo = this.ctx.createOscillator();
    this.oceanLfo.type = 'sine';
    this.oceanLfo.frequency.setValueAtTime(0.1, this.ctx.currentTime); // 0.1Hz = 10 segundos

    // Modulador para aplicar el LFO al filtro
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(250, this.ctx.currentTime); // Desviación de frecuencia

    this.oceanGain = this.ctx.createGain();
    this.oceanGain.gain.setValueAtTime(volume * 0.8, this.ctx.currentTime);

    // Conexión LFO -> Filtro
    this.oceanLfo.connect(lfoGain);
    lfoGain.connect(this.oceanFilter.frequency);

    // Conexión Ruido -> Filtro -> Volumen -> Destino
    this.oceanNoiseNode.connect(this.oceanFilter);
    this.oceanFilter.connect(this.oceanGain);
    this.oceanGain.connect(this.ctx.destination);

    // Arrancar el LFO
    this.oceanLfo.start();
  }

  public setOceanWavesVolume(volume: number) {
    if (this.oceanGain && this.ctx) {
      this.oceanGain.gain.linearRampToValueAtTime(volume * 0.8, this.ctx.currentTime + 0.1);
    }
  }

  public stopOceanWaves() {
    if (this.oceanLfo) {
      try { this.oceanLfo.stop(); } catch(e) {}
      this.oceanLfo.disconnect();
      this.oceanLfo = null;
    }
    if (this.oceanNoiseNode) {
      this.oceanNoiseNode.disconnect();
      this.oceanNoiseNode = null;
    }
    if (this.oceanFilter) {
      this.oceanFilter.disconnect();
      this.oceanFilter = null;
    }
    if (this.oceanGain) {
      this.brownGain = null; // Fix simple reference
      this.oceanGain.disconnect();
      this.oceanGain = null;
    }
  }

  // --- 3. TONOS BINAURALES (432Hz - Ansiedad extrema/Pánico) ---
  // Izquierdo: 432Hz, Derecho: 436Hz. Diferencia = 4Hz (Ondas Delta de sueño/relajación)
  public startBinauralBeats(volume: number = 0.5) {
    this.initContext();
    if (!this.ctx) return;

    if (this.oscLeft) {
      this.setBinauralVolume(volume);
      return;
    }

    // Oscilador Izquierdo (432Hz)
    this.oscLeft = this.ctx.createOscillator();
    this.oscLeft.type = 'sine';
    this.oscLeft.frequency.setValueAtTime(432, this.ctx.currentTime);

    // Oscilador Derecho (436Hz)
    this.oscRight = this.ctx.createOscillator();
    this.oscRight.type = 'sine';
    this.oscRight.frequency.setValueAtTime(436, this.ctx.currentTime);

    // Paneadores estéreo para enrutar a oídos distintos (indispensable usar auriculares)
    this.pannerLeft = this.ctx.createStereoPanner();
    this.pannerLeft.pan.setValueAtTime(-1.0, this.ctx.currentTime); // Todo a la izquierda

    this.pannerRight = this.ctx.createStereoPanner();
    this.pannerRight.pan.setValueAtTime(1.0, this.ctx.currentTime); // Todo a la derecha

    this.binauralGain = this.ctx.createGain();
    this.binauralGain.gain.setValueAtTime(volume * 0.15, this.ctx.currentTime); // Las ondas puras cansan si están muy fuertes

    // Conectar canales
    this.oscLeft.connect(this.pannerLeft);
    this.pannerLeft.connect(this.binauralGain);

    this.oscRight.connect(this.pannerRight);
    this.pannerRight.connect(this.binauralGain);

    this.binauralGain.connect(this.ctx.destination);

    // Arrancar osciladores
    this.oscLeft.start();
    this.oscRight.start();
  }

  public setBinauralVolume(volume: number) {
    if (this.binauralGain && this.ctx) {
      this.binauralGain.gain.linearRampToValueAtTime(volume * 0.15, this.ctx.currentTime + 0.1);
    }
  }

  public stopBinauralBeats() {
    if (this.oscLeft) {
      try { this.oscLeft.stop(); } catch(e) {}
      this.oscLeft.disconnect();
      this.oscLeft = null;
    }
    if (this.oscRight) {
      try { this.oscRight.stop(); } catch(e) {}
      this.oscRight.disconnect();
      this.oscRight = null;
    }
    if (this.pannerLeft) {
      this.pannerLeft.disconnect();
      this.pannerLeft = null;
    }
    if (this.pannerRight) {
      this.pannerRight.disconnect();
      this.pannerRight = null;
    }
    if (this.binauralGain) {
      this.binauralGain.disconnect();
      this.binauralGain = null;
    }
  }

  // --- DETENER TODO ---
  public stopAll() {
    this.stopBrownNoise();
    this.stopOceanWaves();
    this.stopBinauralBeats();
    if (this.ctx && this.ctx.state !== 'closed') {
      // Opcional, pero suspendemos para ahorrar procesador
      this.ctx.suspend();
    }
  }
}

export const CalmaAudio = new CalmaAudioEngine();
