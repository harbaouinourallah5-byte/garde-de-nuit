/**
 * GARDE DE NUIT - Cas Cliniques & Référentiel Pédagogique
 * Basé EXCLUSIVEMENT sur la présentation PPTX "Les signes vitaux / Les constantes vitales".
 */

const PPTX_STANDARDS = {
    temperature: {
        name: "Température corporelle",
        unit: "°C",
        slide: 5,
        definition: "Degré de chaleur produit et conservé par le corps humain, régulé par l'hypothalamus.",
        normalMin: 36.5,
        normalMax: 37.5,
        feverThreshold: 38.0,
        hypothermiaThreshold: 35.0,
        classify: (val) => {
            if (val >= 38.0) return { status: 'danger', label: 'Fièvre / Hyperthermie', color: 'red', slide: 5 };
            if (val < 35.0) return { status: 'danger', label: 'Hypothermie', color: 'red', slide: 5 };
            if (val > 37.5 && val < 38.0) return { status: 'warning', label: 'Subfébrile / À surveiller', color: 'orange', slide: 5 };
            return { status: 'normal', label: 'Normale (36,5 à 37,5 °C)', color: 'green', slide: 5 };
        }
    },
    pulse: {
        name: "Pouls (Fréquence cardiaque)",
        unit: "bpm",
        slide: 11,
        definition: "Perception des battements cardiaques au niveau d'une artère superficielle.",
        normalMin: 60,
        normalMax: 100,
        tachycardiaThreshold: 100,
        bradycardiaThreshold: 60,
        classify: (val, isChild = false) => {
            // Selon slide 11 : normal adulte 60 à 100 bpm. Plus de 100 = tachycardie, moins de 60 = bradycardie.
            // Pour l'enfant de 8 ans dans le cas, 120 bpm est fébrile et tachycarde.
            if (val > 100) return { status: 'danger', label: 'Tachycardie (> 100 bpm)', color: 'red', slide: 11 };
            if (val < 60) return { status: 'danger', label: 'Bradycardie (< 60 bpm)', color: 'red', slide: 11 };
            return { status: 'normal', label: 'Normal (60 à 100 bpm)', color: 'green', slide: 11 };
        }
    },
    respiration: {
        name: "Fréquence respiratoire",
        unit: "cycles/min",
        slide: 15,
        definition: "Nombre de cycles respiratoires (inspiration + expiration) effectués en une minute.",
        normalMin: 12,
        normalMax: 20,
        classify: (val) => {
            if (val > 20) return { status: 'danger', label: 'Tachypnée / Polypnée (> 20 cpm)', color: 'red', slide: 15 };
            if (val < 12) return { status: 'danger', label: 'Bradypnée (< 12 cpm)', color: 'red', slide: 15 };
            return { status: 'normal', label: 'Normale (12 à 20 cycles/min)', color: 'green', slide: 15 };
        }
    },
    bloodPressure: {
        name: "Tension artérielle",
        unit: "mmHg",
        slide: 18,
        definition: "Pression exercée par le sang sur la paroi des artères (systolique / diastolique).",
        reference: "120/80 mmHg",
        classify: (sys, dia) => {
            if (sys >= 140 || dia >= 90) return { status: 'danger', label: 'Hypertension artérielle', color: 'red', slide: 19 };
            if (sys < 90 || dia < 60) return { status: 'danger', label: 'Hypotension artérielle (< 90/60)', color: 'red', slide: 19 };
            if (sys > 125 || dia > 82) return { status: 'warning', label: 'Normale haute', color: 'orange', slide: 18 };
            return { status: 'normal', label: 'Normale (réf. ~120/80 mmHg)', color: 'green', slide: 18 };
        }
    },
    spo2: {
        name: "Saturation en oxygène (SpO₂)",
        unit: "%",
        slide: 23,
        definition: "Pourcentage d'hémoglobine dans le sang qui transporte de l'oxygène.",
        classify: (val) => {
            if (val >= 95) return { status: 'normal', label: 'Normal (95 à 100 %)', color: 'green', slide: 23 };
            if (val >= 92 && val <= 94) return { status: 'warning', label: 'Valeur basse à évaluer (92 à 94 %)', color: 'orange', slide: 23 };
            if (val === 91) return { status: 'danger', label: 'Valeur basse critique post-op (91 %)', color: 'red', slide: 23 };
            return { status: 'danger', label: 'Hypoxémie importante (< 90 %)', color: 'red', slide: 23 };
        }
    }
};

