/**
 * dashboard.js
 * =========================================================================
 * Comportamento exclusivo do dashboard.html: busca os dados do jogador
 * em PlayerStore/Conquistas (sistema.js) e desenha o perfil (com as
 * conquistas fixadas em destaque), o histórico e os melhores resultados
 * =========================================================================
 */
(function () {
  Navigation.protegerPagina();
  if (!PlayerStore.hasPlayer()) return; 

  const jogador = PlayerStore.getPlayer();

  /* ---------- perfil ---------- */
  document.getElementById('perfilNome').textContent = jogador.nome;

  const nivel = PlayerStore.getNivel();
  const progresso = PlayerStore.getProgressoNivel();

  document.getElementById('perfilNivel').textContent = `Nível ${nivel}`;
  document.getElementById('perfilBarraXp').style.width = `${progresso.percentual}%`;
  document.getElementById('perfilXpTexto').textContent =
    `${progresso.xpAtual} / ${progresso.xpNecessario} XP`;

  /* ---------- avatar: clique na foto (ou no lápis) abre o seletor de arquivo ---------- */
  const elAvatarPerfil = document.getElementById('perfilAvatar');
  const btnEditarAvatar = document.getElementById('btnEditarAvatar');
  const inputAvatar = document.getElementById('inputAvatar');
  const TAMANHO_AVATAR_PX = 240;

  function aplicarAvatarNaTela() {
    const jogadorAtual = PlayerStore.getPlayer();
    elAvatarPerfil.style.backgroundImage =
      jogadorAtual && jogadorAtual.avatar ? `url("${jogadorAtual.avatar}")` : '';
  }
  aplicarAvatarNaTela();

  /** Lê o arquivo escolhido, recorta em quadrado (crop central) e reduz o tamanho antes de salvar */
  function processarImagemAvatar(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Não foi possível ler esse arquivo.'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Esse arquivo não é uma imagem válida.'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = TAMANHO_AVATAR_PX;
          canvas.height = TAMANHO_AVATAR_PX;
          const ctx = canvas.getContext('2d');

          const lado = Math.min(img.width, img.height);
          const origemX = (img.width - lado) / 2;
          const origemY = (img.height - lado) / 2;
          ctx.drawImage(img, origemX, origemY, lado, lado, 0, 0, TAMANHO_AVATAR_PX, TAMANHO_AVATAR_PX);

          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  function abrirSeletorAvatar() {
    inputAvatar.click();
  }
  elAvatarPerfil.addEventListener('click', abrirSeletorAvatar);
  btnEditarAvatar.addEventListener('click', abrirSeletorAvatar);

  inputAvatar.addEventListener('change', () => {
    const arquivo = inputAvatar.files[0];
    inputAvatar.value = ''; // permite escolher o mesmo arquivo de novo depois
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
      window.alert('Escolha um arquivo de imagem (jpg, png, etc.).');
      return;
    }

    processarImagemAvatar(arquivo)
      .then((dataUrl) => {
        PlayerStore.setAvatar(dataUrl);
        aplicarAvatarNaTela();
        Navigation.preencherNavbar();
      })
      .catch((erro) => {
        window.alert(erro.message || 'Não foi possível usar essa imagem.');
      });
  });

  /* ---------- conquistas em destaque ---------- */
  const gradeFixadasEl = document.getElementById('perfilConquistasFixadas');
  const idsFixadas = PlayerStore.getConquistasFixadas();
  if (idsFixadas.length === 0) {
    gradeFixadasEl.innerHTML = '<p class="profile-destaques__vazio">Nenhuma escolhida ainda.</p>';
  } else {
    const todasConquistas = Conquistas.listarComStatus();
    idsFixadas.forEach((id) => {
      const c = todasConquistas.find((item) => item.id === id);
      if (!c) return;
      const medalha = document.createElement('span');
      medalha.className = 'medalha';
      medalha.dataset.categoria = c.categoria;
      medalha.textContent = c.icone;
      medalha.title = `${c.categoriaLabel} · ${c.nome}`;
      gradeFixadasEl.appendChild(medalha);
    });
  }

  /* ---------- helpers de formatação ---------- */
  function formatarData(iso) {
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  function criarCardHistorico(resultado) {
    const li = document.createElement('li');
    li.className = 'history-card';
    li.innerHTML = `
      <div class="history-info">
        <span class="history-date">${formatarData(resultado.data)}</span>
        <span class="history-diff">${resultado.dificuldade}</span>
        <span class="history-subject">${resultado.materia} · ${resultado.acertos}/${resultado.total} acertos</span>
      </div>
      <div class="history-points">${resultado.pontos}</div>
    `;
    return li;
  }

  function mostrarListaVazia(listaEl, mensagem) {
    listaEl.innerHTML = `<li style="color:var(--ink-soft); font-size:0.85rem; text-align:center; padding:16px 0;">${mensagem}</li>`;
  }

  /* ---------- últimos desafios ---------- */
  const listaHistoricoEl = document.getElementById('listaHistorico');
  const historico = PlayerStore.getHistorico().slice(0, 5);
  if (historico.length === 0) {
    mostrarListaVazia(listaHistoricoEl, 'Você ainda não jogou nenhuma partida.');
  } else {
    historico.forEach((r) => listaHistoricoEl.appendChild(criarCardHistorico(r)));
  }

  /* ---------- melhores resultados: 1 por dificuldade (5 no total), não por matéria ---------- */
  const listaMelhoresEl = document.getElementById('listaMelhores');
  const ORDEM_DIFICULDADES = ['Very Easy', 'Easy', 'Normal', 'Hard', 'Extreme'];

  const melhorPorDificuldade = {};
  Object.values(PlayerStore.getMelhores()).forEach((r) => {
    const atual = melhorPorDificuldade[r.dificuldade];
    if (!atual || r.pontos > atual.pontos) melhorPorDificuldade[r.dificuldade] = r;
  });
  const melhores = ORDEM_DIFICULDADES.map((d) => melhorPorDificuldade[d]).filter(Boolean);

  if (melhores.length === 0) {
    mostrarListaVazia(listaMelhoresEl, 'Nenhum recorde ainda — jogue para começar sua galeria.');
  } else {
    melhores.forEach((r) => listaMelhoresEl.appendChild(criarCardHistorico(r)));
  }
})();
