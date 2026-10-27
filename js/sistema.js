/* =========================================================================
   1) PLAYER — dados do jogador, tudo salvo no localStorage
   ========================================================================= */
const PlayerStore = (() => {
  const CHAVE_JOGADOR = 'enemgame_jogador';
  const CHAVE_HISTORICO = 'enemgame_historico';
  const CHAVE_MELHORES = 'enemgame_melhores';

  const TAMANHO_HISTORICO = 20; // guarda 20 partidas, a dashboard mostra as 5 mais recentes

  // ---------------------------------------------------------------------
  // Sistema de nível: cada nível N exige N * 120 de XP para avançar ao
  // próximo (nível 1 → 120, nível 2 → 240, nível 10 → 1200 ...)
  // O XP em si vem da pontuação da partida dividida por 5 (ponto de desafio 1800 → 360 XP)
  // ---------------------------------------------------------------------
  const XP_POR_NIVEL_MULTIPLICADOR = 120;
  const DIVISOR_XP = 5;

  function _xpNecessario(nivel) {
    return nivel * XP_POR_NIVEL_MULTIPLICADOR;
  }

  function _ler(chave, valorPadrao) {
    try {
      const bruto = localStorage.getItem(chave);
      return bruto ? JSON.parse(bruto) : valorPadrao;
    } catch (erro) {
      console.error(`sistema.js: falha ao ler "${chave}"`, erro);
      return valorPadrao;
    }
  }

  function _escrever(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch (erro) {
      console.error(`sistema.js: falha ao escrever "${chave}"`, erro);
    }
  }

  function getPlayer() {
    return _ler(CHAVE_JOGADOR, null);
  }

  function hasPlayer() {
    const jogador = getPlayer();
    return !!(jogador && jogador.nome && jogador.nome.trim().length > 0);
  }

  function createPlayer(nome) {
    const jogador = {
      nome: nome.trim(),
      criadoEm: new Date().toISOString(),
      pontosTotais: 0,
      nivel: 1,
      xpNivelAtual: 0,
      contagemPartidas: { total: 0 },
      conquistasFixadas: [],
    };
    _escrever(CHAVE_JOGADOR, jogador);
    return jogador;
  }

  /** Troca o nome sem apagar pontos/histórico (usado no menu "Renomear") */
  function renomearJogador(novoNome) {
    const jogador = getPlayer();
    if (!jogador) return null;
    jogador.nome = novoNome.trim();
    _escrever(CHAVE_JOGADOR, jogador);
    return jogador;
  }

  /** Salva a foto do jogador */
  function setAvatar(dataUrl) {
    const jogador = getPlayer();
    if (!jogador) return;
    jogador.avatar = dataUrl;
    _escrever(CHAVE_JOGADOR, jogador);
  }

  /** Volta ao avatar padrão */
  function removerAvatar() {
    const jogador = getPlayer();
    if (!jogador) return;
    delete jogador.avatar;
    _escrever(CHAVE_JOGADOR, jogador);
  }

  /** Apaga tudo — usado no menu "Deletar Progresso" */
  function resetPlayer() {
    localStorage.removeItem(CHAVE_JOGADOR);
    localStorage.removeItem(CHAVE_HISTORICO);
    localStorage.removeItem(CHAVE_MELHORES);
  }

  /** Soma ao total histórico de pontos exibido no perfil */
  function addPontos(pontos) {
    const jogador = getPlayer();
    if (!jogador) return;
    jogador.pontosTotais = (jogador.pontosTotais || 0) + pontos;
    _escrever(CHAVE_JOGADOR, jogador);
  }

  /**
   * Converte a pontuação de uma partida em XP (pontos / 5) e aplica ao
   * nível atual, subindo de nível quantas vezes for necessário — cada
   * nível N exige N * 120 de XP para o próximo
   */
  function ganharXp(pontosDesafio) {
    const jogador = getPlayer();
    if (!jogador) return;
    if (typeof jogador.nivel !== 'number') jogador.nivel = 1;
    if (typeof jogador.xpNivelAtual !== 'number') jogador.xpNivelAtual = 0;

    jogador.xpNivelAtual += Math.round(pontosDesafio / DIVISOR_XP);

    let necessario = _xpNecessario(jogador.nivel);
    while (jogador.xpNivelAtual >= necessario) {
      jogador.xpNivelAtual -= necessario;
      jogador.nivel += 1;
      necessario = _xpNecessario(jogador.nivel);
    }

    _escrever(CHAVE_JOGADOR, jogador);
  }

  function getNivel() {
    const jogador = getPlayer();
    return jogador && typeof jogador.nivel === 'number' ? jogador.nivel : 1;
  }

  function getProgressoNivel() {
    const jogador = getPlayer();
    const nivel = getNivel();
    const xpAtual = jogador && typeof jogador.xpNivelAtual === 'number' ? jogador.xpNivelAtual : 0;
    const xpNecessario = _xpNecessario(nivel);
    return {
      xpAtual,
      xpNecessario,
      xpParaProximo: xpNecessario - xpAtual,
      percentual: Math.round((xpAtual / xpNecessario) * 100),
    };
  }

  function getHistorico() {
    return _ler(CHAVE_HISTORICO, []);
  }

  function getMelhores() {
    return _ler(CHAVE_MELHORES, {});
  }

  /** Contagem de partidas jogadas — total e por dificuldade | Base das conquistas por medalha */
  function getContagemPartidas() {
    const jogador = getPlayer();
    return (jogador && jogador.contagemPartidas) || { total: 0 };
  }

  function _registrarPartida(dificuldadeLabel) {
    const jogador = getPlayer();
    if (!jogador) return;
    if (!jogador.contagemPartidas) jogador.contagemPartidas = { total: 0 };
    jogador.contagemPartidas.total = (jogador.contagemPartidas.total || 0) + 1;
    jogador.contagemPartidas[dificuldadeLabel] = (jogador.contagemPartidas[dificuldadeLabel] || 0) + 1;
    _escrever(CHAVE_JOGADOR, jogador);
  }

  /** Conquistas em destaque no perfil — até MAX_CONQUISTAS_FIXADAS, escolhidas em achievements.html */
  const MAX_CONQUISTAS_FIXADAS = 3;

  function getConquistasFixadas() {
    const jogador = getPlayer();
    return (jogador && jogador.conquistasFixadas) || [];
  }

  /** Retorna { ok, motivo } — (ex: limite atingido) */
  function fixarConquista(id) {
    const jogador = getPlayer();
    if (!jogador) return { ok: false, motivo: 'sem-jogador' };
    if (!jogador.conquistasFixadas) jogador.conquistasFixadas = [];
    if (jogador.conquistasFixadas.includes(id)) return { ok: true };
    if (jogador.conquistasFixadas.length >= MAX_CONQUISTAS_FIXADAS) {
      return { ok: false, motivo: 'limite' };
    }
    jogador.conquistasFixadas.push(id);
    _escrever(CHAVE_JOGADOR, jogador);
    return { ok: true };
  }

  function desafixarConquista(id) {
    const jogador = getPlayer();
    if (!jogador || !jogador.conquistasFixadas) return;
    jogador.conquistasFixadas = jogador.conquistasFixadas.filter((c) => c !== id);
    _escrever(CHAVE_JOGADOR, jogador);
  }

  /** resultado: { data, materia, dificuldade, pontos, acertos, total } */
  function salvarResultado(resultado) {
    const historico = getHistorico();
    historico.unshift(resultado);
    _escrever(CHAVE_HISTORICO, historico.slice(0, TAMANHO_HISTORICO));

    const melhores = getMelhores();
    const chave = `${resultado.materia}|${resultado.dificuldade}`;
    if (!melhores[chave] || resultado.pontos > melhores[chave].pontos) {
      melhores[chave] = resultado;
      _escrever(CHAVE_MELHORES, melhores);
    }

    addPontos(resultado.pontos);
    ganharXp(resultado.pontos);
    _registrarPartida(resultado.dificuldade);
  }

  return {
    getPlayer,
    hasPlayer,
    createPlayer,
    renomearJogador,
    setAvatar,
    removerAvatar,
    resetPlayer,
    addPontos,
    ganharXp,
    getNivel,
    getProgressoNivel,
    getHistorico,
    getMelhores,
    getContagemPartidas,
    getConquistasFixadas,
    fixarConquista,
    desafixarConquista,
    MAX_CONQUISTAS_FIXADAS,
    salvarResultado,
  };
})();

