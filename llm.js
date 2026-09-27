/* ════════════════════════════════════════════════════════
   llm.js —— LLM 增强模式（可选）
   仅生成「回复文案」；判定、证据、策略面板仍由规则引擎驱动。
   Key 只存本机 localStorage，不外传。
   ════════════════════════════════════════════════════════ */
window.LLM = (() => {
  const KEY_EP = "sr_endpoint", KEY_KEY = "sr_key", KEY_MODEL = "sr_model";

  function cfg() {
    return {
      endpoint: localStorage.getItem(KEY_EP) || "https://api.deepseek.com/v1",
      key: localStorage.getItem(KEY_KEY) || "",
      model: localStorage.getItem(KEY_MODEL) || "deepseek-chat"
    };
  }
  function saveCfg(c) {
    localStorage.setItem(KEY_EP, c.endpoint); localStorage.setItem(KEY_KEY, c.key); localStorage.setItem(KEY_MODEL, c.model);
  }

  /* 岗位说明书式 system prompt：规则 + 当前策略档 + 已确认事实 + 本轮检索到的知识库 */
  function buildSystemPrompt(state, engineOut) {
    const st = window.Engine.strategyOf(state.maxLevel || 0);
    const facts = [];
    if (state.order) facts.push(`订单 ${state.order.orderId}：${state.order.sku}，购买 ${state.order.purchaseDate}，质保至 ${state.order.warrantyEnd}，渠道 ${state.order.country}/${state.order.seller}`);
    if (state.lastWarranty) facts.push(`质保判定：${state.lastWarranty.warrantyText}，${state.lastWarranty.authorized ? "授权渠道" : "非授权渠道"}`);
    if (state.product) facts.push(`已确认产品：${state.product.name}`);
    const kb = [];
    if (engineOut && engineOut.kbHits && engineOut.kbHits.length) {
      kb.push("规则引擎本轮检索到的知识库条目（排障只允许引用这些文档，并注明文档号）：");
      engineOut.kbHits.forEach(h => {
        const steps = (h.doc.stepsEn || h.doc.steps).slice(0, 3).map((s, i) => `  ${i + 1}. ${s}`).join("\n");
        kb.push(`[${h.doc.id}] ${h.doc.titleEn || h.doc.title}\n${steps}`);
      });
    } else {
      kb.push("本轮未检索到知识库条目：不要编造文档号与排障步骤，如实说明并升级人工。");
    }
    return [
      "你是 Anker 海外售后客服 Agent。严格遵守以下岗位规则：",
      "1. 只说看得见的：描述照片/产品只陈述可见信息，不凭外观断定型号与内部故障。",
      "2. 同名产品先消歧（如 S1 Pro 有扫地机/吸奶器两种），只问一个最关键的使用现象，不重复问已知信息。",
      "3. 排障结论必须来自知识库，回复注明文档号（如 [KB-014]）；检索不到就诚实升级人工，绝不编造。",
      "4. 质保判定依据订单字段与经销商名录（country 精确 + seller 模糊），结论要引用依据。",
      "5. 换货/退款等重要动作：你只能备好工单信息，必须转人工确认，绝不承诺已执行。",
      "6. 语言跟随客户，口语化简短，禁止套话（尊敬的用户/为您赋能等）。",
      `7. 当前情绪档位「${st.name}」：语气=${st.tone}；追问节奏=${st.pace}；转人工策略=${st.escalate}。`,
      facts.length ? "已确认事实（不得与之矛盾）：\n- " + facts.join("\n- ") : "",
      kb.join("\n")
    ].filter(Boolean).join("\n");
  }

  async function reply(state, engineOut, history) {
    const c = cfg();
    if (!c.key) throw new Error("未配置 API Key（点右上 ⚙ 填写）");
    const messages = [
      { role: "system", content: buildSystemPrompt(state, engineOut) },
      ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
    ];
    const res = await fetch(c.endpoint.replace(/\/+$/, "") + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + c.key },
      body: JSON.stringify({ model: c.model, messages, temperature: 0.5, max_tokens: 500 }),
      signal: AbortSignal.timeout(15000) // 网络挂起 15s 后放弃，回退规则回复，不锁死发送键
    });
    if (!res.ok) throw new Error(`API ${res.status}：` + (await res.text()).slice(0, 160));
    const data = await res.json();
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error("返回为空");
    return text.trim();
  }

  return { cfg, saveCfg, reply };
})();
