/* Irregular verbs trainer — one scrolling page of exercises. Expects window.GROUP. */
(function(){
"use strict";
const G = window.GROUP;
const $ = (s, el=document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const alts = f => f.split("/").map(x => x.trim().toLowerCase());
const main = f => f.split("/")[0].trim();
const norm = s => s.trim().toLowerCase().replace(/[’`]/g,"'").replace(/\s+/g," ");
const okAns = (input, form) => alts(form).includes(norm(input));
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const take = (a, n) => shuffle(a).slice(0, n);

/* ---------- sentences ---------- */
const ALL = G.verbs.flatMap(v => v.sents.map(([s,t,i]) => {
  const target = s.match(/\*([^*]+)\*/)[1];
  const accept = (v.v[0] !== "be" && alts(v.v[i]).includes(target.toLowerCase())) ? v.v[i] : target;
  return { v, s, t, i, target, accept };
}));
const byForm = i => ALL.filter(x => x.i === i);
const before = x => esc(x.s.split("*")[0]);
const after  = x => esc(x.s.split("*")[2]);

/* ---------- speech: cards only ---------- */
let voice = null;
function pickVoice(){
  const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
  voice = vs.find(v=>/en-GB/i.test(v.lang)) || vs.find(v=>/^en/i.test(v.lang)) || null;
}
if (window.speechSynthesis){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(texts){
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  texts.forEach(t=>{ const u = new SpeechSynthesisUtterance(t); u.lang="en-GB"; if (voice) u.voice=voice; u.rate=0.8; speechSynthesis.speak(u); });
}
const sayForms = v => [0,1,2].map(i => v.say ? v.say[i] : main(v.v[i]));

/* ---------- regular-looking wrong form ---------- */
function regular(b){
  if (/e$/.test(b)) return b+"d";
  if (/[^aeiou]y$/.test(b)) return b.slice(0,-1)+"ied";
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(b)) return b + b.slice(-1) + "ed";
  return b+"ed";
}
function wrongFor(x){
  const v = x.v, ok = alts(v.v[x.i]).concat([x.target.toLowerCase()]);
  const order = x.i===0 ? [1,2] : x.i===1 ? [2,0] : [1,0];
  for (const k of order){ const w = main(v.v[k]); if (!ok.includes(w.toLowerCase())) return w; }
  return regular(v.v[0]);
}
function optionsFor(x){
  const v = x.v, correct = x.target.toLowerCase(), ok = alts(v.v[x.i]).concat([correct]);
  const pool = [main(v.v[0]), main(v.v[1]), main(v.v[2]), regular(v.v[0])];
  if (x.i===2 && !/en$/.test(correct)) pool.push(main(v.v[1]).replace(/e?$/,"en"));
  pool.push(v.v[0]+"s");
  const wrong = [...new Set(pool.map(w=>w.toLowerCase()))].filter(w => !ok.includes(w)).slice(0,3);
  return shuffle([x.target, ...wrong]);
}

/* ---------- building blocks ---------- */
const inp = (answer, ph="") => `<input class="ans" data-a="${esc(answer)}" placeholder="${esc(ph)}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`;
const SECTIONS = [];
function section(title, lead, render, opts={}){
  SECTIONS.push({ title, lead, render, ...opts });
}
function controls(n, isLast){
  const next = isLast
    ? (G.next ? `<a class="btn sage" href="${G.next.url}">Следующая группа: ${esc(G.next.label)} →</a>` : `<a class="btn sage" href="../index.html">Ко всем группам</a>`)
    : `<a class="btn sage next" href="#ex-${n+1}">Дальше ↓</a>`;
  return `<div class="row-btns"><button class="btn do-check">Проверить</button><button class="btn ghost do-again">🔄 Новые задания</button><span class="score"></span></div>
          <div class="row-btns next-row">${next}</div>`;
}
function attachCheck(box){
  const score = $(".score", box);
  $(".do-check", box).onclick = ()=>{
    let ok=0, total=0;
    box.querySelectorAll("input.ans").forEach(i=>{
      total++; const good = okAns(i.value, i.dataset.a);
      i.classList.toggle("ok", good); i.classList.toggle("no", !good);
      const f = i.nextElementSibling; if (f && f.classList.contains("fix")) f.remove();
      if (good) ok++; else i.insertAdjacentHTML("afterend", `<span class="fix">${esc(main(i.dataset.a))}</span>`);
    });
    score.textContent = `${ok} из ${total}` + (ok===total ? " 🎉" : "");
  };
  box.addEventListener("keydown", e=>{
    if (e.key!=="Enter" || !e.target.matches("input.ans")) return;
    e.preventDefault();
    const all = [...box.querySelectorAll("input.ans")]; const k = all.indexOf(e.target);
    if (k < all.length-1) all[k+1].focus(); else $(".do-check", box).click();
  });
}
const q = (n, body, tr) => `<div class="q"><span class="num">${n}.</span><span class="prompt"><span class="sent">${body}</span>${tr?`<span class="tr">${esc(tr)}</span>`:""}</span></div>`;

/* ---------- 0. table ---------- */
section("Таблица", "Прочитайте таблицу вслух: V1 – V2 – V3. Транскрипция подскажет, как произносить.", () => `
  <div class="legend"><span class="c1">● V1 — инфинитив</span><span class="c2">● V2 — Past Simple</span><span class="c3">● V3 — Past Participle</span></div>
  <table class="vt"><thead><tr><th>V1</th><th>V2</th><th>V3</th><th>Перевод</th></tr></thead><tbody>${
    G.verbs.map(v=>`<tr>${[0,1,2].map(i=>`<td><span class="f c${i+1}">${esc(v.v[i])}</span><span class="ipa">[${esc(v.ipa[i])}]</span></td>`).join("")}<td class="ru">${esc(v.ru)}</td></tr>`).join("")
  }</tbody></table>`, { noCheck:true, title2:"Таблица" });

/* ---------- 1. cards ---------- */
section("Карточки", "Посмотрите на перевод и назовите три формы вслух. Нажмите на карточку — она перевернётся и произнесёт формы. Стрелками листайте дальше.", () => `
  <div class="fc-stage"><div class="fc" id="fc"><div class="fc-face fc-front" id="fcFront"></div><div class="fc-face fc-back" id="fcBack"></div></div></div>
  <div class="fc-ctrl"><button class="btn ghost" id="fcPrev" aria-label="Назад">←</button><span class="fc-count" id="fcCount"></span><button class="btn ghost" id="fcNext" aria-label="Вперёд">→</button></div>
  <div class="row-btns" style="justify-content:center"><button class="btn small ghost" id="fcMode">Лицевая сторона: перевод</button><button class="btn small ghost" id="fcShuffle">🔀 Перемешать</button></div>`,
  { noCheck:true, after: box => {
    let deck = G.verbs.slice(), idx = 0, mode = "ru";
    const fc = $("#fc", box);
    function draw(){
      const v = deck[idx]; fc.classList.remove("flip");
      $("#fcFront",box).innerHTML = mode==="ru"
        ? `<div class="fc-word" style="font-size:30px">${esc(v.ru)}</div><div class="fc-hint">назовите V1 – V2 – V3 · нажмите, чтобы перевернуть</div>`
        : `<div class="fc-word">${esc(v.v[0])}</div><div class="fc-ru">[${esc(v.ipa[0])}]</div><div class="fc-hint">назовите V2 и V3 · нажмите, чтобы перевернуть</div>`;
      $("#fcBack",box).innerHTML = `<div class="fc-forms">${[0,1,2].map(i=>`<div class="c${i+1}">${esc(v.v[i])}<span class="ipa">[${esc(v.ipa[i])}]</span></div>`).join("")}</div>
        <div class="fc-ru">${esc(v.ru)}</div><button class="say" id="fcSay" title="Послушать ещё раз">🔊</button>`;
      $("#fcCount",box).textContent = `${idx+1} / ${deck.length}`;
    }
    fc.onclick = e => {
      if (e.target.closest("#fcSay")){ e.stopPropagation(); speak(sayForms(deck[idx])); return; }
      fc.classList.toggle("flip"); if (fc.classList.contains("flip")) speak(sayForms(deck[idx]));
    };
    $("#fcPrev",box).onclick = ()=>{ idx=(idx-1+deck.length)%deck.length; draw(); };
    $("#fcNext",box).onclick = ()=>{ idx=(idx+1)%deck.length; draw(); };
    $("#fcShuffle",box).onclick = ()=>{ deck = shuffle(deck); idx=0; draw(); };
    $("#fcMode",box).onclick = e=>{ mode = mode==="ru" ? "v1" : "ru"; e.target.textContent = "Лицевая сторона: " + (mode==="ru"?"перевод":"V1"); draw(); };
    draw();
  }});

/* ---------- 2. missing forms ---------- */
section("Допиши недостающие формы", "Одна форма уже есть — впишите две другие. Enter — к следующему полю.", () => {
  return take(G.verbs, 12).map((v,n)=>{
    const given = Math.floor(Math.random()*3);
    const cells = [0,1,2].map(i => i===given ? `<span class="given c${i+1}">${esc(v.v[i])}</span>` : inp(v.v[i], "V"+(i+1))).join("");
    return `<div class="q"><span class="num">${n+1}.</span><span class="prompt">${esc(v.ru)}</span><span class="three">${cells}</span></div>`;
  }).join("");
});

/* ---------- 3. Past Simple ---------- */
section("Past Simple: раскройте скобки", "Всё это случилось в прошлом — нужна <b>вторая форма (V2)</b>.", () =>
  take(byForm(1), 10).map((x,n)=> q(n+1, `${before(x)}${inp(x.accept)} <span class="base">(${esc(x.v.v[0])})</span>${after(x)}`, x.t)).join(""));

/* ---------- 4. Present Perfect & passive ---------- */
section("Present Perfect и пассив: раскройте скобки", "После <b>have / has / had</b> и после <b>be</b> в пассиве (is, was, been…) — <b>третья форма (V3)</b>.", () =>
  take(byForm(2), 10).map((x,n)=> q(n+1, `${before(x)}${inp(x.accept)} <span class="base">(${esc(x.v.v[0])})</span>${after(x)}`, x.t)).join(""));

/* ---------- 5. trap: did / didn't ---------- */
section("Ловушка: did, didn't, can", "Внимание! После <b>did / didn't / can / don't</b> глагол стоит в <b>первой форме</b>: Did you <u>see</u>? — а не <s>saw</s>. В остальных предложениях — Past Simple.", () => {
  const items = shuffle(take(byForm(0), 8).concat(take(byForm(1), 4)));
  return items.map((x,n)=> q(n+1, `${before(x)}${inp(x.accept)} <span class="base">(${esc(x.v.v[0])})</span>${after(x)}`, x.t)).join("");
});

/* ---------- 6. choose ---------- */
section("Выбери правильную форму", "Нажмите на нужную форму. Подсказка: прошедшее время — V2, после have/has и в пассиве — V3, после did — V1.", () =>
  take(ALL, 10).map((x,n)=> `<div class="q choose" data-a="${esc(x.target)}"><span class="num">${n+1}.</span><span class="prompt">
    <span class="sent">${before(x)}<span class="gap">_____</span>${after(x)}</span><span class="tr">${esc(x.t)}</span>
    <span class="opts">${optionsFor(x).map(o=>`<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</span></span></div>`).join(""),
  { choose:true });

/* ---------- 7. find the mistake ---------- */
section("Найди и исправь ошибку", "В каждом предложении неправильная форма зачёркнута красным. Напишите правильную.", () =>
  take(ALL, 8).map((x,n)=> q(n+1, `${before(x)}<u class="wrong">${esc(wrongFor(x))}</u>${after(x)} → ${inp(x.accept, "правильно…")}`, x.t)).join(""));

/* ---------- 8. translation ---------- */
section("Вспомни глагол по переводу", "Глагол в скобках не дан! Прочитайте перевод, вспомните глагол и поставьте его в нужную форму.", () =>
  take(ALL, 8).map((x,n)=> `<div class="q"><span class="num">${n+1}.</span><span class="prompt"><span class="tr ru-first">${esc(x.t)}</span>
    <span class="sent">${before(x)}${inp(x.accept)}${after(x)}</span></span></div>`).join(""));

/* ---------- 9. story ---------- */
section("Текст: " + G.story_title, "Прочитайте историю и раскройте скобки. Подумайте: прошедшее время (V2) или have / was + V3?", () =>
  `<div class="story">${esc(G.story).replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_,b,a)=> inp(a) + `<span class="base"> (${b})</span>`)}</div>`);

/* ---------- render feed ---------- */
const feed = $("#feed"), steps = $("#steps");
const numbered = SECTIONS.map((s,k)=>({...s, n:k}));
steps.innerHTML = `<span class="steps-label">Упражнения:</span>` + numbered.map(s=>`<a href="#ex-${s.n}">${s.n===0?"📋":s.n}</a>`).join("");
numbered.forEach((s,k)=>{
  const isLast = k === numbered.length-1;
  const box = document.createElement("section");
  box.className = "panel ex"; box.id = "ex-"+s.n;
  const head = s.n===0 ? `<h2>📋 Таблица</h2>` : `<div class="ex-num">Упражнение ${s.n} из ${numbered.length-1}</div><h2>${s.title}</h2>`;
  function draw(){
    box.innerHTML = `${head}<p class="lead">${s.lead}</p><div class="ex-body">${s.render()}</div>` +
      (s.noCheck ? `<div class="row-btns next-row"><a class="btn sage next" href="#ex-${s.n+1}">${s.n===0?"К упражнениям ↓":"Дальше ↓"}</a></div>`
       : s.choose ? `<div class="row-btns"><button class="btn ghost do-again">🔄 Новые задания</button><span class="score"></span></div><div class="row-btns next-row"><a class="btn sage next" href="#ex-${s.n+1}">Дальше ↓</a></div>`
       : controls(s.n, isLast));
    if (s.after) s.after(box);
    if (s.choose) wireChoose(box);
    else if (!s.noCheck) attachCheck(box);
    const again = $(".do-again", box); if (again) again.onclick = draw;
  }
  draw();
  feed.appendChild(box);
});

function wireChoose(box){
  let ok=0, done=0; const total = box.querySelectorAll(".q").length;
  box.querySelector(".ex-body").addEventListener("click", e=>{
    const b = e.target.closest(".opt"); if (!b || b.disabled) return;
    const qq = b.closest(".q"), target = qq.dataset.a, good = norm(b.dataset.o)===norm(target);
    qq.querySelectorAll(".opt").forEach(o=>{ o.disabled=true; if (norm(o.dataset.o)===norm(target)) o.classList.add("ok"); });
    if (!good) b.classList.add("no");
    qq.querySelector(".gap").textContent = target;
    done++; if (good) ok++;
    $(".score", box).textContent = `${ok} из ${done}` + (done===total && ok===total ? " 🎉" : "");
  });
}
})();
