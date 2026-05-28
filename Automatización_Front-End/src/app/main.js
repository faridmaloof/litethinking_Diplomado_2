const form = document.getElementById('registro-form');
const statusBox = document.getElementById('status-box');

function updateStatus(type, text) {
  statusBox.className = `status ${type}`;
  statusBox.textContent = `Estado: ${text}`;
}

form.addEventListener('submit', event => {
  event.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!nombre || !email || !password) {
    updateStatus('error', 'Completa todos los campos');
    return;
  }

  updateStatus('processing', 'Procesando...');

  // Simulación asíncrona para practicar polling en UI tests.
  const waitTime = Math.floor(Math.random() * 11000) + 1000;
  window.setTimeout(() => {
    updateStatus('success', 'Usuario Creado Exitosamente');
  }, waitTime);
});
