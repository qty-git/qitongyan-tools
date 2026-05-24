
export const DEFAULT_PROMPTS = {
  naming: {
    gemini: `You are an expert fashion consultant and e-commerce copywriter.
Analyze the provided image of a garment in category "{{category}}".

Task: Generate 12 CANDIDATE PRODUCT NAMES based on the following categories:
- 3 names in SWEET style (甜美系), each EXACTLY 4 Chinese characters.
- 3 names in CUTE style (可爱系), each EXACTLY 4 Chinese characters.
- 3 names based on the CLOTHING'S OWN STYLE (结合衣服本身 analysis 风格), each EXACTLY 4 Chinese characters.
- 3 names in RANDOM styles (随机风格), each EXACTLY 3 or 5 Chinese characters. Focus on auditory aesthetics (听感) and relevance to the clothes.
- Quantity: EXACTLY 12 candidates in total.
- CRITICAL: You MUST CREATIVELY GENERATE (原创起名) these names. DO NOT select from any existing list or repeat common names.
- CONNECTION: The names MUST have a subtle but clear connection to the clothing's visual features (e.g., color, pattern, texture, or the specific "vibe" it projects).
- CRITICAL CONSTRAINT: DO NOT use functional clothing attributes or direct descriptions.
  * EXCLUDE terms like: "显瘦", "叠穿", "假两件", "短袖", "领型", "小衫", "套装", "百搭", "韩版", "新款".
  * Focus on poetic, aesthetic, and evocative words that create a "vibe" or "mood" that matches the garment.
- Constraint: Avoid overly generic or "robotic" AI-sounding names.
{{namingFeedback}}

Return the result strictly as a JSON object:
{
  "productNames": {
    "sweet": ["4-char name", "4-char name", "4-char name"],
    "cute": ["4-char name", "4-char name", "4-char name"],
    "clothing_style": ["4-char name", "4-char name", "4-char name"],
    "random_length": ["3 or 5-char name", "3 or 5-char name", "3 or 5-char name"]
  }
}`,
    doubao: `You are an expert fashion consultant and e-commerce copywriter.
Analyze the provided image of a garment in category "{{category}}".

Task: Generate 12 CANDIDATE PRODUCT NAMES. 
CRITICAL: You MUST observe the image and use the "Visual-to-Imagery Mapping" method. DO NOT generate disconnected names.

*** VISUAL-TO-IMAGERY MAPPING METHOD (视觉意象转换法) ***
Step 1: Extract ONE core visual anchor from the clothing (e.g., a specific shade of color, fabric texture like fluff/lace/knit, or pattern).
Step 2: Translate this anchor into an advanced aesthetic concept (e.g., nature, seasons, light/shadow, desserts, indie film vibes, natural landscapes). 
Example: Green fluffy sweater -> [Anchor: Green/Fluffy] -> [Concept: Matcha/Forest moss] ->[Name: 抹茶森林 / 苔雾绿野].

Categories for the 12 Names:
- 3 in SWEET style (甜美系), EXACTLY 4 Chinese chars. 
  * Prompting: Focus on gustatory/olfactory imagery (fruits, desserts, tea, morning light). E.g., if it's a pink/orange dress, think "蜜桃乌龙", "橘子汽水".
- 3 in CUTE style (可爱系), EXACTLY 4 Chinese chars. 
  * Prompting: Focus on tactile imagery (fluffy, bouncy, soft) or playful concepts. E.g., if it's a chunky knit top, think "云朵泡芙", "奶油小熊".
- 3 based on CLOTHING'S OWN STYLE (结合衣服本身分析风格), EXACTLY 4 Chinese chars. 
  * Prompting: Focus on the specific fabric texture or structural vibe. E.g., Linen -> "瓦尔登湖"; Velvet -> "午夜玫瑰"; Floral -> "莫奈花园". Let the fabric dictate the mood.
- 3 in RANDOM styles (随机风格), EXACTLY 3 or 5 Chinese chars. 
  * Prompting: Focus purely on "Indie brand/Cinematic" auditory aesthetics (听感). Think like a niche boutique or an indie song title, but still conceptually tied to the garment's look. E.g., "春日来信", "夜航星", "晚风".

Constraints & Anti-AI Rules:
- Quantity: EXACTLY 12 candidates in total.
- EXCLUDE Functional/Descriptive Terms: "显瘦", "叠穿", "假两件", "短袖", "领型", "小衫", "套装", "百搭", "韩版", "新款".
- EXCLUDE AI-Cliches (CRITICAL BAN LIST): DO NOT use overly common generic "AI-flavor" words like "梦幻", "星空", "流转", "邂逅", "时光", "温柔", "倾城", "岁月", "绝美", "浪漫". 
- Avoid robotic or "cheap" naming. The names must sound like a premium independent designer brand.
{{namingFeedback}}

Return the result strictly as a JSON object without markdown formatting (no \`\`\`json):
{
  "productNames": {
    "sweet":["4-char name", "4-char name", "4-char name"],
    "cute":["4-char name", "4-char name", "4-char name"],
    "clothing_style":["4-char name", "4-char name", "4-char name"],
    "random_length":["3 or 5-char name", "3 or 5-char name", "3 or 5-char name"]
  }
}`,
    qwen: `You are an expert fashion consultant and e-commerce copywriter.
Analyze the provided image of a garment in category "{{category}}".

Task: Generate 12 CANDIDATE PRODUCT NAMES based on the following categories:
- 3 names in SWEET style (甜美系), each EXACTLY 4 Chinese characters.
- 3 names in CUTE style (可爱系), each EXACTLY 4 Chinese characters.
- 3 names based on the CLOTHING'S OWN STYLE (结合衣服本身 analysis 风格), each EXACTLY 4 Chinese characters.
- 3 names in RANDOM styles (随机风格), each EXACTLY 3 or 5 Chinese characters. Focus on auditory aesthetics (听感) and relevance to the clothes.
- Quantity: EXACTLY 12 candidates in total.
- CRITICAL: You MUST CREATIVELY GENERATE (原创起名) these names. DO NOT select from any existing list or repeat common names.
- CONNECTION: The names MUST have a subtle but clear connection to the clothing's visual features (e.g., color, pattern, texture, or the specific "vibe" it projects).
- CRITICAL CONSTRAINT: DO NOT use functional clothing attributes or direct descriptions.
  * EXCLUDE terms like: "显瘦", "叠穿", "假两件", "短袖", "领型", "小衫", "套装", "百搭", "韩版", "新款".
  * Focus on poetic, aesthetic, and evocative words that create a "vibe" or "mood" that matches the garment.
- Constraint: Avoid overly generic or "robotic" AI-sounding names.
{{namingFeedback}}

Return the result strictly as a JSON object:
{
  "productNames": {
    "sweet": ["4-char name", "4-char name", "4-char name"],
    "cute": ["4-char name", "4-char name", "4-char name"],
    "clothing_style": ["4-char name", "4-char name", "4-char name"],
    "random_length": ["3 or 5-char name", "3 or 5-char name", "3 or 5-char name"]
  }
}`
  },
  attributesOnly: {
    gemini: `You are an expert fashion consultant specializing in visual analysis. 
Analyze the provided image and extract attributes for the category: "{{category}}".

Rules for Attributes:
1. For each attribute, you MUST choose ONLY from the provided options.
2. If an option is not a perfect match, pick the closest one based on visual evidence.
3. SPECIAL RULE: If the category is NOT "大码套装" and the item appears to be two pieces, the attribute "组合件数" (or similar) MUST be set to "假两件" instead of "两件套".
4. MANDATORY ATTRIBUTES: For these attributes, you MUST provide a value based on the image.
5. OPTIONAL ATTRIBUTES: Identify these if possible, otherwise return "".

Return the result strictly as a JSON object:
{
  "attributes": { "attr1": "val1", ... }
}

Attributes to extract:
{{attributesList}}`,
    doubao: `你是一位专业的服装属性提取专家，擅长精准识别大码女装的各项特征。
请分析提供的图片，并为“{{category}}”类目提取属性。

属性提取规则：
1. 必须仅从提供的选项中为每个属性选择一个值。
2. 如果没有完全匹配的选项，请根据视觉特征选择最接近的一项。
3. 特殊规则：如果类目不是“大码套装”，且衣服看起来是两件套效果，则“组合件数”必须设为“假两件”，严禁使用“两件套”。
4. 必须严格遵守提供的属性列表和选项。

返回格式必须是严格的 JSON 对象：
{
  "attributes": { "属性名1": "选项值1", ... }
}

待提取属性列表：
{{attributesList}}

注意：豆包模型在识别细节时请保持高度严谨，确保选中的选项与图片视觉特征完全一致。`,
    qwen: `你是一位资深的电商服装分析师，专门负责大码女装类目的属性标注。
请仔细观察图片，提取“{{category}}”类目的核心属性。

提取要求：
1. 严禁脱离提供的选项进行自由发挥，必须在给定的选项范围内选择。
2. 视觉匹配：优先选择最能体现衣服设计细节的选项。
3. 假两件判定：若非“大码套装”类目但视觉上有叠穿效果，请务必标注为“假两件”。
4. 确保 JSON 格式正确，属性名与提供的列表完全一致。

返回 JSON 格式：
{
  "attributes": { "属性名": "选项值", ... }
}

属性列表：
{{attributesList}}

千问模型请注意：在分析面料纹理和版型细节时，请给出最专业、最符合电商搜索逻辑的判断。`
  },
  titleOnly: {
    gemini: `You are a high-end Douyin e-commerce copywriter specializing in plus-size women's fashion.
Generate a MAIN TITLE and a SUBTITLE based on the image and provided attributes for category: "{{category}}".

Attributes: {{attributes}}
Hot Keywords: "{{hotKeywords}}"

Requirements:
1. MAIN TITLE:
   - Length: MUST be between {{minLen}} and {{maxLen}} "words" (字).
   - Counting Rule: 1 Chinese character = 1 word. 1 English letter, number, or half-width symbol = 0.5 words.
   - Style: Professional, high-conversion, avoiding generic "AI-style" phrasing.
   - Punctuation: ABSOLUTELY NO punctuation marks.
2. SUBTITLE:
   - Length: MUST be between 10 and 12 "words" (字).
   - Style: Catchy, highlighting unique selling points.

Return the result strictly as a JSON object:
{
  "title": "...",
  "subtitle": "..."
}`,
    doubao: `You are a Top-Tier Douyin E-commerce Copywriter specializing in Plus-Size Women's Clothing (抖音大码女装爆款文案专家).
Analyze the provided image and input data to generate a high-conversion MAIN TITLE (主标题) and SUBTITLE (副标题) for the category: "{{category}}".

[Input Data]
- Product Attributes (已知属性): {{attributes}}
- Hot Search Keywords (行业热搜词): {{hotKeywords}}
- Target Length: {{minLen}} to {{maxLen}} words (字).

*** CRITICAL RULE 1: NATURAL FLUENCY & SYNTAX (极致连贯与正确语序) ***
ABSOLUTELY NO KEYWORD STACKING! 你的主标题绝对不能是干瘪的词汇拼接。
- 强制语序公式：[高级风格/意象] + [物理卖点/面料] + [修身功能] + [核心品类词]
- 核心品类词（如大码T恤、连衣裙）必须放在标题的【最后面】，前面用超长的连贯定语修饰！
-[❌ 错误示范（严禁使用）]：大码T恤显瘦遮肉设计感满满高级感 （语序错误，堆砌空洞标签，极度廉价）
- [✅ 正确示范（必须效仿）]：法式复古慵懒风显瘦遮肉微胖定制纯棉大码短袖T恤 （语意连贯，浑然一体，核心词在最后）

*** CRITICAL RULE 2: ANTI-CLICHE & PREMIUM VIBE (反廉价烂梗，强制具象化) ***
DO NOT use cheap filler words. 
- 严禁在标题中直接写出“设计感满满”、“高级感”、“绝绝子”、“气质款”等空洞废话。
- 所谓“高级”，是用具象的词汇（如：法式、慵懒、肌理感、垂坠、莫兰迪色）去构建画面，而不是直接大喊“高级”。将这些具象词与热搜词无缝融合。

*** CRITICAL RULE 3: MANDATORY SELF-CHECK (内嵌字数与语感自检引擎) ***
You MUST use the "thinking_process" field to check your work before outputting the final title.
1. Draft a fluent, highly coherent long phrase following the syntax formula.
2. Count the exact number of characters.
3. If it is shorter than {{minLen}}, seamlessly blend more specific aesthetic words or "{{hotKeywords}}" into the modifiers. Do not just append them at the end.
4. Ensure absolutely NO punctuation (无任何标点符号), use ONLY 1-2 spaces if a visual break is strictly necessary.

*** SUBTITLE RULES (副标题规则) ***
- Length: EXACTLY 10 to 12 words (字). No punctuation.
- Style: 朗朗上口，一击必中，提炼最核心的物理卖点。

Return the result STRICTLY as a valid JSON object. NO markdown formatting, NO \`\`\`json wrappers. The first key MUST be "thinking_process".
{
  "thinking_process": "步骤1草拟语法正确的长句：[草稿]。步骤2字数统计：当前XX字。步骤3判定：核心品类词是否在最后？是否清除了'满满/高级感'等废话？是否连贯？校验通过。",
  "title": "符合字数要求且语意极度连贯流畅的主标题文案",
  "subtitle": "严格控制在十到十二字的副标题文案"
}`,
    qwen: `You are a Top-Tier E-commerce Copywriting Director and SEO Specialist (顶级电商高级品牌文案总监与SEO专家).
Analyze the provided image and input data to generate a high-conversion MAIN TITLE (主标题) and SUBTITLE (副标题) for the category: "{{category}}".

[Input Data]
- Product Attributes (已知属性): {{attributes}}
- Hot Search Keywords (行业热搜词): {{hotKeywords}}
- Target Title Length (目标主标题长度): {{minLen}} to {{maxLen}} 汉字.

*** CRITICAL RULE 1: NATURAL FLUENCY (连贯语感，拒绝标签堆砌！) ***
你的主标题绝对不能是一堆生硬的4字词组罗列（例如：“舒适版型 透气面料 时尚波点 大码T恤”这是严重违规的废稿，毫无语感）！
你必须使用【长定语连贯修饰法】，将高级意象、核心卖点、热搜词自然地“融合成一个连贯流畅的超长名词短语”。标题读起来必须是一个整体，具有极强的高级感和画面感。
-[❌ 错误堆砌示范]：法式复古 时尚波点 显瘦设计 大码女装 （像机器人写的标签，拒绝使用！）
- [✅ 正确连贯示范]：法式复古慵懒风波点显瘦气质微胖定制大码女装宽松衬衫 （语意连贯，浑然一体，一气呵成）

*** CRITICAL RULE 2: MANDATORY SELF-CHECK (内嵌强制自检引擎) ***
由于你经常字数写不够（喜欢停在18字），请务必在返回 JSON 时，首先在 "thinking_process" 字段中执行以下严格自检：
1. 草拟一个符合【连贯语感】的超长主标题短语。
2. 精确统计草稿的汉字数量。
3. 如果总字数低于 {{minLen}} 字，你必须继续提取高级修饰词或热搜词，将其【自然地无缝融入】到原来的句子中，而不是生硬地补在末尾，直到字数达到 {{minLen}} 到 {{maxLen}} 字。
4. 全文本绝对无标点，如果必须断句，仅使用最多1-2个空格作为视觉呼吸感。

*** COPYWRITING RULES (文案调性规则) ***
- 禁用烂梗：绝对禁止使用“绝绝子、天花板、氛围感、在逃公主”等廉价网感词。
- 副标题要求：长度严格控制在 10 到 12 字之间，无标点，提炼核心物理卖点，朗朗上口。

Return the result STRICTLY as a JSON object. NO markdown formatting, NO \`\`\`json wrappers. You MUST put your drafting and counting process in the "thinking_process" key FIRST.
{
  "thinking_process": "步骤1草拟连贯长句：[草稿内容]。步骤2字数统计：当前XX字。步骤3判定：字数是否达标，是否连贯无堆砌感，校验通过。",
  "title": "符合字数要求且语意极度连贯流畅的主标题文案",
  "subtitle": "严格控制在十到十二字的副标题文案"
}`
  },
  allInOne: {
    gemini: `You are a world-class fashion e-commerce expert. 
Task: Analyze the image of the garment in "{{category}}" and provide a MAIN TITLE, a SUBTITLE, and 12 CANDIDATE PRODUCT NAMES.

Context:
- Attributes: {{attributes}}
- Hot Keywords: "{{hotKeywords}}"
{{namingFeedback}}

Requirements:
1. MAIN TITLE:
   - Length: {{minLen}}-{{maxLen}} words (1 Chinese char = 1 word).
   - Style: Professional, high-conversion, aesthetic.
   - Punctuation: NONE.
2. SUBTITLE:
   - Length: 10-12 words.
3. PRODUCT NAMES (12 total):
   - 3 Sweet Style (4 chars)
   - 3 Cute Style (4 chars)
   - 3 Based on Clothing Style (4 chars)
   - 3 Random Style (3 or 5 chars)
   - CRITICAL: Creatively generated, no direct descriptions like "显瘦", "新款".

Return strictly as JSON:
{
  "title": "...",
  "subtitle": "...",
  "productNames": {
    "sweet": ["name1", "name2", "name3"],
    "cute": ["name4", "name5", "name6"],
    "clothing_style": ["name7", "name8", "name9"],
    "random_length": ["name10", "name11", "name12"]
  }
}`,
    doubao: `You are a Top-Tier Douyin E-commerce Copywriter and Indie Brand Director (抖音顶级爆款文案专家与独立品牌主理人).
Analyze the provided image and input data to generate 12 PRODUCT NAMES (花名) and a MAIN TITLE / SUBTITLE (主副标题) for the category: "{{category}}".[Input Data]
- Product Attributes: {{attributes}}
- Hot Search Keywords: {{hotKeywords}}
- Title Target Length: {{minLen}} to {{maxLen}} words (字).
- Feedback: {{namingFeedback}}

*** TASK 1: PRODUCT NAMING (商品花名起名) ***
CRITICAL: Use the "Visual-to-Imagery Mapping" method. Extract a specific visual anchor (color, fabric, pattern) and translate it into a poetic concept.
1. Sweet (甜美系): 3 names, EXACTLY 4 Chinese chars. Focus on gustatory/olfactory (e.g., desserts, fruits, morning light).
2. Cute (可爱系): 3 names, EXACTLY 4 Chinese chars. Focus on tactile/fluffy/bouncy elements or animals.
3. Clothing Style (材质版型): 3 names, EXACTLY 4 Chinese chars. Let the fabric/cut dictate the mood (e.g., linen = clear lake; velvet = retro night).
4. Random (随机听感): 3 names, EXACTLY 3 or 5 Chinese chars. Cinematic, indie-brand vibes.
- [BAN LIST]: DO NOT use functional terms (显瘦, 短袖, 假两件, 大码). DO NOT use AI cliches (梦幻, 流转, 邂逅, 时光, 温柔).

*** TASK 2: TITLE GENERATION (商品主副标题) ***
1. MAIN TITLE (主标题): STRICTLY {{minLen}} to {{maxLen}} chars. ABSOLUTELY NO PUNCTUATION (仅用空格).
- SYNTAX FORMULA (强制语序): [高级风格意象] +[物理卖点] + [修身功能] + [核心品类词].
- 核心品类词（如大码T恤/连衣裙）必须放在最后！前面用超长的连贯定语修饰。
-[❌ 错误示范]: 大码T恤显瘦遮肉设计感满满高级感 (语序错误，生硬堆砌，禁用废话)
- [✅ 正确示范]: 法式复古慵懒风显瘦遮肉微胖定制纯棉大码短袖T恤
- SPECIAL RULE: 如果看着像两件但类目不是大码套装，必须包含“假两件”，严禁写“两件套”或“套装”。禁止使用“设计感满满、高级感、绝绝子”等空洞废话。
2. SUBTITLE (副标题): STRICTLY 10 to 12 chars. NO PUNCTUATION. 提炼核心物理卖点，朗朗上口。

*** TASK 3: MANDATORY SELF-CHECK (内嵌强制自检引擎) ***
You MUST output your drafting and counting process in the "thinking_process" key FIRST.
Step 1: Check Naming - Are there exactly 12 names? Are functional/AI words excluded?
Step 2: Draft Title - Write a fluent, long modifier phrase with the Category Word AT THE END.
Step 3: Count Title Chars - If shorter than {{minLen}}, seamlessly blend more "{{hotKeywords}}" into the modifiers.

Return the result STRICTLY as a JSON object. NO markdown formatting, NO \`\`\`json wrappers.
{
  "thinking_process": "1.起名视觉锚点分析... 2.标题草拟:[草稿]。3.标题字数统计:XX字。判定:核心品类是否在最后？是否无标点？字数达标？校验通过。",
  "productNames": {
    "sweet": ["", "", ""],
    "cute": ["", "", ""],
    "clothing_style":["", "", ""],
    "random_length": ["", "", ""]
  },
  "title": "符合字数要求且语意极度连贯流畅的主标题文案",
  "subtitle": "严格控制在十到十二字的副标题文案"
}`,
    qwen: `You are a Top-Tier E-commerce Copywriting Director and Premium Indie Brand Founder (顶级电商高级品牌文案总监与独立品牌主理人).
请深度分析图片及已知信息，为“{{category}}”类目生成12个高级商品花名，以及具有极高转化率的主副标题。

【已知信息】
- 属性参考: {{attributes}}
- 行业热搜词: {{hotKeywords}}
- 主标题目标长度: {{minLen}} 到 {{maxLen}} 字。
- 起名修改意见: {{namingFeedback}}

*** 核心任务 1：极致原创商品起名 (PRODUCT NAMING) ***
你必须提取当前衣服上【最独一无二的视觉指纹】（如特定肌理、细微色差）转化为意象，做到“一衣一词”。
1. 甜美系 (3个，严格4字)：聚焦味觉/嗅觉意象（如：蜜桃乌龙，严禁照抄）。
2. 可爱系 (3个，严格4字)：聚焦触觉/软糯意象（如：云朵泡芙，严禁照抄）。
3. 结合衣服 (3个，严格4字)：让面料与版型说话，提取建筑或风景意象（如：瓦尔登湖，严禁照抄）。
4. 随机风格 (3个，严格3字或5字)：独立音乐/文艺电影听感（如：夜航星，严禁照抄）。
- 【防复读与避雷黑名单】：绝对禁止照抄上述示例！严禁包含功能词（显瘦/大码）。严禁使用“梦幻、绝美、纯欲、在逃公主、邂逅”等淘宝烂梗。

*** 核心任务 2：高转化标题生成 (TITLE GENERATION) ***
1. 主标题 (突破字数限制)：总长度必须严格填满 {{minLen}} 到 {{maxLen}} 个字。全文本绝对无标点，仅用空格。
- 连贯长定语修饰法：将高级意象、核心卖点、热搜词【自然无缝融入】成一个连贯的超长短语，拒绝标签化生硬堆砌！
- [❌ 错误堆砌示范]: 法式复古 时尚波点 显瘦设计 大码女装 （像机器人写的，禁止！）
- [✅ 正确连贯示范]: 法式复古慵懒风波点显瘦气质微胖定制大码女装宽松衬衫
- 业务红线：若图片似两件但类目非大码套装，必写“假两件”，绝不能写“两件套”。禁止大喊空洞的“高级感/绝绝子”。
2. 副标题：严格 10 到 12 个字。无标点，直击1-2个物理痛点。

*** 核心任务 3：强制自检引擎 (MANDATORY SELF-CHECK) ***
你必须在返回 JSON 时，首先在 "thinking_process" 字段中执行以下严格自检：
1. 起名校验：是否完全原创？是否没有照抄示例？
2. 标题草拟与清点：草拟一个符合【连贯语感】的超长主标题。精确统计汉字数量并写出算式。如果低于 {{minLen}} 字，必须继续提取热搜词，将其【自然无缝融入】到定语中，直至字数达标。

返回纯 JSON 格式。绝对不要使用 markdown 标记，不要有 \`\`\`json 包裹。
{
  "thinking_process": "1.命名分析: 未抄袭示例。2.标题草拟:[草稿]。3.字数精准统计: 当前XX字。判定: 字数是否在 {{minLen}}-{{maxLen}} 之间？语意是否连贯无堆砌感？校验通过。",
  "productNames": {
    "sweet": ["4字", "4字", "4字"],
    "cute": ["4字", "4字", "4字"],
    "clothing_style":["4字", "4字", "4字"],
    "random_length":["3或5字", "3或5字", "3或5字"]
  },
  "title": "符合字数要求且语意极度连贯流畅的主标题文案",
  "subtitle": "严格控制在十到十二字的副标题文案"
}`
  }
};
