/**
 * index.js
 * =========================================================================
 * Comportamento exclusivo do index.html: abrir o modal de login e criar
 * o jogador quando o formulário é enviado. Só é carregado nessa página.
 * =========================================================================
 */
(function () {
  const btnAbrir = document.getElementById('btnAbrirModal');
  const modal = document.getElementById('modalLogin');
  const inputNome = document.getElementById('nomeUsuario');
  const btnComecar = document.getElementById('btnComecar');

  function abrirModal() {
    // já existe um jogador salvo? vai direto pro dashboard, sem passar pelo modal
    if (PlayerStore.hasPlayer()) {
      window.location.href = 'dashboard.html';
      return;
    }
    modal.style.display = 'flex';
    inputNome.focus();
  }

  function fecharModal() {
    modal.style.display = 'none';
  }

  function tentarEntrar() {
    const nome = inputNome.value.trim();
    if (nome.length < 2) {
      inputNome.focus();
      return;
    }
    // se já existe um jogador, só renomeia (preserva pontos/nível/conquistas);
    // criar do zero de novo apagaria o progresso sem querer
    if (PlayerStore.hasPlayer()) {
      PlayerStore.renomearJogador(nome);
    } else {
      PlayerStore.createPlayer(nome);
    }
    window.location.href = 'dashboard.html';
  }

  btnAbrir.addEventListener('click', abrirModal);

  // clique fora do card fecha o modal
  modal.addEventListener('click', (evento) => {
    if (evento.target === modal) fecharModal();
  });

  btnComecar.addEventListener('click', tentarEntrar);
  inputNome.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') tentarEntrar();
  });
})();
