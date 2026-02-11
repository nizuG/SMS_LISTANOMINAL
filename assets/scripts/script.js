/* ================= ELEMENTOS ================= */
const info = document.getElementById("info");
const tabelaContainer = document.getElementById("tabela");
const filtro = document.getElementById("filtro");
const filtroIndicador = document.getElementById("filtro-indicador");
const filtroStatus = document.getElementById("filtro-status");
const filtroTexto = document.getElementById("filtro-texto");

let dicionarioGlobais = [];
let indicadorAtual = "";
let dadosOriginais = [];
let dadosEquipe = [];
let dadosGlobais = [];
let debounceBusca;

/* ================= EQUIPES ================= */
const equipes = [
  { codigo: "0002233843", nome: "EAP CSII" },
  { codigo: "0002396068", nome: "EAP CSII 02" },
  { codigo: "0002396033", nome: "ESF CSII" },
  { codigo: "0001695223", nome: "ESF Estação" },
  { codigo: "0002555913", nome: "ESF Estação 02" },
  { codigo: "0002317206", nome: "EAP Estação 02" },
  { codigo: "0002143143", nome: "EAP Estação" },
  { codigo: "0002317184", nome: "EAP Mathias 02" },
  { codigo: "0002140004", nome: "EAP Mathias" },
  { codigo: "0002555905", nome: "ESF Mathias 02" },
  { codigo: "0001695231", nome: "ESF Mathias" },
  { codigo: "0002426005", nome: "ESF Santana" },
  { codigo: "0000349186", nome: "ESF Caporanga" },
  { codigo: "0000349151", nome: "ESF Aureliana 02" },
  { codigo: "0000349178", nome: "ESF Aureliana" },
  { codigo: "0000349100", nome: "ESF Fabiano 02" },
  { codigo: "0000349097", nome: "ESF Fabiano" },
  { codigo: "0001603957", nome: "ESF São João" },
  { codigo: "0001520857", nome: "ESF Parque" },
];

function obterNomeEquipe(codigo) {
  if (!codigo) return "Município";
  const eq = equipes.find(e => e.codigo === codigo.trim());
  return eq ? eq.nome : codigo;
}

/* ================= FILTROS ================= */
filtroIndicador.addEventListener("change", aplicarFiltrosCombinados);
filtroStatus.addEventListener("change", aplicarFiltrosCombinados);
filtroTexto.addEventListener("input", () => {
  clearTimeout(debounceBusca);
  tabelaContainer.style.opacity = "0.4";
  debounceBusca = setTimeout(() => {
    aplicarFiltrosCombinados();
    tabelaContainer.style.opacity = "1";
  }, 180);
});

/* ================= FUNÇÕES DE EXIBIÇÃO ================= */
function atualizarInfo(meta, totalRegistros) {
  info.innerHTML = `
    <span class="item"><strong>Competência:</strong> ${meta.competencia || "-"}</span>
    <span class="item"><strong>Indicador:</strong> ${meta.indicador || "-"}</span>
    <span class="item"><strong>Registros:</strong> ${totalRegistros}</span>
  `;
}

dadosEquipe.forEach(obj => {
  if (!obj.CPF && obj.cpf) obj.CPF = obj.cpf;
  if (!obj.CNS && obj.cns) obj.CNS = obj.cns;
});

