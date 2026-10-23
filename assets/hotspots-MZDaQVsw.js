import{e as l,t as i}from"./main-Bpj74a-F.js";const o=[{x:50,y:3.2,side:"l",label:{ar:"لسان «زوووط» المنسوج",en:"Woven «ZOOOT» tongue"}},{x:82,y:4.5,side:"r",label:{ar:"حزام مطاطي + رباط",en:"Elastic waistband + drawstring"}},{x:66,y:17,side:"r",label:{ar:"«زوووط» الكبيرة · أعلى الخلف",en:"The big «ZOOOT» · top of the back"}},{x:72,y:41,side:"r",label:{ar:"جيب خلفي",en:"Back pocket"}},{x:50,y:50,side:"l",label:{ar:"منطقة وسطى نازلة (قصّة تقليدية)",en:"Dropped crotch (traditional cut)"}},{x:24,y:72,side:"l",label:{ar:"ساق واسعة",en:"Wide leg"}},{x:76,y:93,side:"r",label:{ar:"كف مطاطي عند الكاحل",en:"Elastic ankle cuff"}}];function d(n,{points:t=o,colorway:e}={}){n.innerHTML=`
    <figure class="anatomy">
      <div class="anatomy-figure" ${e?`style="--zl-fill:${e.fill};--zl-edge:${e.edge};--zl-shadow:${e.shadow}"`:""}>
        <img src="img/products/sirwal-anatomy.webp" width="942" height="1600" alt="${l(i({ar:"رسم تقني لشروال زوووط من الخلف",en:"Technical flat of the ZOOOT sirwal, back view"}))}" loading="lazy">
        <svg class="anatomy-logo" aria-hidden="true"><use href="#zooot-logo"/></svg>
        <span class="anatomy-tongue" aria-hidden="true"><svg><use href="#zooot-logo"/></svg></span>
        ${t.map((a,s)=>`
          <button type="button" class="hs hs--${a.side}" style="--x:${a.x};--y:${a.y}" aria-describedby="hs-${s}">
            <span class="hs-dot"><b>${s+1}</b></span>
            <span class="hs-line" aria-hidden="true"></span>
            <span class="hs-label" id="hs-${s}" role="tooltip">${l(i(a.label))}</span>
          </button>`).join("")}
      </div>
      <figcaption>
        <ol class="anatomy-list">${t.map(a=>`<li>${l(i(a.label))}</li>`).join("")}</ol>
      </figcaption>
    </figure>`}export{d as r};
