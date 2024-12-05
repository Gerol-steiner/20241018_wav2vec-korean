const wordList = [
    "안녕하세요", // こんにちは
    "그는 누구예요?",  // 彼は誰ですか？
    "그는 존이에요.",  // 彼はジョンです。
    "그는 대학생이에요?",  //  彼は大学生ですか？
    "이 학교에 유학생들이 많아요.",  //  この学校には留学生たちが多いです。
    "사람들이 저기에 있어요.",  //  人々があそこにいます。
    "저 학생도 외국인이에요",  //  あの学生も外国人です。
    "안녕하세요. 잘 부탁드립니다",     // こんにちは。よろしくお願いします。
    "안녕하세요, 만나서 반가워요",     // こんにちは、お会いできて嬉しいです。
    "여기가 집이에요?",     // ここが家ですか？
    "아니요, 거기는 고양이의 집이에요",     // いいえ、そこは猫の家です。
    "고양이가 어디에 있어요?",     // 猫はどこにいますか？
    "저기는 지수의 집이에요.",     // あそこはジスの家です。
    "가방 안에 무엇이 있어요?",      // カバンの中に何がありますか？
    "의자 아래에 뭐가 있어요?",     // 椅子の下に何がありますか？
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
