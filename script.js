const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const DB_KEY = "beheira_suggestions_v1";
const APPROVED_KEY = "beheira_approved_content_v1";

const builtInFacts = [
  { type: "city", title: "الأبقعين", description: "قرية تتبع مركز حوش عيسى بمحافظة البحيرة ويقع بالقرب منها تل آثار الأبقعين." },
  { type: "landmark", title: "تل آثار الأبقعين", description: "موقع أثري مرتبط بحصن عسكري من عصر الدولة الحديثة، وتذكر تقارير وجود مبانٍ من الطوب اللبن ومرافق للتخزين." },
  { type: "city", title: "دمنهور", description: "عاصمة محافظة البحيرة ومركز حضري رئيسي في غرب الدلتا." },
  { type: "city", title: "رشيد", description: "مدينة تاريخية عند فرع رشيد، تشتهر بتراثها المعماري وتاريخها الوطني." },
  { type: "landmark", title: "متحف رشيد القومي", description: "متحف يوثق تاريخ رشيد وتراثها." },
  { type: "history", title: "حملة فريزر", description: "مواجهة الحملة الإنجليزية بقيادة فريزر في رشيد عام 1807." },
  { type: "figure", title: "أحمد زويل", description: "عالم كيمياء مصري حاز جائزة نوبل في الكيمياء عام 1999." },
  { type: "figure", title: "محمد عبده", description: "مفكر ومصلح إسلامي مصري." },
  { type: "figure", title: "توفيق الحكيم", description: "أديب ومسرحي مصري من رواد الأدب العربي الحديث." }
];

const typeNames = {
  history: "معلومة تاريخية",
  city: "مدينة أو قرية",
  landmark: "معلم أو موقع أثري",
  figure: "شخصية",
  image: "صورة"
};

function readList(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
}
function writeList(key, list) { localStorage.setItem(key, JSON.stringify(list)); }
function normalize(text) {
  return (text || "").toLowerCase()
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function words(text) { return new Set(normalize(text).split(/\s+/).filter(w => w.length > 1)); }
function similarity(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let common = 0;
  A.forEach(w => { if (B.has(w)) common++; });
  return common / (A.size + B.size - common);
}
function compareWithSite(type, title, description) {
  const allFacts = [...builtInFacts, ...readList(APPROVED_KEY)];
  let best = { score: 0, fact: null };
  allFacts.forEach(fact => {
    const titleScore = similarity(title, fact.title) * 0.65;
    const textScore = similarity(description, fact.description || "") * 0.35;
    const typeBonus = fact.type === type ? 0.08 : 0;
    const score = Math.min(1, titleScore + textScore + typeBonus);
    if (score > best.score) best = { score, fact };
  });
  return best;
}
function screenSuggestion(type, title, description, comparison) {
  const text = normalize(`${title} ${description}`);
  const beheiraTerms = [
    "البحيره", "دمنهور", "رشيد", "ادكو", "ابو حمص", "ابو المطامير", "حوش عيسي",
    "كفر الدوار", "ايتاي البارود", "الدلنجات", "كوم حماده", "شبراخيت", "الرحمانيه",
    "المحموديه", "النوباريه", "وادي النطرون", "ابو قير", "الابْقعين", "الابقيعين",
    "تل اثار", "دلتا", "البحيرة", "محافظة البحيرة"
  ].map(normalize);
  const hasLocalTerm = beheiraTerms.some(term => term && text.includes(term));
  const duplicate = similarity(title, description) < 0; // keeps screening result deterministic
  const nonsense = title.length < 3 || description.length < 15 || words(description).size < 5;
  const unrelated = !hasLocalTerm && comparison.score < 0.12;
  if (nonsense) return { pass: false, reason: "المحتوى قصير جدًا أو لا يبدو مكتملًا. اكتب عنوانًا ووصفًا واضحين." };
  if (duplicate) return { pass: false, reason: "تعذر فحص الاقتراح. راجع النص وحاول مرة أخرى." };
  if (unrelated) return { pass: false, reason: "لم يظهر ارتباط واضح بمحافظة البحيرة في النص. أضف تفاصيل توضّح صلة المعلومة بالمحافظة ثم أعد الإرسال." };
  if (comparison.score >= 0.68) return { pass: false, reason: `يبدو أن الاقتراح مكرر أو قريب جدًا من «${comparison.fact.title}». راجع الموجود قبل الإرسال.` };
  return { pass: true, reason: hasLocalTerm ? "اجتاز الفحص المبدئي: ظهرت إشارة مرتبطة بالبحيرة. أُرسل الآن إلى مراجعة صاحب الموقع." : "اجتاز الفحص المبدئي فقط. أُرسل إلى مراجعة صاحب الموقع، ويجب التحقق من صحته قبل النشر." };
}

function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}
function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}
$$("[data-close]").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.close)));
$$(".modal").forEach(modal => modal.addEventListener("click", event => {
  if (event.target === modal) closeModal(modal.id);
}));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") $$(".modal.show").forEach(modal => closeModal(modal.id));
});

