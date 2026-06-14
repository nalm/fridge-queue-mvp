const STORAGE_KEY = "fridge-mvp-items";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const shelfLifeRules = [
  { keywords: ["샐러드", "새싹", "쌈채소", "손질"], days: 3, storage: "냉장", category: "채소" },
  { keywords: ["두부", "콩나물", "숙주"], days: 5, storage: "냉장", category: "단백질" },
  { keywords: ["우유", "요거트", "요구르트"], days: 7, storage: "냉장", category: "유제품" },
  { keywords: ["닭", "돼지", "소고기", "고기", "다짐육"], days: 3, storage: "냉장", category: "육류" },
  { keywords: ["생선", "연어", "고등어", "오징어", "새우"], days: 2, storage: "냉장", category: "해산물" },
  { keywords: ["계란", "달걀"], days: 21, storage: "냉장", category: "계란" },
  { keywords: ["냉동", "만두", "볶음밥", "돈까스"], days: 60, storage: "냉동", category: "냉동" },
  { keywords: ["사과", "배", "귤", "토마토", "과일"], days: 10, storage: "냉장", category: "과일" },
  { keywords: ["양파", "감자", "고구마", "마늘"], days: 20, storage: "실온", category: "채소" },
  { keywords: ["치즈", "버터"], days: 20, storage: "냉장", category: "유제품" }
];

const recipeRules = [
  {
    title: "두부 계란 부침",
    needs: ["두부", "계란"],
    optional: ["대파", "양파"],
    time: "15분",
    copy: "두부와 계란이 있으면 빠르게 만들 수 있고, 소비기한이 짧은 두부를 먼저 처리하기 좋습니다."
  },
  {
    title: "샐러드 닭가슴살 볼",
    needs: ["샐러드", "닭"],
    optional: ["토마토", "계란"],
    time: "10분",
    copy: "채소를 먼저 쓰고 단백질을 얹는 조합입니다."
  },
  {
    title: "채소 계란 볶음",
    needs: ["계란"],
    optional: ["양파", "토마토", "애호박", "버섯"],
    time: "12분",
    copy: "임박 채소를 한 번에 줄이기 좋은 기본 요리입니다."
  },
  {
    title: "냉동만두 채소국",
    needs: ["만두"],
    optional: ["대파", "양파", "계란"],
    time: "18분",
    copy: "냉동 재료에 냉장고 자투리 채소를 더해 한 끼로 만들 수 있습니다."
  },
  {
    title: "토마토 계란 덮밥",
    needs: ["토마토", "계란"],
    optional: ["양파", "치즈"],
    time: "15분",
    copy: "토마토와 계란을 같이 소진하기 좋은 간단한 덮밥입니다."
  },
  {
    title: "고기 채소 볶음",
    needs: ["고기"],
    optional: ["양파", "마늘", "버섯", "쌈채소"],
    time: "20분",
    copy: "육류는 소비기한이 짧아 우선순위를 높게 잡는 게 좋습니다."
  }
];

const state = {
  drafts: [],
  items: readItems(),
  filter: "active",
  visibleMonth: startOfMonth(new Date()),
  html5Scanner: null,
  scannerStream: null,
  scanTimer: null,
  scanBusy: false,
  currentProduct: null
};

