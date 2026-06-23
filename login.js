// Microsoft SSO simulation
document.getElementById('sso-btn').addEventListener('click', () => {
  const overlay = document.getElementById('sso-overlay');
  const fill = document.getElementById('sso-prog-fill');
  overlay.classList.add('visible');

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 8 + 3;
    if (progress >= 100) {
      progress = 100;
      fill.style.width = '100%';
      clearInterval(interval);
      setTimeout(() => { window.location.href = 'app.html?sso=uconn'; }, 400);
    } else {
      fill.style.width = progress + '%';
    }
  }, 80);
});

// Email form - demo redirect
document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  if (email.endsWith('@uconn.edu') || email.length > 0) {
    window.location.href = 'app.html';
  }
});
