// Funções de leitura CSV/XLSX e extração de metadados
function lerCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsText(file, "UTF-8");
  });
}

function lerXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const primeiraAba = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[primeiraAba];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      resolve(json);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

function extrairMetadados(linhas) {
  let competencia = null;
  let indicador = null;

  for (const linha of linhas) {
    let texto = "";
    if (typeof linha === "string") texto = linha.trim();
    else if (Array.isArray(linha)) texto = linha.join(" ").trim();

    if (texto.startsWith("Competência selecionada:")) {
      competencia = texto.split(":")[1].trim();
    }
    if (texto.startsWith("Indicador selecionado:")) {
      indicador = texto.split(":")[1].trim();
    }
    if (competencia && indicador) break;
  }

  return { competencia, indicador };
}

// Armazenamento em memória por competência/indicador
const arquivosOrganizados = {};

// Evento de clique
document.getElementById("processar").addEventListener("click", async () => {
  const input = document.getElementById("arquivo");
  const arquivos = input.files;
  if (!arquivos.length) return alert("Selecione pelo menos um arquivo.");

  // Processa cada arquivo
  for (const file of arquivos) {
    let dados;
    if (file.name.endsWith(".csv")) {
      const conteudo = await lerCSV(file);
      dados = conteudo.split(/\r?\n/);
    } else if (file.name.endsWith(".xlsx")) {
      dados = await lerXLSX(file);
    } else {
      alert(`Tipo de arquivo não suportado: ${file.name}`);
      continue;
    }

    const metadados = extrairMetadados(dados);
    metadados.competencia = metadados.competencia.replace(/\//g, ""); // NOV/25 → NOV25
    if (!metadados.competencia || !metadados.indicador) {
      alert(`Arquivo ${file.name} não possui metadados completos.`);
      continue;
    }

    // Organiza em memória
    if (!arquivosOrganizados[metadados.competencia]) {
      arquivosOrganizados[metadados.competencia] = {};
    }
    if (!arquivosOrganizados[metadados.competencia][metadados.indicador]) {
      arquivosOrganizados[metadados.competencia][metadados.indicador] = [];
    }

    arquivosOrganizados[metadados.competencia][metadados.indicador].push({
      file: file, // mantém o File original
      dados: dados, // opcional, para referência
    });
  }

  // Envia para Node
  await enviarArquivos(arquivosOrganizados);
});

// Função que envia para o Node
async function enviarArquivos(arquivosOrganizados) {
  const formData = new FormData();
  const metadadosList = [];

  for (const competencia in arquivosOrganizados) {
    for (const indicador in arquivosOrganizados[competencia]) {
      arquivosOrganizados[competencia][indicador].forEach((fileObj) => {
        formData.append("arquivos", fileObj.file);
        metadadosList.push({ competencia, indicador });
      });
    }
  }

  formData.append("metadados", JSON.stringify(metadadosList));

  const res = await fetch("http://localhost:3000/upload", {
    method: "POST",
    body: formData,
  });
  const texto = await res.text();
  alert(texto);
}
