import './style.css';

const scanButton = document.querySelector('#scan-button');
const scanStatus = document.querySelector('#scan-status');
const scanProgress = document.querySelector('#scan-progress');
const results = document.querySelector('#results');

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

scanButton.addEventListener('click', async () => {
  if (scanButton.dataset.running === 'true') return;

  scanButton.dataset.running = 'true';
  scanButton.disabled = true;
  scanButton.querySelector('span').textContent = 'Inspecting 1,248 rows…';
  scanStatus.textContent = 'Checking fields';
  scanProgress.classList.remove('complete');
  scanProgress.classList.add('running');
  results.classList.remove('visible');

  await wait(1050);
  scanStatus.textContent = 'Finding duplicates';
  await wait(850);
  scanStatus.textContent = 'Preflight complete';
  scanProgress.classList.remove('running');
  scanProgress.classList.add('complete');
  results.classList.add('visible');
  scanButton.querySelector('span').textContent = 'Run again';
  scanButton.disabled = false;
  scanButton.dataset.running = 'false';
});

document.querySelector('#year').textContent = new Date().getFullYear();
