const n={ink:"#0D0D0D",cream:"#F2EBDF",paper:"#FBF8F2",yellow:"#FFD21F",blue:"#1F4BFF",magenta:"#E5197F",muted:"#6E665B"},f="'IBM Plex Sans Arabic', Tahoma, 'Segoe UI', Arial, sans-serif",O="'IBM Plex Sans Arabic', 'Helvetica Neue', Arial, sans-serif",E="'Archivo Black', 'Arial Black', Arial, sans-serif",R={new:{ar:"جديد",en:"New"},confirmed:{ar:"مؤكد",en:"Confirmed"},preparing:{ar:"قيد التجهيز",en:"Preparing"},shipped:{ar:"تم الشحن",en:"Shipped"},delivered:{ar:"تم التسليم",en:"Delivered"},cancelled:{ar:"ملغي",en:"Cancelled"}},j=["new","confirmed","preparing","shipped","delivered"],D={cod:{ar:"الدفع عند الاستلام",en:"Cash on delivery"},transfer:{ar:"تحويل بنكي",en:"Bank transfer"},mada:{ar:"مدى",en:"mada"},card:{ar:"بطاقة ائتمانية",en:"Credit card"},applepay:{ar:"Apple Pay",en:"Apple Pay"},stcpay:{ar:"STC Pay",en:"STC Pay"},cash:{ar:"نقدًا",en:"Cash"}},a=e=>String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),b=(e,t)=>e&&typeof e=="object"?e[t]??e.ar??e.en??"":e??"",u=(e,t)=>{const i=Number(e||0).toLocaleString("en-US",{maximumFractionDigits:2});return t==="en"?`SAR ${i}`:`${i} ر.س`},x=(e,t)=>t?/^https?:|^data:/.test(t)?t:`${e.replace(/\/$/,"")}/${t.replace(/^\.?\//,"")}`:"",N=(e,t)=>t.product_id&&!String(t.image||"").startsWith("http")?x(e,`email/p/${t.product_id}.jpg`):x(e,t.image);function v({lang:e="ar",title:t,preheader:i="",body:d,siteUrl:s,unsubscribeUrl:c,socials:o={}}){const $=e!=="en",r=$?"rtl":"ltr",p=$?"right":"left",l=$?f:O,g=(h,y)=>$?h:y,m=(h,y)=>`<a href="${a(h)}" style="color:${n.cream};text-decoration:none;font-weight:700">${y}</a>`;return`<!doctype html>
<html lang="${e}" dir="${r}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${a(t)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;700&family=Archivo+Black&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  a { color:${n.blue}; }
  @media (max-width: 620px) {
    .container { width:100% !important; border-radius:0 !important; border-left:0 !important; border-right:0 !important; }
    .px { padding-left:22px !important; padding-right:22px !important; }
    .h1 { font-size:28px !important; line-height:1.25 !important; }
    .stack { display:block !important; width:100% !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${n.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${a(i)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${n.cream};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" dir="${r}"
         style="width:600px;max-width:600px;background:${n.paper};border:2px solid ${n.ink};border-radius:22px;overflow:hidden;">
    <tr><td align="center" style="background:${n.ink};padding:30px 24px 24px;">
      <a href="${a(s)}" style="text-decoration:none"><img src="${a(x(s,"email/logo.png"))}" width="168" height="78" alt="زوووط ZOOOT" style="display:block;border:0;width:168px;height:auto;color:${n.yellow};font:700 28px ${l}"></a>
      <div style="font-family:${E};font-size:10px;letter-spacing:4px;color:${n.yellow};margin-top:14px;">WEAR THE MOOD. OWN THE STREET.</div>
    </td></tr>
    <tr><td style="font-size:0;line-height:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td height="6" style="background:${n.yellow};font-size:0;line-height:0">&nbsp;</td>
        <td height="6" style="background:${n.magenta};font-size:0;line-height:0">&nbsp;</td>
        <td height="6" style="background:${n.blue};font-size:0;line-height:0">&nbsp;</td>
      </tr></table>
    </td></tr>
    <tr><td class="px" dir="${r}" align="${p}" style="padding:36px 40px 40px;font-family:${l};color:${n.ink};text-align:${p};direction:${r};">
      ${d}
    </td></tr>
    <tr><td align="center" style="background:${n.ink};padding:26px 24px;font-family:${l};font-size:13px;line-height:1.9;color:#9A9387;">
      ${m(s+"/shop.html",g("المتجر","Shop"))} &nbsp;·&nbsp; ${m(s+"/track.html",g("تتبّع طلبك","Track an order"))}${o.instagram?` &nbsp;·&nbsp; ${m(o.instagram,"Instagram")}`:""}${o.tiktok?` &nbsp;·&nbsp; ${m(o.tiktok,"TikTok")}`:""}
      <div style="margin-top:10px;">© ZOOOT — زوووط · DROP 001</div>
      ${c?`<div style="margin-top:6px;"><a href="${a(c)}" style="color:#9A9387;text-decoration:underline">${g("إلغاء الاشتراك","Unsubscribe")}</a></div>`:""}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`}const T=e=>`<div style="font-family:${E};font-size:11px;letter-spacing:3px;color:${n.magenta};margin:0 0 10px;direction:ltr;unicode-bidi:isolate;">${a(e)}</div>`,_=(e,t)=>`<h1 class="h1" style="margin:0 0 16px;font-family:${t};font-size:34px;line-height:1.2;font-weight:700;color:${n.ink};">${e}</h1>`,k=(e,t,i="")=>`<p style="margin:0 0 16px;font-family:${t};font-size:16px;line-height:1.85;color:#3A352F;${i}">${e}</p>`;function F(e,t,i,{bg:d=n.yellow,fg:s=n.ink}={}){return`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px;"><tr>
    <td align="center" bgcolor="${d}" style="background:${d};border:2px solid ${n.ink};border-radius:999px;mso-padding-alt:14px 30px;">
      <a href="${a(e)}" style="display:inline-block;padding:14px 30px;font-family:${i};font-size:16px;font-weight:700;color:${s};text-decoration:none;border-radius:999px;">${a(t)} &nbsp;${i===f?"&#8592;":"&#8594;"}</a>
    </td></tr></table>`}function w(e,{bg:t=n.cream,border:i="rgba(13,13,13,.16)",dashed:d=!0}={}){return`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;"><tr>
    <td style="background:${t};border:1.5px ${d?"dashed":"solid"} ${i};border-radius:16px;padding:20px 22px;">${e}</td>
  </tr></table>`}function U(e,t){const i=j.indexOf(e);return`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;"><tr>${j.map((s,c)=>{const o=i>=c;return`<td width="20%" align="center" style="padding:0 2px;">
      <div style="height:8px;border-radius:8px;background:${o?c===i?n.magenta:n.ink:"rgba(13,13,13,.12)"};"></div>
      <div style="font-size:11px;line-height:1.4;margin-top:8px;color:${o?n.ink:"#9A9387"};font-weight:${c===i?700:400};">${a(R[s][t])}</div>
    </td>`}).join("")}</tr></table>`}function B(e,t,i,d){const s=t!=="en",c=s?"left":"right",o=(e.items||[]).map(l=>{const g=(l.options||[]).map(h=>`${a(b(h.label,t))}: ${a(typeof h.value=="object"?b(h.value,t):h.value)}`).join(" · "),m=N(i,l);return`<tr>
        <td width="64" valign="top" style="padding:10px 0;">${m?`<img src="${a(m)}" width="56" height="70" alt="" style="display:block;width:56px;height:70px;object-fit:cover;border-radius:10px;background:${n.cream};">`:""}</td>
        <td valign="top" style="padding:10px 12px;font-family:${d};">
          <div style="font-size:15px;font-weight:700;line-height:1.5;color:${n.ink};">${a(b(l.name,t))}</div>
          ${g?`<div style="font-size:12.5px;line-height:1.6;color:${n.muted};">${g}</div>`:""}
          <div style="font-size:12.5px;color:${n.muted};">× ${Number(l.qty)}</div>
        </td>
        <td valign="top" align="${c}" style="padding:10px 0;font-family:${d};font-size:15px;font-weight:700;white-space:nowrap;color:${n.ink};">${u(l.unit_price*l.qty,t)}</td>
      </tr>`}).join('<tr><td colspan="3" style="border-top:1px solid rgba(13,13,13,.1);font-size:0;line-height:0;">&nbsp;</td></tr>'),$=(l,g,m=!1)=>`<tr><td style="padding:4px 0;font-family:${d};font-size:${m?17:14}px;font-weight:${m?700:400};color:${m?n.ink:n.muted};">${l}</td>
      <td align="${c}" style="padding:4px 0;font-family:${d};font-size:${m?17:14}px;font-weight:700;color:${n.ink};white-space:nowrap;">${g}</td></tr>`,r=(l,g)=>s?l:g,p=`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;border-top:2px solid ${n.ink};padding-top:8px;">
    ${$(r("المجموع الفرعي","Subtotal"),u(e.subtotal,t))}
    ${Number(e.discount)>0?$(r("الخصم","Discount"),"− "+u(e.discount,t)):""}
    ${$(r("الشحن","Shipping"),Number(e.shipping)>0?u(e.shipping,t):r("مجاني","Free"))}
    ${$(r("الإجمالي","Total"),u(e.total,t),!0)}
  </table>`;return w(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${o}</table>${p}`,{bg:"#FFFFFF"})}const C=(e,t,i)=>{const d=(s,c)=>t!=="en"?s:c;return`<div style="font-family:${i};font-size:14px;line-height:1.8;color:#3A352F;">
    <strong style="color:${n.ink}">${d("التوصيل إلى","Delivering to")}</strong><br>
    ${a(e.customer_name)} · <span dir="ltr">${a(e.customer_phone)}</span><br>
    ${a([e.city,e.district].filter(Boolean).join(" — "))}${e.address?"<br>"+a(e.address):""}
  </div>`},A=(e={})=>({siteUrl:(e.siteUrl||"https://zooot.shop").replace(/\/$/,""),socials:e.socials||{}}),S=(e,t)=>`${e}/track.html?order=${encodeURIComponent(t.order_no)}`;function W(e={}){const{lang:t="ar",unsubscribeUrl:i,...d}=e,{siteUrl:s,socials:c}=A(d),o=t!=="en",$=o?f:O,r=(h,y)=>o?h:y,p=`<span style="color:${n.magenta};font-weight:700">✦</span>`,l=[r("وصول مبكّر لكل إصدار قبل الكل","Early access to every drop"),r("عدّاد الإطلاق — يوم بيوم حتى الإصدار الجاي","The launch counter — day by day to the next drop"),r("قاموس زوووط: كلمة من القاموس + موقف من الشارع","The ZOOOT dictionary: one word, one street moment")],g=r("أهلًا بك في الزوووطة ✦","Welcome to the ZOOOTA ✦"),m=`
    <a href="${a(s)}"><img src="${a(x(s,"og-image.jpg"))}" width="520" alt="${a(r("امسك شروالك مزبوووط","Hold your sirwal just right"))}" style="display:block;width:100%;max-width:520px;height:auto;border-radius:16px;border:2px solid ${n.ink};margin:0 0 28px;"></a>
    ${T("JOIN THE ZOOOTA")}
    ${_(r('أهلًا بك في <span style="color:'+n.magenta+'">الزوووطة</span>','Welcome to <span style="color:'+n.magenta+'">the ZOOOTA</span>'),$)}
    ${k(r("صرت من أوّل الناس اللي يدرون. زوووط: هودي أوفرسايز، شروال من أقمشة السوق، وكلمة وحدة على الظهر — يقرأها الشارع قبل ما يشوف وجهك.","You’re now one of the first to know. ZOOOT: an oversized hoodie, a sirwal in souq fabric, and one word on the back — the street reads it before it sees your face."),$)}
    ${w(l.map(h=>`<div style="font-family:${$};font-size:15px;line-height:1.9;color:${n.ink};">${p}&nbsp; ${a(h)}</div>`).join(""))}
    ${F(`${s}/shop.html`,r("تسوّق DROP 001","Shop DROP 001"),$)}
    ${k(r("ولا تنسى: امسك شروالك مزبوووط.","And remember: hold your sirwal just right."),$,`color:${n.muted};font-size:14px;margin-top:18px;`)}`;return{subject:g,html:v({lang:t,title:g,preheader:r("وصول مبكّر، عدّاد الإطلاق، وقاموس زوووط.","Early access, the launch counter and the ZOOOT dictionary."),body:m,siteUrl:s,unsubscribeUrl:i,socials:c}),text:`${g}

${l.map(h=>"✦ "+h).join(`
`)}

${r("تسوّق","Shop")}: ${s}/shop.html${i?`

${r("إلغاء الاشتراك","Unsubscribe")}: ${i}`:""}`}}function Z(e){const{order:t,settings:i={},...d}=e,{siteUrl:s,socials:c}=A(d),o=t.lang==="en"?"en":"ar",$=o!=="en",r=$?f:O,p=(y,z)=>$?y:z,l=D[t.payment_method]?b(D[t.payment_method],o):t.payment_method,g=p(`طلبك ${t.order_no} وصلنا ✦`,`We got your order ${t.order_no} ✦`),m=t.payment_method==="transfer"&&i.bank_details?w(`<div style="font-family:${r};font-size:14px;line-height:1.8;"><strong>${p("بيانات التحويل البنكي","Bank transfer details")}</strong><br>${a(i.bank_details).replace(/\n/g,"<br>")}<br><span style="color:${n.muted}">${p("اكتب رقم الطلب في ملاحظة التحويل.","Put the order number in the transfer note.")}</span></div>`,{bg:n.cream,dashed:!1}):"",h=`
    ${T(`ORDER ${t.order_no} · DROP 001`)}
    ${_(p("شكرًا لأنك اخترت زوووط","Thanks for choosing ZOOOT"),r)}
    ${k(p(`أهلًا ${a(t.customer_name)}، استلمنا طلبك وبنبدأ نجهّزه. بنرسل لك تحديث مع كل خطوة.`,`Hi ${a(t.customer_name)}, we’ve got your order and we’re getting it ready. You’ll hear from us at every step.`),r)}
    ${U(t.status||"new",o)}
    ${B(t,o,s,r)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="stack" valign="top" width="55%" style="padding:0 0 12px;">${C(t,o,r)}</td>
      <td class="stack" valign="top" width="45%" style="padding:0 0 12px;font-family:${r};font-size:14px;line-height:1.8;color:#3A352F;">
        <strong style="color:${n.ink}">${p("طريقة الدفع","Payment")}</strong><br>${a(l)}
      </td>
    </tr></table>
    ${m}
    ${F(S(s,t),p("تتبّع طلبك","Track your order"),r)}
    ${w(`<div style="font-family:${r};font-size:15px;line-height:1.8;color:${n.cream};"><strong style="color:${n.yellow}">${p("تدري مين وراء الزوووطة؟","Who’s behind the ZOOOTA?")}</strong><br>${p("الجواب داخل العلبة. افتحها وصوّر اللحظة 👀","The answer is inside the box. Open it — and film the moment 👀")}</div>`,{bg:n.ink,dashed:!1,border:n.ink})}`;return{subject:g,html:v({lang:o,title:g,preheader:p(`الإجمالي ${u(t.total,o)} — تتبّع طلبك في أي وقت.`,`Total ${u(t.total,o)} — track it any time.`),body:h,siteUrl:s,socials:c}),text:[g,"",...(t.items||[]).map(y=>`• ${b(y.name,o)} ×${y.qty} — ${u(y.unit_price*y.qty,o)}`),`${p("الإجمالي","Total")}: ${u(t.total,o)}`,`${p("الدفع","Payment")}: ${l}`,"",`${p("تتبّع طلبك","Track your order")}: ${S(s,t)}`].join(`
`)}}const P={confirmed:{h:{ar:"طلبك تأكّد ✓",en:"Your order is confirmed ✓"},p:{ar:"كل شي تمام — طلبك دخل قائمة التجهيز.",en:"All good — your order is in the queue."}},preparing:{h:{ar:"طلبك قيد التجهيز",en:"Your order is being made"},p:{ar:"نطبع العبارة، نثبّت «زوووط» على الظهر، ونجهّز صندوق التوقيع.",en:"Printing the statement, fixing «ZOOOT» on the back and packing the signature box."}},shipped:{h:{ar:"طلبك في الطريق 🚚",en:"Your order is on its way 🚚"},p:{ar:"سلّمنا الصندوق لشركة الشحن. جهّز مكان في الدولاب.",en:"The box is with the courier. Make some room in the closet."}},delivered:{h:{ar:"وصلك؟ البسه.",en:"Got it? Wear it."},p:{ar:"خلّ الشارع يقرأ الظهر — وصوّرها وأشّر علينا.",en:"Let the street read the back — and tag us when you post it."}},cancelled:{h:{ar:"تم إلغاء طلبك",en:"Your order was cancelled"},p:{ar:"إذا كان في شي غلط أو تبي تطلب من جديد، ردّ على هذا الإيميل.",en:"If something’s off or you want to order again, just reply to this email."}},new:{h:{ar:"استلمنا طلبك",en:"We received your order"},p:{ar:"بنبدأ نجهّزه قريب.",en:"We’ll start on it soon."}}};function I(e){const{order:t,...i}=e,d=e.status||t.status,{siteUrl:s,socials:c}=A(i),o=t.lang==="en"?"en":"ar",$=o!=="en",r=$?f:O,p=(y,z)=>$?y:z,l=P[d]||P.new,g=`${t.order_no} · ${b(l.h,o)}`,m=d==="shipped"&&(t.courier||t.tracking_no)?w(`<div style="font-family:${r};font-size:14px;line-height:1.8;"><strong>${p("بيانات الشحنة","Shipment")}</strong><br>${a(t.courier||"")} ${t.tracking_no?`· <span dir="ltr" style="font-family:${E}">${a(t.tracking_no)}</span>`:""}</div>`,{bg:n.cream,dashed:!1}):"",h=`
    ${T(`ORDER ${t.order_no} · ${R[d]?.en?.toUpperCase()||""}`)}
    ${_(a(b(l.h,o)),r)}
    ${k(a(b(l.p,o)),r)}
    ${d!=="cancelled"?U(d,o):""}
    ${m}
    ${F(S(s,t),p("تتبّع طلبك","Track your order"),r)}`;return{subject:g,html:v({lang:o,title:g,preheader:b(l.p,o),body:h,siteUrl:s,socials:c}),text:`${b(l.h,o)}
${b(l.p,o)}

${p("تتبّع طلبك","Track your order")}: ${S(s,t)}`}}function q(e){const{order:t,subject:i,message:d,...s}=e,{siteUrl:c,socials:o}=A(s),$=t.lang==="en"?"en":"ar",r=$!=="en",p=r?f:O,l=(h,y)=>r?h:y,g=String(d||"").split(/\n{2,}/).map(h=>k(a(h).replace(/\n/g,"<br>"),p)).join(""),m=`${T(`ORDER ${t.order_no}`)}${_(a(i),p)}${g}${F(S(c,t),l("تتبّع طلبك","Track your order"),p)}`;return{subject:i,html:v({lang:$,title:i,preheader:String(d||"").slice(0,90),body:m,siteUrl:c,socials:o}),text:`${i}

${d}`}}function H(e){const{order:t,dashboardUrl:i,...d}=e,{siteUrl:s}=A(d),c=f,o=`🟡 طلب جديد ${t.order_no} — ${u(t.total,"ar")}`,$=`
    ${T(`NEW ORDER · ${t.order_no}`)}
    ${_(`طلب جديد من ${a(t.customer_name)}`,c)}
    ${k(`${a(t.city||"")} · <span dir="ltr">${a(t.customer_phone)}</span>${t.customer_email?` · ${a(t.customer_email)}`:""}`,c)}
    ${B({...t},"ar",s,c)}
    ${t.customer_note?w(`<div style="font-family:${c};font-size:14px;line-height:1.8;"><strong>ملاحظة العميل</strong><br>${a(t.customer_note)}</div>`):""}
    ${F(i||`${s}/admin/`,"افتح الطلب في لوحة التحكم",c,{bg:n.magenta,fg:"#FFFFFF"})}`;return{subject:o,html:v({lang:"ar",title:o,preheader:`${t.customer_name} · ${u(t.total,"ar")}`,body:$,siteUrl:s}),text:`${o}
${t.customer_name} · ${t.customer_phone}
${i||s+"/admin/"}`}}function M(e){const{lang:t="ar",subject:i,heading:d,body:s,ctaLabel:c,ctaUrl:o,image:$,unsubscribeUrl:r,...p}=e,{siteUrl:l,socials:g}=A(p),h=t!=="en"?f:O,y=String(s||"").split(/\n{2,}/).map(L=>k(a(L).replace(/\n/g,"<br>"),h)).join(""),z=`
    ${$?`<img src="${a(x(l,$))}" width="520" alt="" style="display:block;width:100%;max-width:520px;height:auto;border-radius:16px;border:2px solid ${n.ink};margin:0 0 28px;">`:""}
    ${T("ZOOOT · DROP 001")}
    ${_(a(d||i),h)}
    ${y}
    ${c&&o?F(x(l,o),c,h):""}`;return{subject:i,html:v({lang:t,title:i,preheader:String(s||"").slice(0,90),body:z,siteUrl:l,unsubscribeUrl:r,socials:g}),text:`${d||i}

${s}${o?`

${c}: ${x(l,o)}`:""}${r?`

Unsubscribe: ${r}`:""}`}}export{q as a,Z as b,M as c,H as o,I as s,W as w};