$("#openAdd").addEventListener("click", () => openModal("welcomeModal"));
$("#startSuggestion").addEventListener("click", () => {
  closeModal("welcomeModal");
  $("#matchResult").classList.add("hidden");
  openModal("suggestModal");
});

$("#suggestForm").addEventListener("submit", event => {
  event.preventDefault();
  const type = $("#suggestType").value;
  const title = $("#suggestTitle").value.trim();
  const description = $("#suggestDescription").value.trim();
  const source = $("#suggestSource").value.trim();

  if (!type || !title || description.length < 15) {
    showMatch("اكتب عنوان المعلومة ووصفًا واضحًا واختار القسم المناسب.", "mismatch");
    return;
  }
  if (source && !/^https?:\/\//i.test(source)) {
    showMatch("رابط المصدر غير واضح. اكتب رابطًا يبدأ بـ https:// أو اترك خانة المصدر فارغة.", "mismatch");
    return;
  }

  const comparison = compareWithSite(type, title, description);
  const screening = screenSuggestion(type, title, description, comparison);
  if (!screening.pass) {
    showMatch(`الفحص الآلي المبدئي: لم يُرسل الاقتراح. ${escapeHtml(screening.reason)}`, "mismatch");
    return;
  }

  const item = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    type, title, description, source,
    createdAt: new Date().toLocaleString("ar-EG"),
    status: "pending",
    screening: screening.reason,
    matchScore: Math.round(comparison.score * 100),
    similarTitle: comparison.fact ? comparison.fact.title : "",
    similarDescription: comparison.fact ? comparison.fact.description : ""
  };

  const previous = readList(DB_KEY);
  const duplicate = previous.find(old => old.status !== "rejected" &&
    (similarity(title, old.title) > 0.78 || similarity(description, old.description) > 0.88));
  if (duplicate) {
    showMatch(`الفحص الآلي: الاقتراح قريب جدًا من اقتراح موجود بعنوان «${escapeHtml(duplicate.title)}». لم يتم إرساله.`, "mismatch");
    return;
  }

  previous.unshift(item);
  writeList(DB_KEY, previous);
  renderReviewList();
  showMatch(`الفحص الآلي المبدئي: ${escapeHtml(screening.reason)} لن تُنشر المعلومة قبل مراجعتك وموافقتك.`, "review");
  $("#suggestForm").reset();
  setTimeout(() => closeModal("suggestModal"), 2600);
});

