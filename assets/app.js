/* Irregular verbs trainer — shared engine. Expects window.GROUP. */
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
const FORM_NAMES = ["V1 · инфинитив","V2 · Past Simple","V3 · Past Participle"];

/* ---------- speech ---------- */
let voice = null;
function pickVoice(){
  const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
  voice = vs.find(v=>/en-GB/i.test(v.lang) && /female|libby|sonia|serena|kate|google uk english female/i.test(v.name))
       || vs.find(v=>/en-GB/i.test(v.lang)) || vs.find(v=>/^en/i.test(v.lang)) || null;
}
if (window.speechSynthesis){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(texts, rate=0.85){
  if (!window.speechSynthesis){ alert("Ваш браузер не поддерживает озвучку. Попробуйте Chrome или Safari."); return; }
  speechSynthesis.cancel();
  (Array.isArray(texts)?texts:[texts]).forEach(t=>{
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "en-GB"; if (voice) u.voice = voice; u.rate = rate;
    speechSynthesis.speak(u);
  });
}
const sayForm = (v,i) => v.say ? v.say[i] : main(v.v[i]);
const sayThree = v => speak([0,1,2].map(i=>sayForm(v,i)), 0.8);
window.__speak = speak;
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-say]"); if (!b) return;
  e.stopPropagation(); speak(b.dataset.say.split("|"), b.dataset.rate?+b.dataset.rate:0.85);
});
const sayBtn = (text, title="Послушать") => `<button class="say" title="${title}" data-say="${esc(text)}">🔊</button>`;
const stripStars = s => s.replace(/\*/g,"");

/* ---------- tabs ---------- */
const TABS = [
  ["table","📋 Таблица"],["cards","🃏 Карточки"],["three","✍️ Три формы"],
  ["listen","🎧 На слух"],["choose","✅ Выбери форму"],["fill","🧩 Впиши в предложение"],["story","📖 Текст"]
];
function initTabs(){
  const bar = $("#tabs"), host = $("#panels");
  TABS.forEach(([id,label],i)=>{
    bar.insertAdjacentHTML("beforeend", `<button class="tab${i?"":" active"}" data-tab="${id}">${label}</button>`);
    host.insertAdjacentHTML("beforeend", `<section class="panel${i?"":" active"}" id="p-${id}"></section>`);
  });
  bar.addEventListener("click", e=>{
    const t = e.target.closest(".tab"); if (!t) return;
    bar.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active", x===t));
    host.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active", p.id==="p-"+t.dataset.tab));
    if (window.speechSynthesis) speechSynthesis.cancel();
  });
}

/* ---------- 1. table ---------- */
function renderTable(){
  const p = $("#p-table");
  const rows = G.verbs.map(v=>`<tr>
    ${[0,1,2].map(i=>`<td><span class="f c${i+1}">${esc(v.v[i])}</span><span class="ipa">[${esc(v.ipa[i])}]</span></td>`).join("")}
    <td class="ru">${esc(v.ru)}</td>
    <td>${sayBtn([0,1,2].map(i=>sayForm(v,i)).join("|"),"Послушать три формы")}</td></tr>`).join("");
  p.innerHTML = `<h2>Слушай и повторяй</h2>
    <p class="lead">Нажмите 🔊 и повторите вслух все три формы: сначала медленно, потом в ритме — как скороговорку.</p>
    <div class="legend"><span class="c1">● V1 — инфинитив</span><span class="c2">● V2 — Past Simple</span><span class="c3">● V3 — Past Participle</span></div>
    <table class="vt"><thead><tr><th>V1</th><th>V2</th><th>V3</th><th>Перевод</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    <div class="row-btns"><button class="btn sage" id="chantAll">▶ Прослушать всю группу</button>
    <button class="btn ghost" onclick="speechSynthesis.cancel()">■ Стоп</button></div>`;
  $("#chantAll").onclick = ()=> speak(G.verbs.flatMap(v=>[0,1,2].map(i=>sayForm(v,i))), 0.85);
}

