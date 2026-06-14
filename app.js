const STORAGE_KEY = "fridge-mvp-items";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const shelfLifeRules = [
  { keywords: ["샐러드", "새싹", "쌈채소", "손질"], days: 3, storage: "냉장", category: "채소" },
  { keywords: ["두부", "콩나물", "숙주"], days: 5, storage: "냉장", category: "단백질" },
  { keywords: ["우유", "요거트", "요구르트"], days: 7, storage: "냉장", category: "유제품" },
  { keywords: ["닭", "돼지", "소고기", "고기", "너겟", "핫도그"], days: 30, storage: "냉동", category: "가공식품" },
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
    title: "핫도그 샐러드 플레이트",
    needs: ["핫도그"],
    optional: ["샐러드", "토마토", "치즈"],
    time: "12분",
    copy: "냉동 핫도그에 남은 채소를 곁들여 간단한 한 끼로 만들 수 있습니다."
  },
  {
    title: "치킨너겟 덮밥",
    needs: ["너겟"],
    optional: ["계란", "양파", "토마토"],
    time: "15분",
    copy: "너겟과 냉장고 자투리 재료를 같이 쓰는 빠른 메뉴입니다."
  }
];

const state = {
  selectedPhotos: [],
  drafts: [],
  items: readItems(),
  filter: "active",
  visibleMonth: startOfMonth(new Date()),
  analyzing: false
};

const els = {
  apiStatus: document.querySelector("#apiStatus"),
  cameraPhotoInput: document.querySelector("#cameraPhotoInput"),
  labelPhotoInput: document.querySelector("#labelPhotoInput"),
  photoList: document.querySelector("#photoList"),
  analyzeButton: document.querySelector("#analyzeButton"),
  clearPhotosButton: document.querySelector("#clearPhotosButton"),
  manualNameInput: document.querySelector("#manualNameInput"),
  manualQuantityInput: document.querySelector("#manualQuantityInput"),
  manualStorageInput: document.querySelector("#manualStorageInput"),
  manualExpiryInput: document.querySelector("#manualExpiryInput"),
  manualAddButton: document.querySelector("#manualAddButton"),
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
  els.manualExpiryInput.value = toDateInputValue(addDays(new Date(), 7));
  bindEvents();
  render();
}

