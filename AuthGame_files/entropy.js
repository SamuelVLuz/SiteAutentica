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
  passwordField?.addEventListener('input', () => {
    updateFeedback(passwordField.value);
    updatePolicyFeedback(passwordField.value);
  });
  if (passwordField) updateFeedback(passwordField.value);
  if (passwordField) updatePolicyFeedback(passwordField.value);

  window.evaluatePasswordPolicy = function (password, policy) {
    if (!policy?.enabled) return { valid: true };
    const mode = getActiveMode();

    if (mode === 'none') {
      const baseline = policy.baseline;
      const valid = password.length >= baseline.minimumLength
        && (!baseline.requireLetter || /[a-zA-ZÀ-ÿ]/.test(password))
        && (!baseline.requireNumber || /\d/.test(password))
        && (!baseline.requireSpecial || /[^a-zA-Z0-9]/.test(password));
      return { valid, message: valid ? '' : policy.messages.baseline };
    }

    if (mode === 'score' && !listState.ready) {
      return { valid: false, pending: true, message: policy.messages.loading };
    }

    const entropy = calculateEntropy(password);
    const strength = getStrength(entropy);
    const percentile = getPercentile(entropy);
    const crackTime = mode === 'time' && typeof zxcvbn === 'function'
      ? zxcvbn(password).crack_times_seconds.offline_slow_hashing_1e4_per_second
      : 0;
    const valid = mode === 'score'
      ? percentile >= policy.minimumPercentile
      : mode === 'time'
        ? crackTime >= policy.minimumCrackTimeSeconds
        : strength.score >= policy.minimumScore;
    const message = valid ? '' : getModePolicyMessage(policy, mode);
    return { valid, message, strength, percentile, crackTime };
  };

  function getModePolicyMessage(policy, mode) {
    const scoreLabels = { 1: 'Fraca', 2: 'Básica', 3: 'Boa', 4: 'Forte', 5: 'Excelente', 6: 'Lendária' };
    const time = formatPolicyDuration(policy.minimumCrackTimeSeconds);
    const template = policy.messages[mode] || 'A senha não atingiu o mínimo exigido para este modo.';
    return template
      .replace('{percentile}', policy.minimumPercentile)
      .replace('{score}', policy.minimumScore)
      .replace('{level}', scoreLabels[policy.minimumScore] || 'Boa')
      .replace('{time}', time);
  }

  function formatPolicyDuration(seconds) {
    if (seconds % 86400 === 0) return `${seconds / 86400} ${seconds / 86400 === 1 ? 'dia' : 'dias'}`;
    if (seconds % 3600 === 0) return `${seconds / 3600} ${seconds / 3600 === 1 ? 'hora' : 'horas'}`;
    if (seconds % 60 === 0) return `${seconds / 60} ${seconds / 60 === 1 ? 'minuto' : 'minutos'}`;
    return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
  }

  function updatePolicyFeedback(password) {
    const feedback = document.getElementById('passwordPolicyFeedback');
    if (!feedback || !password || !window.passwordPolicyFeedbackRequested) {
      if (feedback) {
        feedback.textContent = '';
        feedback.classList.remove('is-invalid');
      }
      passwordField?.setAttribute('aria-invalid', 'false');
      return;
    }
    const result = window.evaluatePasswordPolicy?.(password, window.PASSWORD_POLICY);
    if (!window.PASSWORD_POLICY?.enabled) {
      feedback.textContent = '';
      feedback.classList.remove('is-invalid');
      passwordField?.setAttribute('aria-invalid', 'false');
      return;
    }
    const invalid = !result?.valid;
    if (invalid) {
      feedback.replaceChildren();
      const requirement = document.createElement('span');
      requirement.textContent = result?.message || window.PASSWORD_POLICY.messages.loading;
      const tip = document.createElement('span');
      tip.className = 'password-policy-tip';
      tip.textContent = 'Tente uma senha mais longa ou mais complexa.';
      feedback.append(requirement, tip);
    } else {
      feedback.textContent = '';
    }
    feedback.classList.toggle('is-invalid', invalid);
    passwordField?.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }

  function configureTestMode() {
    if (modeControl) modeControl.hidden = evaluationMode !== 'all';
    renderModeButton();

    modeToggleButton?.addEventListener('click', () => {
      if (evaluationMode !== 'all') return;
      currentModeIndex = (currentModeIndex + 1) % modes.length;
      localStorage.setItem('passwordMode', modes[currentModeIndex]);
      renderModeButton();
      updateFeedback(passwordField.value);
      updatePolicyFeedback(passwordField.value);
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
      if (passwordField) {
        updateFeedback(passwordField.value);
        updatePolicyFeedback(passwordField.value);
      }
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
      case 'score': renderComparison(entropy); break;
      case 'bar': renderStrengthBar(strength); break;
      case 'stars': renderStars(strength); break;
      case 'time': renderCrackTime(password); break;
    }
  }

  function calculateEntropy(password) {
    const range = getCharacterRange(password);
    return password.length && range ? Math.log2(range ** password.length) : 0;
  }
  window.calculatePasswordEntropy = calculateEntropy;

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
    if (entropy < 28) return { label: 'Fraca', detail: 'Um palpite bem treinado pode pegá-la.', score: 1, percent: 17, className: 'is-weak' };
    if (entropy < 36) return { label: 'Básica', detail: 'Já é alguma coisa, mas ainda dá para caprichar.', score: 2, percent: 34, className: 'is-basic' };
    if (entropy < 60) return { label: 'Boa', detail: 'Está no caminho certo.', score: 3, percent: 51, className: 'is-good' };
    if (entropy < 80) return { label: 'Forte', detail: 'Essa já dá trabalho de verdade.', score: 4, percent: 68, className: 'is-strong' };
    if (entropy < 105) return { label: 'Excelente', detail: 'Uma senha de respeito!', score: 5, percent: 84, className: 'is-excellent' };
    return { label: 'Lendária', detail: 'Nível chefe final: guarde-a em segurança.', score: 6, percent: 100, className: 'is-legendary' };
  }

  function getComparisonClass(percentile) {
    if (percentile < 20) return 'is-weak';
    if (percentile < 40) return 'is-basic';
    if (percentile < 70) return 'is-good';
    if (percentile < 90) return 'is-strong';
    if (percentile < 99) return 'is-excellent';
    return 'is-legendary';
  }

  function renderComparison(entropy) {
    const percentile = getPercentile(entropy);
    const comparisonClass = getComparisonClass(percentile);
    const note = percentile >= 99 ? 'No topo do mundo!!! Continue assim!'
      : percentile >= 90 ? 'Ela está muito acima das outras. Belo trabalho!'
      : percentile >= 70 ? 'Superou mais da metade - ótimo trabalho!'
      : percentile >= 40 ? 'Ela está no meio do caminho; ainda podemos melhorar.'
      : 'Ainda parece familiar as outras, podemos fazer melhor.';
    passwordEntropy.innerHTML = `<div class="password-meter"><div class="password-meter__header"><span>Força relativa da senha</span><strong>${percentile}%</strong></div><div class="password-meter__track" aria-hidden="true"><span class="password-meter__fill ${comparisonClass}" style="width: ${Math.max(percentile, 4)}%"></span></div><p>${note}</p></div>`;
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
    if (time.includes('centur')) return 'Séculos... levariam gerações inteiras para descobrir essa. Bravo!';
    const translated = translateTime(time);
    if (time.includes('year')) return `${translated}. Dá para envelhecer com tranquilidade esperando.`;
    if (time.includes('month')) return `${translated}. Tempo suficiente para muita coisa mudar.`;
    if (time.includes('day')) return `${translated}. Boa! Essa já não pode ser subestimada.`;
    if (time.includes('hour')) return `${translated}. Um cafézinho não vai ser suficiente para quebrá-la.`;
    if (time.includes('minute')) return `${translated}. Uma dorzinha de cabeça, vamos reforçar MAIS!`;
    return `${translated}. Essa foi rápida demais, em pouco tempo descobrem.`;
  }

  function translateTime(time) {
    return time.replace('less than a second', 'menos de um segundo').replace('seconds', 'segundos').replace('second', 'segundo').replace('minutes', 'minutos').replace('minute', 'minuto').replace('hours', 'horas').replace('hour', 'hora').replace('days', 'dias').replace('day', 'dia').replace('months', 'meses').replace('month', 'mês').replace('years', 'anos').replace('year', 'ano');
  }
});
