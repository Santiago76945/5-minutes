// script.js

// Variables globales para almacenar las rutinas
let routines = {
  '5': null,
  '10': null
};
let selectedRoutine = null;
let selectedRoutineId = '';
let currentRoutine = [];
let currentExerciseIndex = 0;
let timerInterval = null;
let timeLeft = 0;
let isRest = false;

// Cargar ambas rutinas al iniciar la página
window.onload = function() {
  // Rutina de 5 minutos
  fetch('routine_abdomen_biceps_5.json')
    .then(response => response.json())
    .then(data => {
      routines['5'] = data;
      document.getElementById('routineMenuImage5').src = data.image;
      document.getElementById('routineName5').textContent = data.routine;
    })
    .catch(error => console.error('Error al cargar la rutina 5 min:', error));

  // Rutina de 10 minutos
  fetch('routine_abdomen_biceps_10.json')
    .then(response => response.json())
    .then(data => {
      routines['10'] = data;
      document.getElementById('routineMenuImage10').src = data.image;
      document.getElementById('routineName10').textContent = data.routine;
    })
    .catch(error => console.error('Error al cargar la rutina 10 min:', error));
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

// Al seleccionar una rutina del menú
function selectRoutine(id) {
  if (!routines[id]) {
    alert("La rutina aún no se ha cargado. Intenta de nuevo en unos instantes.");
    return;
  }
  selectedRoutineId = id;
  selectedRoutine = routines[id];
  // Actualizar la sección de detalle con los datos de la rutina seleccionada
  document.getElementById('routineTitle').textContent = selectedRoutine.routine;
  showSection('routineDetailSection');
}

// Inicia la rutina (al pulsar "Empezar ejercicio")
function startRoutine() {
  if (!selectedRoutine) {
    alert("La rutina aún no se ha cargado. Intenta de nuevo en unos instantes.");
    return;
  }
  currentRoutine = selectedRoutine.exercises;
  currentExerciseIndex = 0;
  isRest = false;
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
  startTimerTick();
}

// Función de cuenta regresiva (para ejercicio y descanso)
function startTimerTick() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (!isRest) {
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
  }
}

// Reanuda el cronómetro y alterna botones
function resumeTimer() {
  if (!timerInterval) {
    startTimerTick();
    document.getElementById('resumeBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-block';
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
  document.getElementById('routineImage').src = selectedRoutine.image || '';
  document.getElementById('routineDescription').textContent = selectedRoutine.description || 'No hay descripción disponible.';
  document.getElementById('popupModal').style.display = 'block';
}

// Cierra el pop up de información
function closeRoutineInfoPopup() {
  document.getElementById('popupModal').style.display = 'none';
}
