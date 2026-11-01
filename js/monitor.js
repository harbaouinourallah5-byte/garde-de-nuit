/**
 * GARDE DE NUIT - Moniteur Multiparamétrique en Direct (Live Bedside Monitor)
 * Dessine en temps réel l'ECG (tracé P-QRS-T), la courbe respiratoire,
 * et affiche les valeurs colorées selon les normes du PPTX.
 */

class LiveMonitor {
    constructor() {
        this.ecgCanvas = null;
        this.ecgCtx = null;
        this.respCanvas = null;
        this.respCtx = null;

        this.animFrameId = null;
        this.lastTime = 0;

        // Paramètres patient actifs
        this.hr = 80;
        this.rr = 16;
        this.spo2 = 98;
        this.bpSys = 120;
        this.bpDia = 80;
        this.temp = 37.0;

        // État de mesure (mesuré ou non par le joueur)
        this.measured = {
            temperature: false,
            pulse: false,
            respiration: false,
            bloodPressure: false,
            spo2: false
        };

        // Sweep variables pour ECG
        this.ecgX = 0;
        this.ecgLastY = 0;
        this.ecgBuffer = [];
        this.beatPhase = 0; // 0 to 1 dans le cycle cardiaque
        this.lastBeatTime = 0;

        // Sweep variables pour Respiration
        this.respX = 0;
        this.respLastY = 0;
        this.respPhase = 0;

        // Audio bip lié au QRS
        this.soundMuted = false;
        this.hasBeepedThisCycle = false;
    }

    init() {
        this.ecgCanvas = document.getElementById('ecg-canvas');
        if (this.ecgCanvas) {
            this.ecgCtx = this.ecgCanvas.getContext('2d');
            this.resizeCanvas(this.ecgCanvas);
        }

        this.respCanvas = document.getElementById('resp-canvas');
        if (this.respCanvas) {
            this.respCtx = this.respCanvas.getContext('2d');
            this.resizeCanvas(this.respCanvas);
        }

        window.addEventListener('resize', () => {
            if (this.ecgCanvas) this.resizeCanvas(this.ecgCanvas);
            if (this.respCanvas) this.resizeCanvas(this.respCanvas);
            this.clearCanvases();
        });

        this.clearCanvases();
        this.startLoop();
    }

    resizeCanvas(canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * (window.devicePixelRatio || 1);
        canvas.height = rect.height * (window.devicePixelRatio || 1);
    }

    clearCanvases() {
        if (this.ecgCtx && this.ecgCanvas) {
            this.ecgCtx.fillStyle = '#06131a';
            this.ecgCtx.fillRect(0, 0, this.ecgCanvas.width, this.ecgCanvas.height);
            this.drawGrid(this.ecgCtx, this.ecgCanvas.width, this.ecgCanvas.height, '#0d2833');
            this.ecgX = 0;
            this.ecgLastY = this.ecgCanvas.height * 0.55;
        }
        if (this.respCtx && this.respCanvas) {
            this.respCtx.fillStyle = '#06131a';
            this.respCtx.fillRect(0, 0, this.respCanvas.width, this.respCanvas.height);
            this.drawGrid(this.respCtx, this.respCanvas.width, this.respCanvas.height, '#0d2833');
            this.respX = 0;
            this.respLastY = this.respCanvas.height * 0.5;
        }
    }

