/**
 * GARDE DE NUIT - Moteur de Simulation Clinique & Évaluation
 * Gère le déroulement du soin, le respect strict de l'ordre des étapes,
 * les avertissements en cas d'erreur chronologique, la feuille de surveillance,
 * la rédaction de la note de transmission et la notation pédagogique.
 */

class ClinicalSimulator {
    constructor() {
        this.currentCaseIndex = 0;
        this.currentCase = CLINICAL_CASES[0];

        // Outil en cours d'utilisation
        this.activeTool = null;
        this.activeStepIndex = 1; // De 1 à 7
        this.stepCompletedForActiveTool = {}; // { stepId: boolean }

        // Suivi des constantes mesurées dans le cas actif
        this.recordedVitals = {
            temperature: null,
            pulse: null,
            respiration: null,
            bloodPressure: null,
            spo2: null
        };

        // Suivi de l'audit et des avertissements
        this.orderWarningsCount = 0;
        this.warningLog = [];
        this.completedToolsCount = 0;
        this.toolsFinished = {
            thermometer: false,
            blood_pressure: false,
            oxymeter: false,
            pulse_hand: false,
            watch_respiration: false
        };

        // Mesure interactive interne
        this.measurementProgress = 0;
        this.measurementInterval = null;
        this.bpNeedlePressure = 0;
        this.bpPumpInterval = null;
        this.bpDeflateInterval = null;
        this.respObservationTimer = null;
        this.respObsCount = 0;
        this.respObsSeconds = 0;
    }

    init() {
        this.loadCase(0);
        this.bindEvents();
    }

    loadCase(index) {
        this.currentCaseIndex = index;
        this.currentCase = CLINICAL_CASES[index];
        this.recordedVitals = {
            temperature: null,
            pulse: null,
            respiration: null,
            bloodPressure: null,
            spo2: null
        };
        this.orderWarningsCount = 0;
        this.warningLog = [];
        this.completedToolsCount = 0;
        this.toolsFinished = {
            thermometer: false,
            blood_pressure: false,
            oxymeter: false,
            pulse_hand: false,
            watch_respiration: false
        };
        this.activeTool = null;
        this.activeStepIndex = 1;
        this.stepCompletedForActiveTool = {};

        // Réinitialiser le moniteur
        if (window.liveMonitor) {
            window.liveMonitor.setCase(this.currentCase);
        }

        // Mettre à jour l'interface du patient et de la chambre
        this.updatePatientUI();
        this.renderToolTray();
        this.updateSurveillanceChart();
        this.resetTransmissionForm();
        this.closeProcedureModal();
        this.hideResultModal();
    }

    updatePatientUI() {
        // En-tête et dossier
        const caseTitleEl = document.getElementById('case-title-display');
        const caseServiceEl = document.getElementById('case-service-display');
        const patientContextEl = document.getElementById('patient-context-text');
        const patientNameEl = document.getElementById('patient-name-display');
        const patientAgeEl = document.getElementById('patient-age-display');
        const patientDialogueEl = document.getElementById('patient-bubble-text');
        const warningCounterEl = document.getElementById('warning-counter-badge');

        if (caseTitleEl) caseTitleEl.textContent = this.currentCase.title;
        if (caseServiceEl) caseServiceEl.textContent = this.currentCase.service;
        if (patientContextEl) patientContextEl.textContent = this.currentCase.context;
        if (patientNameEl) patientNameEl.textContent = this.currentCase.patientName;
        if (patientAgeEl) patientAgeEl.textContent = this.currentCase.age;
        if (patientDialogueEl) patientDialogueEl.textContent = this.currentCase.patientDialogueInit;
        if (warningCounterEl) warningCounterEl.textContent = `${this.orderWarningsCount} avertissement(s)`;

        // Avatar SVG du patient
        this.renderPatientAvatar();

        // Sélecteur de cas actif
        document.querySelectorAll('.case-tab-btn').forEach((btn, idx) => {
            btn.classList.toggle('active', idx === this.currentCaseIndex);
        });
    }

