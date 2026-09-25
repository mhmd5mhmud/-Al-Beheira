const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const progressBar = $("#progressBar");
const toTop = $("#toTop");
const themeBtn = $("#themeBtn");
const menuToggle = $("#menuToggle");
const mainNav = $("#mainNav");

window.addEventListener("scroll", () => {
  const scrollTop = window.scrollY;
  const height = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = `${height ? (scrollTop / height) * 100 : 0}%`;
  toTop.classList.toggle("show", scrollTop > 500);

  const sections = $$("section[id]");
  let current = "home";
  sections.forEach(sec => {
    if (scrollTop >= sec.offsetTop - 180) current = sec.id;
  });
  $$(".main-nav a").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === `#${current}`);
  });
});

toTop.addEventListener("click", () => window.scrollTo({top:0, behavior:"smooth"}));

menuToggle.addEventListener("click", () => mainNav.classList.toggle("open"));
$$(".main-nav a").forEach(a => a.addEventListener("click", () => mainNav.classList.remove("open")));

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  themeBtn.textContent = document.body.classList.contains("dark") ? "☀" : "☾";
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, {threshold:.12});

$$(".reveal").forEach(el => revealObserver.observe(el));

const infoModal = $("#infoModal");
const modalTitle = $("#modalTitle");
const modalText = $("#modalText");
const modalClose = $("#modalClose");

$$(".timeline-item").forEach(item => {
  item.addEventListener("click", () => {
    modalTitle.textContent = item.dataset.title;
    modalText.textContent = item.dataset.text;
    infoModal.classList.add("show");
    infoModal.setAttribute("aria-hidden", "false");
  });
});

function closeInfo(){
  infoModal.classList.remove("show");
  infoModal.setAttribute("aria-hidden", "true");
}
modalClose.addEventListener("click", closeInfo);
infoModal.addEventListener("click", e => { if(e.target === infoModal) closeInfo(); });

const imageModal = $("#imageModal");
const modalImage = $("#modalImage");
const modalCaption = $("#modalCaption");
const imageModalClose = $("#imageModalClose");

$$(".gallery-item").forEach(item => {
  item.addEventListener("click", () => {
    modalImage.src = item.dataset.img;
    modalImage.alt = item.dataset.caption;
    modalCaption.textContent = item.dataset.caption;
    imageModal.classList.add("show");
    imageModal.setAttribute("aria-hidden","false");
  });
});

function closeImage(){
  imageModal.classList.remove("show");
  imageModal.setAttribute("aria-hidden","true");
  modalImage.src = "";
}
imageModalClose.addEventListener("click", closeImage);
imageModal.addEventListener("click", e => { if(e.target === imageModal) closeImage(); });

document.addEventListener("keydown", e => {
  if(e.key === "Escape"){
    closeInfo();
    closeImage();
  }
});

const counters = $$("[data-count]");
const counterObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if(!entry.isIntersecting) return;
    const el = entry.target;
    const target = Number(el.dataset.count);
    let value = 0;
    const step = Math.max(1, Math.ceil(target / 35));
    const timer = setInterval(() => {
      value += step;
      if(value >= target){
        value = target;
        clearInterval(timer);
      }
      el.textContent = value;
    }, 30);
    observer.unobserve(el);
  });
}, {threshold:.6});

counters.forEach(c => counterObserver.observe(c));
