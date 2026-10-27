/**
 * =========================================================================
 * Tudo que é comportamento da navbar, comum a TODAS as páginas:
 *   - preencher o nome do jogador (#navUserNome)
 *   - abrir/fechar o menu de configurações (engrenagem)
 *   - controle de volume (ícone de som)
 *   - ações do menu: Renomear e Deletar Progresso
 * =========================================================================
 */
const Navigation = (() => {
  /** Redireciona para index.html se não houver usuario salvo */
  function protegerPagina() {
    if (!PlayerStore.hasPlayer()) {
      window.location.href = 'index.html';
    }
  }

  /** Preenche o nome e a foto do jogador na navbar (#navUserNome / #navAvatar)*/
  function preencherNavbar() {
    const jogador = PlayerStore.getPlayer();

    const elNome = document.getElementById('navUserNome');
    if (elNome) elNome.textContent = jogador ? jogador.nome : 'Visitante';

    const elAvatar = document.getElementById('navAvatar');
    if (elAvatar) {
      elAvatar.style.backgroundImage = jogador && jogador.avatar ? `url("${jogador.avatar}")` : '';
    }
  }

  /** Liga o botão de engrenagem, o menu que abre, e os itens Renomear / Deletar Progresso */
  function configurarMenuConfiguracoes() {
    const btnToggle = document.getElementById('btnSettingsToggle');
    const menu = document.getElementById('settingsMenu');
    const btnRenomear = document.getElementById('btnRenomear');
    const btnDeletar = document.getElementById('btnDeletarSave');
    if (!btnToggle || !menu) return;

    btnToggle.addEventListener('click', (evento) => {
      evento.stopPropagation();
      const abrindo = menu.style.display !== 'block';
      menu.style.display = abrindo ? 'block' : 'none';
      const menuVolume = document.getElementById('volumeMenu');
      if (menuVolume) menuVolume.style.display = 'none'; // um menu aberto por vez
    });

    // clique fora do menu fecha
    document.addEventListener('click', (evento) => {
      if (!menu.contains(evento.target) && evento.target !== btnToggle) {
        menu.style.display = 'none';
      }
    });

    if (btnRenomear) {
      btnRenomear.addEventListener('click', () => {
        if (!PlayerStore.hasPlayer()) return;
        const nomeAtual = PlayerStore.getPlayer().nome;
        const novoNome = window.prompt('Novo nome de jogador:', nomeAtual);
        if (novoNome === null) return; // cancelou
        if (novoNome.trim().length < 2) {
          window.alert('Digite um nome com pelo menos 2 letras.');
          return;
        }
        PlayerStore.renomearJogador(novoNome);
        preencherNavbar();
        menu.style.display = 'none';
      });
    }

    if (btnDeletar) {
      btnDeletar.addEventListener('click', () => {
        if (!PlayerStore.hasPlayer()) return;
        const confirmou = window.confirm(
          'Isso apaga seu nome, pontos e histórico permanentemente. Deseja continuar?'
        );
        if (!confirmou) return;
        PlayerStore.resetPlayer();
        window.location.href = 'index.html';
      });
    }
  }

  /** Liga o ícone de som: abre/fecha o controle de volume (0–100%) e guarda o valor escolhido */
  function configurarVolume() {
    const btnToggle = document.getElementById('btnVolumeToggle');
    const menu = document.getElementById('volumeMenu');
    const slider = document.getElementById('volumeSlider');
    const rotulo = document.getElementById('volumeValor');
    if (!btnToggle || !menu || !slider) return;

    /** Mostra o volume atual no controle: posição do slider, "xx%" e ícone apagado se estiver mudo */
    function mostrarVolume(valor) {
      slider.value = valor;
      if (rotulo) rotulo.textContent = `${valor}%`;
      btnToggle.classList.toggle('mudo', valor === 0);
    }
    mostrarVolume(Som.getVolume());

    btnToggle.addEventListener('click', (evento) => {
      evento.stopPropagation();
      const abrindo = menu.style.display !== 'flex';
      menu.style.display = abrindo ? 'flex' : 'none';
      const menuConfig = document.getElementById('settingsMenu');
      if (menuConfig) menuConfig.style.display = 'none'; // um menu aberto por vez
    });

    // clique fora do controle fecha 
    document.addEventListener('click', (evento) => {
      if (!menu.contains(evento.target) && evento.target !== btnToggle) {
        menu.style.display = 'none';
      }
    });

    slider.addEventListener('input', () => {
      Som.setVolume(slider.value);
      mostrarVolume(Som.getVolume());
    });
  }

  return { protegerPagina, preencherNavbar, configurarMenuConfiguracoes, configurarVolume };
})();

document.addEventListener('DOMContentLoaded', () => {
  Navigation.preencherNavbar();
  Navigation.configurarMenuConfiguracoes();
  Navigation.configurarVolume();
});
