let speechMediaRecorder; // 音声認識用のメディアレコーダー
let audioChunks = [];
let isRecordingSpeech = false; // 録音状態を管理するフラグ
let isRecognizing = false; // 音声認識状態を管理するフラグ

// 音声認識の初期化
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'ko-KR'; // 韓国語を指定
recognition.interimResults = true; // 中間結果を取得するかどうか

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

            try {
                recognition.start(); // 音声認識開始
                console.log("Recognition started.");
            } catch (error) {
                console.error('Error starting recognition:', error);
                isRecognizing = false; // エラー発生時にフラグをリセット
                document.getElementById('speakButton').disabled = false; // ボタンを再度有効化
                return;
            }
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

    axios.post('/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then(response => {
        document.getElementById('transcriptionResult').textContent = response.data.text; // 結果を表示
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// 音声認識結果の処理
recognition.onresult = function(event) {
    let transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');

    document.getElementById('transcriptionResult').textContent = transcript; // 結果を表示
};

// エラー処理
recognition.onerror = function(event) {
    console.error(`Recognition error: ${event.error}`);
    isRecognizing = false; // エラー発生時にフラグをリセット
    document.getElementById('speakButton').disabled = false; // ボタンを再度有効化
};

// 録音停止時および音声認識終了時の処理
recognition.onend = function() {
    console.log("Recognition ended.");
    isRecordingSpeech = false; // 録音終了
    isRecognizing = false; // 音声認識終了
    document.getElementById('speakButton').disabled = false; // ボタンを再度有効化
};

// ボタンがクリックされたときのイベントリスナー
document.getElementById('speakButton').addEventListener('click', () => {
    if (!isRecordingSpeech) {
        document.getElementById('speakButton').disabled = true; // ボタンを無効化
        startSpeechRecognition();
    }
});