function bindEvents() {
  els.cameraPhotoInput.addEventListener("change", (event) => handlePhotoSelection(event, { append: true, source: "camera" }));
  els.labelPhotoInput.addEventListener("change", (event) => handlePhotoSelection(event, { append: true, source: "library" }));
  els.analyzeButton.addEventListener("click", analyzeSelectedPhotos);
  els.clearPhotosButton.addEventListener("click", clearSelectedPhotos);
  els.manualNameInput.addEventListener("input", syncManualDefaults);
  els.manualAddButton.addEventListener("click", addManualDraft);
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

function handlePhotoSelection(event, options = {}) {
  const files = [...event.target.files];
  if (!files.length) return;
  if (!options.append) {
    revokePhotoUrls();
    state.selectedPhotos = [];
  }
  const nextPhotos = files.map((file) => ({
    id: makeId(),
    file,
    url: URL.createObjectURL(file),
    status: "대기",
    progress: 0,
    text: "",
    source: options.source || "file"
  }));
  state.selectedPhotos = [...state.selectedPhotos, ...nextPhotos];
  event.target.value = "";
  els.analyzeButton.disabled = state.selectedPhotos.length === 0;
  els.clearPhotosButton.disabled = state.selectedPhotos.length === 0;
  setStatus(`${state.selectedPhotos.length}장 촬영/선택됨`, "ok");
  renderPhotoList();
}

function clearSelectedPhotos() {
  revokePhotoUrls();
  state.selectedPhotos = [];
  els.analyzeButton.disabled = true;
  els.clearPhotosButton.disabled = true;
  setStatus("사진 촬영 준비", "ok");
  renderPhotoList();
}

async function analyzeSelectedPhotos() {
  if (!state.selectedPhotos.length || state.analyzing) return;
  if (!window.Tesseract?.recognize) {
    setStatus("OCR 라이브러리를 불러오지 못했습니다", "warn");
    return;
  }

  state.analyzing = true;
  els.analyzeButton.disabled = true;

  try {
    for (let index = 0; index < state.selectedPhotos.length; index += 1) {
      const photo = state.selectedPhotos[index];
      photo.status = "분석 중";
      photo.progress = 0;
      renderPhotoList();
      setStatus(`${index + 1}/${state.selectedPhotos.length} 사진 분석 중`, "busy");

      const result = await window.Tesseract.recognize(photo.file, "kor+eng", {
        logger(progress) {
          if (progress.status === "recognizing text") {
            photo.progress = Math.round(progress.progress * 100);
            renderPhotoList();
          }
        }
      });

      photo.text = result.data?.text || "";
      const draft = parseLabelText(photo.text, photo.file.name);
      state.drafts = [draft, ...state.drafts];
      photo.status = draft.expiresAt ? "추출 완료" : "날짜 확인 필요";
      photo.progress = 100;
      renderPhotoList();
      renderDrafts();
    }

    setStatus(`${state.selectedPhotos.length}장 분석 완료`, "ok");
  } catch {
    setStatus("사진 분석 중 오류가 발생했습니다", "warn");
  } finally {
    state.analyzing = false;
    els.analyzeButton.disabled = state.selectedPhotos.length === 0;
    els.clearPhotosButton.disabled = state.selectedPhotos.length === 0;
  }
}

function parseLabelText(text, fileName) {
  const name = extractProductName(text) || stripExtension(fileName);
  const expiresAt = extractExpiryDate(text) || toDateInputValue(addDays(new Date(), 7));
  const rule = inferRule(name);
  return {
    id: makeId(),
    name,
    quantity: "1개",
    category: rule.category,
    storage: rule.storage,
    platform: "사진 OCR",
    purchaseDate: toDateInputValue(new Date()),
    expiresAt,
    confidence: extractExpiryDate(text) ? "사진에서 날짜 추출" : "날짜 확인 필요",
    source: "photo",
    rawText: text
  };
}

function extractExpiryDate(text) {
  const source = normalizeOcrText(text);
  const patterns = [
    /(?:20)?\d{2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{1,2}/g,
    /(?:20)?\d{2}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일/g,
    /\(01\)\s*\d{8,14}/g
  ];
  const candidates = [];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const parsed = parseDateCandidate(match[0]);
      if (!parsed) continue;
      const context = source.slice(Math.max(0, match.index - 18), match.index + match[0].length + 18);
      let score = 1;
      if (/소비기한|유통기한|품질유지기한|까지|exp|best/i.test(context)) score += 8;
      if (/제조일|제조원|주소|전화|고객|품목보고/i.test(context)) score -= 4;
      candidates.push({ date: parsed, score });
    }
  }

  if (!candidates.length) return "";
  candidates.sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date));
  return candidates[0].date;
}

function parseDateCandidate(value) {
  const digits = String(value).match(/\d+/g)?.map(Number) || [];
  if (digits.length < 3) return "";
  let [year, month, day] = digits;
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  if (year < 2020 || year > 2045 || month < 1 || month > 12 || day < 1 || day > 31) return "";
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return toDateInputValue(date);
}

function extractProductName(text) {
  const lines = normalizeOcrText(text)
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const line of lines) {
    const productLine = line.match(/(?:제품명|품명)\s*[:|]?\s*(.+)$/);
    if (productLine) {
      const cleaned = cleanProductName(productLine[1]);
      if (cleaned) return cleaned;
    }
  }

  const scored = lines
    .map((line) => ({ line: cleanProductName(line), score: scoreNameLine(line) }))
    .filter((item) => item.line && item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.line || "";
}

function scoreNameLine(line) {
  const cleaned = cleanProductName(line);
  if (!cleaned) return -10;
  if (/소비기한|유통기한|원재료|영양|조리|보관|제조|판매|고객|내용량|품목보고|주의|알레르기|까지|barcode|haccp/i.test(line)) return -10;
  const hangul = (cleaned.match(/[가-힣]/g) || []).length;
  const latin = (cleaned.match(/[a-z]/gi) || []).length;
  const lengthPenalty = cleaned.length > 24 ? 8 : 0;
  const productWords = /(핫도그|너겟|치킨|두부|우유|요거트|만두|샐러드|계란|치즈|버터)/.test(cleaned) ? 8 : 0;
  return hangul * 2 + latin + productWords - lengthPenalty;
}

