// script-xlsx.js

function extrairDadosXLSX(workbook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const dados = XLSX.utils.sheet_to_json(sheet, { defval: '' }); // defval mantém campos vazios
  return dados;
}

function extrairDicionarioXLSX(dados) {
  if (!dados || !dados.length) return {};
  const dicionario = {};
  Object.keys(dados[0]).forEach(chave => {
    dicionario[chave] = chave; // ou mapeie para descrição real se tiver
  });
  return dicionario;
}
