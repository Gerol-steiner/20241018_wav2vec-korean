from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse  # HTMLResponseをインポート
from app.routes import audio_routes  # audio_routes.pyからインポート

app = FastAPI()

# CORS設定
origins = [
    "http://localhost:8000",  # 自分自身のオリジン
    "http://127.0.0.1:8000",  # 127.0.0.1も許可
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 許可するオリジンのリスト
    allow_credentials=True,
    allow_methods=["*"],  # 許可するHTTPメソッド
    allow_headers=["*"],  # 許可するHTTPヘッダー
)

# 静的ファイルのマウント
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# ルーターの追加
app.include_router(audio_routes.router)

@app.get("/", response_class=HTMLResponse)  # HTMLResponseを指定
async def read_index():
    with open("app/static/index.html") as f:
        return f.read()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)