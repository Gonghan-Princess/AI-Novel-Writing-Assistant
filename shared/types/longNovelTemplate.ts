export const LONG_NOVEL_TEMPLATE_IDS = [
  "fantasy",
  "urban_realist",
  "science_fiction",
  "mystery",
  "historical",
  "romance",
  "adventure_growth",
  "custom",
] as const;

export type LongNovelTemplateId = typeof LONG_NOVEL_TEMPLATE_IDS[number];

export interface LongNovelTemplate {
  id: LongNovelTemplateId;
  label: string;
  description: string;
  planningFocus: readonly string[];
  worldbuildingPrompts: readonly string[];
  characterPrompts: readonly string[];
  reviewFocus: readonly string[];
  automationAdvice: readonly string[];
}

export const LONG_NOVEL_TEMPLATES = [
  {
    id: "fantasy",
    label: "奇幻",
    description: "适合魔法、神话、异世界或超自然秩序驱动的长篇故事。",
    planningFocus: [
      "明确力量体系、禁忌、代价与成长阶梯",
      "规划主线冒险、阵营冲突和世界秩序变化",
      "提前布置传说、神器、预言或历史谜团的回收节奏",
    ],
    worldbuildingPrompts: [
      "这个世界的超凡力量从何而来，普通人如何理解它？",
      "不同地域、种族、组织之间的资源和信仰冲突是什么？",
      "哪些古老事件仍在影响当下主线？",
    ],
    characterPrompts: [
      "主角获得力量时付出的代价是什么？",
      "队友、导师、反派分别代表怎样的世界观选择？",
      "角色成长是否会改变他们与阵营、血统或使命的关系？",
    ],
    reviewFocus: [
      "力量升级是否有铺垫并遵守既定规则",
      "设定信息是否服务情节而非堆砌说明",
      "伏笔回收是否改变局势或人物选择",
    ],
    automationAdvice: [
      "维护力量体系表和阵营关系表，自动检查新增设定是否冲突",
      "按卷追踪关键道具、预言和历史线索的出现与回收状态",
    ],
  },
  {
    id: "urban_realist",
    label: "都市现实",
    description: "适合职场、家庭、行业、社会议题或现实成长向长篇故事。",
    planningFocus: [
      "建立现实压力链：职业、家庭、金钱、身份和社会关系",
      "规划阶段性目标与现实阻力的递进",
      "保持生活细节、行业逻辑和人物选择的可信度",
    ],
    worldbuildingPrompts: [
      "故事发生的城市、行业或社区有哪些真实约束？",
      "人物的阶层、资源、人脉和制度边界是什么？",
      "哪些社会变化会推动主线矛盾升级？",
    ],
    characterPrompts: [
      "主角最想改变的现实处境是什么？",
      "重要关系中的利益、情感和责任如何互相拉扯？",
      "角色的短期妥协是否会影响长期价值选择？",
    ],
    reviewFocus: [
      "事件转折是否符合现实因果",
      "人物对话和行动是否贴近身份处境",
      "议题表达是否通过情节和人物完成",
    ],
    automationAdvice: [
      "建立行业术语、岗位职责和现实规则清单，减少前后不一致",
      "按章节追踪人物目标、资源变化和关系债务",
    ],
  },
  {
    id: "science_fiction",
    label: "科幻",
    description: "适合技术假设、未来社会、太空探索或文明演化驱动的长篇故事。",
    planningFocus: [
      "定义核心科学假设及其社会后果",
      "规划技术、伦理、政治和生存压力的递进",
      "保持新概念揭示与情节推进同步",
    ],
    worldbuildingPrompts: [
      "核心技术或科学异常改变了哪些基础规则？",
      "社会制度、经济结构和日常生活如何适应这些变化？",
      "不同群体对技术风险和收益的立场是什么？",
    ],
    characterPrompts: [
      "主角与核心技术之间是创造者、受害者、探索者还是反抗者关系？",
      "角色面对未知时的理性、信念和恐惧如何冲突？",
      "反派或对立方是否拥有合理的技术伦理立场？",
    ],
    reviewFocus: [
      "科学假设是否自洽并持续影响情节",
      "技术解决方案是否避免无代价万能化",
      "宏大议题是否落在具体人物选择上",
    ],
    automationAdvice: [
      "维护核心假设、技术限制和时间线表，自动提示违反规则的桥段",
      "追踪每项技术设定的首次解释、升级和情节用途",
    ],
  },
  {
    id: "mystery",
    label: "悬疑推理",
    description: "适合案件、秘密、心理悬念或真相揭示驱动的长篇故事。",
    planningFocus: [
      "先确定真相、误导线索、证据链和揭示顺序",
      "规划每卷或每阶段的核心谜题与答案",
      "控制信息差，让读者始终拥有可推理但不完整的信息",
    ],
    worldbuildingPrompts: [
      "案件或秘密发生的环境有哪些封闭性和规则？",
      "权力结构、职业体系或地方关系如何影响调查？",
      "过去的哪些事件构成当前谜团的根源？",
    ],
    characterPrompts: [
      "每个关键人物隐藏了什么，为什么隐藏？",
      "调查者的盲点、执念或道德边界是什么？",
      "嫌疑人、受害者和旁观者之间的真实关系如何变化？",
    ],
    reviewFocus: [
      "线索是否公平出现且能被复盘",
      "误导是否来自人物动机而非作者作弊",
      "真相揭示是否同时推进人物和主题",
    ],
    automationAdvice: [
      "维护线索台账，记录真线索、假线索、出现章节和解释状态",
      "按角色追踪公开信息、隐藏信息和读者已知信息",
    ],
  },
  {
    id: "historical",
    label: "历史",
    description: "适合历史背景、时代变迁、家族兴衰或权力格局驱动的长篇故事。",
    planningFocus: [
      "明确时代背景、关键事件和虚构空间的边界",
      "规划个人命运与历史浪潮之间的互动",
      "兼顾考据可信度与长篇叙事节奏",
    ],
    worldbuildingPrompts: [
      "时代的政治、经济、礼法和技术条件是什么？",
      "真实历史事件与虚构事件如何相互避让或嵌合？",
      "人物的身份决定了哪些机会、限制和风险？",
    ],
    characterPrompts: [
      "主角的个人愿望如何受到时代结构限制？",
      "家族、同僚、敌手和盟友分别承担什么历史压力？",
      "角色是否会在忠诚、利益和生存之间改变立场？",
    ],
    reviewFocus: [
      "时代细节是否稳定且不过度解释",
      "人物选择是否符合身份、制度和信息条件",
      "历史事件是否影响主线而非只做背景",
    ],
    automationAdvice: [
      "维护年代、官职、地名、制度和真实事件索引",
      "自动检查章节中的时代错位、称谓变化和人物年龄连续性",
    ],
  },
  {
    id: "romance",
    label: "情感关系",
    description: "适合亲密关系、情感成长、家庭关系或多线关系推动的长篇故事。",
    planningFocus: [
      "设计关系阶段、信任变化和情感阻力",
      "让外部事件持续检验人物的亲密关系选择",
      "规划误会、靠近、分离和承诺的节奏",
    ],
    worldbuildingPrompts: [
      "故事环境如何影响亲密关系的公开性、成本和选择？",
      "家庭、职业、地域或文化差异带来哪些长期阻力？",
      "哪些共同空间会承载关系变化的关键记忆？",
    ],
    characterPrompts: [
      "主角在关系中最害怕失去什么？",
      "双方的需求、边界和表达方式有什么错位？",
      "配角关系如何映照或挑战主线关系？",
    ],
    reviewFocus: [
      "情感推进是否来自具体行动和选择",
      "冲突是否尊重人物性格而非硬造误会",
      "关系变化是否与个人成长同步",
    ],
    automationAdvice: [
      "维护关系温度、信任事件和未解决冲突列表",
      "按阶段检查关键情感节点是否有足够铺垫与后果",
    ],
  },
  {
    id: "adventure_growth",
    label: "冒险成长",
    description: "适合旅程、试炼、伙伴、探索和自我成长驱动的长篇故事。",
    planningFocus: [
      "规划旅程地图、阶段目标和成长试炼",
      "让每次冒险改变角色能力、关系或价值观",
      "安排伙伴加入、分歧、牺牲和重聚的节奏",
    ],
    worldbuildingPrompts: [
      "旅程经过的地点各自提供什么危险、资源和选择？",
      "外部世界如何随着主角行动发生反馈？",
      "探索目标背后隐藏着怎样的更大结构？",
    ],
    characterPrompts: [
      "主角出发时缺少什么，旅程会迫使其面对什么？",
      "团队成员之间的互补能力和价值冲突是什么？",
      "每个阶段的失败会留下什么长期影响？",
    ],
    reviewFocus: [
      "冒险事件是否推动成长而非只换地图",
      "团队关系是否有持续变化和记忆",
      "阶段胜利是否带来新的代价或更大问题",
    ],
    automationAdvice: [
      "维护地点、任务、队伍状态和成长里程碑表",
      "追踪长期伤害、承诺、道具和探索成果的后续影响",
    ],
  },
  {
    id: "custom",
    label: "自定义",
    description: "适合跨类型、实验结构或用户已有明确创作规则的长篇项目。",
    planningFocus: [
      "先记录用户自定义类型规则、禁区和优先级",
      "把核心卖点拆成可检查的长期叙事指标",
      "按项目特性决定卷结构、节奏和自动化检查点",
    ],
    worldbuildingPrompts: [
      "这个项目最不可替代的设定或叙事规则是什么？",
      "哪些类型元素可以混合，哪些必须保持边界？",
      "读者需要逐步理解哪些背景信息？",
    ],
    characterPrompts: [
      "主角的核心驱动力是否足以支撑长篇推进？",
      "关键人物承担哪些类型功能和主题功能？",
      "角色变化应优先服务情节、主题还是关系？",
    ],
    reviewFocus: [
      "章节是否持续服务用户定义的核心卖点",
      "混合类型元素是否稳定且不互相抵消",
      "自动化规则是否需要根据试写反馈调整",
    ],
    automationAdvice: [
      "建立项目专属规则清单，让后续规划、写作和审稿共用同一套检查项",
      "定期把人工反馈沉淀为模板补充项，减少后续偏航",
    ],
  },
] as const satisfies readonly LongNovelTemplate[];

export function getLongNovelTemplate(id: LongNovelTemplateId): LongNovelTemplate | undefined {
  return LONG_NOVEL_TEMPLATES.find((template) => template.id === id);
}
