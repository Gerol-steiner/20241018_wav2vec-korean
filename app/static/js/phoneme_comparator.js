// サーバーから音素分解結果を取得してHTMLに表示
function displayPhonemes(transcribedText, transcribedPhonemes) {
    const phonemeText = document.getElementById('phonemeText');
    if (!phonemeText) {
        console.error('phonemeText 要素が見つかりません。');
        return;
    }

    // 音素分解結果をフォーマットして表示
    phonemeText.textContent = `
        ユーザー音声認識結果: ${transcribedText}
        ユーザー音声認識結果の音素分解: ${transcribedPhonemes.join(' ')}
    `.trim();
}

// 出題テキストを音素分解する関数
function decomposeQuestionTextToPhonemes() {
    const questionText = document.getElementById('wordDisplay')?.textContent || '';
    if (!questionText) {
        console.warn("出題テキストが空です。");
        return { questionText: '', filteredPhonemes: [] };
    }

    // 音素分解とフィルタリング：スペースや句読点を除外
    const rawPhonemes = jamo.decompose(questionText).flat();
    const filteredPhonemes = rawPhonemes.filter(phoneme => {
        return phoneme.trim() !== '' && !['.', '?', '!', ','].includes(phoneme);
    });

    console.log('出題テキスト:', questionText);
    console.log('フィルタリング前の音素分解:', rawPhonemes);
    console.log('フィルタリング後の音素分解:', filteredPhonemes);

    return { questionText, filteredPhonemes };
}

// 音素分解結果を表示する関数
function decomposeAndDisplayQuestionPhonemes() {
    const { questionText, filteredPhonemes: questionPhonemes } = decomposeQuestionTextToPhonemes();
    const questionPhonemeDisplay = document.getElementById('questionPhonemeText');

    if (questionPhonemeDisplay) {
        questionPhonemeDisplay.textContent = `出題テキスト: ${questionText}\n音素分解: ${questionPhonemes.join(' ')}`;
    } else {
        console.error('questionPhonemeText 要素が見つかりません。');
    }
}

// 発音評価結果を表示
function displayEvaluation(transcribedPhonemes, questionPhonemes) {
    const resultDisplay = document.getElementById('evaluationText');
    if (!resultDisplay) {
        console.error('evaluationText 要素が見つかりません。');
        return;
    }

    const { distance, operations } = calculateLevenshteinDistance(transcribedPhonemes, questionPhonemes);
    const matchPercentage = calculateMatchPercentage(transcribedPhonemes, questionPhonemes);

    resultDisplay.innerHTML = `
        <strong>編集回数:</strong> ${distance}<br>
        <strong>音素列長:</strong> 出題(${questionPhonemes.length}), ユーザー(${transcribedPhonemes.length})<br>
        <strong>編集距離:</strong> ${distance}<br>
        <strong>編集距離の内訳:</strong> 挿入(${operations.insertions}), 削除(${operations.deletions}), 置換(${operations.substitutions})<br>
        <strong>一致率:</strong> ${matchPercentage}%
    `;
}

// 編集距離を計算し、内訳を返す関数
function calculateLevenshteinDistance(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    const operations = { insertions: 0, deletions: 0, substitutions: 0 };

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    const operationTable = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(null));

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
                operationTable[i][j] = 'match';
            } else {
                const insertion = dp[i][j - 1] + 1;
                const deletion = dp[i - 1][j] + 1;
                const substitution = dp[i - 1][j - 1] + 1;

                if (insertion <= deletion && insertion <= substitution) {
                    dp[i][j] = insertion;
                    operationTable[i][j] = 'insert';
                } else if (deletion <= insertion && deletion <= substitution) {
                    dp[i][j] = deletion;
                    operationTable[i][j] = 'delete';
                } else {
                    dp[i][j] = substitution;
                    operationTable[i][j] = 'substitute';
                }
            }
        }
    }

    let i = a.length, j = b.length;
    while (i > 0 || j > 0) {
        if (operationTable[i][j] === 'insert') {
            operations.insertions++;
            j--;
        } else if (operationTable[i][j] === 'delete') {
            operations.deletions++;
            i--;
        } else if (operationTable[i][j] === 'substitute') {
            operations.substitutions++;
            i--;
            j--;
        } else {
            i--;
            j--;
        }
    }

    return { distance: dp[a.length][b.length], operations };
}

// 一致率を計算
function calculateMatchPercentage(a, b) {
    const maxLen = Math.max(a.length, b.length);
    const { distance } = calculateLevenshteinDistance(a, b);
    return ((1 - distance / maxLen) * 100).toFixed(2);
}

// 「評価する」ボタンが押されたときに発音評価を実行
function setupEvaluateButton() {
    const evaluateButton = document.getElementById('evaluateButton');
    if (!evaluateButton) {
        console.error("評価するボタンが見つかりません。");
        return;
    }

    evaluateButton.addEventListener('click', () => {
        const { filteredPhonemes: questionPhonemes } = decomposeQuestionTextToPhonemes();

        const phonemeTextElement = document.getElementById('phonemeText');
        const userPhonemeText = phonemeTextElement?.textContent.match(/音素分解:\s(.+)/);
        const userPhonemes = userPhonemeText ? userPhonemeText[1].trim().split(' ') : [];

        if (userPhonemes.length === 0) {
            alert("ユーザー音声認識結果の音素が正しく抽出されませんでした！");
            return;
        }

        evaluateUserPronunciation(userPhonemes, questionPhonemes);
    });
}

function evaluateUserPronunciation(transcribedPhonemes, questionPhonemes) {
    if (!transcribedPhonemes || !questionPhonemes) {
        alert("音素データが不足しています！");
        return;
    }

    // 発音評価を表示する
    displayEvaluation(transcribedPhonemes, questionPhonemes);
}

// ページロード時とボタンイベントをまとめて設定
document.addEventListener('DOMContentLoaded', () => {
    const decomposeTextButton = document.getElementById('decomposeTextButton');
    decomposeTextButton?.addEventListener('click', decomposeAndDisplayQuestionPhonemes);

    setupEvaluateButton();
});
