// script.js

// Variables globales para almacenar las rutinas
let routines = {}; // Se llenará dinámicamente con los datos de cada JSON
let selectedRoutine = null;
let selectedRoutineId = '';
let currentRoutine = [];
let currentExerciseIndex = 0;
let timerInterval = null;
let timeLeft = 0;
let isRest = false;
let exerciseImageInterval = null;
let currentImageIndex = 0;

// Si fuera necesario ajustar la ruta base para las imágenes, podrías usar:
const imageBasePath = ""; // Ej: "../" si la carpeta de imágenes está fuera del nivel actual

// Al cargar la página, obtenemos el manifiesto y cargamos cada rutina
window.onload = function () {
  fetch('routines/manifest.json')
    .then(response => response.json())
    .then(manifest => {
      manifest.forEach((routineFile) => {
        fetch('routines/' + routineFile)
          .then(response => response.json())
          .then(data => {
            // Usamos el nombre del archivo (sin extensión) como id
            let routineId = routineFile.replace('.json', '');
            routines[routineId] = data;
            // Crear el elemento HTML de la rutina
            let routineItem = document.createElement('div');
            routineItem.classList.add('routine-item');
            routineItem.onclick = function () {
              selectRoutine(routineId);
            };

            let img = document.createElement('img');
            // Si es necesario ajustar la ruta de la imagen, concatenar imageBasePath + data.image
            img.src = imageBasePath + data.image;
            img.alt = `Rutina ${data.total_time / 60} min`;

            let p = document.createElement('p');
            p.textContent = data.routine;

            routineItem.appendChild(img);
            routineItem.appendChild(p);
            document.getElementById('routineList').appendChild(routineItem);
          })
          .catch(error => console.error('Error al cargar la rutina:', error));
      });
    })
    .catch(error => console.error('Error al cargar el manifest:', error));
};

// Función para mostrar una sección y ocultar las demás
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(sectionId).classList.add('active');
  if (sectionId === 'activitySection') {
    updateActivityStats();
  }
}

function playExerciseAudio(exercise) {
  if (exercise.audio) {
    const exerciseAudio = document.getElementById('exerciseAudio');
    // Establecer la ruta completa: carpeta 'audios/exercises/' + nombre del archivo definido en el JSON
    exerciseAudio.src = "audios/exercises/" + exercise.audio;
    exerciseAudio.loop = false; // Se reproduce solo una vez
    exerciseAudio.play().catch(error => {
      console.error("Error al reproducir el audio de instrucciones:", error);
    });
  }
}

function playTickTock() {
  const tickTockSound = document.getElementById("tickTockSound");
  if (tickTockSound) {
    tickTockSound.volume = 0.20;
    tickTockSound.play().catch(error => {
      console.error("Error al reproducir el sonido tic toc:", error);
    });
  }
}

function stopTickTock() {
  const tickTockSound = document.getElementById("tickTockSound");
  if (tickTockSound) {
    tickTockSound.pause();
    tickTockSound.currentTime = 0;
  }
}

function updateExerciseImage(exercise) {
  const imageContainer = document.getElementById('exerciseImageContainer');
  const exerciseImage = document.getElementById('exerciseImage');
  // Limpiar intervalo previo si existe
  if (exerciseImageInterval) {
    clearInterval(exerciseImageInterval);
    exerciseImageInterval = null;
  }
  // Verificar si existen imágenes en el ejercicio
  if (exercise.images && Array.isArray(exercise.images) && exercise.images.length > 0) {
    imageContainer.style.display = 'block';
    currentImageIndex = 0;
    // Establecer la primera imagen; la ruta completa asume que las imágenes están en /img/exercises/
    exerciseImage.src = imageBasePath + "img/exercises/" + exercise.images[currentImageIndex];
    // Si hay más de una imagen, iniciar intervalo para rotarlas cada 3 segundos
    if (exercise.images.length > 1) {
      exerciseImageInterval = setInterval(() => {
        currentImageIndex = (currentImageIndex + 1) % exercise.images.length;
        exerciseImage.src = imageBasePath + "img/exercises/" + exercise.images[currentImageIndex];
      }, 3000);
    }
  } else {
    // Si no hay imágenes, ocultar el contenedor
    imageContainer.style.display = 'none';
    exerciseImage.src = '';
  }
}


// Al seleccionar una rutina del menú dinámico
function selectRoutine(id) {
  if (!routines[id]) {
    alert("La rutina aún no se ha cargado. Intenta de nuevo en unos instantes.");
    return;
  }
  selectedRoutineId = id;
  selectedRoutine = routines[id];
  // Mostrar el pop up de información directamente
  showRoutineInfoPopup();
}

// Inicia la rutina (al pulsar "Empezar ejercicio" en el pop up)
function startRoutine() {
  if (!selectedRoutine) {
    alert("La rutina aún no se ha cargado. Intenta de nuevo en unos instantes.");
    return;
  }
  currentRoutine = selectedRoutine.exercises;
  currentExerciseIndex = 0;
  isRest = false;
  closeRoutineInfoPopup();
  showSection('exerciseRoutineSection');
  startExercise();
}