    renderPatientAvatar() {
        const avatarContainer = document.getElementById('patient-avatar-container');
        if (!avatarContainer) return;

        let avatarSVG = '';
        if (this.currentCase.patientAvatar === 'child') {
            // Léo, 8 ans, fébrile
            avatarSVG = `
            <svg viewBox="0 0 240 220" class="patient-svg-graphic">
                <defs>
                    <radialGradient id="feverFlush" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#ffedd5" />
                        <stop offset="70%" stop-color="#fed7aa" />
                        <stop offset="100%" stop-color="#fca5a5" />
                    </radialGradient>
                </defs>
                <!-- Lit d'hôpital -->
                <path d="M 20 180 L 220 180 L 230 215 L 10 215 Z" fill="#94a3b8" />
                <rect x="25" y="165" width="190" height="22" rx="6" fill="#cbd5e1" />
                <!-- Oreiller doux -->
                <ellipse cx="120" cy="95" rx="58" ry="32" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
                <!-- Tête de l'enfant -->
                <circle cx="120" cy="85" r="32" fill="url(#feverFlush)" stroke="#e2e8f0" stroke-width="1.5" />
                <!-- Cheveux enfantins bruns -->
                <path d="M 90 80 Q 120 45 150 80 Q 140 60 120 62 Q 100 62 90 80 Z" fill="#78350f" />
                <!-- Pommettes rouges de fièvre -->
                <circle cx="102" cy="92" r="7" fill="#ef4444" opacity="0.35" />
                <circle cx="138" cy="92" r="7" fill="#ef4444" opacity="0.35" />
                <!-- Yeux fatigués -->
                <ellipse cx="106" cy="82" rx="3.5" ry="2" fill="#334155" />
                <ellipse cx="134" cy="82" rx="3.5" ry="2" fill="#334155" />
                <!-- Bouche légèrement entrouverte -->
                <path d="M 115 98 Q 120 102 125 98" stroke="#b91c1c" stroke-width="2" fill="none" stroke-linecap="round" />
                <!-- Gouttelette de sueur fébrile -->
                <path d="M 144 72 Q 146 76 144 79 Q 141 76 144 72 Z" fill="#38bdf8" />
                <!-- Corps sous la couette respirante -->
                <g id="patient-chest-breather" class="breathing-chest">
                    <!-- Couette remontée -->
                    <path d="M 45 125 Q 120 110 195 125 L 205 180 L 35 180 Z" fill="#3b82f6" />
                    <path d="M 45 125 Q 120 115 195 125 L 195 138 Q 120 126 45 138 Z" fill="#60a5fa" />
                    <!-- Bras droit reposant sur le drap -->
                    <rect x="52" y="130" width="35" height="14" rx="7" fill="#fed7aa" />
                </g>
                <!-- Doudou peluche auprès de l'enfant -->
                <circle cx="60" cy="145" r="12" fill="#d97706" />
                <circle cx="55" cy="138" r="4" fill="#b45309" />
                <circle cx="65" cy="138" r="4" fill="#b45309" />
            </svg>`;
        } else if (this.currentCase.patientAvatar === 'elderly') {
            // M. Robert, 74 ans, céphalée intense et poussée d'HTA
            avatarSVG = `
            <svg viewBox="0 0 240 220" class="patient-svg-graphic">
                <!-- Lit incliné 30 degrés -->
                <path d="M 15 180 L 225 180 L 230 215 L 10 215 Z" fill="#94a3b8" />
                <rect x="25" y="165" width="190" height="22" rx="6" fill="#cbd5e1" />
                <!-- Dossier relevé / Oreillers empilés (conforme PPTX dos soutenu) -->
                <ellipse cx="120" cy="85" rx="64" ry="40" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2" />
                <!-- Tête homme âgé -->
                <circle cx="120" cy="80" r="35" fill="#ffedd5" stroke="#fed7aa" stroke-width="1.5" />
                <!-- Cheveux blancs tempes -->
                <path d="M 87 75 C 84 62 95 50 120 50 C 145 50 156 62 153 75 C 150 60 135 55 120 55 C 105 55 90 60 87 75 Z" fill="#e2e8f0" />
                <!-- Rides du front et sourcils froncés (douleur céphalique) -->
                <path d="M 105 66 Q 120 63 135 66" stroke="#94a3b8" stroke-width="1.2" fill="none" />
                <path d="M 107 70 Q 120 67 133 70" stroke="#94a3b8" stroke-width="1.2" fill="none" />
                <!-- Sourcils crispés -->
                <line x1="102" y1="75" x2="114" y2="78" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" />
                <line x1="138" y1="75" x2="126" y2="78" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" />
                <!-- Yeux plissés -->
                <path d="M 104 82 Q 110 79 116 82" stroke="#334155" stroke-width="2" fill="none" />
                <path d="M 124 82 Q 130 79 136 82" stroke="#334155" stroke-width="2" fill="none" />
                <!-- Nez et lunettes posées sur la table -->
                <path d="M 120 78 L 123 88 L 118 90" stroke="#cbd5e1" stroke-width="2" fill="none" />
                <!-- Main portée à la tempe (témoignant du mal de tête) -->
                <circle cx="152" cy="74" r="10" fill="#fed7aa" stroke="#fca5a5" stroke-width="1" />
                <!-- Cage thoracique respirante -->
                <g id="patient-chest-breather" class="breathing-chest">
                    <path d="M 40 120 Q 120 102 200 120 L 210 180 L 30 180 Z" fill="#0284c7" />
                    <!-- Drap blanc replié -->
                    <path d="M 40 120 Q 120 110 200 120 L 200 132 Q 120 120 40 132 Z" fill="#ffffff" />
                    <!-- Bras dénudé prêt pour le tensiomètre -->
                    <rect x="42" y="128" width="45" height="15" rx="7" fill="#fed7aa" />
                </g>
            </svg>`;
        } else {
            // Mme Sylvie, 52 ans, post-opératoire SpO2 91%, FR 24/min
            avatarSVG = `
            <svg viewBox="0 0 240 220" class="patient-svg-graphic">
                <!-- Lit articulé hospitalier -->
                <path d="M 15 180 L 225 180 L 230 215 L 10 215 Z" fill="#94a3b8" />
                <rect x="25" y="165" width="190" height="22" rx="6" fill="#cbd5e1" />
                <!-- Tête de lit relevée à 30-45° -->
                <rect x="18" y="45" width="12" height="145" rx="4" fill="#64748b" />
                <!-- Deux oreillers -->
                <ellipse cx="120" cy="85" rx="60" ry="36" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
                <!-- Tête femme 52 ans avec pâleur -->
                <circle cx="120" cy="80" r="34" fill="#fef3c7" stroke="#fde68a" stroke-width="1.5" />
                <!-- Cheveux mi-longs châtains -->
                <path d="M 88 85 C 84 55 100 48 120 48 C 140 48 156 55 152 85 C 144 98 140 110 142 115 L 136 114 C 134 100 145 80 120 72 C 95 80 106 100 104 114 L 98 115 C 100 110 96 98 88 85 Z" fill="#581c87" opacity="0.85" />
                <!-- Yeux mi-clos / somnolence anesthésique -->
                <path d="M 104 81 Q 110 84 116 81" stroke="#475569" stroke-width="2.5" fill="none" />
                <path d="M 124 81 Q 130 84 136 81" stroke="#475569" stroke-width="2.5" fill="none" />
                <!-- Lèvres légèrement violacées / cyanosées (SpO2 91%) -->
                <path d="M 114 96 Q 120 99 126 96" stroke="#6b21a8" stroke-width="2.2" fill="none" stroke-linecap="round" />
                <!-- Battement ailes du nez -->
                <ellipse cx="118" cy="88" rx="2" ry="1.5" fill="#cbd5e1" />
                <ellipse cx="122" cy="88" rx="2" ry="1.5" fill="#cbd5e1" />
                <!-- Lunettes à oxygène prêtes au chevet -->
                <path d="M 95 82 Q 120 90 145 82" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3,3" fill="none" />
                <!-- Poitrine respirant rapidement (24 cpm) -->
                <g id="patient-chest-breather" class="breathing-chest tachypneic">
                    <!-- Couverture clinique saumon / rose pale -->
                    <path d="M 38 120 Q 120 100 202 120 L 210 180 L 30 180 Z" fill="#0d9488" />
                    <!-- Revers de drap blanc -->
                    <path d="M 38 120 Q 120 108 202 120 L 202 130 Q 120 118 38 130 Z" fill="#f8fafc" />
                    <!-- Doigt visible pour pose du capteur SpO2 -->
                    <rect x="52" y="132" width="40" height="14" rx="7" fill="#fed7aa" />
                    <circle cx="85" cy="139" r="4.5" fill="#ef4444" opacity="0.6" />
                </g>
            </svg>`;
        }

        avatarContainer.innerHTML = avatarSVG;
    }

    renderToolTray() {
        const trayContainer = document.getElementById('tools-grid');
        if (!trayContainer) return;

        trayContainer.innerHTML = '';
        CLINICAL_TOOLS.forEach(tool => {
            const isCompleted = this.toolsFinished[tool.id];
            const btn = document.createElement('button');
            btn.className = `tool-card-btn ${isCompleted ? 'completed' : ''}`;
            btn.id = `btn-tool-${tool.id}`;
            btn.innerHTML = `
                <div class="tool-icon-wrap">
                    <i class="fas ${tool.icon}"></i>
                </div>
                <div class="tool-info">
                    <span class="tool-name">${tool.name}</span>
                    <span class="tool-sub">${tool.description}</span>
                </div>
                <div class="tool-badge">
                    ${isCompleted ? '<i class="fas fa-check-circle"></i> Mesuré' : '<i class="fas fa-play"></i> Débuter'}
                </div>
            `;
            btn.addEventListener('click', () => {
                this.selectTool(tool);
            });
            trayContainer.appendChild(btn);
        });
    }

    selectTool(tool) {
        window.soundEngine.init();
        this.activeTool = tool;
        this.activeStepIndex = 1;
        this.stepCompletedForActiveTool = {};

        // Rendre l'interface de la procédure
        this.openProcedureModal();
    }

