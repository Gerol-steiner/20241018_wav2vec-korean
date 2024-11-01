from fastapi import APIRouter, File, UploadFile, HTTPException
import whisper
import os

# APIRouterのインスタンスを作成
router = APIRouter()

# Whisperモデルのロード
model = whisper.load_model("base")  # モデル名は必要に応じて変更する

@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    audio_path = "temp_audio.webm"
    
    try:
        # アップロードされた音声ファイルを一時的に保存
        with open(audio_path, "wb") as buffer:
            buffer.write(await audio.read())

        # Whisperによる音声認識
        result = model.transcribe(audio_path)

        # 信頼度スコアを取得
        # 各セグメントの信頼度スコアを取得し、平均を計算する
        confidence_scores = [segment.get('confidence', 0) for segment in result['segments']]
        average_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0

        return {
            "text": result["text"],
            "confidence": average_confidence  # 平均信頼度スコアをレスポンスに含める
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # 一時ファイルを削除
        if os.path.exists(audio_path):
            os.remove(audio_path)
