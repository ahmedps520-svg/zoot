import{P as $,b as l,L as m,S as f,C as b,a as y}from"./data-DzIjeNT0.js";import{U as r,s as c,t as o,e as t,u as n,c as u,d as h,h as g}from"./main-CndaHzFm.js";const v={set:r.typeSet,hoodie:r.typeHoodie,sirwal:r.typeSirwal};function k(s){return s.type==="set"?`L${l(m,s.ref).n}`:s.type==="hoodie"?`S${l(f,s.ref).n}`:`B0${b.findIndex(a=>a.id===s.ref)+1}`}const S=s=>`${s.compareAt&&s.compareAt>s.price?`<s class="p-was">${u(s.compareAt)}</s> `:""}${u(s.price)}`,q=s=>c(s)?"":s.type==="set"?`<div class="p-quick"><a class="btn btn--sm btn--block" href="product.html?id=${s.id}">${t(n("pickSizes"))}</a></div>`:`<div class="p-quick" role="group" aria-label="${t(n("quickAdd"))}"><span class="p-quick-label">${t(n("quickAdd"))} · ${t(n("size"))}</span>${y.sizes.map(a=>`<button type="button" data-quick="${s.id}" data-size="${a}" ${c(s,a)?`disabled aria-disabled="true" title="${t(n("sizeSoldOut"))}"`:""}>${a}</button>`).join("")}</div>`;function T(s,{quick:a=!0}={}){if(s.hidden)return"";const d=o(s.name),e=c(s);return`
  <article class="p-card${e?" is-soldout":""}" data-id="${s.id}" data-type="${s.type}" data-price="${s.price}"${a?' data-q="1"':""}>
    <div class="p-media">
      <img src="${s.imgs[0]}" alt="${t(d)}" loading="lazy" decoding="async">
      ${s.imgs[1]?`<img src="${s.imgs[1]}" alt="" loading="lazy" decoding="async">`:""}
      <div class="p-badges"><span class="tag ${s.type==="set"?"tag--yellow":s.type==="hoodie"?"tag--ink":""}">${t(o(v[s.type]))}</span><span class="p-num">${k(s)}</span></div>
      ${e?`<span class="p-soldout">${t(n("soldOut"))}</span>`:""}
      ${a?q(s):""}
    </div>
    <div class="p-info">
      <h3 class="p-name">${t(d)}</h3>
      <span class="p-price">${S(s)}</span>
      <p class="p-sub">${t(o(s.sub))}</p>
      <span class="sw-row" aria-hidden="true">${s.swatches.map(i=>`<i class="sw" style="--c:${i}"></i>`).join("")}</span>
    </div>
    <a class="p-link" href="product.html?id=${s.id}" aria-label="${t(d)}" data-cursor="شوفها" data-cursor-en="VIEW"></a>
  </article>`}function w(s,a){s.addEventListener("click",d=>{const e=d.target.closest("[data-quick]");if(!e)return;d.preventDefault();const i=a.find(p=>p.id===e.dataset.quick);if(i){if(c(i,e.dataset.size))return h(n("sizeSoldOut"));g({pid:i.id,name:i.name,img:i.imgs[0],price:i.price,options:[{label:r.size,value:e.dataset.size}]})}})}window.addEventListener("catalog:change",()=>{document.querySelectorAll(".p-card[data-id]").forEach(s=>{const a=$.find(i=>i.id===s.dataset.id);if(!a)return;if(a.hidden)return s.remove();const d=document.createElement("div");d.innerHTML=T(a,{quick:s.dataset.q==="1"});const e=d.firstElementChild;e&&(e.className=s.className.replace(/\bis-soldout\b/g,"").trim()+(c(a)?" is-soldout":""),e.style.cssText=s.style.cssText,e.hidden=s.hidden,s.replaceWith(e))})});export{v as T,T as a,w as b,k as p};
