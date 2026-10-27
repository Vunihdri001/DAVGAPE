/**
 * conquista.js
 * =========================================================================
 * Comportamento exclusivo do achievements.html: desenha as conquistas agrupadas por categoria 
 * =========================================================================
 */
(function () {
  Navigation.protegerPagina();
  if (!PlayerStore.hasPlayer()) return; 

  const containerEl = document.getElementById('categoriasConquistas');
  const resumoEl = document.getElementById('resumoConquistas');
  const avisoEl = document.getElementById('avisoFixar');
  let avisoTimeoutId = null;

  function mostrarAviso(mensagem) {
    avisoEl.textContent = mensagem;
    clearTimeout(avisoTimeoutId);
    avisoTimeoutId = setTimeout(() => {
      avisoEl.textContent = '';
    }, 3000);
  }

  function criarCard(conquista, idsFixadas) {
    const card = document.createElement('div');
    card.className = 'card-conquista' + (conquista.desbloqueada ? ' unlocked' : '');
    card.dataset.categoria = conquista.categoria;

    const fixada = idsFixadas.includes(conquista.id);
    const botaoFixar = conquista.desbloqueada
      ? `<button type="button" class="btn-fixar${fixada ? ' fixada' : ''}" data-id="${conquista.id}">
           ${fixada ? 'Remover destaque' : 'Fixar'}
         </button>`
      : '';

    card.innerHTML = `
      <div class="icon">${conquista.icone}</div>
      <div class="info">
        <h4>${conquista.nome}</h4>
        <p>${conquista.descricao}</p>
        <span class="status-tag">${conquista.desbloqueada ? 'Desbloqueada' : 'Bloqueada'}</span>
        <div class="rodape">${botaoFixar}</div>
      </div>
    `;
    return card;
  }

  function renderizarTudo() {
    const grupos = Conquistas.listarAgrupadas();
    const idsFixadas = PlayerStore.getConquistasFixadas();

    const totalConquistas = grupos.reduce((soma, g) => soma + g.conquistas.length, 0);
    const totalDesbloqueadas = grupos.reduce(
      (soma, g) => soma + g.conquistas.filter((c) => c.desbloqueada).length,
      0
    );
    resumoEl.textContent = `${totalDesbloqueadas} de ${totalConquistas} desbloqueadas · ${idsFixadas.length}/${PlayerStore.MAX_CONQUISTAS_FIXADAS} fixadas no perfil`;

    containerEl.innerHTML = '';
    grupos.forEach((grupo) => {
      const desbloqueadasNoGrupo = grupo.conquistas.filter((c) => c.desbloqueada).length;

      const secao = document.createElement('section');
      secao.className = 'conquistas-categoria';
      secao.innerHTML = `
        <h2>${grupo.label}</h2>
        <p class="contagem-categoria">${desbloqueadasNoGrupo} de ${grupo.conquistas.length} desbloqueadas</p>
      `;

      const grade = document.createElement('div');
      grade.className = 'conquistas-grid';
      grupo.conquistas.forEach((c) => grade.appendChild(criarCard(c, idsFixadas)));
      secao.appendChild(grade);

      containerEl.appendChild(secao);
    });

    // liga os botões de fixar/desafixar recém-criados
    containerEl.querySelectorAll('.btn-fixar').forEach((botao) => {
      botao.addEventListener('click', () => {
        const id = botao.dataset.id;
        const jaFixada = PlayerStore.getConquistasFixadas().includes(id);

        if (jaFixada) {
          PlayerStore.desafixarConquista(id);
        } else {
          const resultado = PlayerStore.fixarConquista(id);
          if (!resultado.ok && resultado.motivo === 'limite') {
            mostrarAviso(`Você só pode destacar até ${PlayerStore.MAX_CONQUISTAS_FIXADAS} conquistas — remova uma antes de escolher outra.`);
            return;
          }
        }
        renderizarTudo();
      });
    });
  }

  renderizarTudo();
})();
