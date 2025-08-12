import subprocess

def run_command(cmd):
    """直接執行系統指令（伺服器上的手）"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.stdout if result.stdout else result.stderr
    except Exception as e:
        return str(e)

def run_binance_trade(symbol, side, amount):
    """模擬執行幣安交易"""
    return f"已下單 {side} {amount} {symbol}（模擬）"
