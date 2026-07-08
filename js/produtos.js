(function () {
  var CSV_URL = './assets/PRODUTOS_FORNECEDORES_CAMPANHA.csv';
  var PAGE_SIZE = 15;

  var estado = {
    todos: [],
    filtrados: [],
    pagina: 1,
    ordemChave: null,
    ordemAsc: true,
  };

  var elBusca = document.getElementById('produtosBusca');
  var elCorpo = document.getElementById('produtosCorpo');
  var elInfo = document.getElementById('produtosInfo');
  var elPaginacao = document.getElementById('produtosPaginacao');
  var elTabela = document.getElementById('produtosTabela');

  if (!elCorpo) return;

  function normalizar(txt) {
    return (txt || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function normalizarChaveCabecalho(cabecalho) {
    return cabecalho
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
  }

  function parseCSV(texto) {
    var linhas = [];
    var linhaAtual = [];
    var campoAtual = '';
    var dentroAspas = false;

    for (var i = 0; i < texto.length; i++) {
      var char = texto[i];
      var proximo = texto[i + 1];

      if (dentroAspas) {
        if (char === '"' && proximo === '"') {
          campoAtual += '"';
          i++;
        } else if (char === '"') {
          dentroAspas = false;
        } else {
          campoAtual += char;
        }
      } else {
        if (char === '"') {
          dentroAspas = true;
        } else if (char === ';') {
          linhaAtual.push(campoAtual);
          campoAtual = '';
        } else if (char === '\r') {
          // ignora, tratado no \n
        } else if (char === '\n') {
          linhaAtual.push(campoAtual);
          linhas.push(linhaAtual);
          linhaAtual = [];
          campoAtual = '';
        } else {
          campoAtual += char;
        }
      }
    }

    if (campoAtual.length > 0 || linhaAtual.length > 0) {
      linhaAtual.push(campoAtual);
      linhas.push(linhaAtual);
    }

    return linhas.filter(function (linha) {
      return linha.some(function (campo) {
        return campo.trim() !== '';
      });
    });
  }

  function csvParaObjetos(texto) {
    var linhas = parseCSV(texto);
    if (linhas.length === 0) return [];

    var cabecalhos = linhas[0].map(normalizarChaveCabecalho);

    return linhas.slice(1).map(function (linha) {
      var obj = {};
      cabecalhos.forEach(function (chave, idx) {
        if (!chave) return;
        obj[chave] = (linha[idx] || '').trim();
      });
      return obj;
    });
  }

  function badgeParaValor(valor) {
    var v = normalizar(valor);
    if (!v) return '<span class="badge badge-neutro">—</span>';

    if (/^(ativ|aprov|liberad|ok|dispon)/.test(v)) {
      return '<span class="badge badge-ok">' + escapeHtml(valor) + '</span>';
    }
    if (/(pendent|analise|aguard)/.test(v)) {
      return '<span class="badge badge-warn">' + escapeHtml(valor) + '</span>';
    }
    if (/(inativ|cancel|reprov|bloquead|suspens)/.test(v)) {
      return '<span class="badge badge-off">' + escapeHtml(valor) + '</span>';
    }
    return '<span class="badge badge-neutro">' + escapeHtml(valor) + '</span>';
  }

  function escapeHtml(txt) {
    var div = document.createElement('div');
    div.textContent = txt == null ? '' : txt;
    return div.innerHTML;
  }

  function renderizarTabela() {
    var inicio = (estado.pagina - 1) * PAGE_SIZE;
    var pagina = estado.filtrados.slice(inicio, inicio + PAGE_SIZE);

    if (pagina.length === 0) {
      elCorpo.innerHTML = '<tr><td colspan="5" class="produtos-estado">Nenhum produto encontrado para a busca informada.</td></tr>';
    } else {
      elCorpo.innerHTML = pagina
        .map(function (item) {
          return (
            '<tr>' +
            '<td>' + escapeHtml(item.NOME_PRODUTO) + '</td>' +
            '<td>' + escapeHtml(item.RAZAO) + '</td>' +
            '</tr>'
          );
        })
        .join('');
    }

    var total = estado.filtrados.length;
    var totalGeral = estado.todos.length;
    if (total === totalGeral) {
      elInfo.innerHTML = '<strong>' + total + '</strong> produtos participantes';
    } else {
      elInfo.innerHTML = '<strong>' + total + '</strong> de ' + totalGeral + ' produtos';
    }

    renderizarPaginacao();
  }

  function renderizarPaginacao() {
    var totalPaginas = Math.max(1, Math.ceil(estado.filtrados.length / PAGE_SIZE));
    if (estado.pagina > totalPaginas) estado.pagina = totalPaginas;

    if (totalPaginas <= 1) {
      elPaginacao.innerHTML = '';
      return;
    }

    var html = '';
    html += '<button data-pagina="' + (estado.pagina - 1) + '" ' + (estado.pagina === 1 ? 'disabled' : '') + '>&larr; Anterior</button>';

    var janela = 2;
    for (var p = 1; p <= totalPaginas; p++) {
      if (p === 1 || p === totalPaginas || Math.abs(p - estado.pagina) <= janela) {
        html += '<button data-pagina="' + p + '" class="' + (p === estado.pagina ? 'ativo' : '') + '">' + p + '</button>';
      } else if (Math.abs(p - estado.pagina) === janela + 1) {
        html += '<span>...</span>';
      }
    }

    html += '<button data-pagina="' + (estado.pagina + 1) + '" ' + (estado.pagina === totalPaginas ? 'disabled' : '') + '>Próxima &rarr;</button>';

    elPaginacao.innerHTML = html;

    elPaginacao.querySelectorAll('button[data-pagina]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        estado.pagina = parseInt(btn.getAttribute('data-pagina'), 10);
        renderizarTabela();
        elTabela.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  function aplicarFiltro() {
    var termo = normalizar(elBusca ? elBusca.value : '');

    estado.filtrados = !termo
      ? estado.todos.slice()
      : estado.todos.filter(function (item) {
          return (
            normalizar(item.NOME_PRODUTO).indexOf(termo) !== -1 ||
            normalizar(item.RAZAO).indexOf(termo) !== -1
          );
        });

    if (estado.ordemChave) {
      ordenar(estado.ordemChave, true);
    }

    estado.pagina = 1;
    renderizarTabela();
  }


  function iniciarOrdenacao() {
    if (!elTabela) return;
  }

  function carregar() {
    fetch(CSV_URL)
      .then(function (resp) {
        if (!resp.ok) throw new Error('Arquivo de produtos não encontrado (' + resp.status + ')');
        return resp.text();
      })
      .then(function (texto) {
        estado.todos = csvParaObjetos(texto);
        estado.filtrados = estado.todos.slice();

        if (estado.todos.length === 0) {
          elCorpo.innerHTML = '<tr><td colspan="5" class="produtos-estado">Nenhum produto cadastrado no momento.</td></tr>';
          elInfo.textContent = '';
          return;
        }

        renderizarTabela();
      })
      .catch(function (erro) {
        elCorpo.innerHTML =
          '<tr><td colspan="5" class="produtos-estado erro">Não foi possível carregar a lista de produtos no momento. Tente novamente em instantes.</td></tr>';
        elInfo.textContent = '';
        console.warn('[produtos] ' + erro.message);
      });
  }

  if (elBusca) {
    elBusca.addEventListener('input', aplicarFiltro);
  }

  iniciarOrdenacao();
  carregar();
})();
