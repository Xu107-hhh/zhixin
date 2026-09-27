/* ════════════════════════════════════════════════════════
   app.js —— UI 编排（中英双语）
   对话为绝对主角；「处理过程」抽屉按时间线整理执行依据。
   ════════════════════════════════════════════════════════ */
(() => {
  const D = window.DEMO_DATA, E = window.Engine;
  const $ = s => document.querySelector(s);
  const msgsEl = $("#messages"), cardsEl = $("#cards"), inputEl = $("#input");
  const stepsEl = $("#steps"), scriptHintEl = $("#scriptHint"), photoChipEl = $("#photoChip");

  const ICON = {
    headset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a8 8 0 0 1 16 0"/><rect x="3" y="13" width="4" height="6" rx="1.6"/><rect x="17" y="13" width="4" height="6" rx="1.6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>'
  };

  const CARD_ORDER = ["emotion", "disambig", "warranty", "logistics", "retrieval", "honesty", "gate", "satisfaction"];
  const CARD_META = {
    emotion:      ["01", "情绪与处理方式", "Emotion & handling"],
    disambig:     ["02", "看图与消歧", "Photo & disambiguation"],
    warranty:     ["03", "订单与质保", "Order & warranty"],
    logistics:    ["",   "物流查询", "Logistics lookup"],
    retrieval:    ["04", "知识库检索", "Knowledge retrieval"],
    honesty:      ["",   "诚实边界", "Honesty boundary"],
    gate:         ["05", "换货 / 退款确认", "Replacement / refund confirmation"],
    satisfaction: ["06", "满意度（NSS）", "Satisfaction (NSS)"]
  };
  const state = {
    mode: "rule", scenario: null, curLang: "zh", idx: 0,
    order: null, product: null, pendingDisambig: null,
    curLevel: 0, maxLevel: 0, levelLog: [], prevStrategy: null,
    pendingPhoto: null, history: [], gateOpen: false, derailed: false,
    sending: false, stepDone: new Set(), traceNotified: false,
    epoch: 0, lastWarranty: null, gateAutoOpened: false
  };

  /* ── 工具 ── */
  const now = () => new Date().toTimeString().slice(0, 8);
  const pad = n => String(n).padStart(2, "0");
  const en = () => state.curLang === "en";
  const esc = s => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const renderCites = s => esc(s).replace(/\[(KB-[\d]+)\]/g, '<span class="cite">$1</span>');
  /* 轻量结构化渲染：数字行→步骤卡，· 行→圆点列表，**粗体**，[KB-xxx] 引用 */
  function mdLite(s) {
    const inline = x => x
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\[(KB-[\d]+)\]/g, '<span class="cite">$1</span>');
    const out = []; let list = null;
    const close = () => { if (list) { out.push("</" + list + ">"); list = null; } };
    esc(s).split("\n").forEach(raw => {
      const line = raw.trim();
      const ol = line.match(/^\d+[.、)]\s*(.*)$/), ul = line.match(/^[·•]\s*(.*)$/);
      if (ol) { if (list !== "ol") { close(); out.push('<ol class="rl-steps">'); list = "ol"; } out.push("<li>" + inline(ol[1]) + "</li>"); }
      else if (ul) { if (list !== "ul") { close(); out.push('<ul class="rl-dots">'); list = "ul"; } out.push("<li>" + inline(ul[1]) + "</li>"); }
      else { close(); if (line === "" && out.length && !out[out.length - 1].endsWith("<br>")) { out.push("<br>"); return; } if (line) out.push(inline(line) + "<br>"); }
    });
    close();
    return out.join("");
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function daysOf(order) {
    const end = new Date(order.warrantyEnd + "T23:59:59");
    return Math.round(Math.abs(end - new Date()) / 86400000);
  }
  function detectLang(text) {
    const cjk = (text.match(/[一-鿿]/g) || []).length;
    const lat = (text.match(/[a-zA-Z]/g) || []).length;
    if (cjk === 0 && lat >= 4) return "en";
    if (lat >= 6 && lat > cjk * 2) return "en";
    if (cjk > 0) return "zh";
    return null;
  }
  function toast(t) {
    const el = $("#toast"); el.textContent = t; el.classList.remove("hidden");
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.add("hidden"), 2600);
  }
  function newTK() {
    const d = new Date();
    const ymd = "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    return "TK-" + ymd + "-" + Math.floor(1000 + Math.random() * 9000);
  }

  /* ── 消息 ── */
  function addMsg(role, html, photo) {
    const div = document.createElement("div");
    div.className = "msg " + role;
    const av = `<div class="avatar">${role === "agent" ? ICON.headset : ICON.user}</div>`;
    const ph = photo ? `<span class="photo-thumb"><img src="${photo.img}" alt="附件"></span>` : "";
    div.innerHTML = av + `<div class="bubble">${ph}${html}<span class="msg-ts">${now().slice(0, 5)}</span></div>`;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return div;
  }
  function typing() {
    const div = addMsg("agent", '<span class="typing"><i></i><i></i><i></i></span>');
    return () => div.remove();
  }
  function removeWelcome() { const w = $("#welcome"); if (w) w.remove(); document.body.classList.add("chatting"); }

  /* ── 步骤条：只标实际执行过的环节 ── */
  function markStep(i) {
    state.stepDone.add(i);
    stepsEl.querySelectorAll(".s").forEach((s, k) => {
      s.classList.toggle("done", state.stepDone.has(k));
      s.classList.toggle("active", k === i);
    });
  }

  /* ── 抽屉卡片骨架（按 CARD_ORDER 插入） ── */
  function ensureCard(id) {
    let el = document.getElementById("card-" + id);
    if (el) { el.querySelector(".time").textContent = now(); return el; }
    const [n, title, titleEn] = CARD_META[id];
    el = document.createElement("div");
    el.className = "dcard"; el.id = "card-" + id;
    el.innerHTML = `<div class="dh"><span class="t">${n ? `<span class="n">${n}</span>` : ""}${en() ? titleEn : title}</span><span class="time">${now()}</span></div><div class="db"></div>`;
    const myIdx = CARD_ORDER.indexOf(id);
    let before = null;
    for (const other of CARD_ORDER.slice(myIdx + 1)) {
      const ex = document.getElementById("card-" + other);
      if (ex) { before = ex; break; }
    }
    cardsEl.insertBefore(el, before);
    cardsEl.querySelector("div[style]")?.remove();
    if (document.body.classList.contains("drawer-open")) {
      try { el.scrollIntoView({ block: "nearest" }); } catch (e) {}
    }
    return el;
  }
  const body = id => ensureCard(id).querySelector(".db");
  function flash(id) {
    const el = ensureCard(id);
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }

  /* ══ 01 情绪与处理方式 ══
     徽标=本条实时档位；处理方式表=会话峰值档位（升档保持，平静后不降级） */
  function renderEmotion(text, emo) {
    const e = en();
    const badgeSt = E.strategyOf(emo.level);
    const st = E.strategyOf(state.maxLevel);
    const g = s => e ? s.nameEn : s.name;
    const fval = (s, k) => e ? s[k + "En"] : s[k];
    const changed = k => state.prevStrategy && fval(state.prevStrategy, k) !== fval(st, k) ? "changed" : "";
    if (emo.level !== state.curLevel) {
      state.levelLog.push(`<b>${g(E.strategyOf(state.curLevel))} → ${g(badgeSt)}</b>${emo.signals.length ? (e ? ", risk signal matched" : "，命中风险信号") : ""}`);
    }
    state.curLevel = emo.level; state.prevStrategy = st;

    const sigs = emo.signals.length
      ? emo.signals.map(s => `<span class="tag">${esc(s)}</span>`).join("")
      : `<span class="none">${e ? "No escalation signal (review threat / social media / legal terms)" : "无升级信号（差评威胁 / 社媒 / 法律词）"}</span>`;
    const latch = state.maxLevel > emo.level
      ? `<div class="latch">${e
          ? `Handling locked at the session peak “${g(st)}”: it stays upgraded and never de-rates when the user calms down.`
          : `处理方式已锁定会话峰值「${g(st)}」：升档保持，用户平静后服务不降级。`}</div>` : "";
    const log = state.levelLog.slice(-4).map(l => `<div>${l}</div>`).join("");

    body("emotion").innerHTML = `
      <div class="emo-top">
        <span class="lv"><span class="d" style="background:${badgeSt.dot}"></span>${g(badgeSt)}</span>
        <span class="score-wrap"><span class="score">${e ? "Intensity" : "强度"} ${emo.score}</span><span class="int-track"><i style="width:${Math.min(emo.score, 10) * 10}%"></i></span></span>
      </div>
      <div class="sig-row">${sigs}</div>
      <div class="kv">
        <div class="r ${changed("priority")}"><span class="k">${e ? "Response priority" : "响应优先级"}</span><span class="v">${fval(st, "priority")}</span></div>
        <div class="r ${changed("comp")}"><span class="k">${e ? "Compensation" : "补偿建议"}</span><span class="v">${fval(st, "comp")}</span></div>
        <div class="r ${changed("escalate")}"><span class="k">${e ? "Human-handoff threshold" : "转人工阈值"}</span><span class="v">${fval(st, "escalate")}</span></div>
        <div class="r ${changed("pace")}"><span class="k">${e ? "Questioning pace" : "追问节奏"}</span><span class="v">${fval(st, "pace")}</span></div>
      </div>
      ${latch}
      <div class="lv-log">${log || `<div>${e ? "Level stable this session, no transition" : "本会话档位平稳，无跃迁"}</div>`}</div>`;
    flash("emotion"); markStep(0); notifyTrace();
  }

  /* ══ 02 看图与消歧 ══ */
  function renderDisambigStart() {
    const e = en();
    const d = state.pendingDisambig;
    if (d.textOnly) {
      // 纯文字提及同名组：两款平权并列，等一句话或一张照片
      const cands = d.candidates.map(p => {
        const pvis = e ? (p.visibleEn || p.visible) : p.visible;
        return `<div class="cand">
          <img class="cp" src="${p.img}" alt="${p.name}">
          <div style="flex:1;min-width:0;">
            <h4>${e ? (p.nameEn || p.name) : p.name}</h4>
            <div class="mt">${pvis.map(v => `<span class="hit">${v}</span>`).join(" ")}</div>
            <div class="conf-t">${e ? "One word or a photo settles it" : "一句话或一张照片即可确认"}</div>
          </div>
        </div>`;
      }).join("");
      body("disambig").innerHTML = `
        <div class="vis-chips"><span class="vc">${e ? "User mentions “S1 Pro”, no photo yet" : "用户提到「S1 Pro」，暂无照片"}</span></div>
        ${cands}
        <div class="ask">${e ? "Same-name pair — one question decides which one, then the flow continues" : "同名两款——问清是哪台，再继续流程"}</div>`;
    } else {
      const matchOf = p => p.visible.reduce((n, v) => n + (d.photo.visible.includes(v) ? 1 : 0), 0);
      const photoVis = e ? d.photo.visibleEn : d.photo.visible;
      const cands = d.candidates.map((p, i) => {
        const m = matchOf(p);
        const pvis = e ? p.visibleEn : p.visible;
        const hits = p.visible.map((v, vi) => {
          const on = d.photo.visible.includes(v);
          const label = pvis[vi] || v;
          return on ? `<span class="hit">${label}</span>` : `<span class="miss">${label}</span>`;
        }).join(" ");
        const conf = i === 0 ? Math.min(78, 52 + m * 7) : Math.min(30, 10 + m * 6);
        return `<div class="cand ${i === 0 ? "" : "off"}">
          <img class="cp" src="${p.img}" alt="${p.name}">
          <div style="flex:1;min-width:0;">
            <h4>${e ? (p.nameEn || p.name) : p.name}</h4>
            <div class="mt">${hits}</div>
            <div class="conf"><i style="width:${conf}%"></i></div>
            <div class="conf-t">${e ? "Confidence" : "置信度"} ${conf}%${i === 0 ? (e ? ", too close to skip asking" : "，太接近，不能不问") : ""}</div>
          </div>
        </div>`;
      }).join("");
      const keyQ = e ? (d.candidates[0].keyQuestionEn || d.keyQuestion) : d.keyQuestion;
      body("disambig").innerHTML = `
        <div class="vis-chips">${photoVis.map(v => `<span class="vc">${v}</span>`).join("")}</div>
        ${cands}
        <div class="ask">${e
          ? `The two look close — one question about usage:<br>“${keyQ}”`
          : `两款太接近，问一句用途：<br>「${keyQ}」`}</div>`;
    }
    flash("disambig"); markStep(1); notifyTrace();
  }
  function renderDisambigResolved(product, photo) {
    const e = en();
    const pname = e ? (product.nameEn || product.name) : product.name;
    if (!document.getElementById("card-disambig") && photo) {
      const vis = e ? photo.visibleEn : photo.visible;
      body("disambig").innerHTML = `
        <div class="vis-chips">${vis.map(v => `<span class="vc">${v}</span>`).join("")}</div>
        <div class="mini-concl ok">${e ? "Identified" : "已识别"}：${pname}，${e ? "routing to its flow" : "进入对应处理流程"}（${product.kbId}）</div>`;
    } else {
      const el = ensureCard("disambig");
      el.querySelectorAll(".cand,.ask").forEach(x => x.remove());
      el.querySelector(".db").insertAdjacentHTML("beforeend",
        `<div class="mini-concl ok">${e ? "Confirmed" : "已确认"}：${pname}，${e ? "routing to its flow" : "进入对应处理流程"}（${product.kbId}）</div>`);
    }
    flash("disambig"); markStep(1); notifyTrace();
  }

  /* ══ 03 订单与质保 ══ */
  function renderWarranty(w) {
    const e = en(), inW = w.inWarranty, au = w.authorized, dd = daysOf(w.order);
    let concl;
    if (inW && au) concl = `<div class="concl ok vh">${e ? `In warranty · authorized channel, eligible via ${w.sellerHit.id}: ${w.sellerHit.pathEn}` : `在保 · 授权渠道，可走 ${w.sellerHit.id}：${w.sellerHit.path}`}</div>`;
    else if (inW && !au) concl = `<div class="concl warn vh">${e ? "In warranty · unauthorized channel, redirect to the selling retailer [KB-044]" : "在保 · 非授权渠道，引导联系销售商家 [KB-044]"}</div>`;
    else if (!inW && au) concl = `<div class="concl warn vh">${e ? "Out of warranty · authorized channel, paid repair / replacement discount [KB-051]" : "已超保 · 授权渠道，可付费维修 / 换新折扣 [KB-051]"}</div>`;
    else concl = `<div class="concl bad vh">${e ? "Out of warranty · unauthorized channel, warranty sits with the retailer; Anker can do paid inspection [KB-044/051]" : "已超保 · 非授权渠道，质保由销售商家承担；安克可付费检测 [KB-044/051]"}</div>`;
    const L = e ? ["Order", "Product", "Purchased", "Warranty ends", "Country", "Seller"]
                : ["订单号", "产品", "购买日期", "质保到期", "国家", "卖家"];
    const endText = inW ? (e ? `In warranty · ~${dd} days left` : `在保，剩余约 ${dd} 天`)
                        : (e ? `Out of warranty · ${dd} days past end` : `已超保，过期 ${dd} 天`);
    const sku = e ? (w.order.skuEn || w.order.sku) : w.order.sku;
    body("warranty").innerHTML = `
      ${concl}
      <div class="ev"><span class="k">${L[0]}</span><span class="v">${w.order.orderId}</span></div>
      <div class="ev"><span class="k">${L[1]}</span><span class="v">${sku}</span></div>
      <div class="ev"><span class="k">${L[2]}</span><span class="v">${w.order.purchaseDate}</span></div>
      <div class="ev"><span class="k">${L[3]}</span><span class="v ${inW ? "ok" : "bad"}">${w.order.warrantyEnd} · ${endText}</span></div>
      <div class="ev"><span class="k">${L[4]}</span><span class="v">${w.order.country}</span></div>
      <div class="ev"><span class="k">${L[5]}</span><span class="v ${au ? "ok" : "bad"}">${w.order.seller}</span></div>
      <div class="rule">${e
        ? `Rules: exact country match + fuzzy seller match<br>① country “${w.order.country}” exact match<br>② seller “${w.order.seller}” fuzzy match → ${au ? w.sellerHit.id + " · authorized" : "not found · unauthorized"}`
        : `判定规则：country 精准匹配 + seller 模糊匹配<br>① ${w.trace[0]}<br>② ${w.trace[1]}`}</div>`;
    flash("warranty"); markStep(2); notifyTrace();
    if (!inW || !au) renderHonesty(e
      ? "When the result is unfavorable, state the boundary honestly — never invent benefits we can offer."
      : "判定结果不利时如实告知边界，不编造可承诺的权益。");
  }

  /* ══ 物流查询（引用订单物流字段，不属于六步主链） ══ */
  function renderLogistics(order) {
    const e = en();
    const L = e ? ["Carrier", "Tracking", "Status", "Shipped"] : ["承运商", "运单号", "状态", "发货日期"];
    const st = e ? (order.status === "运输中" ? "In transit" : "Delivered") : order.status;
    body("logistics").innerHTML = `
      <div class="ev"><span class="k">${L[0]}</span><span class="v">${order.carrier}</span></div>
      <div class="ev"><span class="k">${L[1]}</span><span class="v">${order.tracking}</span></div>
      <div class="ev"><span class="k">${L[2]}</span><span class="v ${order.status === "已签收" ? "ok" : ""}">${st}</span></div>
      <div class="ev"><span class="k">${L[3]}</span><span class="v">${order.shipDate}</span></div>
      <div class="concl ok">${e ? `All fields cited from order ${order.orderId} — nothing invented` : `以上逐项引用订单 ${order.orderId} 物流字段，无编造`}</div>`;
    flash("logistics"); notifyTrace();
  }

  /* ══ 04 知识库检索 ══ */
  function renderRetrieval(query, hits) {
    const e = en();
    let inner;
    if (hits.length) {
      inner = hits.map(h => {
        const title = e ? (h.doc.titleEn || h.doc.title) : h.doc.title;
        const steps = e ? (h.doc.stepsEn || h.doc.steps) : h.doc.steps;
        return `<div class="kb-hit"><span class="id">${h.doc.id}</span><h4>${title}</h4><ol>${steps.map(s => `<li>${s}</li>`).join("")}</ol></div>`;
      }).join("");
    } else {
      inner = `<div class="no-hit">${e
        ? "No matching entry found — honestly escalate to a human (summary attached), no made-up answer."
        : "未检索到匹配条目，诚实升级人工（已附对话摘要），不编造答案。"}</div>`;
    }
    const q = esc(query.slice(0, 38));
    body("retrieval").innerHTML =
      `<div class="query-line">${e
        ? `Query “${q}${query.length > 38 ? "…" : ""}” · ${hits.length} hit(s)`
        : `查询「${q}${query.length > 38 ? "…" : ""}」· 命中 ${hits.length} 条`}</div>${inner}`;
    flash("retrieval"); markStep(3); notifyTrace();
    if (!hits.length) renderHonesty(e
      ? "When no evidence is retrieved, don't produce answer-looking content — hand off with a summary."
      : "检索不到依据时，不生成看似答案的内容，转人工并移交摘要。");
  }

  /* ── 诚实边界 ── */
  function renderHonesty(note) {
    body("honesty").innerHTML = `<div class="honesty"><b>${en() ? "Hallucination guard" : "幻觉防护"}</b>：${note}</div>`;
    notifyTrace();
  }

  /* ══ 05 换货 / 退款确认 ══ */
  function openGate(draftDef, out) {
    const order = state.order, e = en();
    const L = e
      ? { banner: "Important actions require human confirmation — AI prepares, never executes", type: "Type", product: "Product", reason: "Reason", evidence: "Evidence", advice: "Advice", comp: "Compensation", ok: "Confirm & create ticket", no: "Reject · to human" }
      : { banner: "重要动作必须由人确认 —— AI 只备好一切，不自动执行", type: "类型", product: "产品", reason: "原因", evidence: "证据", advice: "建议", comp: "补偿建议", ok: "人工确认 · 创建工单", no: "驳回 · 转人工" };
    const wantRefund = out && out.intents && out.intents.includes("退款") && !out.intents.includes("换货");
    const d0 = {
      type: wantRefund ? (e ? "Refund" : "退款") : (e ? "Replacement" : "换货"),
      reason: state.product ? `${e ? (state.product.nameEn || state.product.name) : state.product.name} ${e ? "fault" : "故障"}` : (e ? "User request" : "用户申请"),
      evidence: order ? `${e ? "Order" : "订单"} ${order.orderId}` : (e ? "Order verification pending" : "待补订单核实"),
      advice: e ? "Per warranty policy" : "按质保政策处理",
      comp: e ? "Per current level" : "按当前档位权限"
    };
    const gv = k => e ? (draftDef && draftDef[k + "En"] ? draftDef[k + "En"] : d0[k]) : d0[k];
    const prod = order ? (e ? (order.skuEn || order.sku) : order.sku)
                       : (state.product ? (e ? (state.product.nameEn || state.product.name) : state.product.name) : "—");
    state.gateOpen = true;
    const row = (k, v) => `<div class="draft"><span class="k">${k}</span><span>${v}</span></div>`;
    ensureCard("gate");
    body("gate").innerHTML = `
      <div class="gate-banner">${L.banner}</div>
      <div class="gate-inner">
        ${row(L.type, gv("type"))}${row(L.product, prod)}
        ${row(L.reason, gv("reason"))}${row(L.evidence, gv("evidence"))}
        ${row(L.advice, gv("advice"))}${row(L.comp, gv("comp"))}
        <div class="gate-actions">
          <button class="btn-ok">${L.ok}</button>
          <button class="btn-no">${L.no}</button>
        </div>
      </div>`;
    $("#card-gate").querySelector(".btn-ok").onclick = () => resolveGate(true, draftDef);
    $("#card-gate").querySelector(".btn-no").onclick = () => resolveGate(false, draftDef);
    flash("gate"); markStep(4); notifyTrace();
    // 人工确认是关键节点：首次出现自动展开「处理过程」，用户关闭后不再强拉
    if (!state.gateAutoOpened && !document.body.classList.contains("drawer-open")) {
      state.gateAutoOpened = true;
      openDrawer();
    }
  }
  async function resolveGate(ok, draftDef) {
    if (!state.gateOpen) return;
    state.gateOpen = false;
    const e = en();
    const el = ensureCard("gate");
    el.querySelector(".gate-actions").remove();
    const tk = newTK();
    const stamp = document.createElement("div");
    stamp.className = "stamp" + (ok ? "" : " reject");
    if (ok) {
      const note = (draftDef && draftDef.confirmNote) || (e ? "Ticket created · {TK}" : "工单已创建 · {TK}");
      stamp.innerHTML = note.replace("{TK}", tk).replace(/\n/g, "<br>");
    } else {
      stamp.innerHTML = e ? "Rejected · routed to human (summary handed over)" : "已驳回 · 转人工（AI 摘要已移交）";
    }
    el.querySelector(".gate-inner").appendChild(stamp);
    await sleep(450);
    let reply;
    if (ok) reply = (draftDef && draftDef.confirmReply) || (e ? "Ticket created, I'll keep you updated." : "工单已创建，稍后同步进展。");
    else reply = e
      ? "This has been handed to a human agent with the full summary and evidence — no need to repeat yourself."
      : "本单已转人工，AI 已把摘要和全部证据移交，无需你重复描述。";
    agentSay(reply);
    showSatisfaction();
  }

  /* ══ 06 满意度 · 净 NSS ══ */
  function showSatisfaction() {
    if (document.getElementById("card-satisfaction")) return;
    markStep(5);
    const e = en();
    ensureCard("satisfaction");
    body("satisfaction").innerHTML = `
      <div class="nss-q">${e
        ? "How was this service? <span class='nss-note'>(Net Satisfaction Score)</span>"
        : "这次的服务体验怎么样？<span class='nss-note'>（净满意度 NSS）</span>"}</div>
      <div class="nss-opts">
        <button data-v="pos">${e ? "Satisfied" : "满意"}</button>
        <button data-v="neu">${e ? "Neutral" : "一般"}</button>
        <button data-v="neg">${e ? "Dissatisfied" : "不满意"}</button>
      </div>
      <div class="nss-res"></div>`;
    const btns = $("#card-satisfaction").querySelectorAll(".nss-opts button");
    btns.forEach(b => b.onclick = () => {
      btns.forEach(x => x.classList.remove("on")); b.classList.add("on");
      const v = b.dataset.v;
      const nss = v === "pos" ? 63 : v === "neu" ? 60 : 56;
      $("#card-satisfaction").querySelector(".nss-res").innerHTML = e
        ? `Recorded · simulated net NSS <span class="mono">${nss}%</span>, reported`
        : `已记录（${v === "pos" ? "+1 正分" : v === "neu" ? "不计正分" : "−1 负分"}）· 当前模拟净 NSS <span class="mono">${nss}%</span>，已上报`;
      $("#card-satisfaction")._done = true;
    });
    notifyTrace();
  }

  /* ── Agent 回复 ── */
  async function agentSay(text, engineOut, guard) {
    let final = text;
    if (state.mode === "llm") {
      try { final = await window.LLM.reply(state, engineOut, state.history); }
      catch (e) { toast("LLM 调用失败，已回退规则回复：" + e.message); }
    }
    if (guard && !guard()) return false;
    state.history.push({ role: "assistant", content: final });
    const stop = typing();
    await sleep(Math.min(850, 320 + final.length * 3));
    stop();
    if (guard && !guard()) return false;
    addMsg("agent", mdLite(final));
    return true;
  }

  /* ── 自由输入回复 ──
     收尾类（已解决/寒暄）→ 明确意图（物流/查无订单/政策）→ 消歧提问；
     实质处理（换退/质保/排障）前拼接「照片识别前缀 + 情绪前缀」，照片不再吞掉用户诉求。 */
  function freeReply(out, photo) {
    const e = en();
    if (out.intents.includes("已解决") && state.history.some(m => m.role === "assistant")) {
      return e ? "Glad it's sorted! If anything else comes up, just come back.\nMind rating this service before you go?"
               : "太好了，解决就是硬道理。后续有问题随时回来找我。\n走之前方便给这次服务打个分吗？";
    }
    if (out.intents.includes("寒暄")) {
      return /谢|感|thank/i.test(state.history[state.history.length - 1]?.content || "")
        ? (e ? "You're welcome! Come back anytime." : "不客气，有进展随时回来找我。")
        : (e ? "Hi! Tell me what's going on, or send an order number / a photo." : "你好！说说遇到的情况，或直接发订单号 / 照片。");
    }
    if (out.intents.includes("物流") || out.orderNotFound) {
      if (out.orderNotFound) return e
        ? `I couldn't find order **${out.orderNotFound}** — could you double-check the number? It looks like ORD-88291.`
        : `没查到订单 **${out.orderNotFound}**，麻烦核对一下号码（格式如 ORD-88291）。`;
      const order = state.order;
      if (order) return e
        ? `Order **${order.orderId}**: shipped ${order.shipDate} via ${order.carrier}, tracking ${order.tracking} — currently **${order.status === "运输中" ? "in transit" : "delivered"}**.`
        : `订单 **${order.orderId}**：${order.shipDate} 由 ${order.carrier} 发出，运单号 ${order.tracking}，当前状态「**${order.status}**」。`;
      return e ? "Send me your order number and I'll pull the latest tracking right away."
               : "把订单号发我，马上帮你查最新物流。";
    }
    if (out.intents.includes("保修政策")) {
      return e ? `Most products carry a **12–24 month** warranty (varies by category); the exact dates follow the order record [KB-060].\nSend me the order number and I'll check this unit's end date.`
               : `多数产品整机保修 **12–24 个月**（品类有别），具体起算与到期以订单记录为准 [KB-060]。\n把订单号发我，我帮你查这台的到期日。`;
    }
    if (out.disambigStarted) {
      const d = state.pendingDisambig;
      if (d && d.textOnly) {
        return e ? "The S1 Pro comes in two versions — a robot vacuum and a breast pump. Which one is yours?\nTell me in a word, or send a photo and I'll tell them apart myself."
                 : "S1 Pro 有两款——扫地机器人和吸奶器，名字一样。你的是哪台？\n说一句，或者发张照片，我马上认出来。";
      }
      const kq = e ? (d.candidates[0].keyQuestionEn || d.keyQuestion) : d.keyQuestion;
      return e ? `Got the photo, but the two look close — one question: ${kq}`
               : `照片看到了，但两款太接近，问一句：${kq}`;
    }
    /* 实质处理段：情绪档位联动（会话峰值≥不满先接一句情绪再办事）+ 照片识别前缀 */
    const pname = out.disambigResolved ? (e ? (out.disambigResolved.nameEn || out.disambigResolved.name) : out.disambigResolved.name) : "";
    const idLead = (photo && out.disambigResolved)
      ? (e ? `Got the photo — this is the ${pname}. ` : `照片看到了——${pname}。`)
      : "";
    const empath = state.maxLevel >= 3
      ? (e ? "I'm really sorry it came to this — I'm on it right now. " : "让你这么上火，实在抱歉，我优先来处理。\n")
      : state.maxLevel === 2
        ? (e ? "Sorry for the trouble — let me sort this out right away. " : "抱歉给你添了麻烦，我马上处理。\n")
        : "";
    if (out.needGate && state.order)
      return empath + idLead + (e ? "Understood — I'm preparing the ticket details. Important actions require human confirmation (see the process panel)."
                                  : "你的要求我理解了，工单信息正在备好——重要动作需人工确认（见处理过程）。");
    if (out.needGate)
      return empath + idLead + (e ? "A replacement / refund needs order verification first — send your order number or SN, then we move to human confirmation."
                                  : "换货 / 退款需要先核实订单，把订单号或 SN 发我，再进入人工确认。");
    if (out.warranty) {
      const w = out.warranty, dd = daysOf(w.order);
      if (e) {
        const wt = w.inWarranty ? `In warranty, ~${dd} days left` : `Out of warranty, ${dd} days past end`;
        const ch = w.authorized ? `Authorized channel — eligible for ${w.sellerHit.pathEn}`
                                : "Unauthorized channel — warranty sits with the selling retailer [KB-044]";
        let sug = "";
        if (out.kbHits.length) { const h = out.kbHits[0]; sug = "\nSuggested: " + (h.doc.stepsEn || h.doc.steps).slice(0, 3).join("; ") + ` [${h.doc.id}]`; }
        return `${empath}${idLead}Order verification:\n· ${wt}\n· ${ch}${sug}`;
      }
      return `${empath}${idLead}订单核实结果：\n· ${w.warrantyText}\n· ${w.authorized ? "授权渠道，可走 " + w.sellerHit.path : "非授权渠道，质保由销售商家承担 [KB-044]"}\n${out.kbHits.length ? "建议：" + out.kbHits[0].doc.steps.slice(0, 3).join("；") + ` [${out.kbHits[0].doc.id}]` : ""}`;
    }
    if (out.kbHits.length) {
      const h = out.kbHits[0];
      if (e) {
        const steps = h.doc.stepsEn || h.doc.steps;
        return `${empath}${idLead}Let's troubleshoot per our knowledge base [${h.doc.id}]:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\nIf it still fails, send me your order number and I'll check the warranty.`;
      }
      return `${empath}${idLead}按知识库为你排查 [${h.doc.id}]:\n${h.doc.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n仍无法解决就把订单号发我核质保。`;
    }
    if (state.pendingDisambig)
      return e ? "To route this correctly, please confirm the key question above first."
               : "为了不走错流程，先确认一下上面那个关键现象。";
    if (idLead)
      return idLead + (e ? "What's going wrong with it?" : "它出了什么状况？");
    return e ? "I need a bit more: describe the issue, or send your order number / a product photo, and I'll check right away."
             : "我需要更多信息：描述一下具体现象，或发订单号 / 产品照片，我马上核实。";
  }

  /* ── 发送一条消息 ── */
  async function send(text, photoId) {
    if (state.sending) return;
    if (!text && !photoId) return;
    state.sending = true; setSending(true);
    const myEpoch = state.epoch; // 会话代际：切换剧本/新对话后，进行中的旧发送立即失效
    const alive = () => state.epoch === myEpoch;
    try {
      const photo = photoId ? D.photos.find(p => p.id === photoId) : null;
      removeWelcome();
      addMsg("user", renderCites(text), photo);
      state.history.push({ role: "user", content: text });
      inputEl.value = ""; detachPhoto();

      // 自由对话 / 偏离剧本：按文字自动判语言（海外用户发英文即英文回复）
      if (!state.scenario || state.scenario === "free" || state.derailed) {
        const dl = detectLang(text);
        if (dl && dl !== state.curLang) setLang(dl);
      }

      await sleep(260);
      if (!alive()) return;
      const out = E.processTurn(state, { text, photoId });
      if (out.warranty) state.lastWarranty = out.warranty;
      let turn = scriptedTurn();
      // 现场若改动预填台词 / 照片（偏离剧本），平滑切到自由对话，避免固定回复与引擎实时判定打架
      if (turn && !state.derailed) {
        if (text.trim() !== (turn.user || "").trim() || (photoId || null) !== (turn.photo || null)) {
          state.derailed = true;
          scriptHint(en()
            ? "You changed the preset line — switched to free chat; replies are generated in real time."
            : "你改动了预置台词，已切换为自由对话，后续回复由引擎实时生成。");
        }
      }
      if (state.derailed) turn = null;

      renderEmotion(text, out.emotion);
      if (out.disambigStarted) renderDisambigStart();
      if (out.disambigResolved) renderDisambigResolved(out.disambigResolved, photo);
      if (out.warranty) renderWarranty(out.warranty);
      if (out.intents.includes("物流") && state.order) renderLogistics(state.order);
      if (out.kbHits.length) renderRetrieval(text, out.kbHits);
      // 寒暄/政策/查无订单/消歧等有明确去向的回合，不渲染"检索不到→升级人工"空卡
      else if (!turn && (text || photo) && !out.intents.length && !out.disambigStarted && !out.disambigResolved && !out.orderNotFound)
        renderRetrieval(text || (en() ? (photo.labelEn || photo.label) : photo.label), out.kbHits);

      let replyText = null, gateDef = null;
      if (turn) {
        replyText = turn.reply;
        if (turn.gate) gateDef = { ...turn.gate, confirmNote: turn.confirmNote, confirmReply: turn.confirmReply };
      } else {
        replyText = freeReply(out, photo);
      }
      if (gateDef || (out.needGate && state.order)) openGate(gateDef, out);
      else if (out.needGate && !state.order) renderHonesty(en()
        ? "Verify the order before a replacement / refund, then human confirmation — no skipping steps."
        : "换货 / 退款先完成订单核实，再进入人工确认，不跳步。");
      await agentSay(replyText, out, alive);
      if (!alive()) return;

      if (turn) advanceScript();
      else if (!state.gateOpen && !state.pendingDisambig && (out.intents.includes("已解决") || ((out.warranty || out.kbHits.length) && state.history.length >= 4))) showSatisfaction();
    } finally {
      state.sending = false; setSending(false);
    }
  }

  /* ── 剧本机制 ── */
  function scriptedTurn() {
    if (!state.scenario || state.scenario === "free") return null;
    const sc = D.scenarios[state.scenario];
    return state.idx < sc.turns.length ? sc.turns[state.idx] : null;
  }
  function advanceScript() {
    const sc = D.scenarios[state.scenario];
    if (!sc) return;
    state.idx++;
    if (state.idx < sc.turns.length) prefillTurn(sc.turns[state.idx]);
    else {
      scriptHint(en() ? "Scenario finished — switch scenarios or continue typing."
                      : "场景已完结，可切换其他场景，或自由输入继续。");
      // 无确认门的 B/C：走完即收满意度（对话里已说"打个分"，卡片必须出现）
      if (!state.gateOpen) showSatisfaction();
    }
  }
  function prefillTurn(turn) {
    inputEl.value = turn.user;
    if (turn.photo) attachPhoto(turn.photo);
    scriptHint(en()
      ? (turn.photo ? "Next line ready (photo + text filled), just press send." : "Next line ready (text filled), just press send.")
      : (turn.photo ? "下一句已就绪（含照片 + 文字已填入），直接点发送即可。" : "下一句已就绪（文字已填入），直接点发送即可。"));
  }
  function scriptHint(t) {
    scriptHintEl.innerHTML = t; scriptHintEl.classList.remove("hidden");
  }
  function loadScenario(id) {
    document.querySelectorAll(".scn").forEach(b => b.classList.toggle("active", b.dataset.scn === id));
    resetAll(false);
    state.scenario = id;
    if (id === "free") {
      setLang("zh");
      scriptHint("自由输入：订单号（如 ORD-88291）、产品问题、情绪表达、英文消息都会被真实处理（发英文会自动用英文回复）。");
      removeWelcome(); return;
    }
    const sc = D.scenarios[id];
    setLang(sc.lang || "zh");
    scriptHint(sc.lang ? `Scenario ${id} · ${sc.title}: ${sc.hint}` : `场景 ${id} · ${sc.title}：${sc.hint}`);
    prefillTurn(sc.turns[0]);
  }

  function drawerHint() {
    cardsEl.innerHTML = `<div style="color:var(--text-3);font-size:12px;text-align:center;margin-top:40px;line-height:2;">${en()
      ? "Every step's execution record and evidence lands here.<br>Send a message to start."
      : "每一步的执行记录和依据，都会在这里。<br>先发条消息试试。"}</div>`;
  }
  function welcomeHTML() {
    return '<div class="welcome" id="welcome"><div class="wl"><h2>说说看，出了什么状况？<br>发张照片也行，我来接。</h2><p>我会先接住情绪、问清情况，再核对质保与渠道，能办的当场办，换货退款这类重要动作会请人工确认。</p><div class="welcome-scn"><button data-scn="A"><span class="t">愤怒客诉 · 换货</span></button><button data-scn="B"><span class="t">S1 Pro · 分清哪台</span></button><button data-scn="C"><span class="t">非授权 · 超保</span></button><button data-scn="D"><span class="t">English · 语言跟随</span></button></div><div class="quick-row"><span class="qlabel">试试：</span><button class="qchip" data-q="充电器发烫了怎么办">充电器发烫了怎么办</button><button class="qchip" data-q="我的订单 ORD-44107 到哪了？">查物流</button><button class="qchip" data-q="S1 Pro 保修多久？">保修政策</button></div></div><div class="hero-img"><img src="assets/img/vacuum.jpg" alt=""><div class="hero-cap">eufy S1 Pro（官方渠道图片）</div></div></div>';
  }
  function resetAll(toWelcome = true) {
    Object.assign(state, {
      scenario: null, curLang: "zh", idx: 0, order: null, product: null,
      curLevel: 0, maxLevel: 0, levelLog: [], prevStrategy: null,
      pendingPhoto: null, history: [], gateOpen: false, derailed: false,
      sending: false, traceNotified: false, stepDone: new Set(),
      epoch: state.epoch + 1, lastWarranty: null, gateAutoOpened: false
    });
    state.pendingDisambig = null;
    msgsEl.innerHTML = toWelcome ? welcomeHTML() : "";
    document.body.classList.toggle("chatting", !toWelcome);
    bindWelcome();
    setLang("zh");
    drawerHint();
    stepsEl.querySelectorAll(".s").forEach(s => s.className = "s");
    scriptHintEl.classList.add("hidden");
    inputEl.value = "";
    detachPhoto();
    closeDrawer();
    $("#btnTrace").querySelector(".badge")?.remove();
  }

  /* ── 照片 ── */
  function attachPhoto(id) {
    state.pendingPhoto = id;
    const p = D.photos.find(x => x.id === id);
    const lbl = en() ? (p.labelEn || p.label) : p.label;
    photoChipEl.innerHTML = `<img src="${p.img}" alt=""><span style="font-size:12px;color:var(--text-2)">${lbl}</span><span class="x">✕</span>`;
    photoChipEl.classList.remove("hidden");
    photoChipEl.querySelector(".x").onclick = detachPhoto;
  }
  function detachPhoto() {
    state.pendingPhoto = null;
    photoChipEl.classList.add("hidden"); photoChipEl.innerHTML = "";
  }
  function buildPhotoPicker() {
    const pk = $("#photoPicker");
    pk.innerHTML = D.photos.map(p => {
      const lbl = en() ? (p.labelEn || p.label) : p.label;
      return `<div class="opt" data-id="${p.id}"><img src="${p.img}" alt="">${lbl}</div>`;
    }).join("");
    pk.querySelectorAll(".opt").forEach(o => o.onclick = () => { attachPhoto(o.dataset.id); pk.classList.add("hidden"); });
  }

  /* ── 抽屉开关 ── */
  function openDrawer() { document.body.classList.add("drawer-open"); $("#btnTrace").querySelector(".badge")?.remove(); }
  function closeDrawer() { document.body.classList.remove("drawer-open"); }
  function notifyTrace() {
    if (!state.traceNotified && !document.body.classList.contains("drawer-open")) {
      state.traceNotified = true;
      const b = document.createElement("span"); b.className = "badge"; b.textContent = "·";
      $("#btnTrace").appendChild(b);
    }
  }

  /* ── 语言切换（同步静态 UI） ── */
  function setLang(lang) {
    state.curLang = lang;
    const e = en();
    const lbZh = ["情绪", "消歧", "质保", "检索", "确认", "满意度"];
    const lbEn = ["Emotion", "Disambig", "Warranty", "Retrieval", "Confirm", "NSS"];
    stepsEl.querySelectorAll(".lb").forEach((lb, i) => lb.textContent = (e ? lbEn : lbZh)[i]);
    $("#drawer").querySelector("h3").textContent = e ? "Process" : "处理过程";
    $("#drawer").querySelector(".sub").textContent = e ? "Execution records & evidence, not internal thoughts" : "展示执行记录与依据，不展示内部思考";
    inputEl.placeholder = e ? "Describe the issue, attach a photo…" : "描述问题，可附上照片…";
    buildPhotoPicker();
    if (state.pendingPhoto) attachPhoto(state.pendingPhoto);
  }

  /* ── 发送按钮禁用态 ── */
  function setSending(on) {
    const b = $("#btnSend");
    b.disabled = on; b.classList.toggle("disabled", on);
  }

  /* ── 模式 / 设置 ── */
  function setMode(m) {
    if (m === "llm" && !window.LLM.cfg().key) {
      openSettings();
      toast("LLM 模式需先配置 Key，当前保持规则演示");
      return; // 未配置 Key 前不切换，按钮状态不骗人
    }
    state.mode = m;
    $("#modeRule").classList.toggle("active", m === "rule");
    $("#modeLlm").classList.toggle("active", m === "llm");
  }
  function openSettings() {
    const c = window.LLM.cfg();
    $("#cfgEndpoint").value = c.endpoint; $("#cfgKey").value = c.key; $("#cfgModel").value = c.model;
    $("#settingsModal").classList.remove("hidden");
  }

  function bindWelcome() {
    document.querySelectorAll(".welcome-scn button").forEach(b => b.onclick = () => loadScenario(b.dataset.scn));
    document.querySelectorAll(".qchip").forEach(b => b.onclick = () => { removeWelcome(); send(b.dataset.q, null); });
  }

  /* ── 事件 ── */
  $("#btnSend").onclick = () => send(inputEl.value.trim(), state.pendingPhoto);
  inputEl.addEventListener("keydown", e => {
    if (e.isComposing || e.keyCode === 229) return; // 中文输入法选词的 Enter 不发送
    if (e.key === "Enter" && !state.sending) $("#btnSend").click();
  });
  document.querySelectorAll(".scn").forEach(b => b.onclick = () => loadScenario(b.dataset.scn));
  $("#btnPhoto").onclick = () => $("#photoPicker").classList.toggle("hidden");
  $("#modeRule").onclick = () => setMode("rule");
  $("#modeLlm").onclick = () => setMode("llm");
  $("#btnNew").onclick = () => resetAll(true);
  $("#btnTrace").onclick = openDrawer;
  $("#drawerClose").onclick = closeDrawer;
  $("#drawerScrim").onclick = closeDrawer;
  $("#btnSettings").onclick = openSettings;
  $("#cfgCancel").onclick = () => $("#settingsModal").classList.add("hidden");
  $("#cfgSave").onclick = () => {
    window.LLM.saveCfg({
      endpoint: $("#cfgEndpoint").value.trim() || "https://api.deepseek.com/v1",
      key: $("#cfgKey").value.trim(),
      model: $("#cfgModel").value.trim() || "deepseek-chat"
    });
    $("#settingsModal").classList.add("hidden"); toast("已保存（仅存本机）");
  };
  $("#btnHelp").onclick = () => $("#helpModal").classList.remove("hidden");
  $("#helpClose").onclick = () => $("#helpModal").classList.add("hidden");
  [$("#settingsModal"), $("#helpModal")].forEach(m => m.addEventListener("click", e => { if (e.target === m) m.classList.add("hidden"); }));

  bindWelcome();
  buildPhotoPicker();
})();