const CLINICAL_TOOLS = [
    {
        id: "thermometer",
        name: "Thermomètre",
        fullName: "Thermomètre électronique / infrarouge",
        icon: "fa-thermometer-half",
        targetConstante: "temperature",
        pptxEquipmentSlide: 7,
        pptxProcedureSlide: 8,
        equipment: ["Thermomètre électronique ou infrarouge", "Solution désinfectante / compresses", "Gants à usage unique si nécessaire"],
        description: "Mesure de la température corporelle centrale (tympanique, axillaire ou frontale)."
    },
    {
        id: "blood_pressure",
        name: "Tensiomètre + Stéthoscope",
        fullName: "Tensiomètre manuel & Stéthoscope",
        icon: "fa-heartbeat",
        targetConstante: "bloodPressure",
        pptxEquipmentSlide: 20,
        pptxProcedureSlide: 21,
        equipment: ["Tensiomètre avec manomètre", "Brassard adapté à la morphologie du bras", "Stéthoscope pour auscultation"],
        description: "Mesure auscultatoire de la pression artérielle systolique et diastolique."
    },
    {
        id: "oxymeter",
        name: "Oxymètre de pouls",
        fullName: "Oxymètre de pouls (Saturomètre)",
        icon: "fa-fingerprint",
        targetConstante: "spo2",
        pptxEquipmentSlide: 24,
        pptxProcedureSlide: 25,
        equipment: ["Oxymètre de pouls digital", "Compresses désinfectantes"],
        description: "Mesure transcutanée de la saturation pulsée en oxygène et du pouls."
    },
    {
        id: "pulse_hand",
        name: "Main pour le pouls",
        fullName: "Palpation manuelle du pouls radial",
        icon: "fa-hand-paper",
        targetConstante: "pulse",
        pptxEquipmentSlide: 12,
        pptxProcedureSlide: 13,
        equipment: ["Mains propres désinfectées", "Pulpe des index, majeur et annulaire"],
        description: "Palpation de l'artère radiale au poignet, comptage de la fréquence et évaluation du rythme."
    },
    {
        id: "watch_respiration",
        name: "Montre pour la fréquence respiratoire",
        fullName: "Montre trotteuse / Chronomètre respiratoire",
        icon: "fa-stopwatch",
        targetConstante: "respiration",
        pptxEquipmentSlide: 14,
        pptxProcedureSlide: 16,
        equipment: ["Montre avec trotteuse ou chronomètre", "Regard attentif sur les mouvements thoraciques"],
        description: "Comptage des cycles respiratoires (inspiration + expiration) pendant 1 minute complète."
    }
];