const els = {
  apiStatus: document.querySelector("#apiStatus"),
  html5QrReader: document.querySelector("#html5QrReader"),
  scanVideo: document.querySelector("#scanVideo"),
  scannerPlaceholder: document.querySelector("#scannerPlaceholder"),
  startScanButton: document.querySelector("#startScanButton"),
  stopScanButton: document.querySelector("#stopScanButton"),
  barcodeImageInput: document.querySelector("#barcodeImageInput"),
  barcodeInput: document.querySelector("#barcodeInput"),
  lookupButton: document.querySelector("#lookupButton"),
  productNameInput: document.querySelector("#productNameInput"),
  quantityInput: document.querySelector("#quantityInput"),
  storageInput: document.querySelector("#storageInput"),
  expiryDateInput: document.querySelector("#expiryDateInput"),
  purchaseDateInput: document.querySelector("#purchaseDateInput"),
  productHint: document.querySelector("#productHint"),
  addProductButton: document.querySelector("#addProductButton"),
  sampleButton: document.querySelector("#sampleButton"),
  exportButton: document.querySelector("#exportButton"),
  draftList: document.querySelector("#draftList"),
  draftEmpty: document.querySelector("#draftEmpty"),
  draftCount: document.querySelector("#draftCount"),
  saveDraftsButton: document.querySelector("#saveDraftsButton"),
  inventoryList: document.querySelector("#inventoryList"),
  inventoryEmpty: document.querySelector("#inventoryEmpty"),
  urgentCount: document.querySelector("#urgentCount"),
  activeCount: document.querySelector("#activeCount"),
  usedCount: document.querySelector("#usedCount"),
  calendarGrid: document.querySelector("#calendarGrid"),
  monthLabel: document.querySelector("#monthLabel"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  recipeList: document.querySelector("#recipeList"),
  recipeEmpty: document.querySelector("#recipeEmpty"),
  draftTemplate: document.querySelector("#draftTemplate")
};

init();

function init() {
  els.purchaseDateInput.value = toDateInputValue(new Date());
  setExpiryFromName("");
  bindEvents();
  render();
}

function bindEvents() {
  els.startScanButton.addEventListener("click", startCameraScan);
  els.stopScanButton.addEventListener("click", stopCameraScan);
  els.barcodeImageInput.addEventListener("change", scanImageFile);
  els.lookupButton.addEventListener("click", () => lookupBarcode(els.barcodeInput.value));
  els.barcodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") lookupBarcode(els.barcodeInput.value);
  });
  els.productNameInput.addEventListener("input", () => setExpiryFromName(els.productNameInput.value));
  els.addProductButton.addEventListener("click", addProductDraft);
  els.sampleButton.addEventListener("click", loadSample);
  els.saveDraftsButton.addEventListener("click", saveDrafts);
  els.exportButton.addEventListener("click", exportIcs);
  els.prevMonth.addEventListener("click", () => {
    state.visibleMonth = addMonths(state.visibleMonth, -1);
    renderCalendar();
  });
  els.nextMonth.addEventListener("click", () => {
    state.visibleMonth = addMonths(state.visibleMonth, 1);
    renderCalendar();
  });
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderInventory();
    });
  });
}

async function startCameraScan() {
  if (window.Html5Qrcode) {
    await startHtml5Scan();
    return;
  }

  const detector = await createBarcodeDetector();
  if (!detector) {
    setStatus("스캔 라이브러리를 불러오지 못했습니다. 직접 입력을 사용하세요", "warn");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("카메라 접근을 지원하지 않는 브라우저입니다", "warn");
    return;
  }

  try {
    state.scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    els.scanVideo.srcObject = state.scannerStream;
    els.scanVideo.hidden = false;
    els.scannerPlaceholder.hidden = true;
    await els.scanVideo.play();
    state.scanTimer = window.setInterval(() => scanVideoFrame(detector), 700);
    els.startScanButton.disabled = true;
    els.stopScanButton.disabled = false;
    setStatus("스캔 중", "busy");
  } catch (error) {
    setStatus("카메라를 열지 못했습니다. 직접 입력을 사용하세요", "warn");
  }
}

async function startHtml5Scan() {
  try {
    if (state.html5Scanner) {
      await stopCameraScan();
    }

    const scanner = new window.Html5Qrcode("html5QrReader", {
      formatsToSupport: getHtml5Formats(),
      verbose: false
    });
    state.html5Scanner = scanner;
    els.html5QrReader.hidden = false;
    els.scanVideo.hidden = true;
    els.scannerPlaceholder.hidden = true;

    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 260, height: 170 },
        aspectRatio: 1.7777778
      },
      async (decodedText) => {
        if (state.scanBusy) return;
        state.scanBusy = true;
        await handleDetectedCode(decodedText);
      },
      () => {}
    );

    els.startScanButton.disabled = true;
    els.stopScanButton.disabled = false;
    setStatus("스캔 중", "busy");
  } catch (error) {
    state.html5Scanner = null;
    els.html5QrReader.hidden = true;
    els.scannerPlaceholder.hidden = false;
    setStatus("카메라를 열지 못했습니다. 권한을 허용하거나 직접 입력을 사용하세요", "warn");
  }
}

async function stopCameraScan() {
  if (state.html5Scanner) {
    try {
      await state.html5Scanner.stop();
    } catch {}
    try {
      await state.html5Scanner.clear();
    } catch {}
    state.html5Scanner = null;
  }
  if (state.scanTimer) {
    window.clearInterval(state.scanTimer);
    state.scanTimer = null;
  }
  if (state.scannerStream) {
    state.scannerStream.getTracks().forEach((track) => track.stop());
    state.scannerStream = null;
  }
  els.scanVideo.pause();
  els.scanVideo.srcObject = null;
  els.scanVideo.hidden = true;
  els.html5QrReader.hidden = true;
  els.scannerPlaceholder.hidden = false;
  els.startScanButton.disabled = false;
  els.stopScanButton.disabled = true;
  state.scanBusy = false;
}

