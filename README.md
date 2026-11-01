# Garde de nuit 🩺

> **Simulateur de constantes vitales & soins infirmiers en milieu hospitalier**

Application web monopage (SPA) immersive pour la formation et l'entraînement aux constantes vitales infirmières. Le joueur incarne un(e) infirmier(ère) de nuit prenant en charge un patient virtuel dans son lit d'hôpital.

Ce projet s'appuie **exclusivement** sur le référentiel pédagogique issu du cours de référence (*Les signes vitaux / Les constantes vitales*).

---

## 🏥 Fonctionnalités & Spécifications

### 1. 3 Cas Cliniques Réalistes
- **Cas 1 : Pédiatrie — Léo (8 ans)**
  - *Constantes :* Température 38,8 °C (Fièvre / Hyperthermie - Slide 5), Pouls 120 bpm (Tachycardie - Slide 11), FR 22 cpm, TA 100/65 mmHg, SpO₂ 98 %.
- **Cas 2 : Médecine Interne — M. Robert (74 ans)**
  - *Constantes :* TA 165/100 mmHg (Hypertension artérielle sévère - Slide 18 & 19), Pouls 88 bpm (Normal 60-100 bpm), T° 36,8 °C, FR 16 cpm, SpO₂ 96 %.
- **Cas 3 : Surveillance Post-Opératoire — Mme Sylvie (52 ans)**
  - *Constantes :* SpO₂ 91 % (Hypoxémie critique - Slide 23), FR 24 cpm (Tachypnée / Polypnée - Slide 15), Pouls 104 bpm (Tachycardie réactionnelle - Slide 11), TA 118/75 mmHg, T° 37,1 °C.

### 2. Chariot de Soins & 5 Outils Réglementaires
- **Thermomètre médical** (Slide 7 & 8)
- **Tensiomètre manuel + Stéthoscope** (Slide 20 & 21)
- **Oxymètre de pouls digital** (Slide 24 & 25)
- **Main pour le pouls radial** (Slide 12 & 13)
- **Montre pour la fréquence respiratoire** (Slide 14 & 16)

### 3. Chronologie Procédurale Obligatoire & Moteur d'Avertissements
Chaque soin exige le respect strict de la séquence clinique :
1. **Hygiène des mains** (Friction hydro-alcoolique)
2. **Explication au patient** (Information et recueil de coopération)
3. **Installation & Positionnement** (Patient au repos, dos soutenu, bras à hauteur du cœur)
4. **Mise en place & Mesure active** (Minijeu interactif : gonflage brassard, auscultation des bruits de Korotkoff, scan thermique, pléthysmographie, chronométrage)
5. **Lecture du résultat**
6. **Retrait & Désinfection** (Décontamination du matériel réutilisable)
7. **Noter sur la feuille de surveillance**

⚠️ *Toute tentative d'étape hors-séquence déclenche un avertissement immédiat avec rappel de la règle du cours et pénalité sur le score d'ordre et d'asepsie.*

### 4. Moniteur Multiparamétrique en Direct (Scope)
- **Tracé ECG en direct (Canvas)** : Balayage P-QRS-T vert néon synchronisé sur la fréquence cardiaque du patient.
- **Tracé respiratoire en direct (Canvas)** : Courbe capnographique cyan synchronisée sur la FR.
- **Visualisation dynamique du patient** : Le thorax du patient dans le lit respire à la vitesse exacte de sa fréquence respiratoire.
- **Codes couleur stricts du cours PPTX** :
  - 🟢 **Vert (Normal)** : T° 36,5–37,5 °C | Pouls 60–100 bpm | FR 12–20 cpm | TA ~120/80 | SpO₂ 95–100 %
  - 🟠 **Orange (Borderline / À surveiller)** : SpO₂ 92–94 % (Slide 23)
  - 🔴 **Rouge (Abnormal / Alerte)** : Fièvre ≥ 38 °C, Tachycardie > 100 bpm, HTA, Tachypnée > 20 cpm, Hypoxémie ≤ 91 %
- **Moteur Audio Web Audio API** : Bips du scope indexés sur la SpO₂, bruits de Korotkoff au stéthoscope, pschitt de décompression, friction SHA, trotteuse (avec bouton muet).

### 5. Transmission Infirmière & Évaluation Clinique
- Sélection du niveau d'alerte : 🟢 Vert (Stable), 🟠 Orange (Surveillance), 🔴 Rouge (Alerte médicale d'urgence).
- Rédaction libre de la note de transmission (Données, Actions, Résultats).
- Calcul automatique des scores :
  - **Technique & Outils** (sur 100)
  - **Ordre & Asepsie** (sur 100)
  - **Alerte & Transmission** (sur 100)
  - **Score Global Pondéré** avec mention et feedback détaillé citant les diapositives exactes du PPTX.

---

## 🎨 Style Visuel
- Look hospitalier épuré (*Clean Hospital Look*).
- Palette bleue (`#0284c7`, `#0f172a`, `#e0f2fe`) et orange (`#f97316`, `#ea580c`).
- Aucun QCM / quiz : 100% axé sur la simulation pratique et le raisonnement clinique.

---

## 🚀 Utilisation
Aucune installation de dépendance requise :
1. Ouvrez simplement `index.html` dans n'importe quel navigateur moderne (Chrome, Firefox, Edge, Safari).
2. Activez le son si souhaité grâce au bouton en haut à droite.
3. Sélectionnez un cas clinique et débutez la prise en charge !
