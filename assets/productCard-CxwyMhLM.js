import{U as n,j as u,d as l,L as p,S as $,C as m,t as r,e as i,u as c,m as y,h as b}from"./main-qwrlvl4z.js";const f={set:n.typeSet,hoodie:n.typeHoodie,sirwal:n.typeSirwal};function g(a){return a.type==="set"?`L${l(p,a.ref).n}`:a.type==="hoodie"?`S${l($,a.ref).n}`:`B0${m.findIndex(t=>t.id===a.ref)+1}`}function v(a,{quick:t=!0}={}){const e=r(a.name),d=a.type==="set"?`<div class="p-quick"><a class="btn btn--sm btn--block" href="product.html?id=${a.id}">${i(c("pickSizes"))}</a></div>`:`<div class="p-quick" role="group" aria-label="${i(c("quickAdd"))}"><span class="p-quick-label">${i(c("quickAdd"))} · ${i(c("size"))}</span>${y.sizes.map(s=>`<button type="button" data-quick="${a.id}" data-size="${s}">${s}</button>`).join("")}</div>`;return`
  <article class="p-card" data-id="${a.id}" data-type="${a.type}" data-price="${a.price}">
    <div class="p-media">
      <img src="${a.imgs[0]}" alt="${i(e)}" loading="lazy" decoding="async">
      ${a.imgs[1]?`<img src="${a.imgs[1]}" alt="" loading="lazy" decoding="async">`:""}
      <div class="p-badges"><span class="tag ${a.type==="set"?"tag--yellow":a.type==="hoodie"?"tag--ink":""}">${i(r(f[a.type]))}</span><span class="p-num">${g(a)}</span></div>
      ${t?d:""}
    </div>
    <div class="p-info">
      <h3 class="p-name">${i(e)}</h3>
      <span class="p-price">${b(a.price)}</span>
      <p class="p-sub">${i(r(a.sub))}</p>
      <span class="sw-row" aria-hidden="true">${a.swatches.map(s=>`<i class="sw" style="--c:${s}"></i>`).join("")}</span>
    </div>
    <a class="p-link" href="product.html?id=${a.id}" aria-label="${i(e)}" data-cursor="شوفها" data-cursor-en="VIEW"></a>
  </article>`}function h(a,t){a.addEventListener("click",e=>{const d=e.target.closest("[data-quick]");if(!d)return;e.preventDefault();const s=t.find(o=>o.id===d.dataset.quick);s&&u({pid:s.id,name:s.name,img:s.imgs[0],price:s.price,options:[{label:n.size,value:d.dataset.size}]})})}export{f as T,v as a,h as b,g as p};
