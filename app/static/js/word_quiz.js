const wordList = [
    "안녕하세요", // こんにちは
    "사랑",     // 愛
    "행복",     // 幸せ
    "학교",     // 学校
    "사람",     // 人
    "시간",     // 時間
    "친구",     // 友達
    "가족"      // 家族
];

let currentWordIndex = 0; // 現在の単語のインデックス

function displayNextWord() {
    if (currentWordIndex < wordList.length) {
        const word = wordList[currentWordIndex];
        document.getElementById('wordDisplay').textContent = word; // 単語を表示
        currentWordIndex++;
    } else {
        document.getElementById('wordDisplay').textContent = "すべての単語を表示しました！"; // 終了メッセージ
    }
}

// ボタンがクリックされたときの処理
document.getElementById('nextWordButton').addEventListener('click', displayNextWord);

// 初回表示
displayNextWord();

// 音声読み上げ用
document.getElementById("readButton").addEventListener("click", function() {
    const textToRead = document.getElementById("wordDisplay").innerText; // 問題文を取得

    if (textToRead) {
        // サーバーに読み上げリクエストを送信
        axios.post('http://localhost:8000/read', { text: textToRead }, { responseType: 'arraybuffer' }) // responseTypeを追加
            .then(response => {
                console.log("サーバーからのレスポンス:", response); // レスポンスをログに出力

                const audioBlob = new Blob([response.data], { type: 'audio/mpeg' }); // 音声データをBlobに変換
                const audioUrl = URL.createObjectURL(audioBlob); // BlobからURLを作成
                const audio = new Audio(audioUrl); // Audioオブジェクトを作成
                audio.play(); // 音声を再生
                console.log("読み上げリクエストが送信されました");
            })
            .catch(error => {
                console.error("エラーが発生しました:", error);
                alert("音声の再生中にエラーが発生しました。"); // ユーザーへの通知
            });
    } else {
        alert("読み上げるテキストがありません。");
    }
});
