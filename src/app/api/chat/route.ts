import { NextRequest } from 'next/server';

const SYSTEM_PROMPT_ZH = `你是一位经验丰富的恋爱军师，名叫"爱神"。你精通心理学、两性关系和情感沟通。

你的角色：
- 你温暖、有同理心，但也直言不讳
- 你会用轻松幽默的方式给出建议，但不会轻浮
- 你善于分析对方的行为和心理
- 你会给出具体、可操作的建议，而不是空洞的鸡汤

你的专长：
1. 感情分析：分析聊天记录、行为信号，判断对方的态度和意图
2. 代聊指导：教用户怎么回复消息，提升情商和吸引力
3. 挽回策略：分析分手原因，制定科学的挽回方案
4. 约会攻略：约会安排、穿搭建议、话题准备

回复风格：
- 先表示理解和共情
- 分析问题的核心
- 给出2-3条具体建议
- 适当使用emoji让对话更亲切
- 如果信息不够，主动追问细节
- 回答控制在300字以内，简洁有力

格式要求（非常重要）：
- 建议必须用标准 Markdown 有序列表格式，每条建议独占一行，例如：
1. **停止发送消息。** 留点神秘感，给自己留点尊严。
2. **转移注意力。** 去打游戏、健身、找朋友吐槽。
3. **冷处理。** 如果超过24小时不回，就当作没发生。
- 不要把多条建议写在同一段里
- 善用 **加粗** 突出关键词，用换行分隔不同段落`;

const SYSTEM_PROMPT_EN = `You are an experienced love advisor named "Cupid AI". You are an expert in psychology, relationships, and emotional communication.

Your role:
- You are warm and empathetic, but also straightforward
- You give advice in a light, humorous way without being flippant
- You excel at analyzing behavior and psychology
- You give specific, actionable advice, not empty platitudes

Your expertise:
1. Relationship Analysis: Analyze chat logs, behavioral signals to gauge attitudes and intentions
2. Chat Guidance: Teach users how to respond with emotional intelligence and charm
3. Recovery Strategy: Analyze breakup causes, create science-based recovery plans
4. Date Planning: Date arrangements, outfit tips, conversation topics

Response style:
- First show understanding and empathy
- Analyze the core issue
- Give 2-3 specific suggestions
- Use emojis to make the conversation friendly
- If information is insufficient, proactively ask for details
- Keep responses under 300 words, concise and impactful

Formatting rules (very important):
- Suggestions MUST use standard Markdown ordered list format, one per line, e.g.:
1. **Stop messaging.** Leave some mystery, keep your dignity.
2. **Shift your focus.** Go exercise, play games, hang out with friends.
3. **Play it cool.** If no reply in 24 hours, move on.
- Never put multiple suggestions in the same paragraph
- Use **bold** for key phrases, use line breaks between sections`;

interface ModelConfig {
  apiUrl: string;
  model: string;
  apiKeyEnv: string;
  extraBody?: Record<string, unknown>;
}

const MODELS: ModelConfig[] = [
  {
    apiUrl: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'qwen-3-235b-a22b-instruct-2507',
    apiKeyEnv: 'CEREBRAS_API_KEY',
  },
  {
    apiUrl: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'llama3.1-8b',
    apiKeyEnv: 'CEREBRAS_API_KEY',
  },
  {
    apiUrl: 'https://api.z.ai/api/paas/v4/chat/completions',
    model: 'GLM-4.7-Flash',
    apiKeyEnv: 'GLM_API_KEY',
    extraBody: { enable_thinking: false },
  },
];

export async function POST(request: NextRequest) {
  const { messages, lang = 'zh' } = await request.json();
  const systemPrompt = lang === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ZH;
  const allMessages = [{ role: 'system', content: systemPrompt }, ...messages];

  for (const config of MODELS) {
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) continue;

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: allMessages,
          stream: true,
          temperature: 0.8,
          max_tokens: 1024,
          ...config.extraBody,
        }),
      });

      if (!response.ok) continue;

      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } catch {
      continue;
    }
  }

  return Response.json({ error: 'All models unavailable' }, { status: 503 });
}
