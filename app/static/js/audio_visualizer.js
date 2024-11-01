let audioContext, analyser, dataArray;
let volumeData = [];
let startTime;
let isRecordingVisualizer = false; // オーディオビジュアライザー用の録音状態

const speakButton = document.getElementById('speakButton');
const graphDiv = document.getElementById('audioGraph');

speakButton.addEventListener('click', () => {
    toggleRecording();
    startSpeechRecognition(); // 音声認識も開始
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
            
            requestAnimationFrame(updateGraph);

            // 3秒後に自動的に停止
            setTimeout(() => {
                if (isRecordingVisualizer) {
                    stopRecording();
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
        
        Plotly.newPlot(graphDiv, [{
            x: volumeData.map(d => d.x),
            y: volumeData.map(d => d.y),
            type: 'scatter',
            mode: 'lines',
            line: {color: '#F148FB', width: 1}
        }], {
            title: 'Real-time Audio Volume',
            xaxis: {
                title: 'Time (s)',
                range: [0, 3],  // 0〜3秒の範囲に固定
                showgrid: true,
                gridcolor: '#767474',
                zeroline: false
            },
            yaxis: {
                title: 'Volume',
                range: [0, 0.4],
                showgrid: true,
                gridcolor: '#767474',
                zeroline: false
            },
            plot_bgcolor: 'rgba(0,0,0,0)',  // 透明な背景
            paper_bgcolor: 'rgba(0,0,0,0)', // 透明な背景
            margin: {t: 50, r: 20, b: 50, l: 50},  // マージンの調整
            font: {family: 'Arial, sans-serif'},   // フォントの設定
        });
        
        requestAnimationFrame(updateGraph);
    }
}