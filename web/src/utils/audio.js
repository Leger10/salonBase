// /src/utils/audio.js
export const playSound = (soundName) => {
  try {
    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.volume = 0.3;

    // Ajouter un timeout pour éviter les erreurs
    const timeout = setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 5000);

    audio
      .play()
      .then(() => {
        clearTimeout(timeout);
      })
      .catch(() => {
        clearTimeout(timeout);
        // Silencieux si le fichier n'existe pas
      });
  } catch (error) {
    // Ignorer les erreurs audio
  }
};

// Exemple d'utilisation :
// import { playSound } from '@/utils/audio';
//
// Dans votre composant
// playSound('success');
