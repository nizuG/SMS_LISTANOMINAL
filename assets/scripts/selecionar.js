// selecionar.js
document.addEventListener('DOMContentLoaded', async () => {
  const selectCompetencia = document.getElementById('select-competencia');
  const selectIndicador = document.getElementById('select-indicador');
  const btnProcessar = document.getElementById('btn-processar');

  let arquivos = [];

  try {
    // Busca lista de arquivos do backend
    const res = await fetch('http://localhost:3000/listar');
    arquivos = await res.json();

    // Preenche competências únicas
    const competencias = [...new Set(arquivos.map(a => a.competencia))];
    competencias.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      selectCompetencia.appendChild(opt);
    });

    // Atualiza indicadores ao mudar a competência
    selectCompetencia.addEventListener('change', () => {
      const comp = selectCompetencia.value;
      selectIndicador.innerHTML = '<option value="">Selecione</option>';

      const indicadores = [...new Set(
        arquivos
          .filter(a => a.competencia === comp)
          .map(a => a.indicador)
      )];

      indicadores.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        selectIndicador.appendChild(opt);
      });
    });

    // Processa seleção e exibe os dados
    btnProcessar.addEventListener('click', async () => {
      const comp = selectCompetencia.value;
      const ind = selectIndicador.value;

      if (!comp || !ind) {
        alert('Selecione competência e indicador');
        return;
      }

      try {
        const res = await fetch(`http://localhost:3000/dados?competencia=${comp}&indicador=${encodeURIComponent(ind)}`);

        if (!res.ok) {
          const texto = await res.text();
          console.error("Erro ao buscar dados:", texto);
          alert('Dados não encontrados para essa competência/indicador');
          return;
        }

        const dadosBrutos = await res.json();
        let dados = [];

        // Detecta tipo de dados (CSV ou XLSX)
        if (Array.isArray(dadosBrutos)) {
          // Se CSV já processado ou XLSX convertido
          dados = dadosBrutos.map(linha => {
            const novaLinha = {};
            for (const key in linha) {
              const chave = key.replace(/^\uFEFF/, '').trim();
              novaLinha[chave] = linha[key]?.toString().trim();
            }
            return novaLinha;
          });
        }

        // Salva globals
        window.dadosOriginais = dados;
        window.dadosEquipe = [...dados];
        window.dadosGlobais = [...dados];

        // Extrai dicionário
        window.dicionarioGlobais = dados.length
          ? (typeof extrairDicionarioCSV === 'function' ? extrairDicionarioCSV(dados) : extrairDicionarioXLSX(dados))
          : {};

        // Exibe tabela e dicionário
        exibirDados(dadosEquipe);
        exibirDicionario(window.dicionarioGlobais);
        gerarOpcoesFiltro(dadosEquipe);
        configurarFiltroEquipe({ equipe: null }, dadosEquipe);

        const percentuais = calcularPercentuaisUnificado(dadosEquipe);
        exibirIndicadores(percentuais);

        atualizarInfo({ competencia: comp, indicador: ind }, dadosEquipe.length);
        document.getElementById('filtro').style.display = 'block';

      } catch (err) {
        console.error(err);
        alert('Erro ao carregar dados');
      }
    });

  } catch (err) {
    console.error('Erro ao carregar lista de arquivos:', err);
    alert('Erro ao carregar lista de arquivos');
  }
});
