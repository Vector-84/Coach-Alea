/* créer mes variables et constantes */
const bouton = document.getElementById("dice");
const boutonChrono = document.getElementById("chrono");
const boutonPause = document.getElementById("pause-chrono");
const boutonReset = document.getElementById("reset-chrono");
const resultat = document.getElementById("resultat");
const nombreExercices = 5;

let chronoEnCours = false;
let chronoEnPause = false;
let chronoAnnule = false;
let tirageCourant = [];
let contexteAudio = null;

/* Déclarer la liste d'exercices */
const exercices = [
    "Pompes",
    "Sit-up",
    "Squats",
    "Fentes",
    "Montain-climber",
    "Planche",
    "Burpees",
    "Chandelle",
    "Pompes-diamants"
]

function attendre(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initialiserAudio() {
    if (!contexteAudio) {
        contexteAudio = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (contexteAudio.state === "suspended") {
        await contexteAudio.resume();
    }

    return contexteAudio;
}

async function bip(duree = 160, frequence = 880, volume = 0.08) {
    const contexte = await initialiserAudio();
    const oscillateur = contexte.createOscillator();
    const gain = contexte.createGain();

    oscillateur.type = "sine";
    oscillateur.frequency.value = frequence;
    gain.gain.value = volume;

    oscillateur.connect(gain);
    gain.connect(contexte.destination);

    oscillateur.start();
    oscillateur.stop(contexte.currentTime + duree / 1000);

    return new Promise((resolve) => {
        oscillateur.onended = () => {
            resolve();
        };
    });
}

async function klaxon() {
    await bip(180, 880, 0.08);
}

async function serieBips(nombre) {
    for (let i = 0; i < nombre; i++) {
        await bip();
        if (i < nombre - 1) {
            await attendre(180);
        }
    }
}

/* Fonction pour tirer au hasard 5 exercices */
function jet(nb) {
    const tirage = [];
    while (tirage.length < nb) {
        const alea = exercices[Math.floor(Math.random() * exercices.length)];
        if (!tirage.includes(alea)) {
            tirage.push(alea);
        }
    }
    return tirage;
}

/* Afficher les exercices dans le container */
function afficherListeExos(tirage) {
    resultat.innerHTML = "";

    tirage.forEach((exo, i) => {
        const p = document.createElement("p");
        p.textContent = `${i + 1}. ${exo}`;
        resultat.appendChild(p);
    });

    const chrono = document.createElement("p");
    chrono.id = "chrono-affichage";
    chrono.textContent = "Chrono prêt";
    resultat.appendChild(chrono);
}

function afficherStatut(message) {
    let statut = document.getElementById("chrono-affichage");

    if (!statut) {
        statut = document.createElement("p");
        statut.id = "chrono-affichage";
        resultat.appendChild(statut);
    }

    statut.textContent = message;
}

function afficherChronoZero() {
    afficherStatut("0s");
}

function activerControlesChrono(activer) {
    boutonPause.disabled = !activer;
    boutonReset.disabled = !activer;
}

function reinitialiserChrono() {
    chronoEnCours = false;
    chronoEnPause = false;
    bouton.disabled = false;
    boutonChrono.disabled = tirageCourant.length === 0;
    boutonChrono.textContent = "Lancer le chrono";
    boutonPause.textContent = "Pause";
    activerControlesChrono(false);
    afficherChronoZero();
}

async function attendreAvecControle(ms) {
    const fin = Date.now() + ms;

    while (Date.now() < fin) {
        if (chronoAnnule) {
            return false;
        }

        while (chronoEnPause) {
            if (chronoAnnule) {
                return false;
            }

            await attendre(120);
        }

        const restant = fin - Date.now();
        await attendre(Math.min(200, Math.max(50, restant)));
    }

    return !chronoAnnule;
}

async function decompteVisible(secondes, messageBase) {
    for (let restant = secondes; restant > 0; restant--) {
        afficherStatut(`${messageBase} ${restant}s`);
        const continuer = await attendreAvecControle(1000);

        if (!continuer) {
            return false;
        }
    }

    return true;
}

async function lancerChrono(tirage) {
    chronoEnCours = true;
    chronoEnPause = false;
    chronoAnnule = false;
    bouton.disabled = true;
    boutonChrono.disabled = true;
    boutonChrono.textContent = "Chrono en cours...";
    boutonPause.textContent = "Pause";
    activerControlesChrono(true);

    for (let index = 0; index < tirage.length; index++) {
        const exercice = tirage[index];

        await klaxon();
        const exerciceTermine = await decompteVisible(45, `Exercice ${index + 1}/${tirage.length} : ${exercice} - travail restant`);

        if (!exerciceTermine || chronoAnnule) {
            reinitialiserChrono();
            return;
        }

        if (index < tirage.length - 1) {
            await serieBips(2);
            const reposTermine = await decompteVisible(15, `Repos avant l'exercice suivant -`);

            if (!reposTermine || chronoAnnule) {
                reinitialiserChrono();
                return;
            }
        }
    }

    afficherStatut("Fin de séance");
    await serieBips(3);

    bouton.disabled = false;
    boutonChrono.disabled = false;
    boutonChrono.textContent = "Lancer le chrono";
    activerControlesChrono(false);
    chronoEnCours = false;
}

/* Tirer les exercices au clic sur le bouton */
bouton.addEventListener("click", async () => {
    tirageCourant = jet(nombreExercices);
    afficherListeExos(tirageCourant);
    boutonChrono.disabled = false;
    afficherChronoZero();
    activerControlesChrono(false);
});

/* Lancer le chrono sur le tirage actuel */
boutonChrono.addEventListener("click", async () => {
    if (chronoEnCours || tirageCourant.length === 0) {
        return;
    }

    try {
        await lancerChrono(tirageCourant);
    } catch (error) {
        console.error(error);
        afficherStatut("Une erreur a interrompu le chrono.");
        bouton.disabled = false;
        boutonChrono.disabled = false;
        boutonChrono.textContent = "Lancer le chrono";
        chronoEnCours = false;
    }
});

boutonPause.addEventListener("click", () => {
    if (!chronoEnCours) {
        return;
    }

    chronoEnPause = !chronoEnPause;
    boutonPause.textContent = chronoEnPause ? "Reprendre" : "Pause";
    afficherStatut(chronoEnPause ? "Chrono en pause" : "Chrono repris");
});

boutonReset.addEventListener("click", () => {
    if (!chronoEnCours && tirageCourant.length === 0) {
        return;
    }

    chronoAnnule = true;
    chronoEnPause = false;
    reinitialiserChrono();
});

if (
    "serviceWorker" in navigator &&
    (location.protocol === "https:" || location.hostname === "localhost")
) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch((error) => {
            console.error("Service worker registration failed:", error);
        });
    });
}

