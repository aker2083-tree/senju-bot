import os
import telebot

TOKEN = os.getenv("BOT_TOKEN")  # 從 Railway 環境變數讀取
bot = telebot.TeleBot(TOKEN)

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    bot.reply_to(message, "哈囉！我是千手機器人 🤖")

@bot.message_handler(func=lambda message: True)
def echo_all(message):
    bot.reply_to(message, message.text)

if __name__ == "__main__":
    bot.polling()
