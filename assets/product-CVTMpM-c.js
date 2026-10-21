import{p as z,b as F,$ as c,l as A,a as M,r as O,g as S,d as h,S as v,L as T,C as k,f as R,e as o,t as m,u,F as C,h as L,c as E,i as Z,U as $,j as N,k as W,m as D,P as U}from"./main-qwrlvl4z.js";import{c as Y,H as x,e as G}from"./outfit-3YIuGd5k.js";import{b as K,p as X,T as _,a as Q}from"./productCard-CxwyMhLM.js";import{r as V}from"./hotspots-OF2-ryeE.js";const J=new URLSearchParams(location.search);let b=z(J.get("id"))||z("hoodie-01"),r={},H=null,g=0;const ee=()=>W()==="en",e=(t,i)=>m({ar:t,en:i});function te(){const t={};if(b.type==="hoodie"){const i=h(v,b.ref);Object.assign(t,{statement:i.id,hoodie:r.hoodie||"#151515",fabric:"souq-woven",colorway:"souq-pop",size:r.size||null})}else if(b.type==="set"){const i=h(T,b.ref);Object.assign(t,{statement:r.statement||"S01",hoodie:i.hoodie,fabric:i.fabric,colorway:i.colorway,sizeH:r.sizeH||null,sizeS:r.sizeS||null})}else{const i=h(k,b.ref);Object.assign(t,{statement:"S01",hoodie:"#151515",fabric:r.fabric||"souq-woven",colorway:i.id,size:r.size||null})}r=t}function ae(){const t=b;if(t.type==="hoodie"){const s=h(v,t.ref),a=r.hoodie==="#151515",n=[{kind:"img",src:s.back,alt:e(`ظهر هودي «${s.quote.ar}»`,`Back of the “${s.quote.en}” hoodie`),label:e("الظهر","Back")},{kind:"img",src:s.full,alt:e("الإطلالة كاملة","Full look"),label:e("الإطلالة","Full look")},{kind:"art",src:s.art,alt:e("الطباعة من قريب","Print close-up"),label:e("الطباعة","Print")},{kind:"outfit",label:e("معاينة حيّة","Live preview")}];return a||n.unshift(n.pop()),n}if(t.type==="set"){const s=h(T,t.ref);return[...s.imgs.map((a,n)=>({kind:"img",src:a,alt:e(`إطلالة ${s.ar}`,`${s.en} look`),label:n?e("لقطة ثانية","Alt shot"):e("الإطلالة","The look")})),{kind:"outfit",label:e("معاينة حيّة","Live preview")},{kind:"img",src:"img/details/embroidery-1.webp",alt:e("تطريز «زوووط» من قريب","«ZOOOT» embroidery close-up"),label:e("من قريب","Close-up")}]}const i=h(k,t.ref);return[{kind:"img",src:i.img,alt:e(`ظهر شروال ${i.ar}`,`${i.en} sirwal, back`),label:e("الظهر","Back"),contain:!0},{kind:"outfit",label:e("معاينة حيّة","Live preview"),zoom:"sirwal"},{kind:"img",src:"img/details/embroidery-2.webp",alt:e("التطريز من قريب","Embroidery close-up"),label:e("من قريب","Close-up")},{kind:"img",src:"img/details/fabric-onbody.webp",alt:e("كليم السوق على الجسم","Souq kilim on body"),label:e("القماش","Fabric")}]}function j(){const t=c("[data-gallery]"),i=ae();g=Math.min(g,i.length-1),t.innerHTML=`
    <div class="g-stage" data-g-stage>
      ${i.map((a,n)=>`
        <div class="g-slide g-slide--${a.kind}${a.contain?" g-slide--contain":""}${n===g?" is-active":""}" data-g-slide="${n}" ${a.kind!=="outfit"&&R?'data-zoom data-cursor="كبّر" data-cursor-en="ZOOM"':""}>
          ${a.kind==="outfit"?`<div class="g-outfit${a.zoom?` g-outfit--${a.zoom}`:""}" data-g-outfit></div><span class="g-note">${o(e("معاينة رقمية — الألوان تقريبية","Digital preview — colours are approximate"))}</span>`:`<img src="${a.src}" alt="${o(a.alt)}" ${n?'loading="lazy"':'fetchpriority="high"'} decoding="async" draggable="false">`}
        </div>`).join("")}
      <span class="g-code num">${X(b)}</span>
      <div class="g-arrows">
        <button class="icon-btn" type="button" data-g-prev aria-label="${o(e("السابق","Previous"))}"><svg><use href="#i-arrow"/></svg></button>
        <button class="icon-btn" type="button" data-g-next aria-label="${o(e("التالي","Next"))}"><svg><use href="#i-arrow"/></svg></button>
      </div>
    </div>
    <div class="g-thumbs" role="tablist" aria-label="${o(e("صور القطعة","Product images"))}">
      ${i.map((a,n)=>`<button type="button" class="g-thumb${n===g?" is-active":""}" role="tab" aria-selected="${n===g}" data-g-thumb="${n}" aria-label="${o(a.label)}">
            ${a.kind==="outfit"?`<span class="g-thumb-live"><svg><use href="#zooot-logo"/></svg><small>${o(a.label)}</small></span>`:`<img src="${a.src}" alt="" loading="lazy">`}
          </button>`).join("")}
    </div>`;const s=c("[data-g-outfit]",t);H=s?Y(s,r,{label:e("معاينة القطعة","Piece preview")}):null}function w(t){const i=E("[data-g-slide]");g=(t+i.length)%i.length,i.forEach((s,a)=>s.classList.toggle("is-active",a===g)),E("[data-g-thumb]").forEach((s,a)=>{s.classList.toggle("is-active",a===g),s.setAttribute("aria-selected",String(a===g))})}function se(){const t=c("[data-gallery]");t.addEventListener("click",s=>{const a=s.target.closest("[data-g-thumb]");a&&w(Number(a.dataset.gThumb)),s.target.closest("[data-g-prev]")&&w(g-1),s.target.closest("[data-g-next]")&&w(g+1)}),t.addEventListener("pointermove",s=>{const a=s.target.closest("[data-zoom]");if(!a)return;const n=a.querySelector("img"),p=a.getBoundingClientRect();n.style.transformOrigin=`${(s.clientX-p.left)/p.width*100}% ${(s.clientY-p.top)/p.height*100}%`,a.classList.add("is-zoom")}),t.addEventListener("pointerout",s=>{const a=s.target.closest("[data-zoom]");a&&!a.contains(s.relatedTarget)&&a.classList.remove("is-zoom")});let i=null;t.addEventListener("pointerdown",s=>{s.pointerType!=="mouse"&&s.target.closest("[data-g-stage]")&&(i=s.clientX)}),t.addEventListener("pointerup",s=>{if(i===null)return;const a=s.clientX-i;if(i=null,Math.abs(a)<40)return;const n=document.documentElement.dir==="rtl"?a>0:a<0;w(g+(n?1:-1))})}const y=(t,i)=>`<div class="opt-group" role="radiogroup" aria-label="${o(u(t==="size"?"size":t==="sizeH"?"hoodieSize":"sirwalSize"))}">${D.sizes.map(s=>`<button type="button" class="opt opt--size" role="radio" aria-checked="${i===s}" data-set="${t}" data-value="${s}">${s}</button>`).join("")}</div>`,I=(t,i)=>`<div class="opt-group opt-group--statements" role="radiogroup" aria-label="${o(u("statement"))}">${v.map(s=>`<button type="button" class="st-opt" role="radio" aria-checked="${t===s.id}" ${i?`data-nav-product="hoodie-${s.n}"`:`data-set="statement" data-value="${s.id}"`} title="${o(`«${s.quote.ar}»`)}">
        <img src="${s.cut}" alt="" loading="lazy"><span class="num">S${s.n}</span>
      </button>`).join("")}</div>`;function oe(){const t=b,i=[[e("القصّة","Cut"),e("أوفرسايز · كتف ساقط · قبعة مزدوجة","Oversized · dropped shoulder · double-layer hood")],[e("الخامة (مقترح)","Fabric (proposed)"),e("فليس قطني أو مخلوط؛ وزن أخف للمناخ الحار ووزن أثقل للشتاء — يُحدَّد بالعيّنات","Cotton or blended fleece; lighter weight for hot weather, heavier for winter — set with samples")],[e("الطباعة","Print"),e("الظهر: شعار مصغّر (≈ 45%) أسفل الرقبة + العبارة الرئيسية · الصدر: شعار صغير","Back: mini logo (≈ 45%) below the neck + the main statement · Chest: small logo")],[e("الأكمام","Sleeves"),e("اختياري: «ZOOOT» عمودي","Optional: vertical «ZOOOT»")]],s=[[e("القماش","Fabric"),e("قماش شروال قطني أو مخلوط من السوق","Cotton or blended sirwal fabric from the souq")],[e("الحزام","Waist"),e("حزام مطاطي بعرض مريح مع رباط · لسان «زوووط» المنسوج","Comfortable elastic waistband with drawstring · woven «ZOOOT» tongue")],[e("القصّة","Cut"),e("منطقة وسطى نازلة (قصّة تقليدية) · ساق واسعة · كف ريب عند الكاحل · جيوب جانبية عميقة","Dropped crotch (traditional cut) · wide leg · rib ankle cuff · deep side pockets")],[e("التوقيع","Signature"),e("«زوووط» الكبيرة أعلى الخلف — طباعة شاشة قبل القص، أو DTF، أو تطريز للإصدارات الخاصة","The big «ZOOOT» across the top of the back — screen printed before cutting, DTF, or embroidered for special editions")]],a=t.type==="hoodie"?i:t.type==="sirwal"?s:[...i.slice(0,3),...s.slice(0,3)],n=h(v,r.statement);return`
    <details class="acc" open>
      <summary>${o(e("التفاصيل","Details"))}<svg aria-hidden="true"><use href="#i-plus"/></svg></summary>
      <dl class="spec">${a.map(([p,d])=>`<div><dt>${o(p)}</dt><dd>${o(d)}</dd></div>`).join("")}</dl>
    </details>
    ${t.type!=="sirwal"?`<details class="acc">
      <summary>${o(e("طريقة الطباعة","Print method"))}<svg aria-hidden="true"><use href="#i-plus"/></svg></summary>
      <p><span class="tag" style="--tag-bg:${n.methodColor}">${o(n.method)}</span> ${o(m(n.spec))}</p>
    </details>`:""}
    <details class="acc">
      <summary>${o(e("التغليف والمفاجأة","Packaging & the surprise"))}<svg aria-hidden="true"><use href="#i-plus"/></svg></summary>
      <p>${o(e("صندوق أسود بشريط أصفر وختم التوقيع، بطاقة شكر، ستيكر الإصدار الأول — وبطاقة «تدري مين وراء الزوووطة؟» فوق القطعة.","A black box with a yellow band and the signature seal, a thank-you card, the first-drop sticker — and the “Who’s behind the ZOOOTA?” card on top."))}</p>
    </details>
    <p class="pdp-fine">${o(e("الخامات والمقاسات النهائية تُعتمد بعيّنات المورّد.","Final materials and sizing are confirmed with supplier samples."))}</p>`}function q(){const t=b,i=c("[data-info]"),s=m(t.name);document.title=`${s} — ${ee()?"ZOOOT":"زوووط"}`,c("[data-crumbs]").innerHTML=`<a href="shop.html">${o(e("المتجر","Shop"))}</a><span aria-hidden="true">/</span><a href="shop.html?type=${t.type}">${o(m(_[t.type]))}</a><span aria-hidden="true">/</span><span aria-current="page">${o(s)}</span>`;let a="",n="",p="";if(t.type==="hoodie"){const d=h(v,t.ref),f=x.find(l=>l.hex===r.hoodie)?.look;a=`STATEMENT S${d.n} · ${d.en.toUpperCase()}`,n=e(`عبارة «${d.quote.ar}» على ظهر هودي أوفرسايز. الظهر هو القطعة — والعبارة تحكي عنك قبل ما تتكلم.`,`“${d.quote.en}” on the back of an oversized hoodie. The back is the piece — the statement speaks before you do.`),p=`
      <div class="opt-block">
        <p class="opt-title"><span>01 · ${o(u("hoodieColor"))}</span><b>${o(f?m({ar:f.ar,en:f.en}):"")}</b></p>
        <div class="opt-group" role="radiogroup" aria-label="${o(u("hoodieColor"))}">${x.map(l=>`<button type="button" class="swatch-btn" role="radio" aria-checked="${l.hex===r.hoodie}" data-set="hoodie" data-value="${l.hex}" aria-label="${o(m({ar:l.look.ar,en:l.look.en}))}" title="${o(m({ar:l.look.ar,en:l.look.en}))}"><i class="sw" style="--c:${l.hex}"></i></button>`).join("")}</div>
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>02 · ${o(u("statement"))}</span><b lang="ar">«${o(d.quote.ar)}»</b></p>
        ${I(d.id,!0)}
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>03 · ${o(u("size"))}</span><button type="button" class="link-btn" data-size-guide-open>${o(e("دليل المقاسات","Fit guide"))}</button></p>
        ${y("size",r.size)}
      </div>`}else if(t.type==="set"){const d=h(T,t.ref),f=h(v,r.statement);a=`LOOK ${d.n} · ${d.en.toUpperCase()}`,n=e(`إطلالة ${d.ar} كاملة: هودي بلونها، شروال من قماش السوق، و«زوووط» الكبيرة على الظهر. اختر العبارة اللي تبيها على الهودي.`,`The full ${d.en} look: a hoodie in its colour, a souq-fabric sirwal and the big «ZOOOT» across the back. Pick the statement for your hoodie.`),p=`
      <div class="opt-block">
        <p class="opt-title"><span>${o(e("وصفة الألوان","Colour recipe"))}</span></p>
        <div class="recipe">
          <span>${o(e("الهودي","Hoodie"))}</span><span class="sw-strip"><i style="--c:${d.hoodie}"></i></span>
          <span>${o(e("الطباعة","Print"))}</span><span class="sw-strip">${d.print.map(l=>`<i style="--c:${l}"></i>`).join("")}</span>
          <span>${o(e("الشروال","Sirwal"))}</span><span class="sw-strip">${d.sirwal.map(l=>`<i style="--c:${l}"></i>`).join("")}</span>
        </div>
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>01 · ${o(u("statement"))}</span><b lang="ar">«${o(f.quote.ar)}»</b></p>
        ${I(f.id,!1)}
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>02 · ${o(u("hoodieSize"))}</span><button type="button" class="link-btn" data-size-guide-open>${o(e("دليل المقاسات","Fit guide"))}</button></p>
        ${y("sizeH",r.sizeH)}
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>03 · ${o(u("sirwalSize"))}</span></p>
        ${y("sizeS",r.sizeS)}
      </div>`}else{const d=h(k,t.ref),f=h(C,r.fabric);a=`THE ICONIC BACK · ${d.en.toUpperCase()}`,n=e(`شروال من أقمشة السوق بقصّة تقليدية، و«زوووط» الكبيرة أعلى الخلف بألوان ${d.ar}: ${d.note.ar}.`,`A traditional-cut sirwal in souq fabric, with the big «ZOOOT» across the back in the ${d.en} colourway: ${d.note.en.toLowerCase()}.`),p=`
      <div class="opt-block">
        <p class="opt-title"><span>01 · ${o(u("backLogo"))}</span><b>${o(m({ar:d.ar,en:d.en}))}</b></p>
        <div class="opt-group" role="radiogroup" aria-label="${o(u("backLogo"))}">${k.map(l=>`<button type="button" class="cw-opt" role="radio" aria-checked="${l.id===d.id}" data-nav-product="sirwal-${l.id}" aria-label="${o(m({ar:l.ar,en:l.en}))}" style="--zl-fill:${l.fill};--zl-edge:${l.edge};--zl-shadow:${l.shadow}"><svg aria-hidden="true"><use href="#zooot-logo"/></svg></button>`).join("")}</div>
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>02 · ${o(u("fabric"))}</span><b>${o(m({ar:f.ar,en:f.en}))}</b></p>
        <div class="opt-group" role="radiogroup" aria-label="${o(u("fabric"))}">${C.map(l=>`<button type="button" class="fab-opt" role="radio" aria-checked="${l.id===r.fabric}" data-set="fabric" data-value="${l.id}" aria-label="${o(m({ar:l.ar,en:l.en}))}" title="${o(m({ar:l.ar,en:l.en}))}" style="background-image:url(${l.img})"></button>`).join("")}</div>
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>03 · ${o(u("size"))}</span><button type="button" class="link-btn" data-size-guide-open>${o(e("دليل المقاسات","Fit guide"))}</button></p>
        ${y("size",r.size)}
      </div>`}i.innerHTML=`
    <p class="kicker">${o(a)}</p>
    <h1 class="pdp-title">${o(s)}</h1>
    <p class="pdp-price num">${L(t.price)}</p>
    <p class="pdp-blurb">${o(n)}</p>
    <div class="pdp-options">${p}</div>
    <div class="pdp-actions">
      <button class="btn btn--block" type="button" data-add data-magnetic="0.15"><svg aria-hidden="true"><use href="#i-bag"/></svg><span>${o(u("addToBag"))} — ${L(t.price)}</span></button>
      <a class="btn btn--ghost btn--block" href="studio.html?${G(r)}"><span>${o(e("عدّلها في الاستوديو","Remix it in the studio"))}</span></a>
    </div>
    <p class="pdp-perk"><svg aria-hidden="true"><use href="#i-crown"/></svg><span>${o(e("تجيك في صندوق التوقيع — مع مفاجأة داخل العلبة.","Ships in the signature box — with a surprise inside."))}</span></p>
    <div class="pdp-acc">${oe()}</div>`,c("[data-buy-name]").textContent=s,c("[data-buy-price]").textContent=L(t.price)}function ie(){const i=b.type==="sirwal"?[[e("شدّ الرباط","Tie the drawstring"),e("الحزام مطاطي — والرباط يضبطه على مزاجك.","The waist is elastic — the drawstring sets it to your mood.")],[e("خلّ الكف عند الكاحل","Cuffs at the ankle"),e("الساق واسعة والكف يجمعها فوق السنيكرز.","Wide legs, gathered by the cuff right above your sneakers.")],[e("فوقه هودي","Hoodie on top"),e("لون الهودي من أفتح لون في النقشة — أو أسود دايم.","Pick the hoodie from the lightest colour in the pattern — or black, always.")]]:[[e("أوفرسايز دايم","Oversized, always"),e("الهودي واسع وكتفه ساقط — خله يرتاح.","Wide body, dropped shoulder — let it hang.")],[e("الحافة فوق الحزام","Hem above the waist"),e("خلّ لسان «زوووط» يبان من تحت الهودي.","Let the «ZOOOT» tongue peek out under the hem.")],[e("الظهر للشارع","The back is for the street"),e("لا تغطي العبارة بشنطة ظهر — الشارع يقرأ الظهر.","Don’t cover the statement with a backpack — the street reads the back.")]];c("[data-wear]").innerHTML=`
    <div class="container wear-grid">
      <div class="wear-head">
        <p class="kicker">HOW TO WEAR IT</p>
        <h2 class="h1">${o(e("كيف تلبسه؟","How to wear it"))}</h2>
      </div>
      <ol class="wear-steps">${i.map(([s,a],n)=>`<li><span class="num">0${n+1}</span><h3 class="h3">${o(s)}</h3><p>${o(a)}</p></li>`).join("")}</ol>
    </div>`}function ne(){const t=c("[data-anatomy]");if(b.type==="hoodie"){t.hidden=!0;return}t.hidden=!1,t.innerHTML=`
    <div class="container anatomy-grid">
      <div class="anatomy-copy">
        <p class="kicker">COLORS &amp; FABRICS · TECH</p>
        <h2 class="h1">${o(e("تشريح الشروال","Sirwal anatomy"))}</h2>
        <p class="lead">${o(e("قصّة تقليدية بروح الشارع: كل تفصيلة لها سبب — من لسان «زوووط» في الحزام إلى الكف عند الكاحل.","A traditional cut with a street soul: every detail has a reason — from the «ZOOOT» tongue on the waist to the cuff at the ankle."))}</p>
      </div>
      <div data-anatomy-figure></div>
    </div>`,V(c("[data-anatomy-figure]",t),{colorway:h(k,r.colorway)})}function re(){const t=b;let i;t.type==="hoodie"?i=["sirwal-souq-pop","set-01","hoodie-"+String(Number(t.id.slice(-2))%6+1).padStart(2,"0"),"sirwal-late-night"]:t.type==="sirwal"?i=["hoodie-01","hoodie-03","set-01","hoodie-05"]:i=["hoodie-01","hoodie-04","sirwal-"+h(T,t.ref).colorway,"set-"+String(Number(t.id.slice(-2))%8+1).padStart(2,"0")];const s=[...new Set(i)].filter(n=>n!==t.id).map(z).filter(Boolean).slice(0,4),a=c("[data-related]");a.innerHTML=s.map(n=>Q(n)).join("")}function P(){te(),j(),q(),ie(),ne(),re()}function le(){c("[data-info]").addEventListener("click",i=>{const s=i.target.closest("[data-nav-product]");if(s){const n=z(s.dataset.navProduct);if(!n||n.id===b.id)return;b=n;const p=new URL(location.href);p.searchParams.set("id",n.id),history.replaceState(null,"",p),g=0,P(),O||S.from(".g-slide.is-active",{opacity:0,scale:1.04,duration:.6,ease:"power2.out"});return}const a=i.target.closest("[data-set]");if(a){const n=a.dataset.set;if(r[n]=a.dataset.value,n==="hoodie")j(),r.hoodie!=="#151515"&&w(0);else if(H&&["statement","fabric"].includes(n)){H.update(r);const d=E("[data-g-slide]").findIndex(f=>f.classList.contains("g-slide--outfit"));d>-1&&w(d)}const p=window.scrollY;q(),window.scrollTo(0,p);return}if(i.target.closest("[data-size-guide-open]")){c("[data-size-guide]").showModal(),A(!0);return}i.target.closest("[data-add]")&&B()})}function B(){const t=b;if(t.type==="set"?!r.sizeH||!r.sizeS:!r.size){Z(t.type==="set"?u("pickSizes"):u("pickSize"));const n=c('[data-info] [data-set^="size"]')?.closest(".opt-block");n&&!O&&S.fromTo(n,{x:-10},{x:0,duration:.6,ease:"elastic.out(1, 0.3)"}),n?.scrollIntoView({block:"center",behavior:O?"auto":"smooth"});return}const s=h(v,r.statement),a=[];if(t.type==="hoodie"){const n=x.find(p=>p.hex===r.hoodie)?.look;a.push({label:$.hoodieColor,value:{ar:n.ar,en:n.en},swatch:r.hoodie},{label:$.size,value:r.size})}else if(t.type==="set")a.push({label:$.statement,value:`S${s.n}`},{label:$.hoodieSize,value:r.sizeH},{label:$.sirwalSize,value:r.sizeS});else{const n=h(C,r.fabric);a.push({label:$.fabric,value:{ar:n.ar,en:n.en}},{label:$.size,value:r.size})}N({pid:t.id,name:t.name,img:t.imgs[0],price:t.price,options:a})}function de(){const t=c("[data-buy-bar]"),i=new IntersectionObserver(([a])=>t.hidden=a.isIntersecting||a.boundingClientRect.top>0,{threshold:0}),s=()=>{const a=c("[data-add]");a&&i.observe(a)};return s(),c("[data-buy-scroll]").addEventListener("click",()=>B()),s}F({setup(){P(),se(),le();const t=de();K(c("[data-related]"),U);const i=c("[data-size-guide]");i.addEventListener("close",()=>A(!1)),i.addEventListener("click",a=>{(a.target===i||a.target.closest("[data-size-guide-close]"))&&i.close()}),window.addEventListener("langchange",()=>{P(),t(),M.refresh()}),new MutationObserver(t).observe(c("[data-info]"),{childList:!0})},intro(){O||(S.from(".g-stage",{clipPath:"inset(0 0 100% 0 round 24px)",duration:1.2,ease:"expo.out"}),S.from(".pdp-info > *",{y:30,opacity:0,duration:.9,ease:"power3.out",stagger:.06,delay:.15}))}});
