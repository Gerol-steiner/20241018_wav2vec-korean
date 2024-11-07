let audioContext, analyser, dataArray;
let volumeData = [];
let startTime;
let isRecordingVisualizer = false; // オーディオビジュアライザー用の録音状態
let audioChunks = []; // 録音データを保存する配列
let audioBlob; // 録音データを保存するための変数(自分の声の再生用)

const speakButton = document.getElementById('speakButton');
const graphDiv = document.getElementById('audioGraph');
const playButton = document.getElementById('playButton');  // 再生ボタンの取得

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
            audioChunks = []; // ★ 録音データを初期化

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data); // ★ここで録音データを保存
            };
            
            // 録音停止時にサーバーに送信し、その後stopRecordingを呼び出す
            mediaRecorder.onstop = () => {
                sendAudioToServer(); // ★ 録音停止時にサーバーに送信
                stopRecording(); // 録音停止後にボタンの状態を元に戻す
            };

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
    speakButton.textContent = 'Speak'; // ボタンを元に戻す
    speakButton.disabled = false; // ボタンを再度有効にする
    if (audioContext) {
        audioContext.close();
    }
}



function updateGraph() {
    if (!isRecordingVisualizer && volumeData.length === 0) return;

    if (isRecordingVisualizer) {
        analyser.getByteFrequencyData(dataArray);
        let volume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length / 255;
        let time = (Date.now() - startTime) / 1000;  // 秒に変換
        volumeData.push({x: time, y: volume});

        // 3秒間のデータのみを保持
        volumeData = volumeData.filter(data => data.x >= 0 && data.x <= 3);

        // グラフを更新
        Plotly.newPlot(graphDiv, [{
            x: volumeData.map(data => data.x),
            y: volumeData.map(data => data.y),
            type: 'scatter'
        }], {
            title: 'Audio Volume Over Time',
            xaxis: { title: 'Time (seconds)', range: [0, 3] }, // 横軸の範囲を0から3秒に固定
            yaxis: { title: 'Volume (normalized)' }
        });

        requestAnimationFrame(updateGraph);
    }
}

function sendAudioToServer() {
    audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // 録音データを保存
    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.webm');

    // FastAPIエンドポイントにPOSTリクエスト
    axios.post('http://localhost:8000/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then(response => {
        document.getElementById('transcriptionResult').textContent = response.data.text; // 結果を表示
        playButton.disabled = false; // 録音されたデータがある場合、再生ボタンを有効にする
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// 再生ボタンのクリックイベント
playButton.addEventListener('click', () => {
    if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play(); // 録音した音声を再生
    }
});