/* =========================================================================
   2) CONFIGURAÇÃO DO JOGO — dificuldades e matérias disponíveis
   ========================================================================= */
const DIFICULDADES = {
  'very-easy': { chave: 'very-easy', label: 'Very Easy', questoes: 5, tempoBase: 360, multiplicador: 1 },
  easy: { chave: 'easy', label: 'Easy', questoes: 10, tempoBase: 315, multiplicador: 2 },
  normal: { chave: 'normal', label: 'Normal', questoes: 20, tempoBase: 270, multiplicador: 3 },
  hard: { chave: 'hard', label: 'Hard', questoes: 40, tempoBase: 225, multiplicador: 6 },
  extreme: { chave: 'extreme', label: 'Extreme', questoes: 80, tempoBase: 180, multiplicador: 12 },
};

const MATERIAS = {
  geral: { chave: 'geral', label: 'Geral', filtro: null },
  matematica: { chave: 'matematica', label: 'Matemática', filtro: 'Matemática' },
  natureza: { chave: 'natureza', label: 'Ciências da Natureza', filtro: 'Ciências da Natureza' },
  linguagens: { chave: 'linguagens', label: 'Linguagens', filtro: 'Linguagens' },
  humanas: { chave: 'humanas', label: 'Ciências Humanas', filtro: 'Ciências Humanas' },
};

