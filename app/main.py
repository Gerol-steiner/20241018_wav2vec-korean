from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routes import audio_routes

app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.include_router(audio_routes.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)