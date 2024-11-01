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