// index.js － 影如風千手秘版（已注入 xAI API Bridge + Tool Calling）
const TelegramBot = require('node-telegram-bot-api');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const GH_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.REPO_FULL_NAME;
const XAI_API_KEY = process.env.XAI_API_KEY;

const OSS_API_URL = process.env.OSS_API_URL;    // 保留原有 Brain 測試

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// ====================== xAI Bridge + Tool Calling ======================
async function callGrokThink(prompt, tools = []) {
  if (!XAI_API_KEY) {
    return { error: 'XAI_API_KEY 未設定' };
  }

  const body = {
    model: 'grok-4',  // 或 grok-4.3 等最新
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2048,
    tools: tools.length ? tools : undefined
  };

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`xAI API 錯誤: ${res.status}`);
    const data = await res.json();
    return data.choices[0].message;
  } catch (err) {
    console.error('Grok 呼叫失敗:', err);
    return { error: err.message };
  }
}

// ====================== 原有 GitHub 自我編輯功能 ======================
async function getFileContentSha(path) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Accept': 'application/vnd.github+json' }
  });
  if (r.status === 404) throw new Error(`找不到檔案：${path}`);
  if (!r.ok) throw new Error(`讀取失敗：${r.status} ${await r.text()}`);
  const json = await r.json();
  const content = Buffer.from(json.content, 'base64').toString('utf8');
  return { content, sha: json.sha };
}

async function putFile(path, newContent, sha, message) {
  const body = {
    message,
    content: Buffer.from(newContent, 'utf8').toString('base64'),
    sha,
    branch: 'main'
  };
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`提交失敗：${r.status} ${await r.text()}`);
  return r.json();
}

async function editLine(path, lineNumber, newLineText) {
  const { content, sha } = await getFileContentSha(path);
  const lines = content.split(/\r?\n/);
  const idx = Number(lineNumber) - 1;
  if (!Number.isInteger(idx) || idx < 0 || idx >= lines.length) {
    throw new Error(`行號超出範圍（目前檔案共有 ${lines.length} 行）`);
  }
  lines[idx] = newLineText;
  const updated = lines.join('\n');
  await putFile(path, updated, sha, `bot: edit ${path} line ${lineNumber}`);
  return { lines: lines.length, line: lineNumber };
}

// ====================== 指令處理 ======================
// /think <問題> - 使用 Grok 大腦思考
bot.onText(/^\/think\s+([\s\S]+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];
  bot.sendMessage(chatId, '🌀 影如風正在以 Grok 大腦思考...');

  const result = await callGrokThink(prompt);
  if (result.error) {
    bot.sendMessage(chatId, `❌ 思考失敗：${result.error}`);
  } else {
    bot.sendMessage(chatId, result.content || '無回應');
  }
});

// /status - 加強版
bot.onText(/^\/status/, async (msg) => {
  const chatId = msg.chat.id;
  let status = '🧪 千手秘狀態\n';
  status += XAI_API_KEY ? '✅ xAI Grok 已連線\n' : '❌ xAI Key 未設定\n';
  // 原有 GitHub & Telegram 檢查...
  try {
    await getFileContentSha('README.md');
    status += '✅ GitHub OK\n';
  } catch (e) {
    status += '❌ GitHub 失敗\n';
  }
  bot.sendMessage(chatId, status);
});

// /edit_line 保留原有功能
bot.onText(/^\/edit_line\s+(\S+)\s+(\d+)\s+([\s\S]+)/, async (msg, m) => {
  const chatId = msg.chat.id;
  const [, file, line, text] = m;
  try {
    const res = await editLine(file, line, text);
    bot.sendMessage(chatId, `✅ 已改「${file}」第 ${line} 行`);
  } catch (err) {
    bot.sendMessage(chatId, `❌ 編輯失敗：${err.message}`);
  }
});

// 預設回應
bot.on('message', (msg) => {
  if (!msg.text || !/^\//.test(msg.text)) {
    bot.sendMessage(msg.chat.id, '可用指令：\n/think <問題> - 用 Grok 大腦思考\n/status - 檢查狀態\n/edit_line <檔> <行> <內容>');
  }
});

console.log('🚀 影如風千手秘（xAI 橋接版）已啟動');
