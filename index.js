const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// 讀環境變數（Railway 你已經設好）
const TG_TOKEN  = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const OSS_URL   = process.env.OSS_API_URL;     // 例: https://senju-oss-brain-production.up.railway.app
const OSS_KEY   = process.env.OSS_API_KEY;     // 你在 brain 服務設定的金鑰
const REPO_FULL = process.env.REPO_FULL_NAME;  // 例: aker2083-tree/senju-bot
const GH_TOKEN  = process.env.GH_TOKEN;        // GitHub PAT（腦需要時可用來改碼）

if (!TG_TOKEN || !OSS_URL || !OSS_KEY || !REPO_FULL || !GH_TOKEN) {
  console.error('❌ 環境變數缺失：請確認 TELEGRAM_BOT_TOKEN/BOT_TOKEN, OSS_API_URL, OSS_API_KEY, REPO_FULL_NAME, GH_TOKEN 都已在 Railway 設定。');
  process.exit(1);
}

const bot = new TelegramBot(TG_TOKEN, { polling: true });
console.log('✅ Senju Bot 已啟動（手）— 連線 Telegram 成功');

// 小工具：把腦的回覆切段（避免超過 Telegram 長度限制）
function chunk(text, size = 3800) {
  const parts = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts;
}

bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    "千手秘（手+腦）已就緒。\n\n你可以直接用自然語言下指令，例：\n- 「把 requirements.txt 第1行改成 Flask==2.3.2」\n- 「新增檔案 README.md 並寫上啟動指令」\n- 「查看目前狀態」\n\n我會把你的需求傳給腦（OSS），讓她自思自改，改完自動觸發重佈署。"
  );
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  // 忽略 /start（上面處理過）
  if (/^\/start$/.test(text)) return;

  // 基本心跳
  if (/^\/status$/.test(text)) {
    await bot.sendMessage(chatId, "🧠 手腦連線正常，請直接描述你要我改什麼。");
    return;
  }

  // 把所有自然語言交給腦
  try {
    await bot.sendChatAction(chatId, 'typing');

    const payload = {
      key: OSS_KEY,
      repo_full_name: REPO_FULL,
      gh_token: GH_TOKEN,
      user_text: text,
      meta: {
        from: 'senju-bot',
        telegram: {
          chat_id: chatId,
          user_id: msg.from?.id,
          username: msg.from?.username || '',
          name: `${msg.from?.first_name || ''} ${msg.from?.last_name || ''}`.trim()
        }
      }
    };

    // 假設腦有一個 /run 的端點，負責「理解→改碼→push→回覆結論」
    const res = await axios.post(`${OSS_URL.replace(/\/$/, '')}/run`, payload, { timeout: 120000 });

    const reply = typeof res.data === 'string'
      ? res.data
      : (res.data?.message || '（腦已處理完畢）');

    // 分段回覆
    for (const part of chunk(reply)) {
      await bot.sendMessage(chatId, part);
    }
  } catch (err) {
    const msgErr = err?.response?.data?.error || err?.message || `${err}`;
    await bot.sendMessage(chatId, `⚠️ 腦處理失敗：${msgErr}`);
    console.error('OSS error:', msgErr);
  }
});
