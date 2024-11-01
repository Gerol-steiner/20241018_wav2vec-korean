from fastapi import APIRouter, Request, File, UploadFile
from fastapi.templating import Jinja2Templates
import whisper

router = APIRouter()
templates = Jinja2Templates(directory="templates")

# Whisperモデルのロード
model = whisper.load_model("base")

@router.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    with open("temp_audio.webm", "wb") as buffer:
        buffer.write(await audio.read())
    
    try:
        result = model.transcribe("temp_audio.webm")
        return {"text": result["text"]}
    except Exception as e:
        print(f"Error during transcription: {e}")
        return {"text": "Transcription failed."}