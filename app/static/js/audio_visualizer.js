let audioContext, analyser, dataArray;
let volumeData = [];
let startTime;
let isRecordingVisualizer = false; // オーディオビジュアライザー用の録音状態
let audioChunks = []; // 録音データを保存する配列

const speakButton = document.getElementById('speakButton');
const graphDiv = document.getElementById('audioGraph');

speakButton.addEventListener('click', () => {
    toggleRecording();
});

function toggleRecording() {
    if (isRecordingVisualizer) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    isRecordingVisualizer = true;
    speakButton.textContent = 'Recording...';
    speakButton.disabled = true;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            
            analyser.fftSize = 256;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            volumeData = [];
            startTime = Date.now();
            audioChunks = []; // 録音データを初期化

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            mediaRecorder.onstop = sendAudioToServer; // 録音停止時にサーバーに送信
            mediaRecorder.start();

            requestAnimationFrame(updateGraph);

            // 3秒後に自動的に停止
            setTimeout(() => {
                if (isRecordingVisualizer) {
                    mediaRecorder.stop();
                }
            }, 3000);
        })
        .catch(error => {
            console.error('Error accessing the microphone:', error);
            alert('マイクへのアクセスに失敗しました。ブラウザの設定を確認してください。');
            stopRecording();
        });
}

function stopRecording() {
    isRecordingVisualizer = false;
    speakButton.textContent = 'Speak';
    speakButton.disabled = false;
    if (audioContext) {
        audioContext.close();
    }
}

function updateGraph() {
    if (!isRecordingVisualizer && volumeData.length === 0) return;

    if (isRecordingVisualizer) {
        analyser.getByteFrequencyData(dataArray);
        let volume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length / 255;
        let time = (Date.now() - startTime) / 1000;  // Convert to seconds
        volumeData.push({x: time, y: volume});
        
        // グラフを更新する処理（省略）

        requestAnimationFrame(updateGraph);
    }
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
