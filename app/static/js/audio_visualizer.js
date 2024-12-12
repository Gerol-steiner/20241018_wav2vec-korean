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
    // オーディオ処理を初期化
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    // マイクにアクセス
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            // マイクデータをオーディオ処理に接続（マイクからの音声ストリーム（stream）を AudioContext の入力ソースとして接続）
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser); // 入力ソース（source）をアナライザーに接続

            analyser.fftSize = 256;  // 周波数解析の精度
            dataArray = new Uint8Array(analyser.frequencyBinCount);  // 「frequencyBinCount」：FFT（高速フーリエ変換）により解析される周波数帯域の数（dataArray はそのデータを格納する配列）
            volumeData = []; // 音量データを保持する配列をリセット
            startTime = Date.now();
            audioChunks = []; // ★ 録音データをを保持する配列を初期化

            const mediaRecorder = new MediaRecorder(stream); // マイクからの音声ストリーム（stream）を録音するオブジェクト
            mediaRecorder.ondataavailable = (event) => {  // 録音中に取得した音声データ（event.data）を audioChunks 配列に追加
                audioChunks.push(event.data); // ★ここで録音データを保存
            };

            // 録音停止時にサーバーに送信し、その後stopRecordingを呼び出す
            mediaRecorder.onstop = () => {
                sendAudioToServer(); // ★ 録音停止時にサーバーに送信
                stopRecording(); // 録音停止後にボタンの状態を元に戻す
            };
            // 録音を開始（録音データは、「ondataavailable」 イベントを通じて収集される）
            mediaRecorder.start();
            // 録音中にビジュアライザーのグラフをリアルタイムで更新する処理を開始（「updateGraph」 はグラフの更新を行う関数）
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
    // 録音が停止していてデータが空の場合は終了
    if (!isRecordingVisualizer && volumeData.length === 0) return;

    if (isRecordingVisualizer) {
        analyser.getByteFrequencyData(dataArray); // アナライザーから周波数データを取得し、dataArray に格納
        let volume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length / 255; // 音量を計算（正規化）
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
        // 次回の画面再描画タイミングで updateGraph 関数を再実行
        // これにより、グラフがリアルタイムで更新され続ける
        requestAnimationFrame(updateGraph);
    }
}

function sendAudioToServer() {
    audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    console.log('生成されたBlob:', audioBlob); // デバッグ用

    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.webm');

    axios.post('http://localhost:8000/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((response) => {
        console.log('サーバーからのレスポンス:', response.data); // レスポンス確認
        document.getElementById('transcriptionResult').textContent = response.data.text;

        // 音素分解結果を表示
        const { text, phonemes } = response.data;
        displayPhonemes(text, phonemes);

        // 出題テキストの音素分解を自動実行
        decomposeAndDisplayQuestionText();

        // 自動評価を実行
        evaluateUserInput();

        // 再生ボタンを有効化
        if (audioBlob.size > 0) {
            playButton.disabled = false; // 再生ボタンを有効にする
        } else {
            console.error('audioBlobが空です。録音に失敗した可能性があります。');
        }
    })
    .catch((error) => {
        console.error('Error during transcription:', error);
        alert('サーバーに音声データを送信できませんでした。');
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