/* ---------- 2. cards ---------- */
function renderCards(){
  const p = $("#p-cards");
  let deck = G.verbs.slice(), idx = 0, mode = "ru";
  p.innerHTML = `<h2>Карточки</h2>
    <p class="lead">Посмотрите на лицевую сторону, назовите три формы вслух — и переверните карточку, чтобы проверить себя.</p>
    <div class="row-btns" style="justify-content:center;margin:0 0 14px">
      <button class="btn small ghost" data-mode="ru">Лицо: перевод</button>
      <button class="btn small ghost" data-mode="v1">Лицо: V1</button>
      <button class="btn small ghost" id="fcShuffle">🔀 Перемешать</button></div>
    <div class="fc-stage"><div class="fc" id="fc">
      <div class="fc-face fc-front" id="fcFront"></div><div class="fc-face fc-back" id="fcBack"></div></div></div>
    <div class="fc-ctrl"><button class="btn ghost" id="fcPrev">←</button><span class="fc-count" id="fcCount"></span>
      <button class="btn ghost" id="fcNext">→</button></div>`;
  const fc = $("#fc", p);
  function draw(){
    const v = deck[idx]; fc.classList.remove("flip");
    $("#fcFront",p).innerHTML = mode==="ru"
      ? `<div class="fc-word" style="font-size:30px">${esc(v.ru)}</div><div class="fc-hint">назовите V1 – V2 – V3 · нажмите, чтобы перевернуть</div>`
      : `<div class="fc-word">${esc(v.v[0])}</div><div class="fc-ru">[${esc(v.ipa[0])}]</div><div class="fc-hint">назовите V2 и V3 · нажмите, чтобы перевернуть</div>`;
    $("#fcBack",p).innerHTML = `<div class="fc-forms">${[0,1,2].map(i=>`<div class="c${i+1}">${esc(v.v[i])}<span class="ipa">[${esc(v.ipa[i])}]</span></div>`).join("")}</div>
      <div class="fc-ru">${esc(v.ru)}</div><div style="margin-top:10px">${sayBtn([0,1,2].map(i=>sayForm(v,i)).join("|"))}</div>`;
    $("#fcCount",p).textContent = `${idx+1} / ${deck.length}`;
  }
  fc.onclick = ()=>{ fc.classList.toggle("flip"); if (fc.classList.contains("flip")) sayThree(deck[idx]); };
  $("#fcPrev",p).onclick = ()=>{ idx=(idx-1+deck.length)%deck.length; draw(); };
  $("#fcNext",p).onclick = ()=>{ idx=(idx+1)%deck.length; draw(); };
  $("#fcShuffle",p).onclick = ()=>{ deck = shuffle(deck); idx=0; draw(); };
  p.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{ mode=b.dataset.mode; draw(); });
  document.addEventListener("keydown", e=>{
    if (!p.classList.contains("active") || e.target.tagName==="INPUT") return;
    if (e.key==="ArrowRight") $("#fcNext",p).click();
    if (e.key==="ArrowLeft") $("#fcPrev",p).click();
    if (e.key===" "){ e.preventDefault(); fc.click(); }
  });
  draw();
}

/* ---------- generic checker ---------- */
function attachCheck(p, onRestart){
  const score = $(".score", p);
  $(".do-check", p).onclick = ()=>{
    let ok=0, total=0;
    p.querySelectorAll("input.ans").forEach(inp=>{
      total++; const good = okAns(inp.value, inp.dataset.a);
      inp.classList.toggle("ok", good); inp.classList.toggle("no", !good);
      let fix = inp.nextElementSibling;
      if (fix && fix.classList.contains("fix")) fix.remove();
      if (good) ok++; else inp.insertAdjacentHTML("afterend", `<span class="fix">${esc(inp.dataset.a)}</span>`);
    });
    score.textContent = `${ok} из ${total}` + (ok===total ? " 🎉" : "");
  };
  $(".do-again", p).onclick = onRestart;
  p.addEventListener("keydown", e=>{
    if (e.key!=="Enter" || !e.target.matches("input.ans")) return;
    const all = [...p.querySelectorAll("input.ans")]; const i = all.indexOf(e.target);
    if (i < all.length-1) all[i+1].focus(); else $(".do-check", p).click();
  });
}
const controls = `<div class="row-btns"><button class="btn do-check">Проверить</button><button class="btn ghost do-again">🔄 Заново</button><span class="score"></span></div>`;
const inp = (answer, ph="") => `<input class="ans" data-a="${esc(answer)}" placeholder="${esc(ph)}" autocomplete="off" autocapitalize="off" spellcheck="false">`;

/* ---------- 3. three forms ---------- */
function renderThree(){
  const p = $("#p-three");
  const items = shuffle(G.verbs);
  p.innerHTML = `<h2>Три формы по переводу</h2>
    <p class="lead">Напишите V1, V2 и V3. Если вариантов два (dreamt/dreamed), подойдёт любой. Enter — к следующему полю.</p>
    ${items.map((v,i)=>`<div class="q"><span class="num">${i+1}.</span><span class="prompt">${esc(v.ru)}</span>
      <span class="three">${inp(v.v[0],"V1")}${inp(v.v[1],"V2")}${inp(v.v[2],"V3")}</span></div>`).join("")}${controls}`;
  attachCheck(p, renderThree);
}

/* ---------- 4. listening dictation ---------- */
function renderListen(){
  const p = $("#p-listen");
  const items = shuffle(G.verbs.flatMap(v=>[1,2].map(i=>({v,i})))).slice(0, 12);
  p.innerHTML = `<h2>Диктант на слух</h2>
    <p class="lead">Нажмите 🔊, послушайте форму глагола и напишите её. Тренируем звук и написание одновременно.</p>
    ${items.map(({v,i},n)=>`<div class="q"><span class="num">${n+1}.</span>${sayBtn(sayForm(v,i))}
      <span class="prompt">${inp(v.v[i],"слышу…")}</span></div>`).join("")}${controls}`;
  attachCheck(p, renderListen);
}

