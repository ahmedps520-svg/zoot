import{L as w,b as a,F as g,C as f,S as h}from"./data-DzIjeNT0.js";const b={hoodie:"#151515",statement:"S01",fabric:"souq-woven",colorway:"souq-pop"},O=[...new Map(w.map(e=>[e.hoodie,{hex:e.hoodie,look:e}])).values()],v=e=>new URL(`img/studio/fab-${e.img.split("/").pop().replace(".webp","")}.webp`,document.baseURI).href;function S(e,t=b,{label:s=""}={}){e.classList.add("outfit"),e.setAttribute("role","img"),e.innerHTML=`
    <div class="o-sirwal">
      <div class="o-fabric"></div>
      <div class="o-fold"></div>
      <img class="o-trim" src="img/studio/sirwal-trim.webp" alt="" width="942" height="1600" draggable="false">
      <svg class="o-logo" aria-hidden="true"><use href="#zooot-logo"/></svg>
    </div>
    <div class="o-hoodie">
      <img class="o-shade" src="img/studio/hoodie-shade.webp" alt="" width="938" height="1181" draggable="false">
      <div class="o-tint"></div>
      <svg class="o-mini" aria-hidden="true"><use href="#zooot-logo"/></svg>
      <div class="o-print"><img alt="" draggable="false"></div>
    </div>`;const r=e.querySelector(".o-print img");let o={};const n=(c={})=>{const i={...b,...o,...c},u=a(g,i.fabric)||g[0],l=a(f,i.colorway)||f[0],d=a(h,i.statement);if(e.style.setProperty("--hoodie",i.hoodie),e.style.setProperty("--fab",`url("${v(u)}")`),e.style.setProperty("--fab-size",`${u.size}%`),e.style.setProperty("--zl-fill",l.fill),e.style.setProperty("--zl-edge",l.edge),e.style.setProperty("--zl-shadow",l.shadow),e.classList.toggle("is-light-hoodie",y(i.hoodie)>.55),i.statement!==o.statement&&(e.classList.toggle("no-print",!d),d)){r.classList.remove("is-in");const m=d.cut,p=new Image;p.onload=()=>{r.src=m,requestAnimationFrame(()=>r.classList.add("is-in"))},p.src=m}return o=i,s&&e.setAttribute("aria-label",typeof s=="function"?s(i):s),i};return n(t),{update:n,get config(){return o}}}function y(e){const t=parseInt(e.slice(1),16),[s,r,o]=[t>>16&255,t>>8&255,t&255].map(n=>{const c=n/255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4});return .2126*s+.7152*r+.0722*o}const I=e=>new URLSearchParams({h:e.hoodie.replace("#",""),s:e.statement,f:e.fabric,c:e.colorway}).toString();function P(e){const t=new URLSearchParams(e),s={};return/^[0-9a-f]{6}$/i.test(t.get("h")||"")&&(s.hoodie=`#${t.get("h")}`),a(h,t.get("s"))&&(s.statement=t.get("s")),a(g,t.get("f"))&&(s.fabric=t.get("f")),a(f,t.get("c"))&&(s.colorway=t.get("c")),s}export{b as D,O as H,S as c,P as d,I as e};
