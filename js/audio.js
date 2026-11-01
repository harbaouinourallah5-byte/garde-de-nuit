/**
 * GARDE DE NUIT - Audio Engine (Web Audio API)
 * Synthétise les sons hospitaliers sans fichier externe :
 * Bips du scope ECG, saturomètre, tensiomètre, thermomètre, friction SHA, trotteuse, alertes.
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.initialized = false;
    }

    init() {
        if (!this.initialized) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.initialized = true;
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    beep(freq = 880, duration = 0.08, type = 'sine', gainVal = 0.15) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playEcgBeep(spo2 = 98) {
        if (this.isMuted) return;
        // La tonalité de l'oxymètre varie avec la SpO2 (comme sur les vrais moniteurs de réanimation)
        const baseFreq = 500 + (spo2 - 85) * 20; // 91% -> ~620Hz, 98% -> ~760Hz
        this.beep(Math.max(350, Math.min(1000, baseFreq)), 0.07, 'sine', 0.12);
    }

    playThermometerBeep() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx ? this.ctx.currentTime : 0;
        [0, 0.14, 0.28].forEach(offset => {
            setTimeout(() => this.beep(1760, 0.08, 'sine', 0.2), offset * 1000);
        });
    }

    playKorotkoff() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        // Bruit sourde de Korotkoff (auscultation stéthoscope)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.13);
    }

    playCuffPump() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        // Bruit de poire de tensiomètre (souffle d'air pressurisé)
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    playCuffRelease() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        // Pschitt doux de décompression lente
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
        filter.Q.value = 3;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    playWashHands() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        // Friction SHA (frottement doux)
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI) * 0.15;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    playTick() {
        if (this.isMuted) return;
        this.beep(1200, 0.02, 'square', 0.05);
    }

    playPulseTap() {
        if (this.isMuted) return;
        this.beep(300, 0.04, 'triangle', 0.1);
    }

    playWarning() {
        if (this.isMuted) return;
        this.init();
        this.beep(320, 0.15, 'sawtooth', 0.25);
        setTimeout(() => this.beep(280, 0.22, 'sawtooth', 0.25), 180);
    }

    playSuccess() {
        if (this.isMuted) return;
        this.init();
        this.beep(523.25, 0.1, 'sine', 0.2); // Do5
        setTimeout(() => this.beep(659.25, 0.1, 'sine', 0.2), 100); // Mi5
        setTimeout(() => this.beep(783.99, 0.18, 'sine', 0.2), 200); // Sol5
    }
}

window.soundEngine = new SoundEngine();