/* ---------- options for choose ---------- */
function regular(b){
  if (/e$/.test(b)) return b+"d";
  if (/[^aeiou]y$/.test(b)) return b.slice(0,-1)+"ied";
  return b+"ed";
}
function optionsFor(v, i, target){
  const correct = target.toLowerCase();
  const pool = [main(v.v[0]), main(v.v[1]), main(v.v[2]), regular(v.v[0])];
  if (i===2 && !/en$/.test(correct)) pool.push(main(v.v[1]).replace(/e?$/,"en"));
  pool.push(v.v[0]+"s");
  const wrong = [...new Set(pool.map(x=>x.toLowerCase()))]
    .filter(x => x!==correct && !alts(v.v[i]).includes(x)).slice(0,3);
  return shuffle([target, ...wrong]);
}

/* ---------- 5. choose ---------- */
function renderChoose(){
  const p = $("#p-choose");
  const items = shuffle(G.verbs.flatMap(v=>[{v,i:1,s:v.s2,t:v.t2},{v,i:2,s:v.s3,t:v.t3}]));
  let ok=0, done=0;
  p.innerHTML = `<h2>Выбери правильную форму</h2>
    <p class="lead">Какая форма нужна — V2 (прошедшее) или V3 (после have/has, в пассиве)? Нажмите на ответ.</p>
    <div id="chList"></div><div class="row-btns"><button class="btn ghost do-again">🔄 Заново</button><span class="score"></span></div>`;
  $("#chList",p).innerHTML = items.map((it,n)=>{
    const sent = esc(it.s).replace(/\*[^*]+\*/, `<span class="gap">_____</span>`);
    return `<div class="q" data-n="${n}"><span class="num">${n+1}.</span><span class="prompt"><span class="sent">${sent}</span>
      <span class="tr">${esc(it.t)}</span><span class="opts">${optionsFor(it.v,it.i,it.s.match(/\*([^*]+)\*/)[1]).map(o=>`<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</span></span></div>`;
  }).join("");
  $("#chList",p).onclick = e=>{
    const b = e.target.closest(".opt"); if (!b || b.disabled) return;
    const q = b.closest(".q"), it = items[+q.dataset.n];
    const target = it.s.match(/\*([^*]+)\*/)[1];
    const good = norm(b.dataset.o) === norm(target);
    q.querySelectorAll(".opt").forEach(o=>{ o.disabled = true; if (norm(o.dataset.o)===norm(target)) o.classList.add("ok"); });
    if (!good) b.classList.add("no");
    q.querySelector(".gap").textContent = target;
    speak(stripStars(it.s), 0.9);
    done++; if (good) ok++;
    $(".score",p).textContent = `${ok} из ${done}` + (done===items.length && ok===done ? " 🎉" : "");
  };
  $(".do-again",p).onclick = renderChoose;
}

/* ---------- 6. fill ---------- */
function renderFill(){
  const p = $("#p-fill");
  const items = shuffle(G.verbs.flatMap(v=>[{v,i:1,s:v.s2,t:v.t2},{v,i:2,s:v.s3,t:v.t3}]));
  p.innerHTML = `<h2>Впиши нужную форму</h2>
    <p class="lead">В скобках — инфинитив. Поставьте его в нужную форму. Перевод подскажет смысл, 🔊 озвучит всё предложение.</p>
    ${items.map((it,n)=>{
      const target = it.s.match(/\*([^*]+)\*/)[1];
      const full = it.v.v[it.i];
      const ans = it.v.v[0] !== "be" && alts(full).includes(target.toLowerCase()) ? full : target;
      const sent = esc(it.s).replace(/\*[^*]+\*/, inp(ans) + ` <span class="base">(${esc(it.v.v[0])})</span>`);
      return `<div class="q"><span class="num">${n+1}.</span><span class="prompt"><span class="sent">${sent}</span><span class="tr">${esc(it.t)}</span></span>${sayBtn(stripStars(it.s))}</div>`;
    }).join("")}${controls}`;
  attachCheck(p, renderFill);
}

/* ---------- 7. story ---------- */
function renderStory(){
  const p = $("#p-story");
  const plain = G.story.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_,b,a)=>main(a));
  const html = esc(G.story).replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_,b,a)=> inp(a) + `<span class="base"> (${b})</span>`);
  p.innerHTML = `<h2>📖 ${esc(G.story_title)}</h2>
    <p class="lead">Прочитайте историю и раскройте скобки: Past Simple или Present Perfect / пассив? Потом послушайте текст целиком и перескажите его.</p>
    <div class="story">${html}</div>${controls}
    <div class="row-btns"><button class="btn sage" id="storyListen">▶ Послушать текст</button><button class="btn ghost" onclick="speechSynthesis.cancel()">■ Стоп</button></div>`;
  attachCheck(p, renderStory);
  $("#storyListen",p).onclick = ()=> speak(plain.replace(/[«»]/g,'"'), 0.88);
}

initTabs(); renderTable(); renderCards(); renderThree(); renderListen(); renderChoose(); renderFill(); renderStory();
})();
