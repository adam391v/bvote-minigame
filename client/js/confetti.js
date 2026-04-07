/**
 * Confetti Animation - Hiệu ứng pháo hoa khi hoàn thành
 */

const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
let confettiParticles = [];
let confettiAnimating = false;

/**
 * Bắn confetti
 */
function launchConfetti(duration = 3000) {
  if (!confettiCanvas || !confettiCtx) return;
  
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiParticles = [];
  confettiAnimating = true;

  const colors = ['#6C5CE7', '#00D2D3', '#f9ca24', '#ff6e84', '#00b894', '#aca3ff', '#56f9f9'];

  // Tạo particles
  for (let i = 0; i < 150; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
      shape: Math.random() > 0.5 ? 'rect' : 'circle'
    });
  }

  animateConfetti();

  setTimeout(() => {
    confettiAnimating = false;
  }, duration);
}

function animateConfetti() {
  if (!confettiAnimating && confettiParticles.every(p => p.opacity <= 0)) {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    return;
  }

  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  confettiParticles.forEach(p => {
    if (p.opacity <= 0) return;

    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05; // gravity
    p.rotation += p.rotationSpeed;

    if (!confettiAnimating) {
      p.opacity -= 0.02;
    }

    if (p.y > confettiCanvas.height + 20) {
      if (confettiAnimating) {
        p.y = -10;
        p.x = Math.random() * confettiCanvas.width;
      } else {
        p.opacity = 0;
      }
    }

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.globalAlpha = Math.max(0, p.opacity);
    confettiCtx.fillStyle = p.color;

    if (p.shape === 'rect') {
      confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      confettiCtx.beginPath();
      confettiCtx.arc(0, 0, p.w / 3, 0, Math.PI * 2);
      confettiCtx.fill();
    }

    confettiCtx.restore();
  });

  requestAnimationFrame(animateConfetti);
}

// Resize canvas khi thay đổi kích thước cửa sổ
window.addEventListener('resize', () => {
  if (confettiCanvas) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
});