    openProcedureModal() {
        const modal = document.getElementById('procedure-modal');
        if (!modal) return;

        const titleEl = document.getElementById('proc-modal-title');
        const slideRefEl = document.getElementById('proc-slide-ref');
        const equipListEl = document.getElementById('proc-equipment-list');
        const patientPromptEl = document.getElementById('proc-patient-dialogue');

        if (titleEl) titleEl.innerHTML = `<i class="fas ${this.activeTool.icon}"></i> ${this.activeTool.fullName}`;
        if (slideRefEl) slideRefEl.innerHTML = `Conforme au cours PPTX : <strong>Slide ${this.activeTool.pptxEquipmentSlide}</strong> (Matériel) & <strong>Slide ${this.activeTool.pptxProcedureSlide}</strong> (Technique de mesure)`;

        if (equipListEl) {
            equipListEl.innerHTML = '';
            this.activeTool.equipment.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-check text-green"></i> ${item}`;
                equipListEl.appendChild(li);
            });
        }

        if (patientPromptEl) {
            patientPromptEl.textContent = this.currentCase.patientDialogueInit;
        }

        // Cacher la zone de mesure interactive pour commencer
        const liveWorkstation = document.getElementById('proc-live-workstation');
        if (liveWorkstation) liveWorkstation.innerHTML = '';

        this.renderStepPipeline();
        modal.classList.add('active');
    }

    closeProcedureModal() {
        const modal = document.getElementById('procedure-modal');
        if (modal) modal.classList.remove('active');
        if (this.measurementInterval) clearInterval(this.measurementInterval);
        if (this.bpPumpInterval) clearInterval(this.bpPumpInterval);
        if (this.bpDeflateInterval) clearInterval(this.bpDeflateInterval);
        if (this.respObservationTimer) clearInterval(this.respObservationTimer);
    }

    renderStepPipeline() {
        const pipelineContainer = document.getElementById('proc-steps-pipeline');
        if (!pipelineContainer) return;

        pipelineContainer.innerHTML = '';

        const readDone = !!this.stepCompletedForActiveTool['read'];
        const firstUncompleted = STANDARD_STEPS.find(s => !this.stepCompletedForActiveTool[s.id]);

        STANDARD_STEPS.forEach((step, idx) => {
            const isCompleted = !!this.stepCompletedForActiveTool[step.id];
            let isCurrent = false;
            if (!isCompleted) {
                if (readDone && (step.id === 'note' || step.id === 'disinfect')) {
                    isCurrent = true;
                } else if (firstUncompleted && firstUncompleted.id === step.id) {
                    isCurrent = true;
                }
            }

            const card = document.createElement('div');
            card.className = `step-action-card ${isCompleted ? 'done' : ''} ${isCurrent ? 'current' : ''}`;
            card.id = `step-card-${step.id}`;

            card.innerHTML = `
                <div class="step-num">${step.order}</div>
                <div class="step-body">
                    <div class="step-title-row">
                        <strong>${step.title}</strong>
                        <span class="step-rule-hint">${step.pptxRule}</span>
                    </div>
                    <div class="step-desc">${step.actionText}</div>
                </div>
                <div class="step-action-btn-wrap">
                    <button class="step-btn ${isCompleted ? 'btn-done' : (isCurrent ? 'btn-primary' : 'btn-outline')}" data-step-id="${step.id}" data-step-order="${step.order}">
                        ${isCompleted ? '<i class="fas fa-check"></i> Fait' : (isCurrent ? '<i class="fas fa-hand-pointer"></i> Effectuer' : 'Réaliser')}
                    </button>
                </div>
            `;

            const btn = card.querySelector('.step-btn');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleStepClick(step);
            });

            pipelineContainer.appendChild(card);
        });

        // Mise à jour de la jauge de progression
        const progressBar = document.getElementById('proc-progress-bar');
        if (progressBar) {
            const completedCount = Object.keys(this.stepCompletedForActiveTool).length;
            const pct = Math.round((completedCount / STANDARD_STEPS.length) * 100);
            progressBar.style.width = `${pct}%`;
        }
    }

    /**
     * CŒUR DU GAMEPLAY : Vérification de l'ordre strict des étapes
     * "Steps must be done in the correct order (hand washing, explaining to the patient,
     * positioning, measuring, reading, noting, disinfecting). Wrong order gives a warning."
     */
    handleStepClick(attemptedStep) {
        window.soundEngine.init();

        // Si l'étape est déjà accomplie
        if (this.stepCompletedForActiveTool[attemptedStep.id]) {
            return;
        }

        const readDone = !!this.stepCompletedForActiveTool['read'];
        const isTerminalStep = (attemptedStep.id === 'note' || attemptedStep.id === 'disinfect');

        // Cas des étapes terminales 6 et 7 (Noter et Désinfecter après Lecture) :
        if (isTerminalStep) {
            if (!readDone) {
                // Erreur : on ne peut ni noter ni désinfecter avant d'avoir lu la mesure !
                const expectedStep = STANDARD_STEPS.find(s => !this.stepCompletedForActiveTool[s.id]);
                this.triggerOrderWarning(attemptedStep, expectedStep);
                return;
            }
            // Valide ! Que le soignant note puis désinfecte, ou désinfecte puis note
            this.executeValidStep(attemptedStep);
            return;
        }

        // Pour les étapes 1 à 5 : ordre rigoureusement séquentiel
        const currentUncompletedStep = STANDARD_STEPS.find(s => !this.stepCompletedForActiveTool[s.id]);
        if (attemptedStep.id !== currentUncompletedStep.id) {
            // AVERTISSEMENT ! Ordre incorrect
            this.triggerOrderWarning(attemptedStep, currentUncompletedStep);
            return;
        }

        // Si l'ordre est respecté : exécuter l'action étape par étape
        this.executeValidStep(attemptedStep);
    }

    triggerOrderWarning(attemptedStep, expectedStep) {
        this.orderWarningsCount++;
        window.soundEngine.playWarning();

        const warningMsg = `Tentative de « ${attemptedStep.title} » avant d'avoir validé l'étape obligatoire « ${expectedStep.title} ».`;
        this.warningLog.push({
            tool: this.activeTool.name,
            attempted: attemptedStep.title,
            expected: expectedStep.title,
            pptxRef: expectedStep.pptxRule,
            time: new Date().toLocaleTimeString('fr-FR', { minute: '2-digit', second: '2-digit' })
        });

        // Mettre à jour l'indicateur d'avertissements
        const warningCounterEl = document.getElementById('warning-counter-badge');
        if (warningCounterEl) {
            warningCounterEl.textContent = `${this.orderWarningsCount} avertissement(s)`;
            warningCounterEl.classList.add('pulse-warning');
            setTimeout(() => warningCounterEl.classList.remove('pulse-warning'), 1000);
        }

        // Afficher la bannière d'alerte avec explication PPTX
        this.showWarningModal(attemptedStep, expectedStep);
    }

    showWarningModal(attemptedStep, expectedStep) {
        const warningBanner = document.getElementById('order-warning-banner');
        if (!warningBanner) return;

        warningBanner.innerHTML = `
            <div class="warning-content">
                <div class="warning-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="warning-text">
                    <h4>⚠️ AVERTISSEMENT PROTOCOLE (Non-respect de l'ordre clinique)</h4>
                    <p>Vous avez tenté : <strong>${attemptedStep.title}</strong>.</p>
                    <p class="highlight-expected">Étape obligatoire préalable requise : <strong>${expectedStep.title}</strong>.</p>
                    <div class="pptx-quote">
                        <i class="fas fa-book-medical"></i> <em>Règle du cours PPTX :</em> "${expectedStep.pptxRule}"
                    </div>
                </div>
                <button class="close-warning-btn" id="dismiss-warning-btn">Compris</button>
            </div>
        `;

        warningBanner.classList.add('visible');
        document.getElementById('dismiss-warning-btn')?.addEventListener('click', () => {
            warningBanner.classList.remove('visible');
        });
    }

    executeValidStep(step) {
        // Valider l'étape
        this.stepCompletedForActiveTool[step.id] = true;

        // Dialogue patient dynamique selon l'étape
        const patientPromptEl = document.getElementById('proc-patient-dialogue');
        const mainPatientBubble = document.getElementById('patient-bubble-text');

        // Sons et animations selon l'étape
        if (step.id === 'wash') {
            window.soundEngine.playWashHands();
            if (patientPromptEl) patientPromptEl.textContent = "L'infirmier(ère) s'approche du lit avec des mains impeccablement désinfectées.";
        } else if (step.id === 'explain') {
            window.soundEngine.playSuccess();
            if (patientPromptEl) patientPromptEl.textContent = this.currentCase.patientDialogueExplain;
            if (mainPatientBubble) mainPatientBubble.textContent = this.currentCase.patientDialogueExplain;
        } else if (step.id === 'position') {
            window.soundEngine.playSuccess();
            if (patientPromptEl) patientPromptEl.textContent = "Le patient est confortablement installé, au repos complet.";
        } else if (step.id === 'measure') {
            // Lancement de l'expérience de mesure interactive
            this.launchMeasurementMiniGame();
        } else if (step.id === 'read') {
            window.soundEngine.playSuccess();
            this.revealValueInProcedure();
        } else if (step.id === 'note') {
            window.soundEngine.playSuccess();
            this.commitValueToChart();
        } else if (step.id === 'disinfect') {
            window.soundEngine.playWashHands();
            if (patientPromptEl) patientPromptEl.textContent = this.currentCase.patientDialogueDisinfect;
            if (mainPatientBubble) mainPatientBubble.textContent = this.currentCase.patientDialogueDisinfect;
        }

        // Vérifier si toutes les 7 étapes sont accomplies
        const allStepsDone = STANDARD_STEPS.every(s => !!this.stepCompletedForActiveTool[s.id]);
        if (allStepsDone) {
            this.toolsFinished[this.activeTool.id] = true;
            this.completedToolsCount++;
            this.updateSurveillanceChart();
            this.renderToolTray();

            const liveWorkstation = document.getElementById('proc-live-workstation');
            if (liveWorkstation) {
                liveWorkstation.innerHTML += `
                    <div class="result-readout-banner green" style="margin-top: 1rem;">
                        <i class="fas fa-check-double fa-2x"></i>
                        <div>
                            <h4>Soin validé avec succès !</h4>
                            <p>Les 7 étapes de la procédure ont été respectées. Enregistrement terminé.</p>
                        </div>
                    </div>
                `;
            }

            setTimeout(() => {
                this.closeProcedureModal();
                this.checkAllVitalsDone();
            }, 1400);
        }

        this.renderStepPipeline();
    }

    /**
     * Expériences de mesure interactives pour l'étape 4 (Mise en place & Mesure)
     */
    launchMeasurementMiniGame() {
        const liveWorkstation = document.getElementById('proc-live-workstation');
        if (!liveWorkstation) return;

        const toolId = this.activeTool.id;

        if (toolId === 'thermometer') {
            liveWorkstation.innerHTML = `
                <div class="interactive-measuring-card">
                    <h5><i class="fas fa-thermometer-half"></i> Prise de la température corporelle</h5>
                    <p class="tool-instruction">Mise en place de l'embout protecteur à usage unique. Appuyez sur le bouton pour déclencher la mesure.</p>
                    <div class="thermometer-visual">
                        <div class="thermo-body">
                            <div class="thermo-screen" id="thermo-live-screen">---.- °C</div>
                            <div class="thermo-sensor-tip"></div>
                        </div>
                    </div>
                    <button class="action-trigger-btn" id="btn-trigger-thermo">
                        <i class="fas fa-satellite-dish"></i> Déclencher la mesure (attendre le signal sonore)
                    </button>
                    <div class="measure-status-text" id="thermo-measure-status">En attente de déclenchement...</div>
                </div>
            `;
            document.getElementById('btn-trigger-thermo').addEventListener('click', () => {
                this.runThermometerSimulation();
            });
        } else if (toolId === 'blood_pressure') {
            liveWorkstation.innerHTML = `
                <div class="interactive-measuring-card">
                    <h5><i class="fas fa-heartbeat"></i> Prise auscultatoire de la tension artérielle</h5>
                    <p class="tool-instruction">Gonflez le brassard pneumatique avec la poire au-dessus de la systolique estimée (180 mmHg), puis relâchez lentement pour ausculter les bruits de Korotkoff.</p>
                    <div class="bp-manometer-container">
                        <div class="manometer-dial">
                            <div class="manometer-needle" id="bp-needle"></div>
                            <div class="manometer-center-hub"></div>
                            <div class="manometer-readout" id="bp-dial-val">0 mmHg</div>
                        </div>
                        <div class="stethoscope-auscult-indicator" id="stetho-pulse-light">
                            <i class="fas fa-stethoscope"></i> <span id="stetho-sound-label">Auscultation : Silencieux</span>
                        </div>
                    </div>
                    <div class="bp-controls-row">
                        <button class="action-trigger-btn bp-btn" id="btn-pump-cuff"><i class="fas fa-compress-arrows-alt"></i> Gonfler la poire (+30 mmHg)</button>
                        <button class="action-trigger-btn bp-btn secondary" id="btn-deflate-cuff" disabled><i class="fas fa-wind"></i> Décompression lente (lecture auscultatoire)</button>
                    </div>
                    <div class="measure-status-text" id="bp-measure-status">Gonflez le brassard jusqu'à 180 mmHg.</div>
                </div>
            `;
            this.bpNeedlePressure = 0;
            document.getElementById('btn-pump-cuff').addEventListener('click', () => {
                this.pumpBPCuff();
            });
            document.getElementById('btn-deflate-cuff').addEventListener('click', () => {
                this.deflateBPCuff();
            });
        } else if (toolId === 'oxymeter') {
            liveWorkstation.innerHTML = `
                <div class="interactive-measuring-card">
                    <h5><i class="fas fa-fingerprint"></i> Oxymètre de pouls digital (SpO₂)</h5>
                    <p class="tool-instruction">Clipsez l'oxymètre sur un doigt propre et tiède. Attendez la stabilisation du signal photopléthysmographique.</p>
                    <div class="oxymeter-device-view">
                        <div class="finger-sensor-clip">
                            <div class="red-led-emitter" id="oxymeter-laser-led"></div>
                            <span class="finger-label">Doigt sous le faisceau infrarouge</span>
                        </div>
                        <div class="oxymeter-digital-box">
                            <div class="oxy-reading">
                                <span class="oxy-label">% SpO₂</span>
                                <span class="oxy-val" id="oxy-screen-spo2">--</span>
                            </div>
                            <div class="oxy-reading">
                                <span class="oxy-label">Pouls bpm</span>
                                <span class="oxy-val" id="oxy-screen-hr">--</span>
                            </div>
                        </div>
                    </div>
                    <button class="action-trigger-btn" id="btn-trigger-oxymeter">
                        <i class="fas fa-wave-square"></i> Démarrer la détection de l'onde de pouls
                    </button>
                    <div class="measure-status-text" id="oxy-measure-status">En attente de stabilisation...</div>
                </div>
            `;
            document.getElementById('btn-trigger-oxymeter').addEventListener('click', () => {
                this.runOxymeterSimulation();
            });
        } else if (toolId === 'pulse_hand') {
            liveWorkstation.innerHTML = `
                <div class="interactive-measuring-card">
                    <h5><i class="fas fa-hand-paper"></i> Palpation de l'artère radiale au poignet</h5>
                    <p class="tool-instruction">Appliquez la pulpe des 2 à 3 doigts (sans le pouce) dans la gouttière radiale. Comptez les pulsations pendant la minute.</p>
                    <div class="pulse-wrist-graphic">
                        <div class="wrist-outline">
                            <div class="radial-pulse-emitter" id="radial-pulse-dot">
                                <i class="fas fa-heart"></i>
                            </div>
                            <span class="wrist-artery-tag">Artère radiale</span>
                        </div>
                        <div class="pulse-palpation-counter">
                            <div class="pulse-sec-label">Chronomètre : <span id="pulse-timer-sec">00s / 60s</span></div>
                            <div class="pulse-count-display">Battements : <span id="pulse-live-beats">0</span></div>
                        </div>
                    </div>
                    <button class="action-trigger-btn" id="btn-trigger-pulse">
                        <i class="fas fa-play"></i> Palper et compter pendant la minute
                    </button>
                    <div class="measure-status-text" id="pulse-measure-status">Prêt pour la palpation manuelle.</div>
                </div>
            `;
            document.getElementById('btn-trigger-pulse').addEventListener('click', () => {
                this.runPulsePalpationSimulation();
            });
        } else if (toolId === 'watch_respiration') {
            liveWorkstation.innerHTML = `
                <div class="interactive-measuring-card">
                    <h5><i class="fas fa-stopwatch"></i> Observation des mouvements thoraciques (Fréquence respiratoire)</h5>
                    <p class="tool-instruction">Installez le patient confortablement. Observez l'élévation et l'abaissement de la cage thoracique (1 cycle = inspiration + expiration) pendant une minute complète.</p>
                    <div class="respiration-watch-box">
                        <div class="analog-stopwatch">
                            <div class="stopwatch-hand" id="resp-stopwatch-hand"></div>
                            <div class="stopwatch-center"></div>
                            <span class="stopwatch-label" id="resp-sec-counter">0 s</span>
                        </div>
                        <div class="chest-cycle-watcher">
                            <div class="chest-motion-bubble" id="chest-motion-sim">
                                <i class="fas fa-lungs"></i>
                                <span id="resp-phase-label">Observation...</span>
                            </div>
                            <div class="cycles-counted-tag">Cycles comptés : <strong id="resp-cycles-count">0</strong></div>
                        </div>
                    </div>
                    <button class="action-trigger-btn" id="btn-trigger-resp">
                        <i class="fas fa-play"></i> Lancer l'observation thoracique (1 minute)
                    </button>
                    <div class="measure-status-text" id="resp-measure-status">Prêt pour le comptage visuel.</div>
                </div>
            `;
            document.getElementById('btn-trigger-resp').addEventListener('click', () => {
                this.runRespirationWatchSimulation();
            });
        }
    }

    runThermometerSimulation() {
        const btn = document.getElementById('btn-trigger-thermo');
        const screen = document.getElementById('thermo-live-screen');
        const status = document.getElementById('thermo-measure-status');
        if (!btn || !screen || !status) return;

        btn.disabled = true;
        status.textContent = "Mesure thermique en cours... Patientez...";
        let tempVal = 35.0;
        const target = this.currentCase.constants.temperature;

        const interval = setInterval(() => {
            tempVal += (target - tempVal) * 0.35 + (Math.random() * 0.1);
            if (tempVal >= target - 0.05) {
                tempVal = target;
                clearInterval(interval);
                screen.textContent = `${tempVal.toFixed(1).replace('.', ',')} °C`;
                window.soundEngine.playThermometerBeep();
                status.innerHTML = `<span class="text-green"><i class="fas fa-check-circle"></i> Signal sonore retenti ! Mesure stabilisée. Cliquez sur l'étape 5 pour lire le résultat.</span>`;
            } else {
                screen.textContent = `${tempVal.toFixed(1).replace('.', ',')} °C`;
            }
        }, 120);
    }

    pumpBPCuff() {
        this.bpNeedlePressure += 35;
        window.soundEngine.playCuffPump();
        if (this.bpNeedlePressure > 210) this.bpNeedlePressure = 210;

        this.updateManometerUI();

        const deflateBtn = document.getElementById('btn-deflate-cuff');
        const status = document.getElementById('bp-measure-status');
        if (this.bpNeedlePressure >= 170) {
            if (deflateBtn) deflateBtn.disabled = false;
            if (status) status.innerHTML = `<span class="text-green"><i class="fas fa-check"></i> Pression adéquate (> 170 mmHg). Cliquez maintenant sur « Décompression lente » pour ausculter.</span>`;
        }
    }

    deflateBPCuff() {
        const deflateBtn = document.getElementById('btn-deflate-cuff');
        const pumpBtn = document.getElementById('btn-pump-cuff');
        const status = document.getElementById('bp-measure-status');
        const stethoLabel = document.getElementById('stetho-sound-label');
        const stethoLight = document.getElementById('stetho-pulse-light');

        if (deflateBtn) deflateBtn.disabled = true;
        if (pumpBtn) pumpBtn.disabled = true;
        if (status) status.textContent = "Décompression lente en cours... Écoutez au stéthoscope les bruits de Korotkoff...";

        window.soundEngine.playCuffRelease();

        const sys = this.currentCase.constants.bloodPressure.sys;
        const dia = this.currentCase.constants.bloodPressure.dia;

        this.bpDeflateInterval = setInterval(() => {
            this.bpNeedlePressure -= 3;
            this.updateManometerUI();

            // Auscultation Korotkoff : Bruits audibles entre Systole et Diastole
            if (this.bpNeedlePressure <= sys + 4 && this.bpNeedlePressure >= dia) {
                window.soundEngine.playKorotkoff();
                if (stethoLabel) stethoLabel.innerHTML = `<strong>Bruit de Korotkoff perçu ! (Pression : ${Math.round(this.bpNeedlePressure)} mmHg)</strong>`;
                if (stethoLight) {
                    stethoLight.classList.add('hearing-pulse');
                    setTimeout(() => stethoLight.classList.remove('hearing-pulse'), 120);
                }
            } else if (this.bpNeedlePressure < dia) {
                if (stethoLabel) stethoLabel.innerHTML = `<em>Disparition des bruits (Diastole atteinte à ${dia} mmHg)</em>`;
            }

            if (this.bpNeedlePressure <= 30) {
                clearInterval(this.bpDeflateInterval);
                this.bpNeedlePressure = 0;
                this.updateManometerUI();
                if (status) status.innerHTML = `<span class="text-green"><i class="fas fa-check-circle"></i> Mesure terminée ! Vous avez perçu le premier bruit à <strong>${sys} mmHg</strong> et la disparition à <strong>${dia} mmHg</strong>. Passez à l'étape 5.</span>`;
            }
        }, 80);
    }

    updateManometerUI() {
        const needle = document.getElementById('bp-needle');
        const readout = document.getElementById('bp-dial-val');
        if (readout) readout.textContent = `${Math.round(this.bpNeedlePressure)} mmHg`;
        if (needle) {
            // Arc de 0 à 300 mmHg correspond à -135deg à +135deg
            const deg = -135 + (this.bpNeedlePressure / 300) * 270;
            needle.style.transform = `rotate(${deg}deg)`;
        }
    }

    runOxymeterSimulation() {
        const btn = document.getElementById('btn-trigger-oxymeter');
        const screenSpo2 = document.getElementById('oxy-screen-spo2');
        const screenHr = document.getElementById('oxy-screen-hr');
        const status = document.getElementById('oxy-measure-status');
        const laser = document.getElementById('oxymeter-laser-led');

        if (!btn || !screenSpo2 || !screenHr || !status) return;

        btn.disabled = true;
        if (laser) laser.classList.add('glowing-red');
        status.textContent = "Acquisition de la pléthysmographie transcutanée...";

        let step = 0;
        const targetSpo2 = this.currentCase.constants.spo2;
        const targetHr = this.currentCase.constants.pulse;

        const interval = setInterval(() => {
            step++;
            window.soundEngine.playPulseTap();
            screenSpo2.textContent = `${Math.min(99, 82 + step * 2)} %`;
            screenHr.textContent = `${Math.round(targetHr + (Math.random() * 4 - 2))} bpm`;

            if (step >= 6) {
                clearInterval(interval);
                screenSpo2.textContent = `${targetSpo2} %`;
                screenHr.textContent = `${targetHr} bpm`;
                window.soundEngine.playSuccess();
                status.innerHTML = `<span class="text-green"><i class="fas fa-check-circle"></i> Onde de pouls stabilisée ! SpO₂ : <strong>${targetSpo2} %</strong>. Passez à l'étape 5.</span>`;
            }
        }, 300);
    }

    runPulsePalpationSimulation() {
        const btn = document.getElementById('btn-trigger-pulse');
        const timerSec = document.getElementById('pulse-timer-sec');
        const liveBeats = document.getElementById('pulse-live-beats');
        const status = document.getElementById('pulse-measure-status');
        const pulseDot = document.getElementById('radial-pulse-dot');

        if (!btn || !timerSec || !liveBeats || !status) return;

        btn.disabled = true;
        status.textContent = "Palpation en cours... Observation de la régularité et de la force du pouls...";

        let seconds = 0;
        let beats = 0;
        const targetBpm = this.currentCase.constants.pulse;

        // Simulation accélérée fluide pour une expérience de jeu dynamique
        const pulseInterval = setInterval(() => {
            seconds += 5;
            beats = Math.round((seconds / 60) * targetBpm);
            timerSec.textContent = `${seconds}s / 60s`;
            liveBeats.textContent = `${beats}`;

            window.soundEngine.playPulseTap();
            if (pulseDot) {
                pulseDot.classList.add('pulsing');
                setTimeout(() => pulseDot.classList.remove('pulsing'), 150);
            }

            if (seconds >= 60) {
                clearInterval(pulseInterval);
                window.soundEngine.playSuccess();
                status.innerHTML = `<span class="text-green"><i class="fas fa-check-circle"></i> Comptage complet sur 1 minute effectué : <strong>${targetBpm} battements/min</strong>. Passez à l'étape 5.</span>`;
            }
        }, 300);
    }

    runRespirationWatchSimulation() {
        const btn = document.getElementById('btn-trigger-resp');
        const secLabel = document.getElementById('resp-sec-counter');
        const cyclesCount = document.getElementById('resp-cycles-count');
        const hand = document.getElementById('resp-stopwatch-hand');
        const status = document.getElementById('resp-measure-status');
        const phaseLabel = document.getElementById('resp-phase-label');

        if (!btn || !secLabel || !cyclesCount || !status) return;

        btn.disabled = true;
        status.textContent = "Observation attentive des mouvements d'inspiration et d'expiration...";

        let seconds = 0;
        const targetRr = this.currentCase.constants.respiration;

        const respInterval = setInterval(() => {
            seconds += 5;
            const cycles = Math.round((seconds / 60) * targetRr);
            secLabel.textContent = `${seconds} s`;
            cyclesCount.textContent = `${cycles}`;

            const deg = (seconds / 60) * 360;
            if (hand) hand.style.transform = `rotate(${deg}deg)`;

            window.soundEngine.playTick();
            if (phaseLabel) {
                phaseLabel.textContent = (seconds % 10 < 5) ? "Inspiration (gonflement)" : "Expiration (relâchement)";
            }

            if (seconds >= 60) {
                clearInterval(respInterval);
                window.soundEngine.playSuccess();
                status.innerHTML = `<span class="text-green"><i class="fas fa-check-circle"></i> 1 minute écoulée : <strong>${targetRr} cycles respiratoires</strong> comptés. Passez à l'étape 5.</span>`;
            }
        }, 300);
    }

    revealValueInProcedure() {
        const liveWorkstation = document.getElementById('proc-live-workstation');
        if (!liveWorkstation) return;

        let displayHtml = '';
        const target = this.activeTool.targetConstante;

        if (target === 'temperature') {
            const val = this.currentCase.constants.temperature;
            const info = PPTX_STANDARDS.temperature.classify(val);
            displayHtml = `
                <div class="result-readout-banner ${info.color}">
                    <div class="readout-num">${val.toFixed(1).replace('.', ',')} °C</div>
                    <div class="readout-meta">
                        <h4>Interprétation PPTX (Slide ${info.slide})</h4>
                        <p><strong>${info.label}</strong> (Norme du cours : 36,5 à 37,5 °C)</p>
                    </div>
                </div>
            `;
        } else if (target === 'bloodPressure') {
            const bp = this.currentCase.constants.bloodPressure;
            const info = PPTX_STANDARDS.bloodPressure.classify(bp.sys, bp.dia);
            displayHtml = `
                <div class="result-readout-banner ${info.color}">
                    <div class="readout-num">${bp.sys}/${bp.dia} mmHg</div>
                    <div class="readout-meta">
                        <h4>Interprétation PPTX (Slide ${info.slide})</h4>
                        <p><strong>${info.label}</strong> (Norme de référence du cours : ~120/80 mmHg)</p>
                    </div>
                </div>
            `;
        } else if (target === 'spo2') {
            const val = this.currentCase.constants.spo2;
            const info = PPTX_STANDARDS.spo2.classify(val);
            displayHtml = `
                <div class="result-readout-banner ${info.color}">
                    <div class="readout-num">${val} %</div>
                    <div class="readout-meta">
                        <h4>Interprétation PPTX (Slide ${info.slide})</h4>
                        <p><strong>${info.label}</strong> (Norme du cours : 95 à 100 %)</p>
                    </div>
                </div>
            `;
        } else if (target === 'pulse') {
            const val = this.currentCase.constants.pulse;
            const info = PPTX_STANDARDS.pulse.classify(val);
            displayHtml = `
                <div class="result-readout-banner ${info.color}">
                    <div class="readout-num">${val} bpm</div>
                    <div class="readout-meta">
                        <h4>Interprétation PPTX (Slide ${info.slide})</h4>
                        <p><strong>${info.label}</strong> (Norme du cours adulte au repos : 60 à 100 bpm)</p>
                    </div>
                </div>
            `;
        } else if (target === 'respiration') {
            const val = this.currentCase.constants.respiration;
            const info = PPTX_STANDARDS.respiration.classify(val);
            displayHtml = `
                <div class="result-readout-banner ${info.color}">
                    <div class="readout-num">${val} cycles/min</div>
                    <div class="readout-meta">
                        <h4>Interprétation PPTX (Slide ${info.slide})</h4>
                        <p><strong>${info.label}</strong> (Norme du cours adulte au repos : 12 à 20 cycles/min)</p>
                    </div>
                </div>
            `;
        }

        liveWorkstation.innerHTML = displayHtml;
    }

    commitValueToChart() {
        const target = this.activeTool.targetConstante;

        // Enregistrer la constante
        if (target === 'temperature') {
            this.recordedVitals.temperature = this.currentCase.constants.temperature;
            window.liveMonitor.markMeasured('temperature');
        } else if (target === 'bloodPressure') {
            this.recordedVitals.bloodPressure = this.currentCase.constants.bloodPressure;
            window.liveMonitor.markMeasured('bloodPressure');
        } else if (target === 'spo2') {
            this.recordedVitals.spo2 = this.currentCase.constants.spo2;
            window.liveMonitor.markMeasured('spo2');
        } else if (target === 'pulse') {
            this.recordedVitals.pulse = this.currentCase.constants.pulse;
            window.liveMonitor.markMeasured('pulse');
        } else if (target === 'respiration') {
            this.recordedVitals.respiration = this.currentCase.constants.respiration;
            window.liveMonitor.markMeasured('respiration');
        }

        // Mise à jour de la feuille de constantes et du moniteur de chevet
        this.updateSurveillanceChart();
    }

    updateSurveillanceChart() {
        const tbody = document.getElementById('chart-table-body');
        if (!tbody) return;

        const v = this.recordedVitals;
        const nowStr = "02:30";

        const tempClass = v.temperature ? PPTX_STANDARDS.temperature.classify(v.temperature) : null;
        const pulseClass = v.pulse ? PPTX_STANDARDS.pulse.classify(v.pulse) : null;
        const respClass = v.respiration ? PPTX_STANDARDS.respiration.classify(v.respiration) : null;
        const bpClass = v.bloodPressure ? PPTX_STANDARDS.bloodPressure.classify(v.bloodPressure.sys, v.bloodPressure.dia) : null;
        const spo2Class = v.spo2 ? PPTX_STANDARDS.spo2.classify(v.spo2) : null;

        tbody.innerHTML = `
            <tr>
                <td><strong>Température</strong></td>
                <td>36,5 - 37,5 °C</td>
                <td><strong class="${tempClass ? tempClass.color : 'text-muted'}">${v.temperature ? v.temperature.toFixed(1).replace('.', ',') + ' °C' : '---'}</strong></td>
                <td>${tempClass ? `<span class="badge-mini ${tempClass.color}">${tempClass.label}</span>` : 'En attente'}</td>
                <td>${v.temperature ? nowStr : '--:--'}</td>
            </tr>
            <tr>
                <td><strong>Pouls (FC)</strong></td>
                <td>60 - 100 bpm</td>
                <td><strong class="${pulseClass ? pulseClass.color : 'text-muted'}">${v.pulse ? v.pulse + ' bpm' : '---'}</strong></td>
                <td>${pulseClass ? `<span class="badge-mini ${pulseClass.color}">${pulseClass.label}</span>` : 'En attente'}</td>
                <td>${v.pulse ? nowStr : '--:--'}</td>
            </tr>
            <tr>
                <td><strong>Fréquence respiratoire</strong></td>
                <td>12 - 20 cpm</td>
                <td><strong class="${respClass ? respClass.color : 'text-muted'}">${v.respiration ? v.respiration + ' cpm' : '---'}</strong></td>
                <td>${respClass ? `<span class="badge-mini ${respClass.color}">${respClass.label}</span>` : 'En attente'}</td>
                <td>${v.respiration ? nowStr : '--:--'}</td>
            </tr>
            <tr>
                <td><strong>Tension artérielle</strong></td>
                <td>~120/80 mmHg</td>
                <td><strong class="${bpClass ? bpClass.color : 'text-muted'}">${v.bloodPressure ? v.bloodPressure.sys + '/' + v.bloodPressure.dia + ' mmHg' : '---'}</strong></td>
                <td>${bpClass ? `<span class="badge-mini ${bpClass.color}">${bpClass.label}</span>` : 'En attente'}</td>
                <td>${v.bloodPressure ? nowStr : '--:--'}</td>
            </tr>
            <tr>
                <td><strong>Saturation SpO₂</strong></td>
                <td>95 - 100 %</td>
                <td><strong class="${spo2Class ? spo2Class.color : 'text-muted'}">${v.spo2 ? v.spo2 + ' %' : '---'}</strong></td>
                <td>${spo2Class ? `<span class="badge-mini ${spo2Class.color}">${spo2Class.label}</span>` : 'En attente'}</td>
                <td>${v.spo2 ? nowStr : '--:--'}</td>
            </tr>
        `;
    }

    checkAllVitalsDone() {
        const allDone = Object.values(this.toolsFinished).every(val => val === true);
        const transmissionCard = document.getElementById('transmission-section-card');
        const allDoneBanner = document.getElementById('all-vitals-ready-alert');

        if (allDone) {
            if (allDoneBanner) allDoneBanner.classList.add('visible');
            if (transmissionCard) {
                transmissionCard.scrollIntoView({ behavior: 'smooth' });
                transmissionCard.classList.add('highlight-ready');
            }
        }
    }

    resetTransmissionForm() {
        const noteInput = document.getElementById('trans-note-input');
        if (noteInput) noteInput.value = '';

        document.querySelectorAll('input[name="alert-level"]').forEach(r => r.checked = false);

        const allDoneBanner = document.getElementById('all-vitals-ready-alert');
        if (allDoneBanner) allDoneBanner.classList.remove('visible');

        const transmissionCard = document.getElementById('transmission-section-card');
        if (transmissionCard) transmissionCard.classList.remove('highlight-ready');
    }

    /**
     * SOUMISSION ET ÉVALUATION CLINIQUE DE LA TRANSMISSION
     * Calcule :
     * 1. Score Technique (outils et constantes)
     * 2. Score Ordre & Asepsie (déduction selon avertissements)
     * 3. Score Alerte & Pertinence clinique (dépistage des anomalies PPTX)
     */
    submitTransmission() {
        window.soundEngine.init();

        const selectedAlertInput = document.querySelector('input[name="alert-level"]:checked');
        const selectedAlert = selectedAlertInput ? selectedAlertInput.value : null;
        const noteText = document.getElementById('trans-note-input')?.value || '';

        if (!selectedAlert) {
            alert("Veuillez sélectionner le niveau d'alerte médicale avant de valider.");
            return;
        }

        if (noteText.trim().length < 15) {
            alert("Veuillez rédiger une note de transmission plus détaillée (données observées, actions menées, alerte).");
            return;
        }

        // CALCUL DU SCORE TECHNIQUE (sur 100)
        // 20 points par constante mesurée
        let vitalsCount = 0;
        if (this.recordedVitals.temperature !== null) vitalsCount++;
        if (this.recordedVitals.pulse !== null) vitalsCount++;
        if (this.recordedVitals.respiration !== null) vitalsCount++;
        if (this.recordedVitals.bloodPressure !== null) vitalsCount++;
        if (this.recordedVitals.spo2 !== null) vitalsCount++;
        const techniqueScore = Math.round((vitalsCount / 5) * 100);

        // CALCUL DU SCORE ORDRE & ASEPSIE (sur 100)
        // Commence à 100, pénalité de 12 points par avertissement
        const orderPenalty = this.orderWarningsCount * 12;
        const orderScore = Math.max(0, 100 - orderPenalty);

        // CALCUL DU SCORE ALERTE & TRANSMISSION (sur 100)
        let alertScore = 0;
        // 1. Justesse du niveau d'alerte (40 pts)
        if (selectedAlert === this.currentCase.idealAlertLevel) {
            alertScore += 40;
        } else if (selectedAlert === 'warning' && this.currentCase.idealAlertLevel === 'danger') {
            alertScore += 15; // Trop prudent
        }

        // 2. Mots-clés et détection des anomalies du cours (40 pts)
        const lowerNote = noteText.toLowerCase();
        let keywordMatches = 0;
        this.currentCase.idealTransmissionKeywords.forEach(kw => {
            if (lowerNote.includes(kw)) {
                keywordMatches++;
            }
        });
        const keywordScore = Math.min(40, keywordMatches * 8);
        alertScore += keywordScore;

        // 3. Structure et professionnalisme (20 pts)
        if (noteText.length >= 80) {
            alertScore += 20;
        } else if (noteText.length >= 40) {
            alertScore += 12;
        }

        // SCORE GLOBAL PONDÉRÉ (sur 100)
        const globalScore = Math.round((techniqueScore * 0.35) + (orderScore * 0.35) + (alertScore * 0.30));

        this.showFinalEvaluation({
            techniqueScore,
            orderScore,
            alertScore,
            globalScore,
            selectedAlert,
            noteText,
            keywordMatches
        });
    }

    showFinalEvaluation(results) {
        const modal = document.getElementById('result-modal');
        if (!modal) return;

        let badgeTitle = '';
        let badgeColor = '';
        let feedbackPraise = '';

        if (results.globalScore >= 85) {
            badgeTitle = 'Infirmier(ère) Expert(e) de Garde';
            badgeColor = 'green';
            feedbackPraise = 'Excellente prise en charge clinique ! Respect remarquable des règles d\'asepsie, chronologie conforme au cours et alerte médicale irréprochable.';
        } else if (results.globalScore >= 70) {
            badgeTitle = 'Soignant(e) Conforme & Vigilant(e)';
            badgeColor = 'orange';
            feedbackPraise = 'Bonne prise en charge globale des constantes vitales. Quelques avertissements d\'ordre ou imprécisions dans la transmission méritent attention.';
        } else {
            badgeTitle = 'Mise à Niveau Clinique Nécessaire';
            badgeColor = 'red';
            feedbackPraise = 'Attention aux règles d\'asepsie et à la chronologie obligatoire des soins. Consultez le référentiel PPTX pour perfectionner vos réflexes de garde.';
        }

        modal.innerHTML = `
            <div class="result-modal-box">
                <div class="result-header">
                    <div class="result-badge-icon ${badgeColor}"><i class="fas fa-award"></i></div>
                    <h3>Bilan Clinique de Garde : ${this.currentCase.patientName}</h3>
                    <p class="result-subtitle">${badgeTitle}</p>
                </div>

                <div class="scores-summary-grid">
                    <div class="score-card global">
                        <span class="score-label">Score Global Pondéré</span>
                        <span class="score-num ${badgeColor}">${results.globalScore} / 100</span>
                    </div>
                    <div class="score-card">
                        <span class="score-label">Technique & Outils</span>
                        <span class="score-num text-blue">${results.techniqueScore}%</span>
                        <small>5 constantes évaluées</small>
                    </div>
                    <div class="score-card">
                        <span class="score-label">Ordre & Asepsie</span>
                        <span class="score-num ${results.orderScore > 75 ? 'text-green' : 'text-orange'}">${results.orderScore}%</span>
                        <small>${this.orderWarningsCount} avertissement(s)</small>
                    </div>
                    <div class="score-card">
                        <span class="score-label">Alerte & Transmission</span>
                        <span class="score-num ${results.alertScore > 75 ? 'text-green' : 'text-orange'}">${results.alertScore}%</span>
                        <small>Précision des alertes</small>
                    </div>
                </div>

                <div class="feedback-detail-card">
                    <h4><i class="fas fa-stethoscope"></i> Analyse Clinique & Recommandations (Source PPTX)</h4>
                    <p class="general-praise">${feedbackPraise}</p>

                    <div class="pptx-citations-box">
                        <h5>Références précises du cours PPTX :</h5>
                        <ul>
                            <li><strong>Niveau d'Alerte :</strong> ${this.currentCase.feedbackRecommendations.alertLevel}</li>
                            <li><strong>Actions Infirmières Recommandées :</strong> ${this.currentCase.feedbackRecommendations.clinicalActions}</li>
                            <li><strong>Slides Associées :</strong> ${this.currentCase.feedbackRecommendations.pptxReferences}</li>
                        </ul>
                    </div>

                    ${this.warningLog.length > 0 ? `
                        <div class="warnings-history-box">
                            <h5><i class="fas fa-history"></i> Rappel des manquements à la chronologie (${this.warningLog.length}) :</h5>
                            <ul>
                                ${this.warningLog.map(w => `
                                    <li><strong>${w.time} (${w.tool}) :</strong> Tentative de « ${w.attempted} ». Règle PPTX : « ${w.pptxRef} ».</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : '<div class="zero-warning-banner"><i class="fas fa-shield-alt text-green"></i> <strong>Parfait !</strong> Aucun avertissement de chronologie : ordre scrupuleusement respecté !</div>'}
                </div>

                <div class="result-actions-row">
                    <button class="modal-btn secondary" id="btn-replay-case"><i class="fas fa-redo"></i> Rejouer ce cas</button>
                    <button class="modal-btn primary" id="btn-next-case"><i class="fas fa-arrow-right"></i> Passer au cas suivant</button>
                </div>
            </div>
        `;

        modal.classList.add('active');

        document.getElementById('btn-replay-case').addEventListener('click', () => {
            this.loadCase(this.currentCaseIndex);
        });
        document.getElementById('btn-next-case').addEventListener('click', () => {
            const nextIndex = (this.currentCaseIndex + 1) % CLINICAL_CASES.length;
            this.loadCase(nextIndex);
        });
    }

    hideResultModal() {
        const modal = document.getElementById('result-modal');
        if (modal) modal.classList.remove('active');
    }

    bindEvents() {
        // Sélection des onglets de cas
        document.querySelectorAll('.case-tab-btn').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                this.loadCase(idx);
            });
        });

        // Fermer le modal de procédure
        document.getElementById('close-proc-modal-btn')?.addEventListener('click', () => {
            this.closeProcedureModal();
        });

        // Soumettre la transmission
        document.getElementById('btn-submit-transmission')?.addEventListener('click', () => {
            this.submitTransmission();
        });

        // Toggle Audio Mute
        document.getElementById('btn-toggle-sound')?.addEventListener('click', () => {
            const muted = window.soundEngine.toggleMute();
            const btn = document.getElementById('btn-toggle-sound');
            if (btn) {
                btn.innerHTML = muted ? '<i class="fas fa-volume-mute"></i> Son : Muet' : '<i class="fas fa-volume-up"></i> Son : Activé';
                btn.classList.toggle('muted', muted);
            }
        });

        // Référentiel PPTX Modal
        const refModal = document.getElementById('pptx-ref-modal');
        document.getElementById('btn-open-pptx-ref')?.addEventListener('click', () => {
            if (refModal) refModal.classList.add('active');
        });
        document.getElementById('btn-close-pptx-ref')?.addEventListener('click', () => {
            if (refModal) refModal.classList.remove('active');
        });
    }
}

window.clinicalSimulator = new ClinicalSimulator();
