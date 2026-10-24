import"./model-Pqpf8ReO.js";import{c,a as d,u as g,r,g as o,t as i,$ as n,e}from"./main-CswUAJYJ.js";import{C as p,c as m,L as $,F as h,S as u}from"./data-DzIjeNT0.js";import{r as w}from"./hotspots-BuwYVytQ.js";const s=(a,t)=>i({ar:a,en:t}),b=[{img:"neck-label",ar:"ملصق داخلي للهودي",en:"Hoodie neck label",note:s("منسوج أسود · داخل الرقبة","Black woven · inside the neck")},{img:"hang-tag",ar:"بطاقة Hang Tag",en:"Hang tag",note:s("سوداء بحلقة معدنية · بأسماء المؤسِّستين","Black with a metal eyelet · the founders’ names")},{img:"belt-label",ar:"ملصق حزام الشروال",en:"Sirwal waistband label",note:s("منسوج داخل الحزام","Woven inside the waistband")},{img:"drop-card",ar:"بطاقة DROP 001 المرقّمة",en:"Numbered DROP 001 card",note:"N° 000 / [—]"},{img:"box",ar:"صندوق التغليف",en:"The box",note:s("أسود بشريط أصفر وختم التوقيع","Black with a yellow band and the signature seal")},{img:"thank-you",ar:"بطاقة الشكر",en:"Thank-you card",note:s("داخل التغليف","Inside the packaging")},{img:"sticker",ar:"ستيكر الإصدار الأول",en:"First-drop sticker",note:s("مقصوص بحافة بيضاء","Die-cut with a white edge")}];function l(){n("[data-cw-grid]").innerHTML=p.map(a=>`
    <a class="cw-card" href="product.html?id=sirwal-${a.id}" data-cursor="شوفه" data-cursor-en="VIEW">
      <span class="cw-media"><img src="${a.img}" alt="${e(s(`شروال ${a.ar} من الخلف`,`${a.en} sirwal from behind`))}" loading="lazy"></span>
      <span class="cw-info"><strong>${e(s(a.ar,a.en))}</strong><small>${e(i(a.note))}</small></span>
      <span class="sw-row" aria-hidden="true"><i class="sw" style="--c:${a.fill}"></i><i class="sw" style="--c:${a.edge}"></i><i class="sw" style="--c:${a.shadow}"></i></span>
    </a>`).join(""),n("[data-palette]").innerHTML=m.map(a=>`
    <button type="button" class="pal" style="--c:${a.hex}" data-hex="${a.hex}" aria-label="${e(`${s(a.ar,a.en)} ${a.hex}`)}">
      <span class="pal-chip"></span>
      <strong>${e(s(a.ar,a.en))}</strong>
      <span class="num">${a.hex}</span>
      <small>${e(i(a.use))}</small>
    </button>`).join(""),n("[data-look-palettes]").innerHTML=$.map(a=>`
    <div class="lp-row">
      <span class="lp-name"><b class="num">${a.n}</b> ${e(s(a.ar,a.en))}</span>
      <span class="sw-strip lp-h" title="${e(s("الهودي","Hoodie"))}"><i style="--c:${a.hoodie}"></i></span>
      <span class="sw-strip" title="${e(s("الطباعة","Print"))}">${a.print.map(t=>`<i style="--c:${t}"></i>`).join("")}</span>
      <span class="sw-strip" title="${e(s("الشروال","Sirwal"))}">${a.sirwal.map(t=>`<i style="--c:${t}"></i>`).join("")}</span>
    </div>`).join(""),n("[data-fab-grid]").innerHTML=h.slice(2).map(a=>`<figure class="fab-card"><span class="fab-media" style="background-image:url(${a.img})"></span><figcaption>${e(s(a.ar,a.en))}</figcaption></figure>`).join(""),w(n("[data-anatomy]")),n("[data-methods]").innerHTML=u.map(a=>`
    <a class="method" href="product.html?id=hoodie-${a.n}">
      <span class="method-art"><img src="img/statements/art-${a.id.toLowerCase()}-800.webp" alt="${e(`«${a.quote.ar}»`)}" loading="lazy"></span>
      <span class="method-info">
        <span class="method-top"><span class="tag" style="--tag-bg:${a.methodColor}">${e(a.method)}</span><strong><span class="num">${a.n}</span> · ${e(s(a.ar,a.en))}</strong></span>
        <small>${e(i(a.spec))}</small>
      </span>
    </a>`).join(""),n("[data-sig-grid]").innerHTML=b.map((a,t)=>`
    <figure class="sig-item${t===4?" sig-item--wide":""}">
      <span class="sig-media"><img src="img/signature/${a.img}${t===4?"":"-800"}.webp" alt="${e(s(a.ar,a.en))}" loading="lazy"></span>
      <figcaption><b class="num">0${t+1}</b> <strong>${e(s(a.ar,a.en))}</strong> <small>${e(a.note)}</small></figcaption>
    </figure>`).join("")}c({setup(){l(),window.addEventListener("langchange",l),document.addEventListener("click",async a=>{const t=a.target.closest("[data-hex]");if(t){try{await navigator.clipboard.writeText(t.dataset.hex)}catch{}d(`${g("copiedHex")} ${t.dataset.hex}`),r||o.fromTo(t.querySelector(".pal-chip"),{scaleY:.9},{scaleY:1,duration:.6,ease:"elastic.out(1, 0.35)"})}}),r||o.fromTo("[data-banner-logo]",{scale:.7,rotate:-6},{scale:1,rotate:0,ease:"none",scrollTrigger:{trigger:".logo-banner",start:"top bottom",end:"center center",scrub:!0}})}});
