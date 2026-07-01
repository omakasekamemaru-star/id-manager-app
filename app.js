const STORAGE_KEY = "accountManagerRecords";

const OPTIONS = {
  emailTypes: ["買い物", "SNS・Webサービス", "プライベート重要", "会社", "退役"],
  loginMethods: ["Apple", "Google", "Microsoft", "メール", "SSO", "その他"],
  storageLocations: ["iPhoneキーチェーン", "Edge", "Chrome", "1Password", "会社SSO", "保存なし", "その他"],
  billingTypes: ["無料", "月額", "年額", "買い切り", "会社契約", "不明"],
  statuses: ["利用中", "お試し中", "解約予定", "解約済み", "退役"],
  owners: ["自分", "会社", "情シス", "不明"]
};

const CSV_HEADERS = [
  "サービス名", "URL", "区分", "メール種別", "登録メール", "ログイン方法", "保存場所",
  "料金", "金額", "更新日", "ステータス", "管理者", "引き継ぎ必要", "メモ"
];

const FIELD_BY_HEADER = {
  "サービス名": "serviceName",
  "URL": "serviceUrl",
  "区分": "category",
  "メール種別": "emailType",
  "登録メール": "registeredEmail",
  "ログイン方法": "loginMethod",
  "保存場所": "storageLocation",
  "料金": "billingType",
  "金額": "amount",
  "更新日": "renewalDate",
  "ステータス": "status",
  "管理者": "owner",
  "引き継ぎ必要": "handoverRequired",
  "メモ": "notes"
};

const THEME_STORAGE_KEY = "accountManagerTheme";

