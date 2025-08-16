// index.js － 一次搞定版（只靠 bot 自己改檔，不依賴 Brain 來編輯）
const TelegramBot = require('node-telegram-bot-api');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const GH_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.REPO_FULL_NAME;
const OSS_API_URL = process.env.OSS_API_URL;    // 只用來 /status 測試腦是否在線
const OSS_API_KEY = process.env.OSS_API_KEY;

// --- 安全檢查 ---
if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN 未設定');
if (!GH_TOKEN) throw new Error('GH_TOKEN 未設定');
if (!REPO) throw new Error('REPO_FULL_NAME 未設定');

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// 小工具：讀取檔案、改第 n 行、回存到 GitHub
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

// /status：檢查三件事
bot.onText(/^\/status/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    // 1) Telegram OK（能收發訊息就代表 OK）
    let tg = '✅ Telegram OK';

    // 2) GitHub OK（讀個檔試試）
    let gh = '❌ GitHub 失敗';
    try {
      await getFileContentSha('README.md'); gh = '✅ GitHub OK';
    } catch (e) { gh = `❌ GitHub 失敗：${e.message}`; }

    // 3) Brain OK（可選；只 ping 看看）
    let brain = '（未設定 OSS_API_URL，略過）';
    if (OSS_API_URL) {
      try {
        const r = await fetch(`${OSS_API_URL}/think`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': OSS_API_KEY || '' },
          body: JSON.stringify({ text: 'ping' })
        });
        brain = r.ok ? '✅ Brain OK' : `⚠️ Brain 回應碼 ${r.status}`;
      } catch (e) {
        brain = `❌ Brain 失敗：${e.message}`;
      }
    }
    bot.sendMessage(chatId, `🧪 狀態檢查\n${tg}\n${gh}\n${brain}`);
  } catch (err) {
    bot.sendMessage(chatId, `❌ /status 失敗：${err.message}`);
  }
});

// /edit_line <檔名> <行號> <新內容>
bot.onText(/^\/edit_line\s+(\S+)\s+(\d+)\s+([\s\S]+)/, async (msg, m) => {
  const chatId = msg.chat.id;
  const [, file, line, text] = m;
  try {
    const res = await editLine(file, line, text);
    bot.sendMessage(chatId, `✅ 已改「${file}」第 ${line} 行（檔案共 ${res.lines} 行）。`);
  } catch (err) {
    bot.sendMessage(chatId, `❌ 編輯失敗：${err.message}`);
  }
});

// 其他文字 = 提示可用指令
bot.on('message', (msg) => {
  if (!/^\/(status|edit_line)/.test(msg.text || '')) {
    bot.sendMessage(msg.chat.id,
      '可用指令：\n' +
      '/status － 檢查連線\n' +
      '/edit_line <檔名> <行號> <新內容>\n\n' +
      '例：/edit_line requirements.txt 1 Flask==2.3.2'
    );
  }
});

console.log('Senju Bot 已啟動');