function exibirDados(dados) {
  const container = document.getElementById("tabela");

  if (!dados || !dados.length) {
    container.innerHTML = "<p>Nenhum dado para exibir</p>";
    return;
  }

  let html = "<table><thead><tr>";

  Object.keys(dados[0]).forEach((coluna) => {
    html += `<th>${coluna}</th>`;
  });

  html += "</tr></thead><tbody>";

  dados.forEach((linha) => {
    html += "<tr>";
    Object.values(linha).forEach((valor) => {
      html += `<td>${valor}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

function exibirDicionario(lista) {
  const container = document.getElementById("dicionario");

  if (!lista || !lista.length) {
    container.innerHTML = "";
    return;
  }

  let html = "<strong>Dicionário:</strong><ul>";
  lista.forEach((item) => {
    html += `<li><strong>${item.coluna}</strong>: ${item.descricao}</li>`;
  });
  html += "</ul>";
  container.innerHTML = html;
}

// ================= FUNÇÕES CSV/XLSX UNIFICADAS =================
function carregarDados(dados, meta) {
  dadosOriginais = dados;
  dadosEquipe = [...dados];
  dadosGlobais = [...dados];

  // Dicionário
  dicionarioGlobais = extrairDicionarioCSV(dados);
  exibirDicionario(dicionarioGlobais);

  atualizarEstadoFiltroStatus();
  exibirDados(dados);
  atualizarInfo(meta, dados.length);
  configurarFiltroEquipe(meta, dados);

  const percentuais = calcularPercentuaisUnificado(dados);
  exibirIndicadores(percentuais);
  gerarOpcoesFiltro(dados);
  filtro.style.display = 'block';
}


/* ================= INDICADORES ================= */
function valorValido(v) {
  if (v === null || v === undefined) return false;
  const valor = String(v).trim().toUpperCase();
  return valor === "X" || valor === "1" || valor === "TRUE";
}

function calcularPercentuaisUnificado(dados) {
  if (!dados.length) return [];
  const colunas = Object.keys(dados[0]);
  const colNM = colunas.filter(c => c.startsWith("NM."));
  const colSimples = colunas.filter(c => /^[A-Z]$/.test(c));

  const resultado = [];

  if (colNM.length) {
    colNM.forEach(nm => {
      const letra = nm.split(".")[1];
      const dn = `DN.${letra}`;
      let atingiu = 0, total = 0;
      dados.forEach(linha => {
        if (valorValido(linha[dn])) {
          total++;
          if (valorValido(linha[nm])) atingiu++;
        }
      });
      resultado.push({ indicador: letra, total, atingiu, percentual: total ? Math.round((atingiu / total) * 100) : 0 });
    });
  } else {
    colSimples.forEach(c => {
      let atingiu = 0, total = dados.length;
      dados.forEach(linha => { if (valorValido(linha[c])) atingiu++; });
      resultado.push({ indicador: c, total, atingiu, percentual: total ? Math.round((atingiu / total) * 100) : 0 });
    });
  }

  return resultado;
}

function exibirIndicadores(percentuais) {
  const container = document.getElementById("indicadores");
  if (!percentuais || !percentuais.length) {
    container.innerHTML = "<p>Nenhum indicador para exibir</p>";
    return;
  }

  let html = "";
  percentuais.forEach(item => {
    html += `
      <div class="indicador">
        <span class="letra">${item.indicador}</span>
        <div class="barra-fundo">
          <div class="barra" style="width: ${item.percentual}%"></div>
        </div>
        <span class="percentual">${item.percentual}%</span>
      </div>`;
  });
  container.innerHTML = html;
}

/* ================= FILTROS ================= */
function verificarStatusIndicador(linha, indicador, status) {
  if (indicador.startsWith("NM.")) {
    const letra = indicador.split(".")[1];
    const dn = linha[`DN.${letra}`] ?? linha[`DM.${letra}`];
    const nm = linha[`NM.${letra}`];
    if (!valorValido(dn)) return false;
    if (status === "atingiu") return valorValido(nm);
    if (status === "vazio") return !valorValido(nm);
    return true;
  }
  const valor = linha[indicador];
  if (valor === undefined) return false;
  if (status === "atingiu") return valorValido(valor);
  if (status === "vazio") return !valorValido(valor);
  return true;
}

function aplicarFiltrosCombinados() {
  let dados = [...dadosEquipe];
  const indicador = filtroIndicador.value;
  const status = filtroStatus.value;
  const texto = filtroTexto.value.trim().replace(/\D/g, "");

  if (indicador) dados = dados.filter(l => verificarStatusIndicador(l, indicador, status));
  if (texto) dados = dados.filter(l => (l.CPF?.replace(/\D/g,"")?.includes(texto)) || (l.CNS?.replace(/\D/g,"")?.includes(texto)));

  exibirDados(dados);
}

function gerarOpcoesFiltro(dados) {
  if (!dados.length) return;
  const colunas = Object.keys(dados[0]);
  const usarNM = indicadorAtual === "Cuidado da mulher e do homem transgênero na prevenção do câncer";
  let indicadores = usarNM ? colunas.filter(c => /^NM\.[A-Z]$/i.test(c)) : colunas.filter(c => /^[A-Z]$/.test(c));
  filtroIndicador.innerHTML = '<option value="">Todos</option>';
  indicadores.forEach(i => {
    const opt = document.createElement("option");
    let texto = i;
    if (usarNM) texto += ` (${contarValidosIndicador(dados, i)} válidos)`;
    opt.value = i; opt.textContent = texto;
    filtroIndicador.appendChild(opt);
  });
}

function contarValidosIndicador(dados, indicador) {
  const letra = indicador.split(".")[1];
  return dados.reduce((acc, l) => acc + (valorValido(l[`DN.${letra}`] ?? l[`DM.${letra}`]) ? 1 : 0), 0);
}

/* ================= FILTRO POR EQUIPE ================= */
function configurarFiltroEquipe(meta, dados) {
  const selectEquipe = document.getElementById("select-equipe");
  if (!selectEquipe) return;
  selectEquipe.innerHTML = '<option value="">Todas</option>';
  const col = Object.keys(dados[0] || {}).find(c => ["INE","CNES"].includes(c));
  if (!col) return;
  [...new Set(dados.map(l => l[col]).filter(Boolean))].forEach(c => {
    const opt = document.createElement("option");
    opt.value = c; opt.textContent = obterNomeEquipe(c);
    selectEquipe.appendChild(opt);
  });
}

function aplicarFiltroEquipe() {
  const select = document.getElementById("select-equipe");
  if (!select) return;
  const codigo = select.value;
  dadosEquipe = codigo ? dadosOriginais.filter(l => l.INE === codigo || l.CNES === codigo) : [...dadosOriginais];
  dadosGlobais = [...dadosEquipe];
  exibirIndicadores(calcularPercentuaisUnificado(dadosEquipe));
  gerarOpcoesFiltro(dadosEquipe);
  aplicarFiltrosCombinados();
  atualizarInfo({ competencia: "-", indicador: "-" }, dadosEquipe.length);
}