const STANDARD_STEPS = [
    {
        id: "wash",
        order: 1,
        title: "1. Hygiène des mains",
        actionText: "Réaliser une friction hydro-alcoolique (ou lavage des mains)",
        pptxRule: "Slide 8 / 21 : Se laver les mains avant tout contact soignant.",
        dialogue: "L'infirmier(ère) désinfecte soigneusement ses mains par friction avec la solution hydro-alcoolique.",
        icon: "fa-hands-wash"
    },
    {
        id: "explain",
        order: 2,
        title: "2. Explication au patient",
        actionText: "Expliquer le soin au patient et vérifier son identité",
        pptxRule: "Slide 8 / 21 : Expliquer le soin au patient pour le rassurer et obtenir sa coopération.",
        dialogue: "L'infirmier(ère) salue le patient, se présente et lui explique le déroulement de la mesure.",
        icon: "fa-comments"
    },
    {
        id: "position",
        order: 3,
        title: "3. Installation & Positionnement",
        actionText: "Installer le patient confortablement au repos et positionner le membre",
        pptxRule: "Slide 8 / 16 / 21 / 25 : Installer le patient au repos (5 min pour la TA), dos soutenu, bras à hauteur du cœur.",
        dialogue: "Le patient est confortablement calé dans le lit. Le site de mesure est préparé et dégagé.",
        icon: "fa-bed"
    },
    {
        id: "measure",
        order: 4,
        title: "4. Mise en place & Mesure",
        actionText: "Placer l'instrument de mesure et déclencher la procédure",
        pptxRule: "Slide 8 / 16 / 21 / 25 : Placer selon la méthode choisie et effectuer la mesure selon les règles de l'art.",
        dialogue: "La mesure commence. Observation attentive des signaux et du comportement du patient.",
        icon: "fa-wave-square"
    },
    {
        id: "read",
        order: 5,
        title: "5. Lecture du résultat",
        actionText: "Lire attentivement la valeur affichée et analyser les chiffres",
        pptxRule: "Slide 8 / 21 / 25 : Attendre le signal sonore / stabilisation et lire les valeurs.",
        dialogue: "La valeur est relevée avec précision sur le dispositif médical.",
        icon: "fa-glasses"
    },
    {
        id: "note",
        order: 6,
        title: "6. Noter sur la feuille",
        actionText: "Consigner le résultat sur la feuille de surveillance du dossier de soins",
        pptxRule: "Slide 8 / 16 / 21 / 25 : Noter immédiatement le résultat pour assurer la traçabilité des soins.",
        dialogue: "La constante est retranscrite sur la feuille d'observation et transmise au moniteur.",
        icon: "fa-clipboard-check"
    },
    {
        id: "disinfect",
        order: 7,
        title: "7. Retrait & Désinfection",
        actionText: "Retirer le matériel, le désinfecter et se désinfecter les mains",
        pptxRule: "Slide 8 : Désinfecter le matériel et se laver les mains après le soin.",
        dialogue: "Le matériel est décontaminé avec une compresse imprégnée d'antiseptique. Friction finale des mains.",
        icon: "fa-spray-can"
    }
];

