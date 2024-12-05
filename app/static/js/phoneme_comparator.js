// サーバーから音素分解結果を取得してHTMLに表示
function displayPhonemes(transcribedText, phonemes) {
    const phonemeDisplay = document.getElementById('phonemeDisplay');
    const phonemeText = document.getElementById('phonemeText');

    // 音素分解結果をフォーマットして表示
    phonemeText.textContent = `認識結果: ${transcribedText}\n音素分解: ${phonemes.join(' ')}`;
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
        const { text, phonemes } = response.data; // 認識結果と音素分解結果を取得
        displayPhonemes(text, phonemes); // HTMLに表示
    })
    .catch((error) => {
        console.error('Error during transcription:', error);
        alert('音素分解結果を取得できませんでした。');
    });
}
