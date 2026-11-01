/**
 * GARDE DE NUIT - Point d'entrée principal (Bootstrap)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialisation du moniteur multiparamétrique
    if (window.liveMonitor) {
        window.liveMonitor.init();
    }

    // Initialisation du simulateur clinique
    if (window.clinicalSimulator) {
        window.clinicalSimulator.init();
    }

    // Déclenchement de l'AudioContext sur la première interaction de l'utilisateur
    const unlockAudio = () => {
        if (window.soundEngine) {
            window.soundEngine.init();
        }
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    console.log("Garde de Nuit initialisée avec succès. Référentiel PPTX chargé.");
});
