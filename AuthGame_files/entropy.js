document.addEventListener('DOMContentLoaded', function () {
  const passwordField = document.getElementById('password');
  const passwordEntropy = document.getElementById('passwordEntropy');
  const modeToggleButton = document.getElementById('modeToggle');
  const modeControl = modeToggleButton?.closest('.select-mode');
  const PASSWORD_LIST_FILE = 'AuthGame_files/rockyou-75.txt';
  const FALLBACK_ENTROPIES = [13.2, 16.1, 18.8, 21.4, 24.0, 27.1, 30.5, 34.0, 38.2, 42.7, 47.6, 53.1, 59.4, 66.0, 74.2, 83.5, 94.1, 106.0];
  const modes = ['score', 'bar', 'stars', 'time'];
  const modeLabels = { score: 'Comparação', bar: 'Barra', stars: 'Estrelas', time: 'Tempo' };
  const modeAliases = {
    comparacao: 'score', comparação: 'score', score: 'score',
    barra: 'bar', bar: 'bar',
    estrelas: 'stars', stars: 'stars',
    tempo: 'time', time: 'time',
    todos: 'all', all: 'all', atual: 'all',
    nenhum: 'none', none: 'none', sem: 'none'
  };
  const rawMode = new URLSearchParams(window.location.search).get('modo');
  const evaluationMode = rawMode ? (modeAliases[rawMode.toLowerCase()] || 'none') : 'none';
  const listState = { ready: false, values: FALLBACK_ENTROPIES.slice().sort((a, b) => a - b) };
  let currentModeIndex = getSavedModeIndex();

  configureTestMode();
  preserveModeBetweenPages();

  if (evaluationMode === 'score' || evaluationMode === 'all') loadReferenceList();
  passwordField?.addEventListener('input', () => updateFeedback(passwordField.value));
  if (passwordField) updateFeedback(passwordField.value);

  function configureTestMode() {
    if (modeControl) modeControl.hidden = evaluationMode !== 'all';
    renderModeButton();

    modeToggleButton?.addEventListener('click', () => {
      if (evaluationMode !== 'all') return;
      currentModeIndex = (currentModeIndex + 1) % modes.length;
      localStorage.setItem('passwordMode', modes[currentModeIndex]);
      renderModeButton();
      updateFeedback(passwordField.value);
    });
  }

  function getSavedModeIndex() {
    const savedIndex = modes.indexOf(localStorage.getItem('passwordMode'));
    return savedIndex >= 0 ? savedIndex : 0;
  }

  function getActiveMode() {
    return evaluationMode === 'all' ? modes[currentModeIndex] : evaluationMode;
  }

  function renderModeButton() {
    if (modeToggleButton) modeToggleButton.textContent = `Modo: ${modeLabels[modes[currentModeIndex]]}`;
  }

  function preserveModeBetweenPages() {
    window.getAuthModeUrl = function (page) {
      return rawMode ? `${page}?modo=${encodeURIComponent(rawMode)}` : page;
    };

    document.querySelectorAll('a[href="AuthGame.html"], a[href="register.html"]').forEach(link => {
      link.href = window.getAuthModeUrl(link.getAttribute('href'));
    });
  }

  async function loadReferenceList() {
    try {
      const response = await fetch(PASSWORD_LIST_FILE);
      if (!response.ok) throw new Error('Lista indisponível');
      const values = (await response.text()).split(/\r?\n/).map(item => item.trim()).filter(Boolean).map(calculateEntropy).sort((a, b) => a - b);
      if (values.length) listState.values = values;
    } catch (error) {
      // A lista de referência é um aprimoramento visual; a avaliação continua com valores locais.
    } finally {
      listState.ready = true;
      if (passwordField) updateFeedback(passwordField.value);
    }
  }

  function updateFeedback(password) {
    if (!passwordEntropy) return;
    const activeMode = getActiveMode();
    if (activeMode === 'none' || !password) {
      passwordEntropy.innerHTML = '';
      return;
    }

    const entropy = calculateEntropy(password);
    const strength = getStrength(entropy);
    switch (activeMode) {
      case 'score': renderComparison(entropy, strength); break;
      case 'bar': renderStrengthBar(strength); break;
      case 'stars': renderStars(strength); break;
      case 'time': renderCrackTime(password); break;
    }
  }

  function calculateEntropy(password) {
    const range = getCharacterRange(password);
    return password.length && range ? password.length * Math.log2(range) : 0;
  }

  function getCharacterRange(password) {
    let range = 0;
    if (/[a-z]/.test(password)) range += 26;
    if (/[A-Z]/.test(password)) range += 26;
    if (/[0-9]/.test(password)) range += 10;
    if (/[^a-zA-Z0-9]/.test(password)) range += 33;
    return range;
  }

  function getPercentile(entropy) {
    let start = 0;
    let end = listState.values.length;
    while (start < end) {
      const middle = Math.floor((start + end) / 2);
      if (listState.values[middle] < entropy) start = middle + 1;
      else end = middle;
    }
    return Math.round((start / listState.values.length) * 100);
  }

  function getStrength(entropy) {
    if (entropy < 28) return { label: 'Fraca', detail: 'um palpite bem treinado pode pegá-la.', score: 1, percent: 17, className: 'is-weak' };
    if (entropy < 36) return { label: 'Básica', detail: 'já é alguma coisa, mas ainda dá para caprichar.', score: 2, percent: 34, className: 'is-basic' };
    if (entropy < 60) return { label: 'Boa', detail: 'está no caminho certo.', score: 3, percent: 51, className: 'is-good' };
    if (entropy < 80) return { label: 'Forte', detail: 'essa já dá trabalho de verdade.', score: 4, percent: 68, className: 'is-strong' };
    if (entropy < 105) return { label: 'Excelente', detail: 'uma senha de respeito.', score: 5, percent: 84, className: 'is-excellent' };
    return { label: 'Lendária', detail: 'nível chefe final: guarde-a em segurança.', score: 6, percent: 100, className: 'is-legendary' };
  }

  function renderComparison(entropy, strength) {
    const percentile = getPercentile(entropy);
    const note = percentile >= 90 ? 'Ela está bem acima das senhas comuns. Belo trabalho.'
      : percentile >= 70 ? 'Ela passou pela maior parte da lista — ótimo sinal.'
      : percentile >= 40 ? 'Ela está no meio do caminho; mais alguns detalhes ajudam bastante.'
      : 'Ela ainda parece familiar demais para uma lista de senhas comuns.';
    passwordEntropy.innerHTML = `<div class="password-meter"><div class="password-meter__header"><span>Comparação com senhas conhecidas</span><strong>${percentile}%</strong></div><div class="password-meter__track" aria-hidden="true"><span class="password-meter__fill ${strength.className}" style="width: ${Math.max(percentile, 4)}%"></span></div><p>${note}</p></div>`;
  }

  function renderStrengthBar(strength) {
    passwordEntropy.innerHTML = `<div class="password-meter"><div class="password-meter__header"><span>Segurança da senha</span><strong>${strength.label}</strong></div><div class="password-meter__track" aria-hidden="true"><span class="password-meter__fill ${strength.className}" style="width: ${strength.percent}%"></span></div><p>${strength.detail}</p></div>`;
  }

  function renderStars(strength) {
    const regularStars = Array.from({ length: 5 }, (_, index) => (
      `<span class="${index < strength.score ? 'is-filled' : ''}">★</span>`
    )).join('');
    const legendaryStar = strength.score === 6
      ? '<span class="is-filled is-legendary-star">✦</span>'
      : '';
    const ariaLabel = strength.score === 6 ? '6 estrelas, nível Lendária' : `${strength.score} de 5 estrelas`;
    passwordEntropy.innerHTML = `<div class="password-stars" aria-label="${ariaLabel}"><div>${regularStars}${legendaryStar}</div><p><strong>${strength.label}</strong>: ${strength.detail}</p></div>`;
  }

  function renderCrackTime(password) {
    const result = typeof zxcvbn === 'function' ? zxcvbn(password) : null;
    const displayTime = result?.crack_times_display.offline_slow_hashing_1e4_per_second;
    const message = displayTime ? getCrackTimeMessage(displayTime) : 'Ainda estamos calculando esse enigma.';
    passwordEntropy.innerHTML = `<div class="password-meter"><div class="password-meter__header"><span>Tempo estimado para descobrir</span></div><p>${message}</p></div>`;
  }

  function getCrackTimeMessage(time) {
    if (time.includes('centur')) return 'Séculos — levariam gerações inteiras para descobrir essa. Impressionante.';
    const translated = translateTime(time);
    if (time.includes('year')) return `${translated}. Dá para envelhecer com tranquilidade esperando.`;
    if (time.includes('month')) return `${translated}. Tempo suficiente para muita coisa mudar.`;
    if (time.includes('day')) return `${translated}. Já não é uma senha para subestimar.`;
    if (time.includes('hour')) return `${translated}. Um café não vai ser suficiente para quebrá-la.`;
    if (time.includes('minute')) return `${translated}. Vamos reforçar essa defesa.`;
    return `${translated}. Essa foi rápida demais — tente adicionar mais variedade.`;
  }

  function translateTime(time) {
    return time.replace('less than a second', 'menos de um segundo').replace('seconds', 'segundos').replace('second', 'segundo').replace('minutes', 'minutos').replace('minute', 'minuto').replace('hours', 'horas').replace('hour', 'hora').replace('days', 'dias').replace('day', 'dia').replace('months', 'meses').replace('month', 'mês').replace('years', 'anos').replace('year', 'ano');
  }
});
