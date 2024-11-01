from fastapi import APIRouter, File, UploadFile
import whisper

# APIRouterのインスタンスを作成
router = APIRouter()

# Whisperモデルのロード
model = whisper.load_model("base")  # モデル名は必要に応じて変更する

@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    audio_path = "temp_audio.webm"
    
    # アップロードされた音声ファイルを一時的に保存
    with open(audio_path, "wb") as buffer:
        buffer.write(await audio.read())

    # Whisperによる音声認識
    result = model.transcribe(audio_path)
    
    return {"text": result["text"]}