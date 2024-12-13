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

    // speakButtonを非表示、audioGraphを表示
    speakButton.style.display = 'none';
    graphDiv.style.display = 'block';

    // オーディオ処理を初期化
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
            audioChunks = [];

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
            mediaRecorder.onstop = () => {
                sendAudioToServer();
                stopRecording();
            };
            mediaRecorder.start();
            requestAnimationFrame(updateGraph);

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

    // ボタン表示を戻す際にHTMLの子要素を直接変更せず、CSSと構造を保持
    graphDiv.style.display = 'none';
    speakButton.style.display = 'flex'; // display:flexを指定してCSSの影響を適用

    const img = speakButton.querySelector('.speak-icon');
    if (img) {
        img.src = '/static/images/speak.svg';
    }

    const span = speakButton.querySelector('.speak-text');
    if (span) {
        span.textContent = 'Speak';
    }

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
            type: 'line',
            line: {
                color: 'rgb(58, 171, 210)', // ラインの色を指定 // ラインの色をマゼンタに指定
                width: 2 // ラインの太さ（オプション）
            }
        }], {
            title: '', // グラフタイトルを非表示
            width: 400, // グラフ全体の幅を固定
            height: 150, // グラフ全体の高さを固定
            margin: {
                l: 0, // 左の余白
                r: 0, // 右の余白
                t: 0, // 上の余白
                b: 0  // 下の余白
            },
            xaxis: {
                title: '', // X軸ラベルを非表示
                range: [0, 3], // 横軸の範囲を0〜3秒に固定
                showticklabels: false, // X軸のメモリを非表示
                showgrid: false, // X軸のグリッド線を非表示
                visible: false // X軸を完全に非表示
            },
            yaxis: {
                title: '', // Y軸ラベルを非表示
                showticklabels: false, // Y軸のメモリを非表示
                showgrid: false, // Y軸のグリッド線を非表示
                visible: false // Y軸を完全に非表示
            },
            paper_bgcolor: 'rgba(0,0,0,0)', // グラフ外部の背景を透明にする
            plot_bgcolor: 'rgba(0,0,0,0)'  // グラフ内部の背景を透明にする
        }, {
            displayModeBar: false // ツールバーメニューを非表示にする
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