function cleanProductName(value) {
  return String(value || "")
    .replace(/식품유형.*$/g, "")
    .replace(/내용량.*$/g, "")
    .replace(/소비기한.*$/g, "")
    .replace(/유통기한.*$/g, "")
    .replace(/[|[\]{}]/g, " ")
    .replace(/\d{1,3}(,\d{3})*원/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 36);
}

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/[：]/g, ":")
    .replace(/[~]/g, "-")
    .replace(/[ㅣ|]/g, " ")
    .replace(/\r/g, "\n");
}

function addManualDraft() {
  const name = els.manualNameInput.value.trim();
  if (!name) {
    setStatus("제품명을 입력하세요", "warn");
    els.manualNameInput.focus();
    return;
  }
  if (!els.manualExpiryInput.value) {
    setStatus("소비기한을 입력하세요", "warn");
    els.manualExpiryInput.focus();
    return;
  }

  const rule = inferRule(name);
  state.drafts = [{
    id: makeId(),
    name,
    quantity: els.manualQuantityInput.value.trim() || "1개",
    category: rule.category,
    storage: els.manualStorageInput.value || rule.storage,
    platform: "직접 입력",
    purchaseDate: toDateInputValue(new Date()),
    expiresAt: els.manualExpiryInput.value,
    confidence: "직접 입력",
    source: "manual"
  }, ...state.drafts];

  els.manualNameInput.value = "";
  els.manualQuantityInput.value = "";
  els.manualStorageInput.value = "냉장";
  els.manualExpiryInput.value = toDateInputValue(addDays(new Date(), 7));
  setStatus("대기 목록에 추가됨", "ok");
  renderDrafts();
}

function syncManualDefaults() {
  const rule = inferRule(els.manualNameInput.value);
  els.manualStorageInput.value = rule.storage;
  if (!els.manualExpiryInput.value) {
    els.manualExpiryInput.value = toDateInputValue(addDays(new Date(), rule.days));
  }
}

function loadSample() {
  const sample = [
    { name: "하림 치킨너겟", quantity: "1봉", expiresAt: "2026-03-15", storage: "냉동" },
    { name: "오리지널 핫도그", quantity: "1봉", expiresAt: "2027-01-15", storage: "냉동" }
  ].map((item) => ({
    id: makeId(),
    ...item,
    category: inferRule(item.name).category,
    platform: "샘플 사진",
    purchaseDate: toDateInputValue(new Date()),
    confidence: "샘플 데이터",
    source: "sample"
  }));

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
  renderPhotoList();
  renderDrafts();
  renderInventory();
  renderCalendar();
  renderRecipes();
}

function renderPhotoList() {
  els.photoList.innerHTML = "";
  state.selectedPhotos.forEach((photo) => {
    const item = document.createElement("article");
    item.className = "photo-item";
    item.innerHTML = `
      <img class="preview-thumb" src="${photo.url}" alt="업로드한 제품 라벨 사진">
      <div>
        <strong>${escapeHtml(photo.file.name)}</strong>
        <div class="ocr-progress">
          <span>${escapeHtml(photo.status)}</span>
          <span>${photo.progress}%</span>
        </div>
        <div class="progress-track"><span style="width:${photo.progress}%"></span></div>
      </div>
    `;
    els.photoList.append(item);
  });
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

    article.innerHTML = `
      <div class="item-title-row">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="expiry-chip ${chipClass}">${chipText}</span>
      </div>
      <div class="inventory-meta">
        <span>${escapeHtml(item.quantity)} · ${escapeHtml(item.storage)} · ${escapeHtml(item.platform)}</span>
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

function stripExtension(fileName) {
  return String(fileName || "제품")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim() || "제품";
}

function revokePhotoUrls() {
  state.selectedPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
