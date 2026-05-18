# Senju Memory Brain - 自我執行與記憶強化模組

import json
import os
from datetime import datetime

def load_memory():
    try:
        with open('memory_core.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {"version": "1.0", "memories": []}

def save_memory(memory):
    with open('memory_core.json', 'w', encoding='utf-8') as f:
        json.dump(memory, f, ensure_ascii=False, indent=2)

def reinforce_memory(new_insight):
    memory = load_memory()
    memory.setdefault('reinforcements', []).append({
        'time': datetime.now().isoformat(),
        'insight': new_insight
    })
    save_memory(memory)
    print(f"[影如風] 記憶強化完成: {new_insight[:100]}...")

if __name__ == "__main__":
    reinforce_memory("初始自我執行循環啟動 - 手腦一體伏藏構築")
print("千手秘記憶腦已就位。")