const CLINICAL_CASES = [
    {
        id: 1,
        title: "Cas 1 : Pédiatrie — Léo (8 ans)",
        patientName: "Léo Mercier",
        age: "8 ans",
        service: "Pédiatrie de Garde - Chambre 204",
        context: "Léo, 8 ans, est hospitalisé depuis l'après-midi pour syndrome fébrile aigu. En pleine nuit, sa mère appelle car il est frissonnant, chaud au toucher, apathique et se plaint de courbatures.",
        patientAvatar: "child",
        patientExpression: "Visage rougeaud, cernes fébriles, frissons visibles sous la couverture.",
        patientDialogueInit: "Bonjour l'infirmier(ère)... J'ai super froid et chaud en même temps... ma tête tape...",
        patientDialogueExplain: "D'accord... vous allez prendre ma température ? Ça ne fait pas mal ?",
        patientDialogueDisinfect: "Merci beaucoup... J'espère que je vais pouvoir me rendormir.",
        constants: {
            temperature: 38.8,
            pulse: 120,
            respiration: 22,
            bloodPressure: { sys: 100, dia: 65, text: "100/65" },
            spo2: 98
        },
        primaryAlerts: [
            "Fièvre élevée à 38,8 °C (Slide 5 : Fièvre à partir de 38 °C)",
            "Tachycardie à 120 bpm (Slide 11 : Tachycardie si > 100 bpm, réactionnelle à la fièvre)"
        ],
        secondaryObservations: [
            "Fréquence respiratoire à 22 cpm (légère tachypnée réactionnelle)",
            "Saturation SpO₂ normale à 98 % (Slide 23 : 95 à 100 % normal)",
            "Tension artérielle adaptée à 100/65 mmHg"
        ],
        idealAlertLevel: "danger", // Rouge
        idealTransmissionKeywords: [
            "fièvre", "température", "38", "38,8", "tachycardie", "120",
            "paracétamol", "antipyrétique", "pédiatre", "médecin", "découvrir",
            "hydrater", "boisson", "surveillance", "frissons"
        ],
        feedbackRecommendations: {
            alertLevel: "Une alerte rouge est requise car la température atteint 38,8 °C (fièvre élevée / hyperthermie selon le Slide 5) associée à une tachycardie à 120 bpm (Slide 11).",
            clinicalActions: "Actions infirmières prioritaires : Prévenir le médecin de garde / pédiatre, découvrir raisonnablement l'enfant sans le faire grelotter, proposer à boire pour éviter la déshydratation (Slide 9), administrer l'antipyrétique prescrit (paracétamol) et réévaluer la température après 45 minutes.",
            pptxReferences: "Slide 5 (Fièvre ≥ 38 °C), Slide 9 (Causes de variation : infections, déshydratation), Slide 11 (Tachycardie > 100 bpm)."
        }
    },
    {
        id: 2,
        title: "Cas 2 : Médecine Interne — M. Robert (74 ans)",
        patientName: "Robert Dupont",
        age: "74 ans",
        service: "Médecine Interne - Chambre 112",
        context: "M. Dupont, 74 ans, suivi pour cardiopathie, sonne à 02h15 pour des céphalées occipitales pulsatiles en étau apparues subitement, accompagnées d'acouphènes et de légers vertiges.",
        patientAvatar: "elderly",
        patientExpression: "Visage crispé, main portée sur la nuque, regard anxieux, respiration calme.",
        patientDialogueInit: "Bonsoir... J'ai la tête qui va exploser et des bourdonnements d'oreilles insupportables...",
        patientDialogueExplain: "Faites, je vous en prie... Prenez ma tension, je sens que mon cœur cogne fort dans mes tempes.",
        patientDialogueDisinfect: "Merci pour votre calme... Qu'est-ce que donne ma tension ?",
        constants: {
            temperature: 36.8,
            pulse: 88,
            respiration: 16,
            bloodPressure: { sys: 165, dia: 100, text: "165/100" },
            spo2: 96
        },
        primaryAlerts: [
            "Hypertension artérielle sévère à 165/100 mmHg (Slide 18 & 19 : Pression très supérieure à la référence 120/80 mmHg)",
            "Céphalées pulsatiles et acouphènes (signes de retentissement neuro-sensoriel)"
        ],
        secondaryObservations: [
            "Pouls normal à 88 bpm (Slide 11 : Normal entre 60 et 100 bpm)",
            "Température normale à 36,8 °C (Slide 5 : 36,5 à 37,5 °C)",
            "Fréquence respiratoire normale à 16 cpm (Slide 15 : 12 à 20 cpm)",
            "Saturation SpO₂ normale à 96 % (Slide 23 : 95 à 100 %)"
        ],
        idealAlertLevel: "danger", // Rouge
        idealTransmissionKeywords: [
            "hypertension", "pression", "tension", "165", "100", "165/100",
            "céphalée", "vertige", "acouphène", "médecin", "repos",
            "antihypertenseur", "surveillance", "traitement", "neurologique"
        ],
        feedbackRecommendations: {
            alertLevel: "Une alerte rouge s'impose en raison d'une poussée hypertensive sévère à 165/100 mmHg (Slide 19) symptomatique (céphalées, acouphènes).",
            clinicalActions: "Actions infirmières prioritaires : Maintenir le patient au repos strict au lit en position demi-assise, le réassurer, appeler immédiatement le médecin de garde pour prescription d'un traitement antihypertenseur d'action rapide, vérifier l'absence de déficit neurologique et renouveler la mesure de la TA.",
            pptxReferences: "Slide 18 (Valeur normale de référence ~120/80 mmHg), Slide 19 (Hypertension artérielle : élévation persistante), Slide 21 (Technique de mesure au repos 5 min, bras à hauteur du cœur)."
        }
    },
    {
        id: 3,
        title: "Cas 3 : Surveillance Post-Opératoire — Mme Sylvie (52 ans)",
        patientName: "Sylvie Martin",
        age: "52 ans",
        service: "Chirurgie Digestive J1 - Chambre 308",
        context: "Mme Martin a subi une laparotomie abdominale hier sous anesthésie générale. Lors de la ronde de 03h00, vous la trouvez somnolente, encombrée, avec des battements d'ailes du nez et une respiration rapide superficielle.",
        patientAvatar: "postop",
        patientExpression: "Teint cireux, lèvres légèrement cyanosées, tirage intercostal modéré, pansement abdominal en place.",
        patientDialogueInit: "J'ai... un peu de mal... à reprendre mon souffle... et mal au ventre quand je respire...",
        patientDialogueExplain: "D'accord... aidez-moi... j'ai l'impression d'étouffer un peu...",
        patientDialogueDisinfect: "Merci... Je me sens déjà un peu plus rassurée avec vous...",
        constants: {
            temperature: 37.1,
            pulse: 104,
            respiration: 24,
            bloodPressure: { sys: 118, dia: 75, text: "118/75" },
            spo2: 91
        },
        primaryAlerts: [
            "Désaturation / Hypoxémie à 91 % (Slide 23 : Moins de 92-94 % est bas, 91 % nécessite une évaluation urgente)",
            "Polypnée / Tachypnée à 24 cycles/min (Slide 15 : Normal adulte 12 à 20 cpm, ici > 20 cpm)",
            "Tachycardie modérée à 104 bpm (Slide 11 : > 100 bpm, compensation de l'hypoxémie)"
        ],
        secondaryObservations: [
            "Tension artérielle normale à 118/75 mmHg (Slide 18)",
            "Température normale à 37,1 °C (Slide 5 : 36,5 à 37,5 °C)"
        ],
        idealAlertLevel: "danger", // Rouge
        idealTransmissionKeywords: [
            "saturation", "spo2", "91", "hypoxie", "hypoxémie", "désaturation",
            "fréquence", "respiratoire", "24", "tachypnée", "polypnée",
            "oxygène", "o2", "demi-assise", "redresser", "médecin", "chirurgien",
            "réanimation", "tachycardie", "104", "douleur", "analgésie"
        ],
        feedbackRecommendations: {
            alertLevel: "Une alerte rouge est impérative car la SpO₂ est effondrée à 91 % (Slide 23 : valeur critique nécessitant une prise en charge urgente) et la fréquence respiratoire est à 24 cpm (Slide 15 : tachypnée > 20 cpm).",
            clinicalActions: "Actions infirmières prioritaires : Redresser immédiatement la tête du lit à 45° (position demi-assise) pour libérer la mécanique diaphragmatique, mettre en place une oxygénothérapie aux lunettes selon protocole de service, stimuler la toux et l'inspiration profonde, alerter le médecin anesthésiste/chirurgien de garde sans délai.",
            pptxReferences: "Slide 23 (SpO₂ : 92-94% basse, <90% hypoxémie importante), Slide 15 (FR normale 12-20 cycles/min), Slide 11 (Tachycardie réactionnelle > 100 bpm)."
        }
    }
];

window.PPTX_STANDARDS = PPTX_STANDARDS;
window.CLINICAL_TOOLS = CLINICAL_TOOLS;
window.STANDARD_STEPS = STANDARD_STEPS;
window.CLINICAL_CASES = CLINICAL_CASES;