async function scanVideoFrame(detector) {
  if (state.scanBusy || els.scanVideo.readyState < 2) return;
  state.scanBusy = true;
  try {
    const codes = await detector.detect(els.scanVideo);
    if (codes.length) {
      await handleDetectedCode(codes[0].rawValue);
    }
  } catch {
    setStatus("스캔 중 오류가 발생했습니다", "warn");
  } finally {
    state.scanBusy = false;
  }
}

async function scanImageFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (window.Html5Qrcode) {
    try {
      await stopCameraScan();
      setStatus("이미지 스캔 중", "busy");
      els.html5QrReader.hidden = false;
      els.scannerPlaceholder.hidden = true;
      const scanner = new window.Html5Qrcode("html5QrReader", {
        formatsToSupport: getHtml5Formats(),
        verbose: false
      });
      const decodedText = await scanner.scanFile(file, false);
      await scanner.clear().catch(() => {});
      els.html5QrReader.hidden = true;
      els.scannerPlaceholder.hidden = false;
      await handleDetectedCode(decodedText);
      return;
    } catch {
      els.html5QrReader.hidden = true;
      els.scannerPlaceholder.hidden = false;
      setStatus("이미지에서 코드를 찾지 못했습니다", "warn");
      event.target.value = "";
      return;
    }
  }

  const detector = await createBarcodeDetector();
  if (!detector) {
    setStatus("이미지 스캔 라이브러리를 불러오지 못했습니다", "warn");
    event.target.value = "";
    return;
  }

  try {
    setStatus("이미지 스캔 중", "busy");
    const bitmap = await createImageBitmap(file);
    const codes = await detector.detect(bitmap);
    bitmap.close?.();
    if (!codes.length) {
      setStatus("이미지에서 코드를 찾지 못했습니다", "warn");
      return;
    }
    await handleDetectedCode(codes[0].rawValue);
  } catch {
    setStatus("이미지를 스캔하지 못했습니다", "warn");
  } finally {
    event.target.value = "";
  }
}

async function handleDetectedCode(rawValue) {
  const code = normalizeScannedCode(rawValue);
  if (!code) {
    setStatus("읽은 코드가 비어 있습니다", "warn");
    return;
  }
  await stopCameraScan();
  els.barcodeInput.value = code;
  await lookupBarcode(code);
}

function getHtml5Formats() {
  if (!window.Html5QrcodeSupportedFormats) return undefined;
  const formats = window.Html5QrcodeSupportedFormats;
  return [
    formats.QR_CODE,
    formats.EAN_13,
    formats.EAN_8,
    formats.UPC_A,
    formats.UPC_E,
    formats.CODE_128,
    formats.CODE_39,
    formats.ITF
  ].filter(Boolean);
}

