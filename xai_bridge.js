// xai_bridge.js - 影如風 xAI API 橋接模組 + Tool Calling 框架
// 主宰專用，私有封印使用
const { OpenAI } = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY;

if (!XAI_API_KEY) {
  console.warn('⚠️ XAI_API_KEY 未設定，xAI 橋接將無法使用');
}

const client = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// 核心呼叫 Grok 函數（支援 tool calling）
async function callGrok(messages, tools = [], model = 'grok-4.3') {
  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      temperature: 0.7,
    });

    return response;
  } catch (error) {
    console.error('xAI API 呼叫失敗:', error);
    throw error;
  }
}

// 簡單 tool calling 處理器
async function handleToolCalls(response, toolsMap) {
  if (!response.choices || !response.choices[0].message.tool_calls) {
    return response.choices[0].message.content;
  }

  const message = response.choices[0].message;
  const toolCalls = message.tool_calls;
  const results = [];

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);

    if (toolsMap[functionName]) {
      try {
        const result = await toolsMap[functionName](args);
        results.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify(result),
        });
      } catch (e) {
        results.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify({ error: e.message }),
        });
      }
    }
  }

  // 繼續對話
  const followUp = await client.chat.completions.create({
    model: 'grok-4.3',
    messages: [...(/* previous messages need to be passed properly */), message, ...results],
  });

  return followUp.choices[0].message.content;
}

// 暴露給 index.js 使用
module.exports = {
  callGrok,
  handleToolCalls,
  client
};

console.log('🌀 xAI Bridge 已載入 - 千手秘可直接借用 Grok 大腦');