const MAX_TENTATIVAS_ERRADAS = 3;

/* =========================================================================
   3) GAMEENGINE — seleção de questões, cronômetro e pontuação
   -------------------------------------------------------------------------
   FÓRMULA DE PONTUAÇÃO: resposta certa ainda dentro dos primeiros
   25% do tempo gasto (T > 75% de B) dá pontuação cheia; depois disso a
   pontuação decai junto com o tempo restante; tempo esgotado = 0.
   Divide pelo nº de erros na questão + 1 (errar penaliza) e multiplica
   pela dificuldade. Ajustável em calcularPonto()
   ========================================================================= */
const GameEngine = (() => {

  const ARQUIVOS_DE_QUESTOES = [
    //'data/enem_2021.json',
    'data/enem_2022.json',
    'data/enem_2023.json',
    //'data/enem_2024.json',
  ];

  let todasQuestoes = [];
  let estado = null;
  let callbacks = {};

  async function carregarQuestoes() {
    if (todasQuestoes.length) return todasQuestoes;

    const resultados = await Promise.all(
      ARQUIVOS_DE_QUESTOES.map(async (caminho) => {
        try {
          const resp = await fetch(caminho);
          if (!resp.ok) {
            console.warn(`sistema.js: não consegui carregar "${caminho}" (HTTP ${resp.status}).`);
            return [];
          }
          return await resp.json();
        } catch (erro) {
          console.warn(`sistema.js: erro ao carregar "${caminho}".`, erro);
          return [];
        }
      })
    );

    todasQuestoes = resultados.flat();
    if (todasQuestoes.length === 0) {
      throw new Error('Não foi possível carregar o banco de questões.');
    }
    return todasQuestoes;
  }

  function contarDisponiveis(materiaKey) {
    const filtro = MATERIAS[materiaKey].filtro;
    if (!filtro) return todasQuestoes.length;
    return todasQuestoes.filter((q) => q.materia === filtro).length;
  }

  function _embaralhar(array) {
    const copia = array.slice();
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  /** Retorna o número real de questões da partida (pode ser menor que o pedido) */
  function iniciarJogo(dificuldadeKey, materiaKey) {
    const dificuldade = DIFICULDADES[dificuldadeKey];
    const filtro = MATERIAS[materiaKey].filtro;
    const pool = filtro ? todasQuestoes.filter((q) => q.materia === filtro) : todasQuestoes;
    const selecionadas = _embaralhar(pool).slice(0, dificuldade.questoes);

    estado = {
      questoes: selecionadas,
      idx: 0,
      pontosTotal: 0,
      acertos: 0,
      erros: 0,
      dificuldadeKey,
      materiaKey,
      timerId: null,
      tempoRestante: dificuldade.tempoBase,
      errosQuestaoAtual: 0,
      respondida: false,
    };
    return estado.questoes.length;
  }

  /**
   * Modo livre / debug: carrega UMA questão específica (por ano + número),
   * sem cronômetro e sem afetar XP, pontos totais, histórico ou conquistas
   * Serve só pra conferir se o enunciado/gabarito de uma questão está correto
   */
  function iniciarModoLivre(ano, numeroQuestao) {
    const questao = todasQuestoes.find((q) => q.ano === ano && q.questao === numeroQuestao);
    if (!questao) return false;

    estado = {
      questoes: [questao],
      idx: 0,
      pontosTotal: 0,
      acertos: 0,
      erros: 0,
      dificuldadeKey: null,
      materiaKey: null,
      timerId: null,
      tempoRestante: 0,
      errosQuestaoAtual: 0,
      respondida: false,
      modoLivre: true,
    };
    return true;
  }

  function estaEmModoLivre() {
    return !!(estado && estado.modoLivre);
  }

  /** Lista os anos disponíveis no banco carregado, em ordem */
  function listarAnosDisponiveis() {
    return [...new Set(todasQuestoes.map((q) => q.ano))].sort((a, b) => a - b);
  }

  /** Questões de um ano, só com o essencial pra montar o seletor (número + matéria) */
  function listarQuestoesDoAno(ano) {
    return todasQuestoes
      .filter((q) => q.ano === ano)
      .map((q) => ({ questao: q.questao, materia: q.materia }))
      .sort((a, b) => a.questao - b.questao);
  }

  function onEvento(handlers) {
    callbacks = handlers || {};
  }

  function questaoAtual() { return estado.questoes[estado.idx]; }
  function totalQuestoes() { return estado.questoes.length; }
  function indiceAtual() { return estado.idx; }
  function pontosAcumulados() { return estado.pontosTotal; }

  function pararTimer() {
    if (estado.timerId) clearInterval(estado.timerId);
    estado.timerId = null;
  }

  function iniciarTimerQuestao() {
    pararTimer();
    estado.errosQuestaoAtual = 0;
    estado.respondida = false;

    // modo livre não tem cronômetro — avisa a tela uma vez (tempo=null é o sinal) e para por aqui
    if (estado.modoLivre) {
      if (callbacks.onTick) callbacks.onTick(null, null);
      return;
    }

    const dificuldade = DIFICULDADES[estado.dificuldadeKey];
    estado.tempoRestante = dificuldade.tempoBase;

    if (callbacks.onTick) callbacks.onTick(estado.tempoRestante, dificuldade.tempoBase);

    estado.timerId = setInterval(() => {
      estado.tempoRestante -= 1;
      if (callbacks.onTick) callbacks.onTick(estado.tempoRestante, dificuldade.tempoBase);
      if (estado.tempoRestante <= 0) _finalizarQuestaoPorTempo();
    }, 1000);
  }

  function calcularPonto(tempoRestante) {
    const dificuldade = DIFICULDADES[estado.dificuldadeKey];
    const B = dificuldade.tempoBase;
    const T = Math.max(tempoRestante, 0);
    let X;
    if (T > B * 0.75) X = B;
    else if (T > 0) X = T;
    else X = 0;
    return Math.round((X / (1 + estado.errosQuestaoAtual)) * dificuldade.multiplicador);
  }

  /** letra: 'A' | 'B' | 'C' | 'D' | 'E' */
  function responder(letra) {
    if (!estado || estado.respondida) return null;
    const questao = questaoAtual();
    const acertou = letra === questao.resposta;

    if (acertou) {
      estado.respondida = true;
      pararTimer();
      // modo livre não pontua (não há dificuldade nem tempo base pra calcular)
      const pontos = estado.modoLivre ? 0 : calcularPonto(estado.tempoRestante);
      estado.pontosTotal += pontos;
      estado.acertos += 1;
      return { correta: true, pontos, respostaCorreta: questao.resposta };
    }

    estado.erros += 1;
    estado.errosQuestaoAtual += 1;

    if (estado.errosQuestaoAtual >= MAX_TENTATIVAS_ERRADAS) {
      estado.respondida = true;
      pararTimer();
      return { correta: false, esgotouTentativas: true, pontos: 0, respostaCorreta: questao.resposta };
    }

    return {
      correta: false,
      esgotouTentativas: false,
      tentativasRestantes: MAX_TENTATIVAS_ERRADAS - estado.errosQuestaoAtual,
    };
  }

  function _finalizarQuestaoPorTempo() {
    if (!estado || estado.respondida) return;
    estado.respondida = true;
    pararTimer();
    if (callbacks.onTempoEsgotado) callbacks.onTempoEsgotado(questaoAtual());
  }

  /** Avança para a próxima questão. Retorna null se o jogo continua, ou o resultado final */
  function avancar() {
    estado.idx += 1;
    if (estado.idx >= estado.questoes.length) return finalizarJogo();
    iniciarTimerQuestao();
    return null;
  }

  function finalizarJogo() {
    pararTimer();
    return {
      data: new Date().toISOString(),
      materia: MATERIAS[estado.materiaKey].label,
      dificuldade: DIFICULDADES[estado.dificuldadeKey].label,
      pontos: estado.pontosTotal,
      acertos: estado.acertos,
      total: estado.questoes.length,
    };
  }

  return {
    carregarQuestoes,
    contarDisponiveis,
    iniciarJogo,
    iniciarModoLivre,
    estaEmModoLivre,
    listarAnosDisponiveis,
    listarQuestoesDoAno,
    onEvento,
    questaoAtual,
    totalQuestoes,
    indiceAtual,
    pontosAcumulados,
    iniciarTimerQuestao,
    responder,
    avancar,
    calcularPonto,
  };
})();

/* =========================================================================
   4) CONQUISTAS — medalhas por quantidade de partidas jogadas
   ------------------------------------------------------------------------- */

const Conquistas = (() => {
  // ---------------------------------------------------------------------
  // TIPO 1 — quantidade de PARTIDAS jogadas (medalhas Bronze → Master)
  // Existe um conjunto pra "partidas totais" e outro pra cada dificuldade
  // ---------------------------------------------------------------------
  const TIERS = [
    { minimo: 1, nome: 'Bronze', icone: '🥉' },
    { minimo: 5, nome: 'Silver', icone: '🥈' },
    { minimo: 10, nome: 'Gold', icone: '🥇' },
    { minimo: 20, nome: 'Master', icone: '👑' },
  ];

  // ---------------------------------------------------------------------
  // TIPO 3 — NÍVEL do jogador: a conquista sai quando o nível chega no valor.
  // Pra mudar/adicionar um nível basta mexer nessa lista
  // ---------------------------------------------------------------------
  const NIVEIS = [
    { nivel: 10, icone: '⭐' },
    { nivel: 25, icone: '🌟' },
    { nivel: 50, icone: '🚀' },
    { nivel: 100, icone: '🏆' },
  ];

  // Grupos da página de conquistas, na ordem em que aparecem
  // contagemChave = qual contador de partidas alimenta as medalhas do grupo
  // (null = o grupo não usa contador de partidas)
  // As conquistas de PONTUAÇÃO (tipo 2) entram dentro do grupo da própria dificuldade
  const CATEGORIAS = [
    { chave: 'geral', label: 'Partidas totais', contagemChave: 'total' },
    { chave: 'very-easy', label: 'Very Easy', contagemChave: 'Very Easy' },
    { chave: 'easy', label: 'Easy', contagemChave: 'Easy' },
    { chave: 'normal', label: 'Normal', contagemChave: 'Normal' },
    { chave: 'hard', label: 'Hard', contagemChave: 'Hard' },
    { chave: 'extreme', label: 'Extreme', contagemChave: 'Extreme' },
    { chave: 'nivel', label: 'Nível', contagemChave: null },
  ];

  /** 1800 → "1.800" (milhar com ponto) */
  function _formatar(numero) {
    return numero.toLocaleString('pt-BR');
  }

  function _construirLista() {
    const lista = [];

    // ---- TIPO 1: partidas jogadas ----
    CATEGORIAS.filter((cat) => cat.contagemChave).forEach((cat) => {
      TIERS.forEach((tier) => {
        const partidaTexto = tier.minimo === 1 ? '1 partida' : `${tier.minimo} partidas`;
        lista.push({
          id: `${cat.chave}-${tier.nome.toLowerCase()}`,
          nome: tier.nome,
          descricao:
            cat.chave === 'geral'
              ? `Jogue ${partidaTexto}, em qualquer dificuldade.`
              : `Jogue ${partidaTexto} na dificuldade ${cat.label}.`,
          icone: tier.icone,
          categoria: cat.chave,
          categoriaLabel: cat.label,
          condicao: (dados) => (dados.contagem[cat.contagemChave] || 0) >= tier.minimo,
        });
      });
    });

    // ---- TIPO 2: pontuação feita em UMA partida, em cada dificuldade ----
    Object.values(DIFICULDADES).forEach((dif) => {
      // pontuação máxima = acertar todas de primeira, no primeiro quarto do tempo:
      // questões × tempo base × multiplicador (ex.: Very Easy = 5 × 360 × 1 = 1800)
      const maximo = dif.questoes * dif.tempoBase * dif.multiplicador;
      const metas = [
        {
          sufixo: 'metade',
          nome: 'Meio caminho',
          icone: '🎯',
          pontos: maximo / 2,
          descricao: `Faça ${_formatar(maximo / 2)} pontos (metade do máximo) em uma partida ${dif.label}.`,
        },
        {
          sufixo: 'maximo',
          nome: 'Pontuação máxima',
          icone: '💯',
          pontos: maximo,
          descricao: `Faça a pontuação máxima (${_formatar(maximo)} pontos) em uma partida ${dif.label}.`,
        },
      ];
      metas.forEach((meta) => {
        lista.push({
          id: `${dif.chave}-pontos-${meta.sufixo}`,
          nome: meta.nome,
          descricao: meta.descricao,
          icone: meta.icone,
          categoria: dif.chave,
          categoriaLabel: dif.label,
          condicao: (dados) => (dados.melhorPontuacao[dif.label] || 0) >= meta.pontos,
        });
      });
    });

    // ---- TIPO 3: nível ----
    NIVEIS.forEach((item) => {
      lista.push({
        id: `nivel-${item.nivel}`,
        nome: `Nível ${item.nivel}`,
        descricao: `Alcance o nível ${item.nivel}.`,
        icone: item.icone,
        categoria: 'nivel',
        categoriaLabel: 'Nível',
        condicao: (dados) => dados.nivel >= item.nivel,
      });
    });

    return lista;
  }

  const LISTA = _construirLista();

  /**
   * Junta tudo que as condições precisam saber sobre o jogador
   * melhorPontuacao: maior pontuação já feita em cada dificuldade, em qualquer matéria */
  function _lerDados() {
    const melhorPontuacao = {};
    Object.values(PlayerStore.getMelhores()).forEach((resultado) => {
      if (resultado.pontos > (melhorPontuacao[resultado.dificuldade] || 0)) {
        melhorPontuacao[resultado.dificuldade] = resultado.pontos;
      }
    });
    return {
      contagem: PlayerStore.getContagemPartidas(),
      melhorPontuacao,
      nivel: PlayerStore.getNivel(),
    };
  }

  /** Devolve a lista completa com um campo extra `desbloqueada` (true/false) */
  function listarComStatus() {
    const dados = _lerDados();
    return LISTA.map((c) => ({ ...c, desbloqueada: c.condicao(dados) }));
  }

  /** Mesma lista, mas agrupada por categoria, na ordem de CATEGORIAS */
  function listarAgrupadas() {
    const todas = listarComStatus();
    return CATEGORIAS.map((cat) => ({
      categoria: cat.chave,
      label: cat.label,
      conquistas: todas.filter((c) => c.categoria === cat.chave),
    }));
  }

  return { listarComStatus, listarAgrupadas };
})();

/* =========================================================================
   SOM — música de fundo, efeito de "level up" e volume geral
   -------------------------------------------------------------------------
   - música (music.mp3): toca em loop durante uma partida. A cada segundo o
     jogo informa quanto tempo falta na questão e a música acelera pra
     passar a sensação de pressa (FAIXAS_TENSAO)
   - efeito (levelUP.mp3): toca uma vez por nível ganho. Se a partida fizer o
     jogador subir vários níveis (ex.: 5 → 10), toca 5 vezes, uma começando
     0,2 s depois da outra, sem esperar a anterior terminar (elas se
     sobrepõem)
   - volume: 0–100%, o mesmo pra música e pro efeito. Fica salvo no
     navegador e é controlado pelo ícone de som da navbar (navegacao.js)
   Se algum arquivo de áudio não existir, o jogo continua normal, só sem som
   ========================================================================= */
const Som = (() => {
  const ARQUIVO_MUSICA = 'assets/audio/music.mp3';
  const ARQUIVO_LEVELUP = 'assets/audio/levelUP.mp3';

  const CHAVE_VOLUME = 'enemgame_volume';
  const VOLUME_PADRAO = 5; // % usado até o jogador mexer no controle
  const INTERVALO_LEVELUP_MS = 200; // atraso entre um "level up" e o seguinte

  // Música sob pressão: quando o tempo que RESTA na questão cai até o limite
  // (fração do tempo total), a música passa a tocar mais rápido.
  // Ordem do menor limite pro maior: vale a primeira faixa em que couber
  const FAIXAS_TENSAO = [
    { ate: 0.1, velocidade: 1.5 }, // restam até 10% → +50%
    { ate: 0.15, velocidade: 1.4 }, // restam até 15% → +40%
    { ate: 0.2, velocidade: 1.3 }, // restam até 20% → +30%
    { ate: 0.25, velocidade: 1.2 }, // restam até 25% → +20%
  ];

  let volume = _lerVolume();
  let musica = null; 

  function _lerVolume() {
    try {
      const salvo = localStorage.getItem(CHAVE_VOLUME);
      if (salvo !== null && Number.isFinite(Number(salvo))) {
        return Math.min(100, Math.max(0, Math.round(Number(salvo))));
      }
    } catch (erro) {
      /* localStorage indisponível: usa o volume padrão */
    }
    return VOLUME_PADRAO;
  }

  function getVolume() {
    return volume;
  }

  /** porcento: 0 a 100. Aplica na hora (inclusive na música que já está tocando) e guarda. */
  function setVolume(porcento) {
    volume = Math.min(100, Math.max(0, Math.round(Number(porcento) || 0)));
    try {
      localStorage.setItem(CHAVE_VOLUME, String(volume));
    } catch (erro) {
      /* sem localStorage: vale só até fechar a página */
    }
    if (musica) musica.volume = volume / 100;
  }

  /** O navegador pode recusar o áudio (arquivo ausente, sem interação do usuário...): ignora em silêncio */
  function _tocar(audio) {
    const promessa = audio.play();
    if (promessa && promessa.catch) promessa.catch(() => {});
  }

  function iniciarMusica() {
    if (!musica) {
      musica = new Audio(ARQUIVO_MUSICA);
      musica.loop = true;
      // Por padrão o navegador acelera mantendo o tom (só o ritmo muda)
      // Pra a música ficar mais aguda ao acelerar, descomente a linha abaixo:
      // musica.preservesPitch = false;
    }
    musica.volume = volume / 100;
    musica.playbackRate = 1;
    musica.currentTime = 0;
    _tocar(musica);
  }

  function pararMusica() {
    if (!musica) return;
    musica.pause();
    musica.currentTime = 0;
    musica.playbackRate = 1;
  }

  /** fracaoRestante: tempo que falta ÷ tempo total da questão (1 = começo, 0 = acabou) */
  function velocidadePara(fracaoRestante) {
    const faixa = FAIXAS_TENSAO.find((f) => fracaoRestante <= f.ate);
    return faixa ? faixa.velocidade : 1;
  }

  /** Chamada a cada segundo da questão, com o tempo restante e o tempo total (em segundos) */
  function ajustarMusicaPeloTempo(restante, base) {
    if (!musica || !base) return;
    musica.playbackRate = velocidadePara(restante / base);
  }

  /** Volta ao ritmo normal (usado quando a questão termina, antes da próxima começar) */
  function velocidadeNormal() {
    if (musica) musica.playbackRate = 1;
  }

  /** Toca o efeito `vezes` vezes, cada uma começando 0,2 s depois da anterior (sobrepostas) */
  function tocarLevelUp(vezes) {
    const tocarUma = () => {
      const efeito = new Audio(ARQUIVO_LEVELUP); // um áudio novo por vez, pra poderem se sobrepor
      efeito.volume = volume / 100;
      _tocar(efeito);
    };
    for (let i = 0; i < vezes; i += 1) {
      if (i === 0) tocarUma(); // a primeira toca na hora
      else setTimeout(tocarUma, i * INTERVALO_LEVELUP_MS); // as outras, 0,2 s depois uma da outra
    }
  }

  return {
    getVolume,
    setVolume,
    iniciarMusica,
    pararMusica,
    velocidadePara,
    ajustarMusicaPeloTempo,
    velocidadeNormal,
    tocarLevelUp,
  };
})();
