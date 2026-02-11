// script-csv.js

function extrairDadosCSV(conteudo) {
  const linhas = conteudo.split(/\r?\n/);
  let cabecalho = null;
  let dados = [];

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].split(';');

    // Detecta a linha do cabeçalho (CPF, CNS ou outro campo)
    if (!cabecalho && (linha.includes('CPF') || linha.includes('CNS'))) {
      cabecalho = linha.map(c => c.replace(/^\uFEFF/, '').trim());
      continue;
    }

    if (cabecalho) {
      const registro = {};
      linha.forEach((valor, idx) => {
        registro[cabecalho[idx]] = valor?.trim() || '';
      });

      if (Object.values(registro).some(v => v !== '')) {
        dados.push(registro);
      }
    }
  }

  return dados;
}

function extrairDicionarioCSV(dados) {
  if (!dados || !dados.length) return {};
  const dicionario = {};
  Object.keys(dados[0]).forEach(chave => {
    dicionario[chave] = chave; // ou mapeie para descrição real se tiver
  });
  return dicionario;
}
