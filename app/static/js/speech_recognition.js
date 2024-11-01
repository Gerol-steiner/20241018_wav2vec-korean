let speechMediaRecorder; // 音声認識用のメディアレコーダー
let audioChunks = [];
let isRecordingSpeech = false; // 録音状態を管理するフラグ
let isRecognizing = false; // 音声認識状態を管理するフラグ

function startSpeechRecognition() {
    console.log("Attempting to start recognition...");

    if (isRecognizing) {
        console.log("Recognition is already started.");
        return; // すでに音声認識が開始されている場合は何もしない
    }

    audioChunks = []; // 録音データを初期化
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            speechMediaRecorder = new MediaRecorder(stream);
            speechMediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            speechMediaRecorder.onstop = sendAudioToServer;
            speechMediaRecorder.start();
            isRecordingSpeech = true; // 録音開始
            
            setTimeout(() => {
                if (speechMediaRecorder.state === "recording") {
                    speechMediaRecorder.stop();
                }
            }, 3000); // 3秒後に自動停止
            
            isRecognizing = true; // 音声認識開始
        })
        .catch(error => {
            console.error('Error accessing the microphone:', error);
            alert('マイクへのアクセスに失敗しました。ブラウザの設定を確認してください。');
        });
}

// 音声データをサーバーに送信
function sendAudioToServer() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.webm');

    // FastAPIエンドポイントにPOSTリクエスト
    axios.post('http://localhost:8000/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then(response => {
        document.getElementById('transcriptionResult').textContent = response.data.text; // 結果を表示
    })
    .catch(error => {
        console.error('Error:', error);
    });
}