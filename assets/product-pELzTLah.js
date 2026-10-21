import"./config-DUPONrBg.js";import{b as R,$ as p,l as j,S as Z,r as S,g as T,d as E,u as c,t as m,e as o,c as z,s as y,f as N,a as x,U as $,h as W,i as D}from"./main-Iqo6fqH5.js";import{p as L,b,S as v,L as C,C as k,F as A,a as U,P as Y}from"./data-DzIjeNT0.js";import{H,e as G,c as K}from"./outfit-CqK36uJZ.js";import{b as X,T as _,p as Q,a as V}from"./productCard-DvY_Rcb3.js";import{r as J}from"./hotspots-DDOkHuki.js";const ee=new URLSearchParams(location.search);let h=L(ee.get("id"))||L("hoodie-01"),r={},P=null,g=0;const te=()=>D()==="en",t=(e,i)=>m({ar:e,en:i});function ae(){const e={};if(h.type==="hoodie"){const i=b(v,h.ref);Object.assign(e,{statement:i.id,hoodie:r.hoodie||"#151515",fabric:"souq-woven",colorway:"souq-pop",size:r.size||null})}else if(h.type==="set"){const i=b(C,h.ref);Object.assign(e,{statement:r.statement||"S01",hoodie:i.hoodie,fabric:i.fabric,colorway:i.colorway,sizeH:r.sizeH||null,sizeS:r.sizeS||null})}else{const i=b(k,h.ref);Object.assign(e,{statement:"S01",hoodie:"#151515",fabric:r.fabric||"souq-woven",colorway:i.id,size:r.size||null})}r=e}function se(){const e=h;if(e.type==="hoodie"){const s=b(v,e.ref),a=r.hoodie==="#151515",n=[{kind:"img",src:s.back,alt:t(`ظهر هودي «${s.quote.ar}»`,`Back of the “${s.quote.en}” hoodie`),label:t("الظهر","Back")},{kind:"img",src:s.full,alt:t("الإطلالة كاملة","Full look"),label:t("الإطلالة","Full look")},{kind:"art",src:s.art,alt:t("الطباعة من قريب","Print close-up"),label:t("الطباعة","Print")},{kind:"outfit",label:t("معاينة حيّة","Live preview")}];return a||n.unshift(n.pop()),n}if(e.type==="set"){const s=b(C,e.ref);return[...s.imgs.map((a,n)=>({kind:"img",src:a,alt:t(`إطلالة ${s.ar}`,`${s.en} look`),label:n?t("لقطة ثانية","Alt shot"):t("الإطلالة","The look")})),{kind:"outfit",label:t("معاينة حيّة","Live preview")},{kind:"img",src:"img/details/embroidery-1.webp",alt:t("تطريز «زوووط» من قريب","«ZOOOT» embroidery close-up"),label:t("من قريب","Close-up")}]}const i=b(k,e.ref);return[{kind:"img",src:i.img,alt:t(`ظهر شروال ${i.ar}`,`${i.en} sirwal, back`),label:t("الظهر","Back"),contain:!0},{kind:"outfit",label:t("معاينة حيّة","Live preview"),zoom:"sirwal"},{kind:"img",src:"img/details/embroidery-2.webp",alt:t("التطريز من قريب","Embroidery close-up"),label:t("من قريب","Close-up")},{kind:"img",src:"img/details/fabric-onbody.webp",alt:t("كليم السوق على الجسم","Souq kilim on body"),label:t("القماش","Fabric")}]}function F(){const e=p("[data-gallery]"),i=se();g=Math.min(g,i.length-1),e.innerHTML=`
    <div class="g-stage" data-g-stage>
      ${i.map((a,n)=>`
        <div class="g-slide g-slide--${a.kind}${a.contain?" g-slide--contain":""}${n===g?" is-active":""}" data-g-slide="${n}" ${a.kind!=="outfit"&&N?'data-zoom data-cursor="كبّر" data-cursor-en="ZOOM"':""}>
          ${a.kind==="outfit"?`<div class="g-outfit${a.zoom?` g-outfit--${a.zoom}`:""}" data-g-outfit></div><span class="g-note">${o(t("معاينة رقمية — الألوان تقريبية","Digital preview — colours are approximate"))}</span>`:`<img src="${a.src}" alt="${o(a.alt)}" ${n?'loading="lazy"':'fetchpriority="high"'} decoding="async" draggable="false">`}
        </div>`).join("")}
      <span class="g-code num">${Q(h)}</span>
      <div class="g-arrows">
        <button class="icon-btn" type="button" data-g-prev aria-label="${o(t("السابق","Previous"))}"><svg><use href="#i-arrow"/></svg></button>
        <button class="icon-btn" type="button" data-g-next aria-label="${o(t("التالي","Next"))}"><svg><use href="#i-arrow"/></svg></button>
      </div>
    </div>
    <div class="g-thumbs" role="tablist" aria-label="${o(t("صور القطعة","Product images"))}">
      ${i.map((a,n)=>`<button type="button" class="g-thumb${n===g?" is-active":""}" role="tab" aria-selected="${n===g}" data-g-thumb="${n}" aria-label="${o(a.label)}">
            ${a.kind==="outfit"?`<span class="g-thumb-live"><svg><use href="#zooot-logo"/></svg><small>${o(a.label)}</small></span>`:`<img src="${a.src}" alt="" loading="lazy">`}
          </button>`).join("")}
    </div>`;const s=p("[data-g-outfit]",e);P=s?K(s,r,{label:t("معاينة القطعة","Piece preview")}):null}function w(e){const i=x("[data-g-slide]");g=(e+i.length)%i.length,i.forEach((s,a)=>s.classList.toggle("is-active",a===g)),x("[data-g-thumb]").forEach((s,a)=>{s.classList.toggle("is-active",a===g),s.setAttribute("aria-selected",String(a===g))})}function oe(){const e=p("[data-gallery]");e.addEventListener("click",s=>{const a=s.target.closest("[data-g-thumb]");a&&w(Number(a.dataset.gThumb)),s.target.closest("[data-g-prev]")&&w(g-1),s.target.closest("[data-g-next]")&&w(g+1)}),e.addEventListener("pointermove",s=>{const a=s.target.closest("[data-zoom]");if(!a)return;const n=a.querySelector("img"),u=a.getBoundingClientRect();n.style.transformOrigin=`${(s.clientX-u.left)/u.width*100}% ${(s.clientY-u.top)/u.height*100}%`,a.classList.add("is-zoom")}),e.addEventListener("pointerout",s=>{const a=s.target.closest("[data-zoom]");a&&!a.contains(s.relatedTarget)&&a.classList.remove("is-zoom")});let i=null;e.addEventListener("pointerdown",s=>{s.pointerType!=="mouse"&&s.target.closest("[data-g-stage]")&&(i=s.clientX)}),e.addEventListener("pointerup",s=>{if(i===null)return;const a=s.clientX-i;if(i=null,Math.abs(a)<40)return;const n=document.documentElement.dir==="rtl"?a>0:a<0;w(g+(n?1:-1))})}const O=(e,i)=>`<div class="opt-group" role="radiogroup" aria-label="${o(c(e==="size"?"size":e==="sizeH"?"hoodieSize":"sirwalSize"))}">${U.sizes.map(s=>{const a=e==="size"&&y(h,s);return`<button type="button" class="opt opt--size" role="radio" aria-checked="${i===s}" data-set="${e}" data-value="${s}" ${a?`aria-disabled="true" title="${o(c("sizeSoldOut"))}"`:""}>${s}</button>`}).join("")}</div>`,B=(e,i)=>`<div class="opt-group opt-group--statements" role="radiogroup" aria-label="${o(c("statement"))}">${v.map(s=>`<button type="button" class="st-opt" role="radio" aria-checked="${e===s.id}" ${i?`data-nav-product="hoodie-${s.n}"`:`data-set="statement" data-value="${s.id}"`} title="${o(`«${s.quote.ar}»`)}">
        <img src="${s.cut}" alt="" loading="lazy"><span class="num">S${s.n}</span>
      </button>`).join("")}</div>`;function ie(){const e=h,i=[[t("القصّة","Cut"),t("أوفرسايز · كتف ساقط · قبعة مزدوجة","Oversized · dropped shoulder · double-layer hood")],[t("الخامة (مقترح)","Fabric (proposed)"),t("فليس قطني أو مخلوط؛ وزن أخف للمناخ الحار ووزن أثقل للشتاء — يُحدَّد بالعيّنات","Cotton or blended fleece; lighter weight for hot weather, heavier for winter — set with samples")],[t("الطباعة","Print"),t("الظهر: شعار مصغّر (≈ 45%) أسفل الرقبة + العبارة الرئيسية · الصدر: شعار صغير","Back: mini logo (≈ 45%) below the neck + the main statement · Chest: small logo")],[t("الأكمام","Sleeves"),t("اختياري: «ZOOOT» عمودي","Optional: vertical «ZOOOT»")]],s=[[t("القماش","Fabric"),t("قماش شروال قطني أو مخلوط من السوق","Cotton or blended sirwal fabric from the souq")],[t("الحزام","Waist"),t("حزام مطاطي بعرض مريح مع رباط · لسان «زوووط» المنسوج","Comfortable elastic waistband with drawstring · woven «ZOOOT» tongue")],[t("القصّة","Cut"),t("منطقة وسطى نازلة (قصّة تقليدية) · ساق واسعة · كف ريب عند الكاحل · جيوب جانبية عميقة","Dropped crotch (traditional cut) · wide leg · rib ankle cuff · deep side pockets")],[t("التوقيع","Signature"),t("«زوووط» الكبيرة أعلى الخلف — طباعة شاشة قبل القص، أو DTF، أو تطريز للإصدارات الخاصة","The big «ZOOOT» across the top of the back — screen printed before cutting, DTF, or embroidered for special editions")]],a=e.type==="hoodie"?i:e.type==="sirwal"?s:[...i.slice(0,3),...s.slice(0,3)],n=b(v,r.statement);return`
    <details class="acc" open>
      <summary>${o(t("التفاصيل","Details"))}<svg aria-hidden="true"><use href="#i-plus"/></svg></summary>
      <dl class="spec">${a.map(([u,d])=>`<div><dt>${o(u)}</dt><dd>${o(d)}</dd></div>`).join("")}</dl>
    </details>
    ${e.type!=="sirwal"?`<details class="acc">
      <summary>${o(t("طريقة الطباعة","Print method"))}<svg aria-hidden="true"><use href="#i-plus"/></svg></summary>
      <p><span class="tag" style="--tag-bg:${n.methodColor}">${o(n.method)}</span> ${o(m(n.spec))}</p>
    </details>`:""}
    <details class="acc">
      <summary>${o(t("التغليف والمفاجأة","Packaging & the surprise"))}<svg aria-hidden="true"><use href="#i-plus"/></svg></summary>
      <p>${o(t("صندوق أسود بشريط أصفر وختم التوقيع، بطاقة شكر، ستيكر الإصدار الأول — وبطاقة «تدري مين وراء الزوووطة؟» فوق القطعة.","A black box with a yellow band and the signature seal, a thank-you card, the first-drop sticker — and the “Who’s behind the ZOOOTA?” card on top."))}</p>
    </details>
    <p class="pdp-fine">${o(t("الخامات والمقاسات النهائية تُعتمد بعيّنات المورّد.","Final materials and sizing are confirmed with supplier samples."))}</p>`}function q(){const e=h,i=p("[data-info]"),s=m(e.name);document.title=`${s} — ${te()?"ZOOOT":"زوووط"}`,p("[data-crumbs]").innerHTML=`<a href="shop.html">${o(t("المتجر","Shop"))}</a><span aria-hidden="true">/</span><a href="shop.html?type=${e.type}">${o(m(_[e.type]))}</a><span aria-hidden="true">/</span><span aria-current="page">${o(s)}</span>`;let a="",n="",u="";if(e.type==="hoodie"){const d=b(v,e.ref),f=H.find(l=>l.hex===r.hoodie)?.look;a=`STATEMENT S${d.n} · ${d.en.toUpperCase()}`,n=t(`عبارة «${d.quote.ar}» على ظهر هودي أوفرسايز. الظهر هو القطعة — والعبارة تحكي عنك قبل ما تتكلم.`,`“${d.quote.en}” on the back of an oversized hoodie. The back is the piece — the statement speaks before you do.`),u=`
      <div class="opt-block">
        <p class="opt-title"><span>01 · ${o(c("hoodieColor"))}</span><b>${o(f?m({ar:f.ar,en:f.en}):"")}</b></p>
        <div class="opt-group" role="radiogroup" aria-label="${o(c("hoodieColor"))}">${H.map(l=>`<button type="button" class="swatch-btn" role="radio" aria-checked="${l.hex===r.hoodie}" data-set="hoodie" data-value="${l.hex}" aria-label="${o(m({ar:l.look.ar,en:l.look.en}))}" title="${o(m({ar:l.look.ar,en:l.look.en}))}"><i class="sw" style="--c:${l.hex}"></i></button>`).join("")}</div>
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>02 · ${o(c("statement"))}</span><b lang="ar">«${o(d.quote.ar)}»</b></p>
        ${B(d.id,!0)}
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>03 · ${o(c("size"))}</span><button type="button" class="link-btn" data-size-guide-open>${o(t("دليل المقاسات","Fit guide"))}</button></p>
        ${O("size",r.size)}
      </div>`}else if(e.type==="set"){const d=b(C,e.ref),f=b(v,r.statement);a=`LOOK ${d.n} · ${d.en.toUpperCase()}`,n=t(`إطلالة ${d.ar} كاملة: هودي بلونها، شروال من قماش السوق، و«زوووط» الكبيرة على الظهر. اختر العبارة اللي تبيها على الهودي.`,`The full ${d.en} look: a hoodie in its colour, a souq-fabric sirwal and the big «ZOOOT» across the back. Pick the statement for your hoodie.`),u=`
      <div class="opt-block">
        <p class="opt-title"><span>${o(t("وصفة الألوان","Colour recipe"))}</span></p>
        <div class="recipe">
          <span>${o(t("الهودي","Hoodie"))}</span><span class="sw-strip"><i style="--c:${d.hoodie}"></i></span>
          <span>${o(t("الطباعة","Print"))}</span><span class="sw-strip">${d.print.map(l=>`<i style="--c:${l}"></i>`).join("")}</span>
          <span>${o(t("الشروال","Sirwal"))}</span><span class="sw-strip">${d.sirwal.map(l=>`<i style="--c:${l}"></i>`).join("")}</span>
        </div>
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>01 · ${o(c("statement"))}</span><b lang="ar">«${o(f.quote.ar)}»</b></p>
        ${B(f.id,!1)}
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>02 · ${o(c("hoodieSize"))}</span><button type="button" class="link-btn" data-size-guide-open>${o(t("دليل المقاسات","Fit guide"))}</button></p>
        ${O("sizeH",r.sizeH)}
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>03 · ${o(c("sirwalSize"))}</span></p>
        ${O("sizeS",r.sizeS)}
      </div>`}else{const d=b(k,e.ref),f=b(A,r.fabric);a=`THE ICONIC BACK · ${d.en.toUpperCase()}`,n=t(`شروال من أقمشة السوق بقصّة تقليدية، و«زوووط» الكبيرة أعلى الخلف بألوان ${d.ar}: ${d.note.ar}.`,`A traditional-cut sirwal in souq fabric, with the big «ZOOOT» across the back in the ${d.en} colourway: ${d.note.en.toLowerCase()}.`),u=`
      <div class="opt-block">
        <p class="opt-title"><span>01 · ${o(c("backLogo"))}</span><b>${o(m({ar:d.ar,en:d.en}))}</b></p>
        <div class="opt-group" role="radiogroup" aria-label="${o(c("backLogo"))}">${k.map(l=>`<button type="button" class="cw-opt" role="radio" aria-checked="${l.id===d.id}" data-nav-product="sirwal-${l.id}" aria-label="${o(m({ar:l.ar,en:l.en}))}" style="--zl-fill:${l.fill};--zl-edge:${l.edge};--zl-shadow:${l.shadow}"><svg aria-hidden="true"><use href="#zooot-logo"/></svg></button>`).join("")}</div>
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>02 · ${o(c("fabric"))}</span><b>${o(m({ar:f.ar,en:f.en}))}</b></p>
        <div class="opt-group" role="radiogroup" aria-label="${o(c("fabric"))}">${A.map(l=>`<button type="button" class="fab-opt" role="radio" aria-checked="${l.id===r.fabric}" data-set="fabric" data-value="${l.id}" aria-label="${o(m({ar:l.ar,en:l.en}))}" title="${o(m({ar:l.ar,en:l.en}))}" style="background-image:url(${l.img})"></button>`).join("")}</div>
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>03 · ${o(c("size"))}</span><button type="button" class="link-btn" data-size-guide-open>${o(t("دليل المقاسات","Fit guide"))}</button></p>
        ${O("size",r.size)}
      </div>`}i.innerHTML=`
    <p class="kicker">${o(a)}</p>
    <h1 class="pdp-title">${o(s)}</h1>
    <p class="pdp-price num">${e.compareAt&&e.compareAt>e.price?`<s class="p-was">${z(e.compareAt)}</s> `:""}${z(e.price)}${y(e)?` <span class="tag" style="--tag-bg:var(--magenta);vertical-align:middle">${o(c("soldOut"))}</span>`:""}</p>
    <p class="pdp-blurb">${o(n)}</p>
    <div class="pdp-options">${u}</div>
    <div class="pdp-actions">
      ${y(e)?`<button class="btn btn--block" type="button" disabled aria-disabled="true" style="opacity:.55;cursor:not-allowed"><span>${o(c("soldOutLong"))}</span></button>`:`<button class="btn btn--block" type="button" data-add data-magnetic="0.15"><svg aria-hidden="true"><use href="#i-bag"/></svg><span>${o(c("addToBag"))} — ${z(e.price)}</span></button>`}
      <a class="btn btn--ghost btn--block" href="studio.html?${G(r)}"><span>${o(t("عدّلها في الاستوديو","Remix it in the studio"))}</span></a>
    </div>
    <p class="pdp-perk"><svg aria-hidden="true"><use href="#i-crown"/></svg><span>${o(t("تجيك في صندوق التوقيع — مع مفاجأة داخل العلبة.","Ships in the signature box — with a surprise inside."))}</span></p>
    <div class="pdp-acc">${ie()}</div>`,p("[data-buy-name]").textContent=s,p("[data-buy-price]").textContent=z(e.price)}function ne(){const i=h.type==="sirwal"?[[t("شدّ الرباط","Tie the drawstring"),t("الحزام مطاطي — والرباط يضبطه على مزاجك.","The waist is elastic — the drawstring sets it to your mood.")],[t("خلّ الكف عند الكاحل","Cuffs at the ankle"),t("الساق واسعة والكف يجمعها فوق السنيكرز.","Wide legs, gathered by the cuff right above your sneakers.")],[t("فوقه هودي","Hoodie on top"),t("لون الهودي من أفتح لون في النقشة — أو أسود دايم.","Pick the hoodie from the lightest colour in the pattern — or black, always.")]]:[[t("أوفرسايز دايم","Oversized, always"),t("الهودي واسع وكتفه ساقط — خله يرتاح.","Wide body, dropped shoulder — let it hang.")],[t("الحافة فوق الحزام","Hem above the waist"),t("خلّ لسان «زوووط» يبان من تحت الهودي.","Let the «ZOOOT» tongue peek out under the hem.")],[t("الظهر للشارع","The back is for the street"),t("لا تغطي العبارة بشنطة ظهر — الشارع يقرأ الظهر.","Don’t cover the statement with a backpack — the street reads the back.")]];p("[data-wear]").innerHTML=`
    <div class="container wear-grid">
      <div class="wear-head">
        <p class="kicker">HOW TO WEAR IT</p>
        <h2 class="h1">${o(t("كيف تلبسه؟","How to wear it"))}</h2>
      </div>
      <ol class="wear-steps">${i.map(([s,a],n)=>`<li><span class="num">0${n+1}</span><h3 class="h3">${o(s)}</h3><p>${o(a)}</p></li>`).join("")}</ol>
    </div>`}function re(){const e=p("[data-anatomy]");if(h.type==="hoodie"){e.hidden=!0;return}e.hidden=!1,e.innerHTML=`
    <div class="container anatomy-grid">
      <div class="anatomy-copy">
        <p class="kicker">COLORS &amp; FABRICS · TECH</p>
        <h2 class="h1">${o(t("تشريح الشروال","Sirwal anatomy"))}</h2>
        <p class="lead">${o(t("قصّة تقليدية بروح الشارع: كل تفصيلة لها سبب — من لسان «زوووط» في الحزام إلى الكف عند الكاحل.","A traditional cut with a street soul: every detail has a reason — from the «ZOOOT» tongue on the waist to the cuff at the ankle."))}</p>
      </div>
      <div data-anatomy-figure></div>
    </div>`,J(p("[data-anatomy-figure]",e),{colorway:b(k,r.colorway)})}function le(){const e=h;let i;e.type==="hoodie"?i=["sirwal-souq-pop","set-01","hoodie-"+String(Number(e.id.slice(-2))%6+1).padStart(2,"0"),"sirwal-late-night"]:e.type==="sirwal"?i=["hoodie-01","hoodie-03","set-01","hoodie-05"]:i=["hoodie-01","hoodie-04","sirwal-"+b(C,e.ref).colorway,"set-"+String(Number(e.id.slice(-2))%8+1).padStart(2,"0")];const s=[...new Set(i)].filter(n=>n!==e.id).map(L).filter(Boolean).slice(0,4),a=p("[data-related]");a.innerHTML=s.map(n=>V(n)).join("")}function I(){ae(),F(),q(),ne(),re(),le()}function de(){p("[data-info]").addEventListener("click",i=>{const s=i.target.closest("[data-nav-product]");if(s){const n=L(s.dataset.navProduct);if(!n||n.id===h.id)return;h=n;const u=new URL(location.href);u.searchParams.set("id",n.id),history.replaceState(null,"",u),g=0,I(),S||T.from(".g-slide.is-active",{opacity:0,scale:1.04,duration:.6,ease:"power2.out"});return}const a=i.target.closest("[data-set]");if(a?.getAttribute("aria-disabled")==="true"){E(c("sizeSoldOut"));return}if(a){const n=a.dataset.set;if(r[n]=a.dataset.value,n==="hoodie")F(),r.hoodie!=="#151515"&&w(0);else if(P&&["statement","fabric"].includes(n)){P.update(r);const d=x("[data-g-slide]").findIndex(f=>f.classList.contains("g-slide--outfit"));d>-1&&w(d)}const u=window.scrollY;q(),window.scrollTo(0,u);return}if(i.target.closest("[data-size-guide-open]")){p("[data-size-guide]").showModal(),j(!0);return}i.target.closest("[data-add]")&&M()})}function M(){const e=h;if(y(e)||e.type!=="set"&&r.size&&y(e,r.size)){E(y(e)?c("soldOutLong"):c("sizeSoldOut"));return}if(e.type==="set"?!r.sizeH||!r.sizeS:!r.size){E(e.type==="set"?c("pickSizes"):c("pickSize"));const n=p('[data-info] [data-set^="size"]')?.closest(".opt-block");n&&!S&&T.fromTo(n,{x:-10},{x:0,duration:.6,ease:"elastic.out(1, 0.3)"}),n?.scrollIntoView({block:"center",behavior:S?"auto":"smooth"});return}const s=b(v,r.statement),a=[];if(e.type==="hoodie"){const n=H.find(u=>u.hex===r.hoodie)?.look;a.push({label:$.hoodieColor,value:{ar:n.ar,en:n.en},swatch:r.hoodie},{label:$.size,value:r.size})}else if(e.type==="set")a.push({label:$.statement,value:`S${s.n}`},{label:$.hoodieSize,value:r.sizeH},{label:$.sirwalSize,value:r.sizeS});else{const n=b(A,r.fabric);a.push({label:$.fabric,value:{ar:n.ar,en:n.en}},{label:$.size,value:r.size})}W({pid:e.id,name:e.name,img:e.imgs[0],price:e.price,options:a})}function ce(){const e=p("[data-buy-bar]"),i=new IntersectionObserver(([a])=>e.hidden=a.isIntersecting||a.boundingClientRect.top>0,{threshold:0}),s=()=>{const a=p("[data-add]");a&&i.observe(a)};return s(),p("[data-buy-scroll]").addEventListener("click",()=>M()),s}R({setup(){I(),oe(),de();const e=ce();X(p("[data-related]"),Y);const i=p("[data-size-guide]");i.addEventListener("close",()=>j(!1)),i.addEventListener("click",a=>{(a.target===i||a.target.closest("[data-size-guide-close]"))&&i.close()}),window.addEventListener("langchange",()=>{I(),e(),Z.refresh()}),window.addEventListener("catalog:change",()=>{const a=window.scrollY;q(),window.scrollTo(0,a)}),new MutationObserver(e).observe(p("[data-info]"),{childList:!0})},intro(){S||(T.from(".g-stage",{clipPath:"inset(0 0 100% 0 round 24px)",duration:1.2,ease:"expo.out"}),T.from(".pdp-info > *",{y:30,opacity:0,duration:.9,ease:"power3.out",stagger:.06,delay:.15}))}});
