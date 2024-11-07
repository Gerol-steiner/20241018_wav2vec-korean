from gtts import gTTS
import os

text = "안녕하세요"  # 読み上げるテキスト
tts = gTTS(text=text, lang='ko')  # 韓国語として指定
tts.save("hello.mp3")  # 一時ファイルに保存
os.system("start hello.mp3")  # Windowsの場合、音声を再生