    drawGrid(ctx, w, h, gridColor) {
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        const step = 20 * (window.devicePixelRatio || 1);
        ctx.beginPath();
        for (let x = 0; x < w; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        for (let y = 0; y < h; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();
    }

    setCase(patientCase) {
        this.hr = patientCase.constants.pulse;
        this.rr = patientCase.constants.respiration;
        this.spo2 = patientCase.constants.spo2;
        this.bpSys = patientCase.constants.bloodPressure.sys;
        this.bpDia = patientCase.constants.bloodPressure.dia;
        this.temp = patientCase.constants.temperature;

        // Reset des mesures découvertes
        this.measured = {
            temperature: false,
            pulse: false,
            respiration: false,
            bloodPressure: false,
            spo2: false
        };

        this.updateDigitalDisplays();
        this.updatePatientBreathingAnimation(this.rr);
        this.clearCanvases();
    }

    markMeasured(paramKey) {
        if (this.measured.hasOwnProperty(paramKey)) {
            this.measured[paramKey] = true;
            this.updateDigitalDisplays();
        }
    }

    updateDigitalDisplays() {
        // Température
        const tempEl = document.getElementById('disp-temp');
        const tempBadge = document.getElementById('badge-temp');
        if (tempEl && tempBadge) {
            if (this.measured.temperature) {
                tempEl.textContent = this.temp.toFixed(1).replace('.', ',') + " °C";
                const info = PPTX_STANDARDS.temperature.classify(this.temp);
                tempEl.className = `val-number ${info.color}`;
                tempBadge.textContent = info.label;
                tempBadge.className = `status-tag ${info.color}`;
            } else {
                tempEl.textContent = "--,- °C";
                tempEl.className = "val-number unmeasured";
                tempBadge.textContent = "Non mesurée";
                tempBadge.className = "status-tag gray";
            }
        }

        // Pouls
        const pulseEl = document.getElementById('disp-pulse');
        const pulseBadge = document.getElementById('badge-pulse');
        if (pulseEl && pulseBadge) {
            if (this.measured.pulse) {
                pulseEl.textContent = this.hr + " bpm";
                const info = PPTX_STANDARDS.pulse.classify(this.hr);
                pulseEl.className = `val-number ${info.color}`;
                pulseBadge.textContent = info.label;
                pulseBadge.className = `status-tag ${info.color}`;
            } else {
                pulseEl.textContent = "-- bpm";
                pulseEl.className = "val-number unmeasured";
                pulseBadge.textContent = "Non mesuré";
                pulseBadge.className = "status-tag gray";
            }
        }

        // Fréquence Respiratoire
        const respEl = document.getElementById('disp-resp');
        const respBadge = document.getElementById('badge-resp');
        if (respEl && respBadge) {
            if (this.measured.respiration) {
                respEl.textContent = this.rr + " cpm";
                const info = PPTX_STANDARDS.respiration.classify(this.rr);
                respEl.className = `val-number ${info.color}`;
                respBadge.textContent = info.label;
                respBadge.className = `status-tag ${info.color}`;
            } else {
                respEl.textContent = "-- cpm";
                respEl.className = "val-number unmeasured";
                respBadge.textContent = "Non comptée";
                respBadge.className = "status-tag gray";
            }
        }

        // Pression Artérielle
        const bpEl = document.getElementById('disp-bp');
        const bpBadge = document.getElementById('badge-bp');
        if (bpEl && bpBadge) {
            if (this.measured.bloodPressure) {
                bpEl.textContent = `${this.bpSys}/${this.bpDia} mmHg`;
                const info = PPTX_STANDARDS.bloodPressure.classify(this.bpSys, this.bpDia);
                bpEl.className = `val-number ${info.color}`;
                bpBadge.textContent = info.label;
                bpBadge.className = `status-tag ${info.color}`;
            } else {
                bpEl.textContent = "---/-- mmHg";
                bpEl.className = "val-number unmeasured";
                bpBadge.textContent = "Non mesurée";
                bpBadge.className = "status-tag gray";
            }
        }

        // Saturation SpO2
        const spo2El = document.getElementById('disp-spo2');
        const spo2Badge = document.getElementById('badge-spo2');
        if (spo2El && spo2Badge) {
            if (this.measured.spo2) {
                spo2El.textContent = this.spo2 + " %";
                const info = PPTX_STANDARDS.spo2.classify(this.spo2);
                spo2El.className = `val-number ${info.color}`;
                spo2Badge.textContent = info.label;
                spo2Badge.className = `status-tag ${info.color}`;
            } else {
                spo2El.textContent = "-- %";
                spo2El.className = "val-number unmeasured";
                spo2Badge.textContent = "Non mesurée";
                spo2Badge.className = "status-tag gray";
            }
        }
    }

    updatePatientBreathingAnimation(rr) {
        const chest = document.getElementById('patient-chest-breather');
        if (chest) {
            const cycleDuration = (60 / rr).toFixed(2); // secondes par cycle (ex: 2.5s pour 24 cpm, 3.75s pour 16 cpm)
            chest.style.animationDuration = `${cycleDuration}s`;
        }
        const respRateDisplay = document.getElementById('patient-rr-sync-indicator');
        if (respRateDisplay) {
            respRateDisplay.textContent = `Rythme respiratoire : ${rr} cycles/min (${(60/rr).toFixed(1)}s / cycle)`;
        }
    }

    startLoop() {
        const loop = (now) => {
            if (!this.lastTime) this.lastTime = now;
            const dt = (now - this.lastTime) / 1000;
            this.lastTime = now;

            this.updateECG(dt, now);
            this.updateResp(dt, now);

            this.animFrameId = requestAnimationFrame(loop);
        };
        this.animFrameId = requestAnimationFrame(loop);
    }

    /**
     * Générateur d'onde ECG réaliste (P - QRS - T)
     * P: onde atriale (+0.12)
     * Q: déflexion négative (-0.15)
     * R: onde systolique haute (+1.0)
     * S: déflexion négative profonde (-0.35)
     * T: onde de repolarisation ventriculaire (+0.25)
     */
    getEcgSample(phase) {
        // Phase va de 0.0 (début battement) à 1.0 (fin intervalle R-R)
        if (phase < 0.12) return 0; // Segment isoélectrique TP
        if (phase >= 0.12 && phase < 0.22) {
            // Onde P
            const pPhase = (phase - 0.12) / 0.10;
            return Math.sin(pPhase * Math.PI) * 0.14;
        }
        if (phase >= 0.22 && phase < 0.28) {
            // Segment PR isoélectrique
            return 0;
        }
        if (phase >= 0.28 && phase < 0.30) {
            // Onde Q
            const qPhase = (phase - 0.28) / 0.02;
            return -Math.sin(qPhase * Math.PI) * 0.18;
        }
        if (phase >= 0.30 && phase < 0.35) {
            // Onde R (pic majeur)
            const rPhase = (phase - 0.30) / 0.05;
            return Math.sin(rPhase * Math.PI) * 1.15;
        }
        if (phase >= 0.35 && phase < 0.39) {
            // Onde S
            const sPhase = (phase - 0.35) / 0.04;
            return -Math.sin(sPhase * Math.PI) * 0.32;
        }
        if (phase >= 0.39 && phase < 0.48) {
            // Segment ST isoélectrique
            return 0;
        }
        if (phase >= 0.48 && phase < 0.64) {
            // Onde T
            const tPhase = (phase - 0.48) / 0.16;
            return Math.sin(tPhase * Math.PI) * 0.30;
        }
        // Segment TP de repos
        return 0;
    }

    updateECG(dt, now) {
        if (!this.ecgCtx || !this.ecgCanvas) return;

        const w = this.ecgCanvas.width;
        const h = this.ecgCanvas.height;
        const baseline = h * 0.55;
        const scale = h * 0.40;

        // Fréquence en battements par seconde
        const bps = this.hr / 60;
        this.beatPhase += dt * bps;

        // Détection de l'onde R pour le bip audio
        if (this.beatPhase >= 0.32 && !this.hasBeepedThisCycle) {
            this.hasBeepedThisCycle = true;
            if (this.measured.pulse || this.measured.spo2) {
                window.soundEngine.playEcgBeep(this.spo2);
            }
        }

        if (this.beatPhase >= 1.0) {
            this.beatPhase -= 1.0;
            this.hasBeepedThisCycle = false;
        }

        // Vitesse de balayage du tracé
        const sweepSpeed = 160 * (window.devicePixelRatio || 1) * dt;
        const steps = Math.max(1, Math.ceil(sweepSpeed));

        for (let i = 0; i < steps; i++) {
            const nextX = (this.ecgX + sweepSpeed / steps) % w;
            const currentSample = this.getEcgSample(this.beatPhase);
            // Bruit haute fréquence naturel discret
            const microNoise = (Math.random() - 0.5) * 0.015;
            const currentY = baseline - (currentSample + microNoise) * scale;

            // Effacement de la bande juste devant la tête de balayage
            const eraseWidth = 22 * (window.devicePixelRatio || 1);
            this.ecgCtx.fillStyle = '#06131a';
            this.ecgCtx.fillRect(nextX, 0, eraseWidth, h);

            // Re-dessin de la grille dans la zone effacée
            this.redrawGridRegion(this.ecgCtx, nextX, 0, eraseWidth, h, '#0d2833');

            // Dessin du tracé ECG vert néon
            this.ecgCtx.strokeStyle = '#10b981'; // Vert éclatant
            this.ecgCtx.shadowColor = '#10b981';
            this.ecgCtx.shadowBlur = 4;
            this.ecgCtx.lineWidth = 2 * (window.devicePixelRatio || 1);
            this.ecgCtx.lineCap = 'round';

            if (nextX > this.ecgX) {
                this.ecgCtx.beginPath();
                this.ecgCtx.moveTo(this.ecgX, this.ecgLastY);
                this.ecgCtx.lineTo(nextX, currentY);
                this.ecgCtx.stroke();
            }

            // Tête de lecture (glow cursor)
            this.ecgCtx.fillStyle = '#34d399';
            this.ecgCtx.beginPath();
            this.ecgCtx.arc(nextX, currentY, 2.5 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
            this.ecgCtx.fill();

            this.ecgX = nextX;
            this.ecgLastY = currentY;
        }
        this.ecgCtx.shadowBlur = 0;
    }

    /**
     * Tracé de la courbe de capnographie / respiration
     */
    updateResp(dt, now) {
        if (!this.respCtx || !this.respCanvas) return;

        const w = this.respCanvas.width;
        const h = this.respCanvas.height;
        const baseline = h * 0.5;
        const scale = h * 0.35;

        const rps = this.rr / 60; // respirations par seconde
        this.respPhase += dt * rps;
        if (this.respPhase >= 1.0) {
            this.respPhase -= 1.0;
        }

        // Onde sinusoïdale asymétrique (inspiration un peu plus courte que l'expiration)
        let sample = 0;
        if (this.respPhase < 0.4) {
            // Inspiration
            sample = Math.sin((this.respPhase / 0.4) * (Math.PI / 2));
        } else {
            // Expiration
            sample = Math.cos(((this.respPhase - 0.4) / 0.6) * (Math.PI / 2));
        }

        const sweepSpeed = 90 * (window.devicePixelRatio || 1) * dt;
        const steps = Math.max(1, Math.ceil(sweepSpeed));

        for (let i = 0; i < steps; i++) {
            const nextX = (this.respX + sweepSpeed / steps) % w;
            const currentY = baseline - sample * scale;

            const eraseWidth = 20 * (window.devicePixelRatio || 1);
            this.respCtx.fillStyle = '#06131a';
            this.respCtx.fillRect(nextX, 0, eraseWidth, h);

            this.redrawGridRegion(this.respCtx, nextX, 0, eraseWidth, h, '#0d2833');

            // Ligne de respiration cyan/bleu ciel
            this.respCtx.strokeStyle = '#06b6d4';
            this.respCtx.shadowColor = '#06b6d4';
            this.respCtx.shadowBlur = 3;
            this.respCtx.lineWidth = 2 * (window.devicePixelRatio || 1);

            if (nextX > this.respX) {
                this.respCtx.beginPath();
                this.respCtx.moveTo(this.respX, this.respLastY);
                this.respCtx.lineTo(nextX, currentY);
                this.respCtx.stroke();
            }

            this.respCtx.fillStyle = '#67e8f9';
            this.respCtx.beginPath();
            this.respCtx.arc(nextX, currentY, 2.2 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
            this.respCtx.fill();

            this.respX = nextX;
            this.respLastY = currentY;
        }
        this.respCtx.shadowBlur = 0;
    }

    redrawGridRegion(ctx, x, y, w, h, gridColor) {
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        const step = 20 * (window.devicePixelRatio || 1);
        const startX = Math.floor(x / step) * step;
        ctx.beginPath();
        for (let gx = startX; gx <= x + w; gx += step) {
            if (gx >= x && gx <= x + w) {
                ctx.moveTo(gx, y);
                ctx.lineTo(gx, y + h);
            }
        }
        for (let gy = 0; gy <= ctx.canvas.height; gy += step) {
            ctx.moveTo(x, gy);
            ctx.lineTo(x + w, gy);
        }
        ctx.stroke();
    }
}

window.liveMonitor = new LiveMonitor();
