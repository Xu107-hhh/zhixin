/* ════════════════════════════════════════════════════════
   engine.js —— 规则引擎（纯逻辑，无 DOM）
   「处理过程」抽屉里的全部判定与依据，都由本引擎真实计算。
   LLM 模式下仅替换回复文案，判定与证据仍走本引擎，保证可复现。
   ════════════════════════════════════════════════════════ */
window.Engine = (() => {
  const D = window.DEMO_DATA;

  /* ── 情绪分档：词表打分 + 标点强度；命中风险信号可直升投诉风险 ──
     词表刻意收窄：易产生歧义的口语（如“挂了”）不作为风险词。 */
  const LEX = {
    angry: [
      "气死", "破质量", "什么破", "破东西", "破玩意", "垃圾", "废物", "受不了", "烦死", "搞什么", "失望透顶", "烂", "恶心", "退钱", "什么玩意", "吓人",
      "terrible", "horrible", "ridiculous", "unacceptable", "disgusting", "awful", "worst", "not okay", "outrageous"
    ],
    upset: [
      "不太满意", "有点问题", "怎么又", "奇怪", "不对劲", "无语", "不太行", "有问题",
      "disappointed", "not great", "not happy", "issue with", "wrong with"
    ],
    risk: [
      "投诉", "差评", "曝光", "推特", "微博", "挂你们", "律师", "法律", "起诉", "消协", "12315", "举报", "发网上",
      "bad review", "report you", "sue", "lawsuit", "lawyer", "social media", "expose", "ftc", "press"
    ]
  };

  /* 英文单词用整词边界匹配（"issue" 不再撞上 "sue"、"pressed" 不再撞上 "press"），中文与短语用包含 */
  const wordHit = (t, w) => /^[a-z]+$/.test(w) ? new RegExp("\\b" + w + "\\b").test(t) : t.includes(w);

  function analyzeEmotion(text) {
    const t = (text || "").toLowerCase();
    let score = 0;
    const signals = [];
    LEX.risk.forEach(w => { if (wordHit(t, w)) { score += 4; signals.push(w); } });
    LEX.angry.forEach(w => { if (wordHit(t, w)) score += 2; });
    LEX.upset.forEach(w => { if (wordHit(t, w)) score += 1; });
    score += Math.min((text.match(/[！!]/g) || []).length, 4) * 0.5;
    score += Math.min((text.match(/[？?]/g) || []).length, 3) * 0.3;
    const level = (signals.length > 0 || score >= 6) ? 3 : (score >= 3 ? 2 : (score >= 1 ? 1 : 0));
    return { score: Math.round(score * 10) / 10, level, signals: [...new Set(signals)] };
  }

  const strategyOf = level => D.strategy[level];

  /* ── 订单号提取 ── */
  function extractOrderRef(text) {
    const m = (text || "").match(/ORD-?\d{3,}/i);
    return m ? m[0].toUpperCase().replace(/^ORD(\d)/, "ORD-$1") : null;
  }

  /* ── 质保判定：在保 / 超保 + country 精准、seller 模糊 → 授权 / 非授权 ── */
  function judgeWarranty(order) {
    const today = new Date();
    const end = new Date(order.warrantyEnd + "T23:59:59");
    const inWarranty = today <= end;
    const days = Math.round(Math.abs(end - today) / 86400000);

    const countryHits = D.dealers.filter(d => d.country === order.country);
    const sellerHit = countryHits.find(d => order.seller.toLowerCase().includes(d.fuzzy));

    return {
      order, inWarranty,
      warrantyText: inWarranty
        ? `在保，剩余约 ${Math.round((end - today) / 86400000)} 天`
        : `已超保，过期 ${days} 天`,
      sellerHit: sellerHit || null,
      authorized: !!sellerHit,
      trace: [
        `country “${order.country}” 精准匹配 → 名录命中 ${countryHits.length} 条`,
        sellerHit
          ? `seller “${order.seller}” 模糊匹配 → 命中 ${sellerHit.id} · ${sellerHit.seller} → 授权渠道`
          : `seller “${order.seller}” 模糊匹配 → 名录未命中 → 非授权渠道`
      ]
    };
  }

  /* ── 知识库检索：关键词打分，命中才引用；检索不到由上层诚实升级 ── */
  function searchKB(text, productHint) {
    const t = (text || "").toLowerCase();
    const hits = [];
    D.kb.forEach(doc => {
      let s = 0; const matched = [];
      doc.tags.forEach(tag => { if (t.includes(tag.toLowerCase())) { s += 2; matched.push(tag); } });
      (doc.product || "").toLowerCase().split(/[\s/()（）]+/).forEach(p => { if (p.length > 2 && t.includes(p)) s += 1; });
      if (productHint && doc.id === productHint) s += 3;
      if (s > 0) hits.push({ doc, score: s, matched });
    });
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, 2);
  }

  /* ── 意图识别：换货 / 退款等重要动作 → 触发人工确认；物流 / 政策 / 寒暄 → 专属回复 ──
     寒暄用整句锚定（^…$），避免"你好，我的充电器坏了"这类带正事的句子被当成纯问候。 */
  function detectIntents(text) {
    const intents = [];
    if (/换货|换新|更换|换一个|\bexchange\b|\breplace/i.test(text)) intents.push("换货");
    if (/退款|退钱|退货|\brefund|\breturn\b/i.test(text)) intents.push("退款");
    if (/维修|检修|修理|\brepair\b/i.test(text)) intents.push("维修");
    if (/物流|快递|到哪了|到哪儿了|什么时候到|发货了吗|运单|签收|tracking|where.*(order|package|my)|delivery status/i.test(text)) intents.push("物流");
    if (/保修多久|保修政策|质保政策|保修期|保修时间|warranty/i.test(text)) intents.push("保修政策");
    if (/^(你好|您好|hi|hello|hey|谢谢|感谢|多谢|thanks?|thank you|ok|okay|好的|收到|嗯+)[!,.。~\s]*$/i.test(text.trim())) intents.push("寒暄");
    // 否定守卫：「还没解决 / 没修好 / 还是不行 / not fixed」不判为已解决
    const negResolved = /(还没?|没有|尚未|没|未)[^。.!？?]{0,4}(解决|修好|弄好|搞定|好|行|能用)/.test(text)
      || /(还是|仍然|依旧|still)\s*(不|没法|cannot)/i.test(text)
      || /\bnot\s+(?:solved|fixed|sorted|working)\b/i.test(text);
    if (!negResolved && /((搞定|解决|修好|弄好)了|好了[！!。，,]|不烫了|正常了|能用了|没事了|works\s+(?:now|fine|again)|\bsolved\b|\bfixed\b|\bsorted\b|all\s+good)/i.test(text)) intents.push("已解决");
    return intents;
  }

  /* ── 看图/识名：信息够就直接识别，不够才问 ──
     ① 照片特征压倒性（第一名命中远超第二名）→ 直接识别，不再追问
     ② 照片特征接近 → 待确认（问用途，不复述特征） */
  function startDisambig(photo) {
    if (photo.group) {
      const members = D.products.filter(p => p.model === photo.group);
      const score = p => p.visible.reduce((n, v) => n + (photo.visible.includes(v) ? 1 : 0), 0);
      members.sort((a, b) => score(b) - score(a));
      const top = score(members[0]), second = members[1] ? score(members[1]) : -1;
      if (top >= 2 && top - second >= 2) {
        return { photo, candidates: members, ambiguous: false, resolved: members[0], keyQuestion: null, pending: false };
      }
      return { photo, candidates: members, ambiguous: true, keyQuestion: members[0].keyQuestion, pending: true };
    }
    const p = D.products.find(x => x.model === photo.model);
    return { photo, candidates: p ? [p] : [], ambiguous: false, keyQuestion: null, pending: true };
  }

  /* 文字已含某款专属词（如“S1 Pro 吸奶器”）→ 直接识别，不问 */
  function resolveByTextGroup(text) {
    const grp = D.products.filter(p => p.model === "S1 Pro");
    if (grp.length < 2 || !/s1\s*pro/i.test(text || "")) return { candidates: grp, resolved: null, needAsk: false };
    const t = (text || "").toLowerCase();
    const has = words => words.some(w => t.includes(w.toLowerCase()));
    const in0 = has(grp[0].words), in1 = has(grp[1].words);
    if (in0 && !in1) return { candidates: grp, resolved: grp[0], needAsk: false };
    if (in1 && !in0) return { candidates: grp, resolved: grp[1], needAsk: false };
    if (!in0 && !in1) return { candidates: grp, resolved: null, needAsk: true };
    return { candidates: grp, resolved: null, needAsk: false };
  }

  /* 否定优先：问题始终指向 candidates[0]；否认即另一款。
     先按专属特征词判定，避免“不对”里的“对”造成反向误判。 */
  function resolveDisambig(state, userText) {
    const cands = state.candidates;
    if (!cands.length) return null;
    const t = userText || "";
    const has = words => words.some(w => t.toLowerCase().includes(w.toLowerCase()));
    const in0 = has(cands[0].words);
    const in1 = cands[1] ? has(cands[1].words) : false;
    const neg = /不对|不是|没有|并没|不会|不跑|不扫|别(?!的)?|\bno\b|\bnot\b|nope|incorrect/i.test(t);
    const affirm = /(^|[\s，。,.])(对|是的|对的|嗯|没错|correct|right|yes|yeah|yep)/i.test(t) || /^(对|是的|嗯|yes|yeah|yep|correct)/i.test(t);

    if (in1 && !in0) return cands[1];
    if (in0 && !in1) return cands[0];
    if (neg) return cands[1] || cands[0];
    if (affirm) return cands[0];
    return null;
  }

  /* ── 一条消息推进整条链路 ── */
  function processTurn(state, { text, photoId }) {
    const out = { emotion: null, orderRef: null, warranty: null, kbHits: [], intents: [], disambigStarted: false, disambigResolved: null, needGate: false, orderNotFound: null };

    out.emotion = analyzeEmotion(text);
    if (out.emotion.level > state.maxLevel) state.maxLevel = out.emotion.level;

    out.orderRef = extractOrderRef(text);
    if (out.orderRef) {
      const order = D.orders.find(o => o.orderId === out.orderRef);
      if (order) { state.order = order; out.warranty = judgeWarranty(order); }
      else out.orderNotFound = out.orderRef; // 查无此单：如实告知，不拿旧订单冒充
    }

    out.intents = detectIntents(text);
    // 用户带着明确意图来（政策/物流/换退/维修）时，挂起的型号消歧不再阻塞流程
    if (state.pendingDisambig && out.intents.some(i => ["保修政策", "物流", "换货", "退款", "维修"].includes(i))) {
      state.pendingDisambig = null;
    }
    const pendingTrig = (state.pendingDisambig && state.pendingDisambig.triggerText) || "";

    if (photoId) {
      const photo = D.photos.find(p => p.id === photoId);
      if (photo) {
        const r = startDisambig(photo);
        if (r.resolved) { state.product = r.resolved; state.pendingDisambig = null; out.disambigResolved = r.resolved; }
        else if (r.ambiguous) { state.pendingDisambig = r; out.disambigStarted = true; }
        else if (r.candidates[0]) { state.product = r.candidates[0]; out.disambigResolved = r.candidates[0]; }
      }
    } else if (state.pendingDisambig) {
      const resolved = resolveDisambig(state.pendingDisambig, text);
      if (resolved) { out.disambigResolved = resolved; state.product = resolved; state.pendingDisambig = null; }
      else {
        // 消歧悬置超过两轮自动放弃，回到正常流程
        state.pendingDisambig.turns = (state.pendingDisambig.turns || 0) + 1;
        if (state.pendingDisambig.turns > 2) state.pendingDisambig = null;
      }
    } else if (!state.product && !out.intents.some(i => ["保修政策", "物流", "换货", "退款", "维修", "已解决", "寒暄"].includes(i))) {
      // 纯文字提及同名组：含答案直接识别，否则一句二选一问用途
      const g = resolveByTextGroup(text);
      if (g.needAsk) { state.pendingDisambig = { candidates: g.candidates, ambiguous: true, keyQuestion: null, textOnly: true, pending: true, triggerText: text }; out.disambigStarted = true; }
      else if (g.resolved) { state.product = g.resolved; out.disambigResolved = g.resolved; }
    }

    // 型号未确认（待消歧）前不检索，避免按错误型号提前给出方案；确认后再定向检索。
    // 消歧当轮把触发句并回检索——"漏水了"这类症状在确认型号后不能丢
    if (!state.pendingDisambig) {
      const productHint = state.product ? state.product.kbId : null;
      const q = (out.disambigResolved && pendingTrig) ? (pendingTrig + " " + text) : text;
      out.kbHits = searchKB(q, productHint);
    }

    out.needGate = out.intents.some(i => i === "换货" || i === "退款");
    return out;
  }

  return { analyzeEmotion, strategyOf, extractOrderRef, judgeWarranty, searchKB, detectIntents, startDisambig, resolveDisambig, processTurn };
})();