function showMatch(message, kind) {
  const box = $("#matchResult");
  box.className = `match-result ${kind || ""}`;
  box.innerHTML = message;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function renderReviewList() {
  const items = readList(DB_KEY);
  const pending = items.filter(item => item.status === "pending").length;
  $("#pendingCount").textContent = `${pending} اقتراحات بانتظار المراجعة`;
  const container = $("#reviewList");
  if (!items.length) {
    container.innerHTML = '<p class="empty-state">لا توجد اقتراحات حاليًا. جرّب زر «أضف معلومة» الموجود على جانب الصفحة.</p>';
    return;
  }
  container.innerHTML = items.map(item => {
    const state = item.status === "pending" ? "بانتظار المراجعة" : item.status === "approved" ? "تمت الموافقة" : "مرفوض";
    const matchInfo = item.similarTitle
      ? `<p class="review-meta">أقرب معلومة في الموقع: ${escapeHtml(item.similarTitle)} — تشابه تقريبي ${item.matchScore}%</p>`
      : `<p class="review-meta">لم يظهر تطابق واضح مع البيانات المبدئية.</p>`;
    const source = item.source
      ? `<p>المصدر: <a href="${escapeHtml(item.source)}" target="_blank" rel="noopener">فتح الرابط ↗</a></p>`
      : `<p>المصدر: لم يقدّم الزائر مصدرًا؛ تمت المقارنة مع بيانات الموقع.</p>`;
    return `<article class="review-card">
      <div class="review-meta">${escapeHtml(typeNames[item.type] || item.type)} • ${escapeHtml(item.createdAt)}</div>
      <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p>${source}${matchInfo}
      <p class="review-meta">نتيجة الفحص: ${escapeHtml(item.screening || "اجتاز المقارنة المبدئية؛ يلزم التحقق البشري.")}</p>
      <label class="review-meta" for="edit-title-${item.id}">تعديل العنوان</label>
      <input class="review-edit-title" id="edit-title-${item.id}" maxlength="100" value="${escapeHtml(item.title)}">
      <label class="review-meta" for="edit-${item.id}">تعديل نص المعلومة قبل القرار</label>
      <textarea id="edit-${item.id}" rows="4">${escapeHtml(item.description)}</textarea>
      <div class="review-meta">الحالة: ${state}</div>
      <div class="review-actions">
        <button class="edit" data-action="save" data-id="${item.id}">حفظ التعديل</button>
        <button class="approve" data-action="approve" data-id="${item.id}">موافقة ونشر</button>
        <button class="reject" data-action="reject" data-id="${item.id}">رفض</button>
      </div>
    </article>`;
  }).join("");
}
$("#reviewList").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const items = readList(DB_KEY);
  const item = items.find(entry => entry.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === "save") {
    const edited = $(`#edit-${item.id}`).value.trim();
    const editedTitle = $(`#edit-title-${item.id}`).value.trim();
    if (edited.length < 15 || editedTitle.length < 3) { alert("اكتب عنوانًا ووصفًا واضحين قبل حفظ التعديل."); return; }
    item.title = editedTitle;
    item.description = edited;
    item.status = "pending";
    alert("تم حفظ التعديل. ما زال القرار النهائي بيدك: وافق للنشر أو ارفض.");
  } else if (button.dataset.action === "approve") {
    item.title = $(`#edit-title-${item.id}`).value.trim();
    item.description = $(`#edit-${item.id}`).value.trim();
    if (item.title.length < 3 || item.description.length < 15) { alert("أكمل العنوان والوصف قبل الموافقة."); return; }
    item.status = "approved";
    const approved = readList(APPROVED_KEY);
    if (!approved.some(entry => entry.id === item.id)) {
      approved.push({ id: item.id, type: item.type, title: item.title, description: item.description, source: item.source });
      writeList(APPROVED_KEY, approved);
    }
    addApprovedCard(item);
    alert("تمت الموافقة وإضافة المعلومة إلى القسم المناسب في هذه النسخة التجريبية.");
  } else if (button.dataset.action === "reject") {
    item.status = "rejected";
    alert("تم رفض الاقتراح.");
  }
  writeList(DB_KEY, items);
  renderReviewList();
});
function addApprovedCard(item) {
  const sectionMap = { city: "#citiesGrid", landmark: "#landmarksGrid", history: "#landmarksGrid", figure: "#figures .feature-grid", image: "#gallery .gallery-grid" };
  const target = document.querySelector(sectionMap[item.type] || "#landmarksGrid");
  if (!target || target.querySelector(`[data-approved-id="${item.id}"]`)) return;
  const card = document.createElement("article");
  card.dataset.approvedId = item.id;
  card.className = item.type === "city" ? "city-card" : item.type === "landmark" || item.type === "history" ? "landmark-card" : item.type === "image" ? "gallery-tile" : "glass-card";
  const title = escapeHtml(item.title), description = escapeHtml(item.description);
  if (item.type === "city") {
    card.innerHTML = `<div class="city-art">✦</div><div><span>إضافة معتمدة</span><h3>${title}</h3><p>${description}</p></div>`;
  } else if (item.type === "landmark" || item.type === "history") {
    card.innerHTML = `<div class="landmark-icon">📜</div><span>إضافة معتمدة</span><h3>${title}</h3><p>${description}</p>`;
  } else if (item.type === "figure") {
    card.innerHTML = `<div class="card-icon">👤</div><h3>${title}</h3><p>${description}</p>`;
  } else {
    card.innerHTML = `<span>${title}</span><small>${description}</small>`;
  }
  target.appendChild(card);
}
function restoreApprovedCards() {
  readList(APPROVED_KEY).forEach(addApprovedCard);
}
$("#clearDemo").addEventListener("click", () => {
  if (!confirm("هل تريد مسح اقتراحات التجربة والمعلومات التي وافقت عليها من هذا المتصفح؟")) return;
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(APPROVED_KEY);
  renderReviewList();
  location.reload();
});

$("#themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  $("#themeBtn").textContent = document.body.classList.contains("dark") ? "☀" : "☾";
});
$("#menuToggle").addEventListener("click", () => $("#mainNav").classList.toggle("open"));
$$(".main-nav a").forEach(link => link.addEventListener("click", () => $("#mainNav").classList.remove("open")));
$("#toTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
window.addEventListener("scroll", () => $("#toTop").classList.toggle("show", window.scrollY > 450));

$$(".timeline-item").forEach(item => item.addEventListener("click", () => {
  $("#infoTitle").textContent = item.dataset.title;
  $("#infoText").textContent = item.dataset.text;
  openModal("infoModal");
}));

renderReviewList();
restoreApprovedCards();
