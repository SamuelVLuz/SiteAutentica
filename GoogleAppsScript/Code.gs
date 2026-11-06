const RESPONSE_SHEET_PROPERTY = "AUTHGAME_RESPONSE_SHEET_ID";
const RESPONSE_SHEET_NAME = "Respostas";
const RESPONSE_HEADERS = [
  "Data/hora",
  "Código do experimento",
  "Modo utilizado",
  "SEQ: facilidade geral (1–7)",
  "Avaliação fácil de entender (1–7)",
  "Avaliação influenciou escolha/ajuste (1–7)",
  "Maior confiança na segurança (1–7)",
  "Informações claras (1–7)",
  "Sugestões",
  "Entropia da senha (bits)",
  "Tentativas de senha",
  "Duração do experimento (segundos)"
];

function doGet() {
  return renderSurvey_({});
}

function doPost(e) {
  return renderSurvey_(e && e.parameter ? e.parameter : {});
}

function renderSurvey_(data) {
  const template = HtmlService.createTemplateFromFile("Index");
  template.experimentId = String(data.experimentId || "");
  template.mode = String(data.mode || "");
  template.entropyBits = String(data.entropyBits || "");
  template.attempts = String(data.attempts || "");
  template.durationSeconds = String(data.durationSeconds || "");
  return template.evaluate()
    .setTitle("Questionário de pós-teste")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Execute uma vez no editor do Apps Script para criar a planilha e autorizar o acesso.
function setupSpreadsheet() {
  const properties = PropertiesService.getScriptProperties();
  const existingId = properties.getProperty(RESPONSE_SHEET_PROPERTY);
  if (existingId) {
    const existing = SpreadsheetApp.openById(existingId);
    ensureHeaders_(existing.getSheetByName(RESPONSE_SHEET_NAME));
    Logger.log("Planilha configurada: " + existing.getUrl());
    return existing.getUrl();
  }

  const spreadsheet = SpreadsheetApp.create("Respostas do experimento de autenticação");
  const sheet = spreadsheet.getSheets()[0];
  sheet.setName(RESPONSE_SHEET_NAME);
  sheet.appendRow(RESPONSE_HEADERS);
  sheet.setFrozenRows(1);
  properties.setProperty(RESPONSE_SHEET_PROPERTY, spreadsheet.getId());
  Logger.log("Planilha criada: " + spreadsheet.getUrl());
  return spreadsheet.getUrl();
}

function saveResponse(response) {
  if (!response || typeof response !== "object") throw new Error("Resposta inválida.");

  const experimentId = String(response.experimentId || "").trim();
  const mode = String(response.mode || "").trim();
  const allowedModes = ["todos", "comparacao", "barra", "tempo", "estrelas", "nenhum"];
  if (!/^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(experimentId)) {
    throw new Error("Código da participação inválido.");
  }
  if (!allowedModes.includes(mode)) throw new Error("Modo do experimento inválido.");

  const seq = scaleValue(response.seq, 1, 7, "SEQ");
  const understand = scaleValue(response.understand, 1, 7, "Compreensão");
  const influence = scaleValue(response.influence, 1, 7, "Influência");
  const confidence = scaleValue(response.confidence, 1, 7, "Confiança");
  const suggestion = String(response.suggestion || "").trim().slice(0, 4000);
  const entropyBits = Number(response.entropyBits);
  const attempts = scaleValue(response.attempts, 1, 10000, "Tentativas");
  const durationSeconds = scaleValue(response.durationSeconds, 0, 86400, "Duração");
  if (!Number.isFinite(entropyBits) || entropyBits < 0 || entropyBits > 4096) {
    throw new Error("Não foi possível recuperar a entropia da senha desta participação.");
  }

  const sheetId = PropertiesService.getScriptProperties().getProperty(RESPONSE_SHEET_PROPERTY);
  if (!sheetId) throw new Error("A planilha ainda não foi configurada. Execute setupSpreadsheet no Apps Script.");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(RESPONSE_SHEET_NAME);
    if (!sheet) throw new Error("A aba de respostas não foi encontrada.");
    ensureHeaders_(sheet);
    if (sheet.getLastRow() > 1) {
      const existingCode = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1)
        .createTextFinder(experimentId)
        .matchEntireCell(true)
        .findNext();
      if (existingCode) throw new Error("Esta participação já enviou uma resposta.");
    }
    const row = new Array(sheet.getLastColumn()).fill("");
    const valuesByHeader = {
      "Data/hora": new Date(),
      "Código do experimento": experimentId,
      "Modo utilizado": mode,
      "SEQ: facilidade geral (1–7)": seq,
      "Avaliação fácil de entender (1–7)": understand,
      "Avaliação influenciou escolha/ajuste (1–7)": influence,
      "Maior confiança na segurança (1–7)": confidence,
      "Sugestões": safeCellText(suggestion),
      "Entropia da senha (bits)": entropyBits,
      "Tentativas de senha": attempts,
      "Duração do experimento (segundos)": durationSeconds
    };
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    headers.forEach((header, index) => {
      if (Object.prototype.hasOwnProperty.call(valuesByHeader, header)) row[index] = valuesByHeader[header];
    });
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  return { ok: true };
}

function ensureHeaders_(sheet) {
  if (!sheet) throw new Error("A aba de respostas não foi encontrada.");
  let existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  RESPONSE_HEADERS.forEach(header => {
    if (!existingHeaders.includes(header)) {
      const nextColumn = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextColumn).setValue(header);
      existingHeaders[nextColumn - 1] = header;
    }
  });
  sheet.setFrozenRows(1);
}

function scaleValue(value, min, max, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error("Resposta inválida para " + label + ".");
  }
  return number;
}

function safeCellText(value) {
  return /^[=+@-]/.test(value) ? "'" + value : value;
}
