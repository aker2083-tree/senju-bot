from flask import Flask, request
from brain_router import brain_router

app = Flask(__name__)

@app.route("/", methods=["POST"])
def handle():
    data = request.json
    user_input = data.get("text", "")
    reply = brain_router(user_input)
    return {"reply": reply}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
