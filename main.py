from fastapi import FastAPI

# FastAPIのインスタンス化
app = FastAPI()

@app.get("/")
def root():
    return {"message":"Hello world"}


