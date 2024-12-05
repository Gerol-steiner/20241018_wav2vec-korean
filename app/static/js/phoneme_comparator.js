// サーバーから音素分解結果を取得してHTMLに表示
function displayPhonemes(transcribedText, transcribedPhonemes, questionText, questionPhonemes) {
    const phonemeText = document.getElementById('phonemeText');

    // 音素分解結果をフォーマットして表示
    phonemeText.textContent = `
        ユーザー音声認識結果: ${transcribedText}\nユーザー音声認識結果の音素分解: ${transcribedPhonemes.join(' ')}\n
    `;
}

// 出題テキストを音素分解する関数
function decomposeQuestionTextToPhonemes() {
    const questionText = document.getElementById('wordDisplay').textContent;

    if (!questionText) {
        console.warn("出題テキストが空です。");
        return { questionText: '', questionPhonemes: '' };
    }

    // 音素分解 (文字列として返す)
    const questionPhonemes = jamo.decompose(questionText).join(' ');
    console.log('出題テキスト:', questionText);
    console.log('音素分解結果:', questionPhonemes);

    return { questionText, questionPhonemes };
}

// 音素分解結果を表示する関数
function decomposeAndDisplayQuestionPhonemes() {
    const questionText = document.getElementById('wordDisplay').textContent;

    if (!questionText) {
        alert("出題テキストがありません！");
        return;
    }

    // 音素分解
    const questionPhonemes = jamo.decompose(questionText).join(' ');
    console.log('出題テキスト:', questionText);
    console.log('音素分解結果:', questionPhonemes);

    // 表示エリアを更新
    const questionPhonemeDisplay = document.getElementById('questionPhonemeText');
    questionPhonemeDisplay.textContent = `出題テキスト: ${questionText}\n音素分解: ${questionPhonemes}`;
}

// 音声データをサーバーに送信して結果を取得
function sendAudioAndDisplayPhonemes(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.webm');

    // サーバーにリクエストを送信
    axios.post('http://localhost:8000/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((response) => {
        const { text: transcribedText, phonemes: transcribedPhonemes } = response.data;

        // 出題テキストの音素分解結果を取得
        const questionText = document.getElementById('wordDisplay').textContent || '';
        const questionPhonemes = questionText ? jamo.decompose(questionText).join(' ') : '';

        // HTMLに表示
        displayPhonemes(transcribedText, transcribedPhonemes, questionText, questionPhonemes);
    })
    .catch((error) => {
        console.error('Error during transcription:', error);
        alert('音素分解結果を取得できませんでした。');
    });
}

// ページロード時とボタンイベントをまとめて設定
document.addEventListener('DOMContentLoaded', () => {
    // 「出題テキストを音素に分解」ボタンのイベントリスナーを追加
    const decomposeTextButton = document.getElementById('decomposeTextButton');
    decomposeTextButton.addEventListener('click', decomposeAndDisplayQuestionPhonemes);
});
