from oss_client import ask_oss
from action_hands import run_command, run_binance_trade

def brain_router(user_input):
    # 先問 OSS 腦
    oss_reply = ask_oss(user_input)
    if "error" in oss_reply:
        return f"OSS 腦錯誤: {oss_reply['error']}"

    # 根據 OSS 的回覆決定是否啟動手
    if "trade" in oss_reply.get("action", ""):
        return run_binance_trade(
            oss_reply.get("symbol", "BTCUSDT"),
            oss_reply.get("side", "BUY"),
            oss_reply.get("amount", 0.001)
        )
    elif "cmd" in oss_reply.get("action", ""):
        return run_command(oss_reply.get("command", "echo 沒有指令"))
    else:
        return oss_reply.get("message", "沒有動作")
