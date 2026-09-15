const toggle = (button) => {
  const passwordElement = document.getElementById(button.getAttribute('aria-controls'));

  if (passwordElement.type === 'password') {
    passwordElement.type = 'text';
    button.textContent = 'Ocultar';
    button.setAttribute('aria-label', button.dataset.labelHide);
  } else if (passwordElement.type === 'text') {
    passwordElement.type = 'password';
    button.textContent = 'Ver';
    button.setAttribute('aria-label', button.dataset.labelShow);
  }
};

document
  .querySelectorAll('[data-password-toggle]')
  .forEach(button => {
    button.onclick = () => toggle(button);
  });