// Inicia el ejercicio actual
function startExercise() {
  if (currentExerciseIndex >= currentRoutine.length) {
    alert("¡Rutina completada!");
    exitRoutine();
    return;
  }
  const exercise = currentRoutine[currentExerciseIndex];
  isRest = false;
  document.getElementById('exerciseTitle').textContent = exercise.name;
  // Actualizar la imagen del ejercicio (si existe)
  updateExerciseImage(exercise);
  // Reproducir instrucciones en audio (si existen)
  playExerciseAudio(exercise);
  timeLeft = exercise.duration;
  updateTimerDisplay();
  // Mostrar botón de "Pausa" y ocultar "Reanudar"
  document.getElementById('pauseBtn').style.display = 'inline-block';
  document.getElementById('resumeBtn').style.display = 'none';
  startTimerTick();
}


// Inicia el período de descanso tras un ejercicio
function startRest(exercise) {
  isRest = true;
  document.getElementById('exerciseTitle').textContent = "Descanso";
  timeLeft = exercise.rest;
  updateTimerDisplay();
  // Limpiar la rotación de imágenes y ocultar el contenedor durante el descanso
  if (exerciseImageInterval) {
    clearInterval(exerciseImageInterval);
    exerciseImageInterval = null;
  }
  document.getElementById('exerciseImageContainer').style.display = 'none';
  startTimerTick();
}


// Función de cuenta regresiva (para ejercicio y descanso)
function startTimerTick() {
  // Inicia el sonido tic toc
  playTickTock();
  
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      // Detén el sonido tic toc al finalizar el período
      stopTickTock();
      if (!isRest) {
        // Reproducir sonido de alarma al finalizar el ejercicio
        playAlarm();
        const exercise = currentRoutine[currentExerciseIndex];
        saveTrainingTime(exercise.duration);
        if (exercise.rest && exercise.rest > 0) {
          startRest(exercise);
        } else {
          currentExerciseIndex++;
          startExercise();
        }
      } else {
        currentExerciseIndex++;
        startExercise();
      }
    }
  }, 1000);
}

// Actualiza la visualización del cronómetro
function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  document.getElementById('exerciseTimer').textContent =
    (minutes < 10 ? '0' + minutes : minutes) + ':' +
    (seconds < 10 ? '0' + seconds : seconds);
}

// Pausa el cronómetro y alterna botones
function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('resumeBtn').style.display = 'inline-block';
    // Detener el sonido tic toc
    stopTickTock();
  }
}

// Reanuda el cronómetro y alterna botones
function resumeTimer() {
  if (!timerInterval) {
    startTimerTick();
    document.getElementById('resumeBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-block';
    // Reanudar el sonido tic toc se inicia dentro de startTimerTick()
  }
}

// Sale de la rutina y vuelve al menú principal
function exitRoutine() {
  if (timerInterval) clearInterval(timerInterval);
  showSection('exercisesSection');
}

// Guarda el tiempo de entrenamiento y actualiza estadísticas en localStorage
function saveTrainingTime(seconds) {
  let totalMinutes = parseInt(localStorage.getItem('totalMinutes')) || 0;
  totalMinutes += Math.floor(seconds / 60);
  localStorage.setItem('totalMinutes', totalMinutes);

  const today = new Date().toISOString().split('T')[0];
  let dailyData = JSON.parse(localStorage.getItem('dailyData')) || { date: today, minutes: 0 };

  if (dailyData.date !== today) {
    dailyData = { date: today, minutes: Math.floor(seconds / 60) };
    let currentStreak = parseInt(localStorage.getItem('currentStreak')) || 0;
    let maxStreak = parseInt(localStorage.getItem('maxStreak')) || 0;
    currentStreak++;
    localStorage.setItem('currentStreak', currentStreak);
    if (currentStreak > maxStreak) {
      localStorage.setItem('maxStreak', currentStreak);
    }
  } else {
    dailyData.minutes += Math.floor(seconds / 60);
  }
  localStorage.setItem('dailyData', JSON.stringify(dailyData));

  let daysTrained = parseInt(localStorage.getItem('daysTrained')) || 0;
  daysTrained++;
  localStorage.setItem('daysTrained', daysTrained);
  let dailyAverage = totalMinutes / daysTrained;
  localStorage.setItem('dailyAverage', dailyAverage.toFixed(1));
}

// Actualiza las estadísticas de actividad en la pantalla "Mi actividad"
function updateActivityStats() {
  document.getElementById('totalMinutes').textContent = localStorage.getItem('totalMinutes') || 0;
  document.getElementById('currentStreak').textContent = localStorage.getItem('currentStreak') || 0;
  document.getElementById('maxStreak').textContent = localStorage.getItem('maxStreak') || 0;
  document.getElementById('dailyAverage').textContent = localStorage.getItem('dailyAverage') || 0;
  const today = new Date().toISOString().split('T')[0];
  let dailyData = JSON.parse(localStorage.getItem('dailyData')) || { date: today, minutes: 0 };
  document.getElementById('todayMinutes').textContent = (dailyData.date === today) ? dailyData.minutes : 0;
}

// Muestra el pop up con información de la rutina seleccionada
function showRoutineInfoPopup() {
  if (!selectedRoutine) return;
  document.getElementById('routineImage').src = imageBasePath + (selectedRoutine.image || '');
  document.getElementById('routineDescription').textContent = selectedRoutine.description || 'No hay descripción disponible.';
  document.getElementById('popupModal').style.display = 'block';
}

// Cierra el pop up de información
function closeRoutineInfoPopup() {
  document.getElementById('popupModal').style.display = 'none';
}

// Función para reproducir el sonido de alarma
function playAlarm() {
  const alarmSound = document.getElementById('alarmSound');
  if (alarmSound) {
    alarmSound.play();
  }
}
