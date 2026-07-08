(function () {
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('mainNav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var aberto = nav.classList.toggle('aberto');
      toggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('aberto');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  var ano = document.getElementById('anoAtual');
  if (ano) {
    ano.textContent = new Date().getFullYear();
  }

  var heroVisual = document.querySelector('.hero-visual');
  if (heroVisual) {
    var verificarVisual = function () {
      if (heroVisual.querySelectorAll('.polaroid').length === 0) {
        heroVisual.closest('.hero').classList.add('sem-visual');
      }
    };
    window.addEventListener('load', verificarVisual);
    setTimeout(verificarVisual, 1500);
  }
})();
