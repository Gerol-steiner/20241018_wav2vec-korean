from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from gtts import gTTS
from jamo import h2j, hangul_to_jamo  # ハングルを音素に分解する
import whisper
import os
import tempfile  # 一時ファイルを扱うためのライブラリをインポート


# APIRouterのインスタンスを作成
# APIルーターを管理するためのオブジェクト
# ここにルート（エンドポイント）を定義し、「main.py」のFastAPIアプリに追加
router = APIRouter()

# Whisperモデルのロード
model = whisper.load_model("base")  # モデル名は必要に応じて変更する

@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)): # 引数名を「audio」とする
    audio_path = "temp_audio.webm"

    try:
        # アップロードされた音声ファイルを一時的に保存
        with open(audio_path, "wb") as buffer:
            buffer.write(await audio.read())

        # Whisperによる音声認識（韓国語を指定）
        result = model.transcribe(audio_path, language='ko')
        text = result["text"].replace(" ", "")  # 空白を削除

        # 音素分解
        raw_phonemes = list(hangul_to_jamo(text))

        # フィルタリングして不要な記号を除去
        phonemes = [phoneme for phoneme in raw_phonemes if phoneme not in ['?', '!', '.', ',']]


        # 認識結果のテキストと認識した言語を表示
        print("認識結果:", result["text"])
        print("認識した言語:", result["language"])  # 言語情報を表示
        print("音素に分解（フィルタリング前）:", raw_phonemes)
        print("音素に分解（フィルタリング後）:", phonemes)

        return {
            "text": result["text"],
            "phonemes": phonemes  # 音素分解結果（フィルタリング後）：ブラウザの「ユーザー音声認識結果の音素分解」として表示される
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # 一時ファイルを削除
        if os.path.exists(audio_path):
            os.remove(audio_path)





class TextRequest(BaseModel):
    text: str  # テキストフィールドを持つPydanticモデル

@router.post("/read")
async def read_text(request: TextRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="No text to send to TTS API")

    try:
        print(f"Received text: {request.text}")  # 受信したテキストをログに出力

        # 一時ファイルを作成
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
            tts = gTTS(text=request.text, lang='ko')  # 韓国語で音声合成
            tts.save(temp_file.name)  # 一時ファイルに音声を保存

        # 音声ファイルを読み込む
        audio_file = open(temp_file.name, 'rb')  # バイナリモードで開く

        response = StreamingResponse(audio_file, media_type="audio/mpeg")  # 音声を返す
        response.headers["Content-Disposition"] = "inline; filename=audio.mp3"  # ファイル名を指定

        return response

    except Exception as e:
        print(f"Error in read_text: {e}")  # エラーメッセージをコンソールに出力
        raise HTTPException(status_code=500, detail=str(e))

