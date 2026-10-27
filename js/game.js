/**
 * game.js
 * =========================================================================
 * Comportamento exclusivo do game.html: alterna entre as três telas
 * (setup → jogo → resultado) e conecta os elementos do DOM ao GameEngine
 * (definido em sistema.js)
 * =========================================================================
 */
(function () {
  Navigation.protegerPagina();
  if (!PlayerStore.hasPlayer()) return;

  const telaSetup = document.getElementById('telaSetup');
  const telaJogo = document.getElementById('telaJogo');
  const telaResultado = document.getElementById('telaResultado');

  let dificuldadeEscolhida = null;
  let materiaEscolhida = null;

  /* =====================================================================
     TELA 1 — setup (escolha de dificuldade e matéria)
     ===================================================================== */
  const opcoesDificuldadeEl = document.getElementById('opcoesDificuldade');
  const opcoesMateriaEl = document.getElementById('opcoesMateria');
  const btnIniciarPartida = document.getElementById('btnIniciarPartida');
  const setupAviso = document.getElementById('setupAviso');

  function atualizarBotaoIniciar() {
    btnIniciarPartida.disabled = !(dificuldadeEscolhida && materiaEscolhida);
  }

  function atualizarAvisoDisponibilidade() {
    if (!dificuldadeEscolhida || !materiaEscolhida) {
      setupAviso.textContent = '';
      return;
    }
    const pedidas = DIFICULDADES[dificuldadeEscolhida].questoes;
    const disponiveis = GameEngine.contarDisponiveis(materiaEscolhida);
    setupAviso.textContent =
      disponiveis < pedidas
        ? `Só há ${disponiveis} questões disponíveis para essa combinação — a partida vai usar todas elas.`
        : '';
  }

  function renderOpcoesDificuldade() {
    opcoesDificuldadeEl.innerHTML = '';
    Object.values(DIFICULDADES).forEach((d) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opcao-btn';
      btn.innerHTML = `
        <span>
          <span class="opcao-nome">${d.label}</span>
          <span class="opcao-detalhe">${d.questoes} questões · ${d.tempoBase}s cada</span>
        </span>
        <span class="opcao-badge">${d.multiplicador}×</span>
      `;
      btn.addEventListener('click', () => {
        dificuldadeEscolhida = d.chave;
        [...opcoesDificuldadeEl.children].forEach((el) => el.classList.remove('selecionada'));
        btn.classList.add('selecionada');
        atualizarAvisoDisponibilidade();
        atualizarBotaoIniciar();
      });
      opcoesDificuldadeEl.appendChild(btn);
    });
  }

  function renderOpcoesMateria() {
    opcoesMateriaEl.innerHTML = '';
    Object.values(MATERIAS).forEach((m) => {
      const disponiveis = GameEngine.contarDisponiveis(m.chave);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opcao-btn';
      btn.disabled = disponiveis === 0;
      btn.innerHTML = `
        <span>
          <span class="opcao-nome">${m.label}</span>
          <span class="opcao-detalhe">${disponiveis > 0 ? disponiveis + ' questões no banco' : 'em breve'}</span>
        </span>
      `;
      btn.addEventListener('click', () => {
        materiaEscolhida = m.chave;
        [...opcoesMateriaEl.children].forEach((el) => el.classList.remove('selecionada'));
        btn.classList.add('selecionada');
        atualizarAvisoDisponibilidade();
        atualizarBotaoIniciar();
      });
      opcoesMateriaEl.appendChild(btn);
    });
  }

  /* =====================================================================
     TELA 2 — pergunta
     ===================================================================== */
  const elTag = document.getElementById('questaoTag');
  const elContexto = document.getElementById('questaoContexto');
  const elPergunta = document.getElementById('questaoPergunta');
  const elImagem = document.getElementById('questaoImagem');
  const elAlternativas = document.getElementById('alternativas');
  const elProgressoTexto = document.getElementById('jogoProgressoTexto');
  const elProgressoBarra = document.getElementById('jogoProgressoBarra');
  const elValorTempo = document.getElementById('valorTempo');
  const elMetricaTempo = document.getElementById('metricaTempo');
  const elValorPontos = document.getElementById('valorPontos');
  const elFeedback = document.getElementById('jogoFeedback');
  const btnConfirmar = document.getElementById('btnConfirmar');

  let letraSelecionada = null;
  let respostaFinalizada = false;
  let emModoDebug = false; // true só durante o modo livre (debug)

  function formatarTempo(segundos) {
    const s = Math.max(segundos, 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  /**
   * Separa o enunciado em corpo + pergunta, com 3 regras simples
   * (valem pra escrever o texto no JSON):
   *   "\n\n"   -> abre um espaço (parágrafo com linha em branco)
   *   "<br>"   -> só quebra a linha, sem espaço (o recuo é aplicado no renderQuestao)
   *   <titulo>texto</titulo> -> título: texto maior e em negrito (não recebe recuo; o espaço antes/depois continua sendo controlado pelo <br> e pelo \n\n)
   * A pergunta é sempre o último bloco. Não existe tratamento especial pra fonte/citação: ela é um parágrafo igual aos outros
   */
  function separarConteudo(enunciado) {
    const juntarLinhas = (bloco) => bloco.split('\n').map((l) => l.trim()).filter(Boolean).join(' ');
    const blocos = enunciado.split(/\n\s*\n/).map(juntarLinhas).filter(Boolean);

    if (blocos.length > 1) {
      return { corpo: blocos.slice(0, -1).join('<br><br>'), pergunta: blocos[blocos.length - 1] };
    }

    const frases = (blocos[0] || '').split(/(?<=[.?!])\s+(?=[A-ZÀ-ÚÍÓÉÁÂÊÔÃÕ])/);
    return { corpo: frases.slice(0, -1).join(' '), pergunta: frases[frases.length - 1] || '' };
  }

  function renderQuestao() {
    letraSelecionada = null;
    respostaFinalizada = false;
    btnConfirmar.disabled = true;
    elFeedback.textContent = '';
    elFeedback.className = 'feedback-jogo';

    const questao = GameEngine.questaoAtual();
    const idx = GameEngine.indiceAtual();
    const total = GameEngine.totalQuestoes();

    elTag.innerHTML = `${questao.tipo} <span class="separador">|</span> ${questao.ano} <span class="separador">|</span> ${questao.caderno} <span class="separador">|</span> <span class="destaque">${questao.materia} · questão ${questao.questao}</span>`;

    const { corpo, pergunta } = separarConteudo(questao.enunciado);
    // recuo: abre um espaço no começo de cada parágrafo (depois de <br> ou de uma linha em branco)
    // Um <br> logo no início do texto serve pra recuar a primeira linha, sem criar uma linha vazia
    const comRecuo = (texto) => texto
      .replace(/<br>[ \t]+/g, '<br>')
      .replace(/^<br>/, '<span class="recuo"></span>')
      .replace(/<br>(?!<br>|<titulo>)/g, '<br><span class="recuo"></span>');
    elContexto.innerHTML = corpo ? `<p>${comRecuo(corpo)}</p>` : '';
    elPergunta.textContent = pergunta;

    if (questao.img) {
      elImagem.src = questao.img;
      elImagem.style.display = 'block';
    } else {
      elImagem.style.display = 'none';
    }

    elProgressoTexto.textContent = `Questão ${idx + 1}/${total}`;
    elProgressoBarra.style.width = `${((idx + 1) / total) * 100}%`;

    elAlternativas.querySelectorAll('.alternativa-btn').forEach((el) => el.remove());
    Object.entries(questao.alternativas).forEach(([letra, texto]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'alternativa-btn';
      btn.dataset.letra = letra;
      btn.innerHTML = `<span class="alternativa-letra">${letra}</span><span class="alternativa-texto">${texto}</span>`;
      btn.addEventListener('click', () => selecionarAlternativa(letra, btn));
      elAlternativas.insertBefore(btn, btnConfirmar);
    });

    GameEngine.iniciarTimerQuestao();
  }

  function selecionarAlternativa(letra, botaoEl) {
    if (respostaFinalizada) return;
    letraSelecionada = letra;
    [...elAlternativas.children].forEach((el) => el.classList.remove('selecionada'));
    botaoEl.classList.add('selecionada');
    btnConfirmar.disabled = false;
  }

  function marcarAlternativa(letra, classe) {
    const el = elAlternativas.querySelector(`[data-letra="${letra}"]`);
    if (el) el.classList.add(classe);
  }

  function encerrarQuestaoNaTela(respostaCorreta) {
    respostaFinalizada = true;
    Som.velocidadeNormal();
    btnConfirmar.disabled = true;
    [...elAlternativas.children].forEach((el) => {
      el.disabled = true;
      if (el.dataset.letra === respostaCorreta) el.classList.add('correta');
    });
  }

  btnConfirmar.addEventListener('click', () => {
    if (!letraSelecionada || respostaFinalizada) return;
    const res = GameEngine.responder(letraSelecionada);

    if (res.correta) {
      elFeedback.textContent = emModoDebug
        ? 'Resposta correta — o gabarito dessa questão bate.'
        : `Certa resposta! +${res.pontos} pontos.`;
      elFeedback.classList.add('sucesso');
      if (!emModoDebug) elValorPontos.textContent = GameEngine.pontosAcumulados();
      encerrarQuestaoNaTela(res.respostaCorreta);
      if (emModoDebug) {
        btnVoltarDebug.classList.remove('oculto');
      } else {
        setTimeout(irParaProximaOuFim, 1100);
      }
      return;
    }

    marcarAlternativa(letraSelecionada, 'errada');
    const botaoErrado = elAlternativas.querySelector(`[data-letra="${letraSelecionada}"]`);
    if (botaoErrado) {
      botaoErrado.disabled = true;
      botaoErrado.classList.add('desabilitada');
    }
    btnConfirmar.disabled = true;
    letraSelecionada = null;

    if (res.esgotouTentativas) {
      elFeedback.textContent = emModoDebug
        ? `Errou 3 vezes. Gabarito dessa questão: ${res.respostaCorreta}.`
        : 'Terceira tentativa errada — questão perdida.';
      elFeedback.classList.add('erro');
      encerrarQuestaoNaTela(res.respostaCorreta);
      if (emModoDebug) {
        btnVoltarDebug.classList.remove('oculto');
      } else {
        setTimeout(irParaProximaOuFim, 1400);
      }
    } else {
      elFeedback.textContent = `Não é essa. Restam ${res.tentativasRestantes} tentativa(s).`;
      elFeedback.classList.add('erro');
    }
  });

  function irParaProximaOuFim() {
    const resultado = GameEngine.avancar();
    if (resultado) {
      mostrarResultado(resultado);
    } else {
      renderQuestao();
    }
  }

  GameEngine.onEvento({
    onTick(restante, base) {
      if (restante === null) return; // modo livre: sem cronômetro
      Som.ajustarMusicaPeloTempo(restante, base); // quanto menos tempo, mais rápida a música
      elValorTempo.textContent = formatarTempo(restante);
      elMetricaTempo.classList.toggle('metrica-critica', restante <= Math.ceil(base * 0.15));
    },
    onTempoEsgotado() {
      elFeedback.textContent = 'Tempo esgotado.';
      elFeedback.classList.add('erro');
      encerrarQuestaoNaTela(GameEngine.questaoAtual().resposta);
      setTimeout(irParaProximaOuFim, 1100);
    },
  });

  /* =====================================================================
     TELA 3 — resultado final
     ===================================================================== */
  function mostrarResultado(resultado) {
    // trava de segurança: o modo livre nunca grava XP, histórico nem conquistas
    if (GameEngine.estaEmModoLivre()) return;
    Som.pararMusica();

    const nivelAntes = PlayerStore.getNivel();
    PlayerStore.salvarResultado(resultado);
    const niveisGanhos = PlayerStore.getNivel() - nivelAntes;
    if (niveisGanhos > 0) Som.tocarLevelUp(niveisGanhos);

    telaJogo.style.display = 'none';
    telaResultado.style.display = 'block';

    document.getElementById('resultadoPontos').textContent = resultado.pontos;
    document.getElementById('resultadoAcertos').textContent = `${resultado.acertos}/${resultado.total}`;
    document.getElementById('resultadoMateria').textContent = resultado.materia;
    document.getElementById('resultadoDificuldade').textContent = resultado.dificuldade;
  }

  document.getElementById('btnJogarNovamente').addEventListener('click', () => {
    window.location.reload();
  });

  /* =====================================================================
     INICIALIZAÇÃO
     ===================================================================== */
  btnIniciarPartida.addEventListener('click', () => {
    const totalSelecionado = GameEngine.iniciarJogo(dificuldadeEscolhida, materiaEscolhida);
    if (totalSelecionado === 0) {
      setupAviso.textContent = 'Não há questões suficientes para essa combinação ainda.';
      return;
    }
    aplicarVisualModoDebug(false);
    telaSetup.style.display = 'none';
    telaJogo.style.display = 'block';
    elValorPontos.textContent = '0';
    Som.iniciarMusica();
    renderQuestao();
  });

  /* =====================================================================
     MODO LIVRE (DEBUG) — testar uma questão específica, sem XP/conquistas
     ===================================================================== */
  const btnAbrirModoDebug = document.getElementById('btnAbrirModoDebug');
  const painelModoDebug = document.getElementById('painelModoDebug');
  const selectDebugAno = document.getElementById('debugAno');
  const selectDebugQuestao = document.getElementById('debugQuestao');
  const btnTestarQuestao = document.getElementById('btnTestarQuestao');
  const btnVoltarDebug = document.getElementById('btnVoltarDebug');
  const elBadgeDebug = document.getElementById('badgeModoDebug');
  const elMetricasJogo = document.getElementById('metricasJogo');

  /** Liga/desliga o visual do modo debug na tela de jogo */
  function aplicarVisualModoDebug(ativo) {
    emModoDebug = ativo;
    elBadgeDebug.classList.toggle('oculto', !ativo);
    elMetricasJogo.classList.toggle('oculto', ativo);
    btnVoltarDebug.classList.add('oculto'); // só aparece depois que a questão é respondida
  }

  function preencherQuestoesDoAno() {
    const ano = Number(selectDebugAno.value);
    selectDebugQuestao.innerHTML = '';
    GameEngine.listarQuestoesDoAno(ano).forEach((q) => {
      const opcao = document.createElement('option');
      opcao.value = q.questao;
      opcao.textContent = `Questão ${q.questao} — ${q.materia}`;
      selectDebugQuestao.appendChild(opcao);
    });
    btnTestarQuestao.disabled = selectDebugQuestao.options.length === 0;
  }

  function prepararPainelDebug() {
    selectDebugAno.innerHTML = '';
    GameEngine.listarAnosDisponiveis().forEach((ano) => {
      const opcao = document.createElement('option');
      opcao.value = ano;
      opcao.textContent = ano;
      selectDebugAno.appendChild(opcao);
    });
    preencherQuestoesDoAno();
  }

  btnAbrirModoDebug.addEventListener('click', () => {
    painelModoDebug.classList.toggle('oculto');
  });
  selectDebugAno.addEventListener('change', preencherQuestoesDoAno);

  btnTestarQuestao.addEventListener('click', () => {
    const ano = Number(selectDebugAno.value);
    const numero = Number(selectDebugQuestao.value);
    if (!GameEngine.iniciarModoLivre(ano, numero)) {
      setupAviso.textContent = 'Não encontrei essa questão no banco.';
      return;
    }
    aplicarVisualModoDebug(true);
    telaSetup.style.display = 'none';
    telaJogo.style.display = 'block';
    renderQuestao();
  });

  btnVoltarDebug.addEventListener('click', () => {
    aplicarVisualModoDebug(false);
    telaJogo.style.display = 'none';
    telaSetup.style.display = 'block';
  });

  GameEngine.carregarQuestoes()
    .then(() => {
      renderOpcoesDificuldade();
      renderOpcoesMateria();
      prepararPainelDebug();
    })
    .catch((erro) => {
      setupAviso.textContent =
        erro.message + ' Se você abriu o arquivo direto (file://), rode um servidor local (ex: Live Server).';
    });
})();