async function lookupBarcode(rawCode) {
  const code = normalizeScannedCode(rawCode);
  if (!code) {
    setStatus("바코드나 QR 값을 입력하세요", "warn");
    return;
  }

  setStatus("제품 조회 중", "busy");
  try {
    const response = await fetch(`/api/product?code=${encodeURIComponent(code)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || "제품 조회에 실패했습니다.");
    }
    applyProductLookup(code, payload);
  } catch (error) {
    state.currentProduct = { code, found: false, source: "manual" };
    els.productNameInput.value = "";
    els.quantityInput.value = els.quantityInput.value || "1개";
    setExpiryFromName("");
    setStatus("제품명을 직접 입력하세요", "warn");
    els.productHint.textContent = "조회가 실패했습니다. 제품명, 수량, 소비기한을 직접 입력해 저장할 수 있습니다.";
  }
}

function applyProductLookup(code, payload) {
  const product = payload.product || {};
  state.currentProduct = {
    code,
    found: Boolean(payload.found),
    source: payload.source || "manual",
    product
  };

  if (payload.found && product.name) {
    els.productNameInput.value = product.name;
    els.quantityInput.value = product.quantity || "1개";
    setExpiryFromName(product.name);
    setStatus("제품 조회 완료", "ok");
    els.productHint.textContent = `${payload.sourceLabel || "제품 DB"}에서 찾았습니다. 실제 포장 소비기한이 보이면 날짜를 수정하세요.`;
    return;
  }

  els.productNameInput.value = "";
  els.quantityInput.value = els.quantityInput.value || "1개";
  setExpiryFromName("");
  setStatus("제품명을 직접 입력하세요", "warn");
  els.productHint.textContent = "공개 제품 DB에서 찾지 못했습니다. 이름을 직접 입력하면 다음부터 냉장고 재료로 관리됩니다.";
}

function addProductDraft() {
  const name = els.productNameInput.value.trim();
  const code = normalizeScannedCode(els.barcodeInput.value);
  if (!name) {
    setStatus("제품명을 입력하세요", "warn");
    els.productNameInput.focus();
    return;
  }

  const purchaseDate = parseDateInput(els.purchaseDateInput.value);
  const rule = inferRule(name);
  const draft = {
    id: makeId(),
    name,
    quantity: els.quantityInput.value.trim() || "1개",
    category: state.currentProduct?.product?.category || rule.category,
    storage: els.storageInput.value || rule.storage,
    platform: code ? `스캔 ${code}` : "직접 입력",
    purchaseDate: toDateInputValue(purchaseDate),
    expiresAt: els.expiryDateInput.value || toDateInputValue(addDays(purchaseDate, rule.days)),
    confidence: state.currentProduct?.found ? "바코드 조회" : code ? "코드 직접 등록" : "직접 입력",
    source: "scan",
    barcode: code
  };

  state.drafts = [draft, ...state.drafts];
  clearProductForm();
  setStatus("대기 목록에 추가됨", "ok");
  renderDrafts();
}

function clearProductForm() {
  state.currentProduct = null;
  els.barcodeInput.value = "";
  els.productNameInput.value = "";
  els.quantityInput.value = "";
  els.storageInput.value = "냉장";
  setExpiryFromName("");
  els.productHint.textContent = "스캔 후 조회 결과를 확인하고, 실제 포장 소비기한이 보이면 날짜를 수정하세요.";
}

function setExpiryFromName(name) {
  const purchaseDate = parseDateInput(els.purchaseDateInput.value);
  const rule = inferRule(name);
  els.storageInput.value = rule.storage;
  els.expiryDateInput.value = toDateInputValue(addDays(purchaseDate, rule.days));
}

async function createBarcodeDetector() {
  if (!("BarcodeDetector" in window)) return null;
  const desired = ["qr_code", "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];
  try {
    const supported = await window.BarcodeDetector.getSupportedFormats?.();
    const formats = Array.isArray(supported) ? desired.filter((format) => supported.includes(format)) : desired;
    return new window.BarcodeDetector(formats.length ? { formats } : undefined);
  } catch {
    try {
      return new window.BarcodeDetector();
    } catch {
      return null;
    }
  }
}

function normalizeScannedCode(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/[^?]+\?/i, "")
    .replace(/^barcode[:=]/i, "")
    .trim();
}

function loadSample() {
  const purchaseDate = new Date();
  const sample = [
    { name: "국산 두부 300g", quantity: "2팩", barcode: "8800000000011" },
    { name: "샐러드 채소", quantity: "1봉", barcode: "8800000000028" },
    { name: "무항생제 계란 30구", quantity: "1판", barcode: "8800000000035" },
    { name: "냉동 만두", quantity: "1봉", barcode: "8800000000042" },
    { name: "토마토", quantity: "6개", barcode: "8800000000059" },
    { name: "닭가슴살", quantity: "3팩", barcode: "8800000000066" }
  ].map((item) => {
    const rule = inferRule(item.name);
    return {
      id: makeId(),
      name: item.name,
      quantity: item.quantity,
      category: rule.category,
      storage: rule.storage,
      platform: `샘플 ${item.barcode}`,
      purchaseDate: toDateInputValue(purchaseDate),
      expiresAt: toDateInputValue(addDays(purchaseDate, rule.days)),
      confidence: "샘플 데이터",
      source: "sample",
      barcode: item.barcode
    };
  });

  state.drafts = [...sample, ...state.drafts];
  setStatus("샘플 추가됨", "ok");
  renderDrafts();
}

function saveDrafts() {
  if (!state.drafts.length) {
    setStatus("저장할 대기 목록이 없습니다", "warn");
    return;
  }

  const items = state.drafts.map((draft) => ({
    ...draft,
    id: makeId(),
    status: "active",
    createdAt: new Date().toISOString(),
    usedAt: null
  }));

  state.items = [...items, ...state.items];
  state.drafts = [];
  persistItems();
  setStatus(`${items.length}개 저장됨`, "ok");
  render();
}

function render() {
  renderDrafts();
  renderInventory();
  renderCalendar();
  renderRecipes();
}

function renderDrafts() {
  els.draftList.innerHTML = "";
  els.draftCount.textContent = `${state.drafts.length}개`;
  els.draftEmpty.classList.toggle("visible", state.drafts.length === 0);
  els.saveDraftsButton.disabled = state.drafts.length === 0;

  state.drafts.forEach((draft) => {
    const node = els.draftTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('[data-field="name"]').value = draft.name;
    node.querySelector('[data-field="quantity"]').value = draft.quantity;
    node.querySelector('[data-field="storage"]').value = draft.storage;
    node.querySelector('[data-field="expiresAt"]').value = draft.expiresAt;
    node.querySelector('[data-field="confidence"]').textContent = `${draft.platform} · ${draft.confidence}`;

    node.querySelectorAll("[data-field]").forEach((input) => {
      const field = input.dataset.field;
      input.addEventListener("input", () => {
        draft[field] = input.value;
      });
    });

    node.querySelector('[data-action="remove-draft"]').addEventListener("click", () => {
      state.drafts = state.drafts.filter((item) => item.id !== draft.id);
      renderDrafts();
    });

    els.draftList.append(node);
  });
}

function renderInventory() {
  const activeItems = state.items.filter((item) => item.status === "active");
  const usedItems = state.items.filter((item) => item.status === "used");
  const urgentItems = activeItems.filter((item) => daysUntil(item.expiresAt) <= 3);

  els.urgentCount.textContent = urgentItems.length;
  els.activeCount.textContent = activeItems.length;
  els.usedCount.textContent = usedItems.length;

  const visibleItems = state.items
    .filter((item) => item.status === state.filter)
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));

  els.inventoryList.innerHTML = "";
  els.inventoryEmpty.classList.toggle("visible", visibleItems.length === 0);

  visibleItems.forEach((item) => {
    const article = document.createElement("article");
    article.className = "inventory-item";
    const dayCount = daysUntil(item.expiresAt);
    const chipClass = dayCount < 0 ? "overdue" : dayCount <= 3 ? "due" : "";
    const chipText = dayCount < 0 ? `${Math.abs(dayCount)}일 지남` : `D-${dayCount}`;
    const barcodeLabel = item.barcode ? ` · ${escapeHtml(item.barcode)}` : "";

    article.innerHTML = `
      <div class="item-title-row">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="expiry-chip ${chipClass}">${chipText}</span>
      </div>
      <div class="inventory-meta">
        <span>${escapeHtml(item.quantity)} · ${escapeHtml(item.storage)}${barcodeLabel}</span>
        <span>${formatKoreanDate(item.expiresAt)}</span>
      </div>
      <div class="inventory-actions"></div>
    `;

    const actions = article.querySelector(".inventory-actions");
    if (item.status === "active") {
      actions.append(makeSmallButton("사용 완료", () => markUsed(item.id)));
      actions.append(makeSmallButton("절반 사용", () => halveQuantity(item.id)));
    } else {
      actions.append(makeSmallButton("되돌리기", () => restoreItem(item.id)));
    }

    els.inventoryList.append(article);
  });
}

function renderCalendar() {
  const month = state.visibleMonth;
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  els.monthLabel.textContent = `${year}년 ${monthIndex + 1}월`;
  els.calendarGrid.innerHTML = "";

  ["일", "월", "화", "수", "목", "금", "토"].forEach((day) => {
    const cell = document.createElement("div");
    cell.className = "calendar-cell header";
    cell.textContent = day;
    els.calendarGrid.append(cell);
  });

  const firstDay = new Date(year, monthIndex, 1);
  const start = addDays(firstDay, -firstDay.getDay());

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index);
    const dateKey = toDateInputValue(date);
    const cell = document.createElement("div");
    cell.className = `calendar-cell${date.getMonth() === monthIndex ? "" : " muted"}`;
    cell.innerHTML = `<span class="day-number">${date.getDate()}</span>`;

    state.items
      .filter((item) => item.status === "active" && item.expiresAt === dateKey)
      .slice(0, 3)
      .forEach((item) => {
        const event = document.createElement("span");
        const dayCount = daysUntil(item.expiresAt);
        event.className = `calendar-event ${dayCount < 0 ? "overdue" : dayCount <= 3 ? "due" : ""}`;
        event.textContent = item.name;
        cell.append(event);
      });

    els.calendarGrid.append(cell);
  }
}

function renderRecipes() {
  const activeItems = state.items
    .filter((item) => item.status === "active")
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
  const names = activeItems.map((item) => item.name);
  const scored = recipeRules
    .map((recipe) => scoreRecipe(recipe, names, activeItems))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  els.recipeList.innerHTML = "";
  els.recipeEmpty.classList.toggle("visible", scored.length === 0);

  scored.forEach(({ recipe, matched, urgent }) => {
    const article = document.createElement("article");
    article.className = "recipe-item";
    article.innerHTML = `
      <h3>${escapeHtml(recipe.title)}</h3>
      <p>${escapeHtml(recipe.copy)}</p>
      <div class="recipe-meta">
        <span>사용 재료: ${matched.map(escapeHtml).join(", ")}</span>
        <span>${recipe.time}${urgent ? " · 임박 재료 포함" : ""}</span>
      </div>
    `;
    els.recipeList.append(article);
  });
}

function inferRule(name) {
  const normalized = String(name || "").toLowerCase();
  return shelfLifeRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) || {
    days: 7,
    storage: "냉장",
    category: "기타"
  };
}

function scoreRecipe(recipe, names, items) {
  const matchedNeeds = recipe.needs.filter((need) => names.some((name) => name.includes(need)));
  const matchedOptional = recipe.optional.filter((need) => names.some((name) => name.includes(need)));
  if (matchedNeeds.length < recipe.needs.length) {
    return { recipe, score: 0, matched: [], urgent: false };
  }

  const matched = [...matchedNeeds, ...matchedOptional];
  const urgent = items.some((item) => matched.some((token) => item.name.includes(token)) && daysUntil(item.expiresAt) <= 3);
  const score = matchedNeeds.length * 10 + matchedOptional.length * 3 + (urgent ? 8 : 0);
  return { recipe, score, matched, urgent };
}

function markUsed(id) {
  state.items = state.items.map((item) => item.id === id ? { ...item, status: "used", usedAt: new Date().toISOString() } : item);
  persistItems();
  render();
}

function restoreItem(id) {
  state.items = state.items.map((item) => item.id === id ? { ...item, status: "active", usedAt: null } : item);
  persistItems();
  render();
}

function halveQuantity(id) {
  state.items = state.items.map((item) => {
    if (item.id !== id) return item;
    return { ...item, quantity: `남은 ${item.quantity} 중 절반` };
  });
  persistItems();
  renderInventory();
}

function exportIcs() {
  const activeItems = state.items.filter((item) => item.status === "active");
  if (!activeItems.length) {
    setStatus("내보낼 재료가 없습니다", "warn");
    return;
  }

  const grouped = activeItems.reduce((acc, item) => {
    acc[item.expiresAt] ||= [];
    acc[item.expiresAt].push(item);
    return acc;
  }, {});

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fridge MVP//Expiry Calendar//KO"
  ];

  Object.entries(grouped).forEach(([date, items]) => {
    const nextDate = toDateInputValue(addDays(parseDateInput(date), 1)).replaceAll("-", "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${date}-${hashText(items.map((item) => item.id).join(""))}@fridge-mvp`,
      `DTSTAMP:${formatIcsDateTime(new Date())}`,
      `DTSTART;VALUE=DATE:${date.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${nextDate}`,
      `SUMMARY:${escapeIcs(`소비기한: ${items.map((item) => item.name).join(", ")}`)}`,
      `DESCRIPTION:${escapeIcs(items.map((item) => `${item.name} ${item.quantity} ${item.storage}`).join("\\n"))}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "fridge-expiry-calendar.ics";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("캘린더 파일 생성", "ok");
}

function makeSmallButton(text, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "small-button";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function setStatus(message, tone = "ok") {
  els.apiStatus.textContent = message;
  els.apiStatus.style.background = tone === "warn" ? "#ffe9e2" : tone === "busy" ? "#e9f2ff" : "#eef4ef";
  els.apiStatus.style.color = tone === "warn" ? "#9a321c" : tone === "busy" ? "#2d5f8b" : "#155039";
}

function readItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function parseDateInput(value) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateInputValue(date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysUntil(dateValue) {
  const today = parseDateInput(toDateInputValue(new Date()));
  const target = parseDateInput(dateValue);
  return Math.ceil((target - today) / MS_PER_DAY);
}

function formatKoreanDate(value) {
  const date = parseDateInput(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatIcsDateTime(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value) {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(";", "\\;").replaceAll("\n", "\\n");
}

function hashText(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
