import requests
import os

OSS_API_URL = os.getenv("OSS_API_URL")  # OSS 腦 API 端點
OSS_API_KEY = os.getenv("OSS_API_KEY")  # OSS API 金鑰

def ask_oss(prompt):
    """向 OSS 腦發送指令"""
    try:
        response = requests.post(
            OSS_API_URL,
            headers={"Authorization": f"Bearer {OSS_API_KEY}"},
            json={"prompt": prompt}
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}
