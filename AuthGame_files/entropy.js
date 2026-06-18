document.addEventListener('DOMContentLoaded', function () {
  const passwordField = document.getElementById('password');
  const passwordEntropy = document.getElementById('passwordEntropy');
  const modeToggleButton = document.getElementById('modeToggle');

  const modes = ['score', 'stars', 'time'];
  const entropyList = [0.5, 0.8, 1, 1.2, 1.5, 1.8, 2, 2.3, 2.5, 2.8,
  3, 3.3, 3.5, 3.8, 4, 4.3, 4.5, 4.8, 5,
  5.5, 6, 6.5, 7, 7.5, 8,
  9, 10, 11, 12, 13, 14, 15,
  16, 17, 18, 19, 20,
  21, 22, 23, 24, 25,
  26, 27, 28, 29, 30,
  32, 34, 36, 38, 40];

  let currentModeIndex = 0;

  function getModeLabel(mode) {
    switch (mode) {
      case 'score': return 'Placar';
      case 'stars': return 'Estrelas';
      case 'time': return 'Tempo';
      default: return '';
    }
  }

  // Traduz expressões de tempo para português
  function traduzirTempo(tempo) {
    return tempo
      .replace('less than a second', 'menos de um segundo')
      .replace('seconds', 'segundos')
      .replace('second', 'segundo')
      .replace('minutes', 'minutos')
      .replace('minute', 'minuto')
      .replace('hours', 'horas')
      .replace('hour', 'hora')
      .replace('days', 'dias')
      .replace('day', 'dia')
      .replace('months', 'meses')
      .replace('month', 'mês')
      .replace('years', 'anos')
      .replace('year', 'ano')
      .replace('centuries', 'séculos')
      .replace('century', 'século');
  }

  // Atualiza feedback com base no modo
  async function updateFeedback(password) {
    if (!password || !passwordEntropy) {
      passwordEntropy.textContent = '';
      return;
    }

    const result = zxcvbn(password);
    const mode = modes[currentModeIndex];

    switch (mode) {
      case 'score':
        const entropy = Number(result.guesses_log10);
        const percentileResult = getPercentile(entropy);
        entropyList.push(entropy);
        passwordEntropy.textContent =
          percentileResult?.percentile !== undefined
            ? `Você está no top ${percentileResult.percentile}%`
            : 'Erro ao calcular percentile.';
        break;

      case 'stars':
        const stars = result.score + 1;
        passwordEntropy.innerHTML = `
          <span style="font-size: 24px;">
          <span style="color: gold;">${'★'.repeat(stars)}</span><span style="color: lightgray;">${'☆'.repeat(5 - stars)}</span>
          </span>
        `;    
        break;

      case 'time':
        const tempo = result.crack_times_display.offline_slow_hashing_1e4_per_second;
        passwordEntropy.textContent = `Tempo para descobrir a senha: ${traduzirTempo(tempo)}`;
        break;
    }
  }

  function getPercentile(entropy) {
  if (!entropyList.length) {
    return { percentile: 0 };
  }

  const countBelow = entropyList.filter(e => e < entropy).length;
  const total = entropyList.length;

  const percentile = 100 - ((countBelow / total) * 100);

  return { percentile: percentile.toFixed(2) };
}

  if (modeToggleButton) {
    modeToggleButton.addEventListener('click', () => {
      currentModeIndex = (currentModeIndex + 1) % modes.length;
      const mode = modes[currentModeIndex];
      modeToggleButton.textContent = `Modo: ${getModeLabel(mode)}`;
      updateFeedback(passwordField.value);
    });

    // Define modo inicial no botão
    modeToggleButton.textContent = `Modo: ${getModeLabel(modes[currentModeIndex])}`;
  }

  if (passwordField) {
    passwordField.addEventListener('input', () => {
      updateFeedback(passwordField.value);
    });
  }
});
