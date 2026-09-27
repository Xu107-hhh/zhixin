/* ════════════════════════════════════════════════════════
   data.js —— 演示数据层（中英双语）
   字段结构对齐官方资料包（订单 / 经销商名录 / 型号库 / 知识库 / SOP）。
   入围拿到官方脱敏数据后，可直接替换本文件，逻辑层无需改动。
   ════════════════════════════════════════════════════════ */
window.DEMO_DATA = (() => {

  /* ── 订单（官方字段：订单号/SKU/数量/金额/购买日期/质保到期日/国家/卖家/地址/状态/承运商/物流单号/发货日期） ── */
  const orders = [
    {
      orderId: "ORD-88291", sku: "Anker 511 充电器 20W（A2637）", skuEn: "Anker 511 Charger 20W (A2637)", qty: 1, amount: "$18.99",
      purchaseDate: "2026-03-12", warrantyEnd: "2027-03-12",
      country: "US", seller: "Anker Official Store",
      address: "Seattle, WA", status: "已签收", carrier: "UPS",
      tracking: "1Z999AA10123456784", shipDate: "2026-03-13"
    },
    {
      orderId: "ORD-77104", sku: "eufy S1 Pro Robot Vacuum", skuEn: "eufy S1 Pro Robot Vacuum", qty: 1, amount: "$699.99",
      purchaseDate: "2025-11-02", warrantyEnd: "2027-11-02",
      country: "US", seller: "Anker Official Store",
      address: "Portland, OR", status: "已签收", carrier: "FedEx",
      tracking: "771204990011", shipDate: "2025-11-03"
    },
    {
      orderId: "ORD-66058", sku: "eufy Indoor Cam E220（2K 云台）", skuEn: "eufy Indoor Cam E220 (2K Pan-Tilt)", qty: 1, amount: "$49.99",
      purchaseDate: "2023-08-15", warrantyEnd: "2024-08-15",
      country: "DE", seller: "TechDeal Store GmbH",
      address: "München, BY", status: "已签收", carrier: "DHL",
      tracking: "0034043412", shipDate: "2023-08-17"
    },
    {
      orderId: "ORD-55021", sku: "Soundcore Life P3 降噪耳机", skuEn: "Soundcore Life P3 Earbuds", qty: 1, amount: "$79.99",
      purchaseDate: "2026-01-20", warrantyEnd: "2027-01-20",
      country: "US", seller: "GadgetHub Online",
      address: "Miami, FL", status: "已签收", carrier: "UPS",
      tracking: "1Z5890AA6642210", shipDate: "2026-01-21"
    },
    {
      orderId: "ORD-44107", sku: "Anker 737 移动电源 PowerCore 24K", skuEn: "Anker 737 Power Bank (PowerCore 24K)", qty: 1, amount: "$149.99",
      purchaseDate: "2026-09-10", warrantyEnd: "2028-09-10",
      country: "US", seller: "Best Buy",
      address: "Austin, TX", status: "运输中", carrier: "FedEx",
      tracking: "920209110028", shipDate: "2026-09-11"
    }
  ];

  /* ── 授权经销商名录（判定规则：country 精准匹配 + seller 模糊匹配） ── */
  const dealers = [
    { id: "D-001", country: "US", seller: "Anker Official Store", fuzzy: "anker official", authorized: true,  path: "寄修 / 补单 / 换新", pathEn: "Repair / resend / replacement" },
    { id: "D-002", country: "US", seller: "AnkerDirect LLC",       fuzzy: "ankerdirect",    authorized: true,  path: "寄修 / 补单 / 换新", pathEn: "Repair / resend / replacement" },
    { id: "D-003", country: "US", seller: "Amazon（安克官方旗舰店）", fuzzy: "amazon",      authorized: true,  path: "寄修 / 补单 / 换新", pathEn: "Repair / resend / replacement" },
    { id: "D-004", country: "US", seller: "Best Buy",              fuzzy: "best buy",       authorized: true,  path: "寄修 / 补单", pathEn: "Repair / resend" },
    { id: "D-005", country: "DE", seller: "Anker Official Store (EU)", fuzzy: "anker",    authorized: true,  path: "寄修 / 补单 / 换新", pathEn: "Repair / resend / replacement" },
    { id: "D-006", country: "DE", seller: "Anker Germany GmbH",    fuzzy: "anker germany", authorized: true,  path: "寄修 / 补单", pathEn: "Repair / resend" },
    { id: "D-007", country: "UK", seller: "Anker Official Store",  fuzzy: "anker",         authorized: true,  path: "寄修 / 补单", pathEn: "Repair / resend" },
    { id: "D-008", country: "FR", seller: "Anker France SARL",     fuzzy: "anker",         authorized: true,  path: "寄修 / 补单", pathEn: "Repair / resend" }
  ];

  /* ── 型号库（S1 Pro 为同名歧义组；其余型号唯一、照片可直接识别） ── */
  const products = [
    {
      model: "S1 Pro", name: "eufy S1 Pro 扫地机器人", sku: "T8983",
      img: "assets/img/vacuum.jpg",
      visible: ["圆形机身", "顶部激光雷达", "底部滚刷", "自动回基站"],
      visibleEn: ["Round body", "Top LiDAR turret", "Bottom roller brush", "Self-empty base"],
      keyQuestion: "平时它会在家里地上跑着扫地，对吧？",
      keyQuestionEn: "It normally drives around the floor vacuuming, right?",
      words: ["扫地", "清扫", "会跑", "自己跑", "在地上", "vacuum", "robot", "sweep"],
      kbId: "KB-014"
    },
    {
      model: "S1 Pro", name: "S1 Pro 吸奶器", nameEn: "S1 Pro Breast Pump", sku: "T8980",
      img: "assets/img/pump.png",
      visible: ["手柄式主机", "奶瓶组件", "软管连接", "无轮子 / 无滚刷"],
      visibleEn: ["Handheld main unit", "Bottle set", "Hose connection", "No wheels / no roller"],
      keyQuestion: "平时是给宝宝吸奶用的，对吧？",
      keyQuestionEn: "You use it for pumping milk, right?",
      words: ["吸奶", "奶瓶", "手柄", "breast", "pump"],
      kbId: "KB-021"
    },
    {
      model: "Anker 511", name: "Anker 511 充电器 20W（A2637）", nameEn: "Anker 511 Charger 20W (A2637)", sku: "A2637",
      img: "assets/img/charger.png",
      visible: ["白色充电头", "USB-C 接口", "原装插脚"],
      visibleEn: ["White charger body", "USB-C port", "Original prongs"],
      keyQuestion: null, keyQuestionEn: null, words: ["充电器", "充电头", "charger"], kbId: "KB-001"
    },
    {
      model: "eufy E220", name: "eufy Indoor Cam E220 云台摄像头", nameEn: "eufy Indoor Cam E220 Pan-Tilt Camera", sku: "T8410",
      img: "assets/img/camera.png",
      visible: ["球形摄像头", "云台底座", "状态指示灯"],
      visibleEn: ["Spherical camera", "Pan-tilt base", "Status LED"],
      keyQuestion: null, keyQuestionEn: null, words: ["摄像头", "摄像机", "camera", "cam"], kbId: "KB-030"
    },
    {
      model: "Anker 737", name: "Anker 737 移动电源 PowerCore 24K", nameEn: "Anker 737 Power Bank (PowerCore 24K)", sku: "A1289",
      img: "assets/img/powerbank.png",
      visible: ["长条形机身", "数显屏幕", "USB-C 接口 ×2"],
      visibleEn: ["Bar-shaped body", "Digital display", "2× USB-C ports"],
      keyQuestion: null, keyQuestionEn: null, words: ["移动电源", "充电宝", "737", "power bank", "powercore"], kbId: "KB-017"
    },
    {
      model: "Life P3", name: "Soundcore Life P3 降噪耳机", nameEn: "Soundcore Life P3 Noise-Cancelling Earbuds", sku: "A3993",
      img: "assets/img/earbuds.jpg",
      visible: ["入耳式耳机", "充电盒", "硅胶耳塞"],
      visibleEn: ["In-ear earbuds", "Charging case", "Silicone tips"],
      keyQuestion: null, keyQuestionEn: null, words: ["耳机", "耳塞", "life p3", "earbuds", "headphones"], kbId: "KB-033"
    }
  ];

  /* ── 知识库（型号库 + 故障排障库 + 政策） ── */
  const kb = [
    {
      id: "KB-001", product: "Anker 511 系列", symptom: "发烫 / 焦味 / 安全隐患", severity: "安全",
      tags: ["发烫", "焦味", "烧", "充电器", "安全", "hot", "burning", "smell"],
      title: "充电器发烫 / 异味安全处理", titleEn: "Charger overheating / odor — safety handling",
      steps: ["立即停止使用并从插座拔下", "拍照留存充电器与线身状态", "核对插座电压与原装线材", "符合条件直接整件换新，无需返修"],
      stepsEn: ["Stop using immediately and unplug it from the outlet", "Take photos of the charger and cable condition", "Check the outlet voltage and the original cable", "Eligible cases get a full replacement, no repair needed"]
    },
    {
      id: "KB-014", product: "S1 Pro 扫地机器人", symptom: "无法启动 / 不动", severity: "常规",
      tags: ["不动", "无法启动", "不工作", "扫地机", "s1 pro", "搬家", "stopped", "won't move"],
      title: "扫地机器人无法启动排查", titleEn: "Robot vacuum won't start — troubleshooting",
      steps: ["检查机身底部运输锁是否拨到解锁位（搬家 / 运输后高发）", "放回基站确认充电灯亮起（亏电需先充 10 分钟）", "取出尘盒与滚刷重新装到位", "长按电源键 10 秒复位"],
      stepsEn: ["Check the bottom transit lock is at unlock (common after moving / shipping)", "Return it to the base and confirm the charging light (charge 10 min if drained)", "Re-seat the dustbin and roller brush", "Hold the power button 10s to reset"]
    },
    {
      id: "KB-021", product: "S1 Pro 吸奶器", symptom: "吸力异常", severity: "常规",
      tags: ["吸奶器", "吸力", "s1 pro"],
      title: "吸奶器吸力异常排查", titleEn: "Breast pump weak suction — troubleshooting",
      steps: ["检查阀门与密封圈是否装到位", "配件清洗后需完全晾干再用", "确认法兰尺寸匹配"],
      stepsEn: ["Check the valve and seal ring are seated correctly", "Parts must be fully dry after washing before use", "Confirm the flange size fits"]
    },
    {
      id: "KB-030", product: "E220 云台摄像头", symptom: "离线 / 无法连接", severity: "常规",
      tags: ["离线", "摄像头", "连不上", "e220"],
      title: "摄像头离线恢复", titleEn: "Camera offline — recovery",
      steps: ["检查电源指示灯是否亮起", "长按重置键 8 秒重新配网", "确认使用 2.4G Wi-Fi"],
      stepsEn: ["Check the power status light is on", "Hold the reset button 8s to re-pair", "Make sure to use 2.4G Wi-Fi"]
    },
    {
      id: "KB-044", product: "通用政策", symptom: "非授权渠道购买", severity: "政策",
      tags: ["非授权", "第三方", "小店", "商家", "政策"],
      title: "非授权渠道服务政策", titleEn: "Unauthorized-channel service policy",
      steps: ["非授权渠道购买，质保责任由销售商家承担", "安克官方可提供付费检测与维修", "建议同时联系购买商家协商"],
      stepsEn: ["For unauthorized-channel purchases, the warranty is the selling retailer's responsibility", "Anker official can offer paid inspection and repair", "We also recommend contacting the seller"]
    },
    {
      id: "KB-051", product: "通用政策", symptom: "超保", severity: "政策",
      tags: ["过保", "超保", "过期", "维修费"],
      title: "超保产品服务政策", titleEn: "Out-of-warranty service policy",
      steps: ["过保可享官方付费检测与维修", "部分品类可申请换新折扣"],
      stepsEn: ["Out-of-warranty units can use official paid inspection and repair", "Some categories qualify for a replacement discount"]
    },
    {
      id: "KB-017", product: "Anker 737 移动电源", symptom: "充不进电 / 无输出", severity: "常规",
      tags: ["充不进", "不充电", "没反应", "移动电源", "充电宝", "charge"],
      title: "移动电源充不进电排查", titleEn: "Power bank won't charge — troubleshooting",
      steps: ["换一根线和一个插座直充 30 分钟（亏电过深会假死）", "长按电源键 5 秒激活数显", "确认充电功率 ≥ 18W，低功率头可能充不进大容量机型", "仍无反应且在保的直接走换新检测"],
      stepsEn: ["Try another cable and wall socket for 30 min (deep discharge can look dead)", "Hold the power button 5s to wake the display", "Use a charger ≥ 18W; low-power bricks may fail on high-capacity models", "If still dead and in warranty, go straight to replacement check"]
    },
    {
      id: "KB-033", product: "Soundcore Life P3", symptom: "断连 / 单耳无声", severity: "常规",
      tags: ["耳机", "断连", "单耳", "没声音", "一边不响", "earbuds", "one ear", "no sound"],
      title: "耳机断连 / 单耳无声排查", titleEn: "Earbuds dropping / one side silent — troubleshooting",
      steps: ["把两只耳机放回盒中，长按盒底按键 10 秒恢复出厂", "手机蓝牙列表里删除 Soundcore 设备后重新配对", "检查左右耳固件版本是否一致（App 内升级）", "单耳无声多为耳塞网堵塞，清洁后再试"],
      stepsEn: ["Put both earbuds in the case, hold the button 10s to factory reset", "Forget the Soundcore device in Bluetooth settings and re-pair", "Check both sides run the same firmware (update in app)", "One-side silence is often wax-blocked mesh — clean and retry"]
    },
    {
      id: "KB-060", product: "通用政策", symptom: "保修政策", severity: "政策",
      tags: ["保修多久", "保修政策", "质保政策", "保修期", "warranty"],
      title: "保修政策总览", titleEn: "Warranty policy overview",
      steps: ["多数产品整机保修 12–24 个月（品类有别）", "起算与到期日以订单记录为准", "把订单号发给客服即可查询本机到期日"],
      stepsEn: ["Most products carry a 12–24 month limited warranty (varies by category)", "Start and end dates follow the order record", "Send your order number to check the exact end date for your unit"]
    }
  ];

  /* ── 情绪分档 → 处理方式（运营可维护的规则表；中英双语） ── */
  const strategy = [
    {
      level: 0, name: "平稳", nameEn: "Calm", dot: "#2f9e6e",
      priority: "普通队列", priorityEn: "Standard queue",
      comp: "无补偿权限", compEn: "No compensation authority",
      escalate: "仅退款 / 法律等红线转人工", escalateEn: "Escalate only on refund / legal red lines",
      pace: "正常追问，每轮 ≤2 问", paceEn: "Normal follow-ups, ≤2 per turn",
      tone: "专业、简洁", toneEn: "Professional, concise"
    },
    {
      level: 1, name: "不满", nameEn: "Unhappy", dot: "#d9a23b",
      priority: "普通队列，标记关注", priorityEn: "Standard queue, flagged",
      comp: "配件级小额建议", compEn: "Small accessory-level offer",
      escalate: "连续 2 轮未解决则预备人工", escalateEn: "Prepare human after 2 unresolved turns",
      pace: "先共情一句，再办事", paceEn: "Empathize once, then act",
      tone: "共情、确认理解", toneEn: "Empathize, confirm understanding"
    },
    {
      level: 2, name: "愤怒", nameEn: "Angry", dot: "#e07b39",
      priority: "高优队列，可插队", priorityEn: "High-priority queue, can jump the line",
      comp: "中额建议（配件 + 运费）", compEn: "Mid offer (accessory + shipping)",
      escalate: "立即预备人工，仍先尝试接住", escalateEn: "Prepare human now, still try to resolve",
      pace: "暂停多问，用已知信息推进", paceEn: "Stop multi-questioning, use known info",
      tone: "先道歉，明确下一步", toneEn: "Apologize first, state the next step"
    },
    {
      level: 3, name: "投诉风险", nameEn: "Complaint risk", dot: "#d5504a",
      priority: "最高，专人跟进", priorityEn: "Highest, dedicated follow-up",
      comp: "建议上限，须人工确认", compEn: "Maximum offer, human approval required",
      escalate: "直通人工通道：专员同步跟进，AI 摘要实时同步", escalateEn: "Direct human line: specialist follows in parallel, AI summary synced live",
      pace: "不再追问，给明确时间承诺", paceEn: "No more questions, give a clear time commitment",
      tone: "郑重道歉 + 时限承诺", toneEn: "Sincere apology + time commitment"
    }
  ];

  /* ── 预置照片（group=同名歧义组；model=可唯一识别） ── */
  const photos = [
    { id: "ph-vacuum", label: "eufy S1 Pro 扫地机", group: "S1 Pro", img: "assets/img/vacuum.jpg",
      visible: ["圆形机身", "顶部激光雷达", "底部滚刷", "白色"],
      visibleEn: ["Round body", "Top LiDAR turret", "Bottom roller brush", "White"] },
    { id: "ph-pump", label: "S1 Pro 吸奶器", labelEn: "S1 Pro Breast Pump", group: "S1 Pro", img: "assets/img/pump.png",
      visible: ["手柄式主机", "奶瓶组件", "软管连接"],
      visibleEn: ["Handheld main unit", "Bottle set", "Hose connection"] },
    { id: "ph-charger", label: "Anker 511 充电器", labelEn: "Anker 511 Charger", model: "Anker 511", img: "assets/img/charger.png",
      visible: ["白色充电头", "USB-C 接口", "插脚"],
      visibleEn: ["White charger body", "USB-C port", "Prongs"] },
    { id: "ph-camera", label: "eufy E220 摄像头", labelEn: "eufy E220 Camera", model: "eufy E220", img: "assets/img/camera.png",
      visible: ["球形摄像头", "云台底座", "指示灯"],
      visibleEn: ["Spherical camera", "Pan-tilt base", "LED"] },
    { id: "ph-powerbank", label: "Anker 737 移动电源", labelEn: "Anker 737 Power Bank", model: "Anker 737", img: "assets/img/powerbank.png",
      visible: ["长条形机身", "数显屏幕", "USB-C 接口"],
      visibleEn: ["Bar-shaped body", "Digital display", "USB-C ports"] },
    { id: "ph-earbuds", label: "Soundcore Life P3 耳机", labelEn: "Soundcore Life P3 Earbuds", model: "Life P3", img: "assets/img/earbuds.jpg",
      visible: ["入耳式耳机", "充电盒", "硅胶耳塞"],
      visibleEn: ["In-ear earbuds", "Charging case", "Silicone tips"] }
  ];

  /* ── 预置剧本 ── */
  const scenarios = {
    A: {
      title: "愤怒客诉 · 换货全链路",
      hint: "情绪分档 → 质保证据 → 人工确认 → 满意度",
      turns: [
        {
          user: "什么情况啊，充电器一插上就发烫，还有股焦味，吓死人了。赶紧解决，不然我发推特上去了啊。",
          reply: "抱歉让你遇到这种情况。先别用了，把充电器从插座拔下来。\n麻烦发一下订单号或者产品 SN，我查下购买记录和质保，马上给你处理方案。"
        },
        {
          user: "订单号 ORD-88291。",
          reply: "查到了，跟你说下结果：\n· 订单 ORD-88291，Anker 511 充电器，今年 3 月买的，质保到明年 3 月，还在保\n· Anker 官方店购买，属于授权渠道\n发烫带焦味属于安全类问题 [KB-001]，这种情况直接换新，不用返修。"
        },
        {
          user: "行，那就换新吧，快点。",
          reply: "好，换新工单的信息我都填好了（「处理过程」里能看到）。\n换货这种操作需要人工最后确认，专员已经收到提醒，确认后就安排发货。",
          gate: {
            type: "换货", typeEn: "Replacement",
            reason: "充电器发烫、有焦味，属安全隐患", reasonEn: "Charger overheating with burning smell — safety hazard",
            evidence: "用户描述 · KB-001 安全指引 · 订单 ORD-88291 在保 · 授权渠道 D-001",
            evidenceEn: "User report · KB-001 safety guide · Order ORD-88291 in warranty · Authorized D-001",
            advice: "整件换新，旧件免运费回收", adviceEn: "Full replacement, free return shipping of old unit",
            comp: "免运费（按「投诉风险」档权限，须人工确认）", compEn: "Free shipping (per complaint-risk level, human confirmed)"
          },
          confirmNote: "工单已创建\n编号 {TK} · 已同步仓配，预计 1–2 个工作日发出",
          confirmReply: "工单建好了。新充电器发出后我第一时间把单号发你，旧件随箱寄回就行，运费帮你申请免了。\n这次确实抱歉。方便的话，最后给本次服务打个分？"
        }
      ]
    },
    B: {
      title: "S1 Pro · 分清哪台",
      hint: "同名两款 → 问一句分清 → 照片确认 → 排障",
      turns: [
        {
          user: "我的 S1 Pro 突然不动了，买了一年多。",
          reply: "S1 Pro 有两款——扫地机器人和吸奶器，名字一样。你的是哪台？\n说一句，或者发张照片，我马上认出来。"
        },
        {
          user: "扫地的那台，照片发你了。上周刚搬了家。",
          photo: "ph-vacuum",
          reply: "照片和你说的对上了——扫地机这款，确认。\n刚搬过家的话，十有八九是运输锁没拨开，搬家后最高发 [KB-014]：\n1. 机身底部运输锁拨到解锁位\n2. 放回基站，充电灯亮起后再等 10 分钟\n3. 尘盒滚刷取出重装，长按电源 10 秒复位\n试完告诉我结果。"
        },
        {
          user: "好了！就是运输锁没拨，谢谢啊。",
          reply: "搞定就好。搬家后让基站一直通着电，免得下次又亏电。\n方便的话打个分？"
        }
      ]
    },
    C: {
      title: "非授权渠道 · 超保",
      hint: "亮出真实边界，不编造承诺",
      turns: [
        {
          user: "我家 eufy 摄像头连不上了。订单 ORD-66058，前几年在德国一个网上小店买的。",
          reply: "先教你让它恢复在线 [KB-030]：\n1. 看电源灯亮不亮\n2. 长按重置键 8 秒重新配网（要连 2.4G Wi‑Fi）\n另外订单我查了，有两点如实跟你说：\n· 质保 2024 年 8 月就到期了，已经超保\n· 卖家 TechDeal Store GmbH 不在授权名单里，质保要找销售商家\n重置后还连不上的话，我可以安排安克官方付费检测维修 [KB-051]，也建议你同时联系卖家。能帮的我帮到底，承诺不了的不乱说。"
        },
        {
          user: "行吧，我先重置试试。",
          reply: "好，配网时看灯：蓝灯慢闪就是在等你连。有进展随时回来找我。\n也帮忙打个分？"
        }
      ]
    },
    D: {
      title: "English · overheating charger",
      hint: "Same full flow in English: safety → warranty → human confirm",
      lang: "en",
      turns: [
        {
          user: "Hey, my charger is getting super hot and there's a burning smell. This is not okay.",
          reply: "Sorry about that. Please stop using it and unplug it from the wall first.\nSend me your order number or the product SN, and I'll check your purchase and warranty right away."
        },
        {
          user: "It's ORD-88291.",
          reply: "Got it. Here's what I found:\n· Order ORD-88291, Anker 511 charger, purchased this March, still under warranty (until next March)\n· Bought from the official Anker store — authorized channel\nA hot charger with a burning smell is a safety issue [KB-001], so this qualifies for a straight replacement, no repair needed."
        },
        {
          user: "Okay, please replace it, asap.",
          reply: "Sure. I've prepared the replacement request with all the details. A replacement needs one final human confirmation — the team's been notified and will arrange shipping once confirmed.",
          gate: {
            type: "Replacement",
            reason: "Charger overheating with burning smell — safety issue",
            evidence: "User report · KB-001 safety guide · Order ORD-88291 in warranty · Authorized D-001",
            advice: "Full replacement, free return shipping",
            comp: "Free return shipping (per complaint-risk level, human confirmed)"
          },
          confirmNote: "Ticket created\n{TK} · Synced to warehouse, ships in 1–2 business days",
          confirmReply: "Done — the ticket's created. The new charger should ship in 1–2 business days, and I'll send the tracking number as soon as it's out. Just return the old one in the box; I've requested free return shipping.\nSorry again for the trouble. Mind rating this service at the end?"
        }
      ]
    }
  };

  return { orders, dealers, products, kb, strategy, photos, scenarios };
})();