const els = {
  themeToggleButton: document.querySelector("#themeToggleButton"),
  newRecordButton: document.querySelector("#newRecordButton"),
  recordDialog: document.querySelector("#recordDialog"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  recordForm: document.querySelector("#recordForm"),
  formTitle: document.querySelector("#formTitle"),
  deleteButton: document.querySelector("#deleteButton"),
  recordList: document.querySelector("#recordList"),
  emptyMessage: document.querySelector("#emptyMessage"),
  recordCount: document.querySelector("#recordCount"),
  listSummary: document.querySelector("#listSummary"),
  toggleListButton: document.querySelector("#toggleListButton"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  emailTypeFilter: document.querySelector("#emailTypeFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  paidOnlyFilter: document.querySelector("#paidOnlyFilter"),
  monthlyTotal: document.querySelector("#monthlyTotal"),
  yearlyTotal: document.querySelector("#yearlyTotal"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput")
};

const form = {
  recordId: document.querySelector("#recordId"),
  serviceName: document.querySelector("#serviceName"),
  serviceUrl: document.querySelector("#serviceUrl"),
  category: document.querySelector("#category"),
  emailType: document.querySelector("#emailType"),
  registeredEmail: document.querySelector("#registeredEmail"),
  loginMethod: document.querySelector("#loginMethod"),
  storageLocation: document.querySelector("#storageLocation"),
  billingType: document.querySelector("#billingType"),
  amount: document.querySelector("#amount"),
  renewalDate: document.querySelector("#renewalDate"),
  status: document.querySelector("#status"),
  owner: document.querySelector("#owner"),
  handoverRequired: document.querySelector("#handoverRequired"),
  notes: document.querySelector("#notes")
};

let records = loadRecords();
let listVisible = false;

function init() {
  applyTheme(loadTheme());

  fillSelect(form.emailType, OPTIONS.emailTypes);
  fillSelect(form.loginMethod, OPTIONS.loginMethods);
  fillSelect(form.storageLocation, OPTIONS.storageLocations);
  fillSelect(form.billingType, OPTIONS.billingTypes);
  fillSelect(form.status, OPTIONS.statuses);
  fillSelect(form.owner, OPTIONS.owners);
  fillSelect(els.emailTypeFilter, OPTIONS.emailTypes, true);
  fillSelect(els.statusFilter, OPTIONS.statuses, true);

  els.themeToggleButton.addEventListener("click", toggleTheme);
  els.toggleListButton.addEventListener("click", toggleListVisibility);
  els.newRecordButton.addEventListener("click", openNewRecord);
  els.closeDialogButton.addEventListener("click", closeDialog);
  els.recordForm.addEventListener("submit", saveForm);
  els.deleteButton.addEventListener("click", deleteCurrentRecord);
  els.exportButton.addEventListener("click", exportCsv);
  els.importInput.addEventListener("change", importCsv);

  [els.searchInput, els.categoryFilter, els.emailTypeFilter, els.statusFilter, els.paidOnlyFilter]
    .forEach((element) => element.addEventListener("input", render));

  render();
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || "light";
  } catch (error) {
    console.warn("テーマ設定を読み込めませんでした", error);
    return "light";
  }
}

function applyTheme(theme) {
  const resolvedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = resolvedTheme;
  document.body.dataset.theme = resolvedTheme;
  document.body.classList.toggle("theme-dark", resolvedTheme === "dark");
  if (els.themeToggleButton) {
    els.themeToggleButton.setAttribute("aria-pressed", String(resolvedTheme === "dark"));
    els.themeToggleButton.textContent = resolvedTheme === "dark" ? "☀️ ライト" : "🌙 ダーク";
  }
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch (error) {
    console.warn("テーマ設定を保存できませんでした", error);
  }
}

function fillSelect(select, values, keepFirstOption = false) {
  const firstOption = keepFirstOption ? select.querySelector("option") : null;
  select.innerHTML = "";
  if (firstOption) select.append(firstOption);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

// localStorageから配列JSONを読み込みます。壊れたデータの場合は空配列に戻します。
function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("保存データを読み込めませんでした", error);
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function openNewRecord() {
  els.formTitle.textContent = "新規登録";
  els.deleteButton.hidden = true;
  els.recordForm.reset();
  form.recordId.value = "";
  form.category.value = "個人";
  form.status.value = "利用中";
  form.billingType.value = "無料";
  form.handoverRequired.value = "いいえ";
  showDialog();
}

function openEditRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) return;

  els.formTitle.textContent = "編集";
  els.deleteButton.hidden = false;
  Object.keys(form).forEach((key) => {
    if (key === "recordId") {
      form[key].value = record.id;
      return;
    }
    form[key].value = record[key] ?? "";
  });
  showDialog();
}

function showDialog() {
  if (typeof els.recordDialog.showModal === "function") {
    els.recordDialog.showModal();
  } else {
    alert("このブラウザは編集ダイアログに対応していません。Safariを最新版にしてください。");
  }
}

function closeDialog() {
  els.recordDialog.close();
}

function saveForm(event) {
  event.preventDefault();
  const record = collectFormRecord();

  if (record.id) {
    records = records.map((item) => item.id === record.id ? record : item);
  } else {
    record.id = createId();
    records.push(record);
  }

  saveRecords();
  closeDialog();
  render();
}

function collectFormRecord() {
  return {
    id: form.recordId.value,
    serviceName: form.serviceName.value.trim(),
    serviceUrl: form.serviceUrl.value.trim(),
    category: form.category.value,
    emailType: form.emailType.value,
    registeredEmail: form.registeredEmail.value.trim(),
    loginMethod: form.loginMethod.value,
    storageLocation: form.storageLocation.value,
    billingType: form.billingType.value,
    amount: Number(form.amount.value || 0),
    renewalDate: form.renewalDate.value,
    status: form.status.value,
    owner: form.owner.value,
    handoverRequired: form.handoverRequired.value,
    notes: form.notes.value.trim()
  };
}

function deleteCurrentRecord() {
  const id = form.recordId.value;
  if (!id) return;

  const record = records.find((item) => item.id === id);
  const message = record ? `「${record.serviceName}」を削除しますか？` : "この登録を削除しますか？";
  if (!confirm(message)) return;

  records = records.filter((item) => item.id !== id);
  saveRecords();
  closeDialog();
  render();
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getFilteredRecords() {
  const keyword = els.searchInput.value.trim().toLowerCase();
  const category = els.categoryFilter.value;
  const emailType = els.emailTypeFilter.value;
  const status = els.statusFilter.value;
  const paidOnly = els.paidOnlyFilter.checked;

  return records
    .filter((record) => {
      const searchable = [
        record.serviceName,
        record.serviceUrl,
        record.registeredEmail,
        record.loginMethod,
        record.storageLocation,
        record.status,
        record.notes
      ].join(" ").toLowerCase();

      if (keyword && !searchable.includes(keyword)) return false;
      if (category && record.category !== category) return false;
      if (emailType && record.emailType !== emailType) return false;
      if (status && record.status !== status) return false;
      if (paidOnly && !["月額", "年額", "買い切り"].includes(record.billingType)) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.renewalDate || "0000-00-00";
      const dateB = b.renewalDate || "0000-00-00";
      return dateB.localeCompare(dateA);
    });
}

function render() {
  const filteredRecords = getFilteredRecords();
  renderSummary();
  renderList(filteredRecords);
}

function renderSummary() {
  const monthlyTotal = records
    .filter((record) => record.billingType === "月額")
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const yearlyTotal = records
    .filter((record) => record.billingType === "年額")
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);

  els.monthlyTotal.textContent = formatYen(monthlyTotal);
  els.yearlyTotal.textContent = formatYen(yearlyTotal);
}

function renderList(list) {
  els.recordList.innerHTML = "";
  els.recordCount.textContent = `${list.length}件`;
  els.listSummary.textContent = buildListSummary(list);

  if (!listVisible) {
    els.recordList.hidden = true;
    els.emptyMessage.hidden = true;
    els.toggleListButton.textContent = "一覧";
    els.toggleListButton.setAttribute("aria-expanded", "false");
    return;
  }

  els.recordList.hidden = false;
  els.emptyMessage.hidden = list.length > 0;
  els.toggleListButton.textContent = "閉じる";
  els.toggleListButton.setAttribute("aria-expanded", "true");

  list.forEach((record) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "record-card";
    card.addEventListener("click", () => openEditRecord(record.id));

    const labelClass = record.category === "会社" ? "company" : "personal";
    card.innerHTML = `
      <div class="card-top">
        <span class="service-name">${escapeHtml(record.serviceName || "名称未設定")}</span>
        <span class="label ${labelClass}">${escapeHtml(record.category || "-")}</span>
      </div>
      <div class="card-details">
        ${detailLine("登録メール", record.registeredEmail || "-")}
        ${detailLine("ログイン", record.loginMethod || "-")}
        ${detailLine("保存場所", record.storageLocation || "-")}
      </div>
      <div class="card-footer">
        <span class="status-pill">${escapeHtml(record.status || "-")}</span>
        <span>${escapeHtml(record.renewalDate || "更新日なし")}</span>
      </div>
    `;
    els.recordList.append(card);
  });
}

function toggleListVisibility() {
  listVisible = !listVisible;
  render();
}

function buildListSummary(list) {
  const storageCounts = list.reduce((counts, record) => {
    const storage = record.storageLocation || "未設定";
    counts[storage] = (counts[storage] || 0) + 1;
    return counts;
  }, {});

  const entries = Object.entries(storageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name}:${count}`);

  const storageSummary = entries.length ? entries.join(" / ") : "なし";
  return `件数 ${list.length} / 保存場所: ${storageSummary}`;
}

function detailLine(label, value) {
  return `<div class="detail-line"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;
}

function formatYen(value) {
  return `${Number(value || 0).toLocaleString("ja-JP")}円`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// CSVは日本語ヘッダーで出力し、表計算ソフトでも開きやすい形式にします。
function exportCsv() {
  const rows = records.map((record) => CSV_HEADERS.map((header) => {
    const field = FIELD_BY_HEADER[header];
    return record[field] ?? "";
  }));
  const csv = [CSV_HEADERS, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");

  const bom = "\ufeff";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `id-manager-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function importCsv(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = parseCsv(String(reader.result || ""));
      records = [...records, ...imported];
      saveRecords();
      render();
      alert(`${imported.length}件を追加しました。`);
    } catch (error) {
      alert(`CSVを読み込めませんでした: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

// ダブルクォートを含む標準的なCSVを読み取ります。
function parseCsv(text) {
  const cleanText = text.replace(/^\ufeff/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < cleanText.length; index += 1) {
    const char = cleanText[index];
    const next = cleanText[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1)
    .filter((csvRow) => csvRow.some((value) => value.trim()))
    .map((csvRow) => {
      const record = createBlankRecord();
      headers.forEach((header, index) => {
        const field = FIELD_BY_HEADER[header];
        if (!field) return;
        record[field] = field === "amount" ? Number(csvRow[index] || 0) : (csvRow[index] || "");
      });
      record.id = createId();
      return record;
    });
}

function createBlankRecord() {
  return {
    id: "",
    serviceName: "",
    serviceUrl: "",
    category: "個人",
    emailType: "SNS・Webサービス",
    registeredEmail: "",
    loginMethod: "メール",
    storageLocation: "保存なし",
    billingType: "無料",
    amount: 0,
    renewalDate: "",
    status: "利用中",
    owner: "自分",
    handoverRequired: "いいえ",
    notes: ""
  };
}

init();
