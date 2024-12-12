// サーバーから音素分解結果を取得してHTMLに表示
function displayPhonemes(transcribedText, transcribedPhonemes) {
    const phonemeText = document.getElementById('phonemeText');
    if (!phonemeText) {
        console.error('phonemeText 要素が見つかりません。');
        return;
    }

    console.log('音素分解結果を表示する要素が見つかりました:', phonemeText);

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
    console.log('displayEvaluation 呼び出し開始');
    console.log('ユーザー音素:', transcribedPhonemes);
    console.log('出題音素:', questionPhonemes);

    const resultDisplay = document.getElementById('evaluationText');
    if (!resultDisplay) {
        console.error('evaluationText 要素が見つかりません。');
        return;
    }

    console.log('evaluationText 要素が見つかりました:', resultDisplay);

    const {
        distance,
        operations,
        insertedPhonemes,
        deletedPhonemes,
        substitutedPhonemes,
    } = calculateLevenshteinDistance(transcribedPhonemes, questionPhonemes);

    console.log('Levenshtein 距離計算結果:', { distance, operations });

    const matchPercentage = calculateMatchPercentage(transcribedPhonemes, questionPhonemes);
    console.log('一致率:', matchPercentage);

    try {
        resultDisplay.innerHTML = `
            <strong>編集回数:</strong> ${distance}<br>
            <strong>音素列長:</strong> 出題(${questionPhonemes.length}), ユーザー(${transcribedPhonemes.length})<br>
            <strong>編集距離:</strong> ${distance}<br>
            <strong>編集距離の内訳:</strong> 挿入(${operations.insertions}), 削除(${operations.deletions}), 置換(${operations.substitutions})<br>
            <strong>一致率:</strong> ${matchPercentage}%
        `;
        console.log('評価結果がevaluationTextに設定されました。');
    } catch (error) {
        console.error('evaluationTextへの結果設定中にエラー:', error);
    }

    const details = {
        insertedPhonemes,
        deletedPhonemes,
        substitutedPhonemes,
    };

    console.log('発音評価の詳細:', details);
    displayPhonemeDetails(details); // 編集距離の詳細を表示
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
    const insertedPhonemes = [];
    const deletedPhonemes = [];
    const substitutedPhonemes = [];

    while (i > 0 || j > 0) {
        if (operationTable[i][j] === 'insert') {
            insertedPhonemes.push(b[j - 1]);
            operations.insertions++;
            j--;
        } else if (operationTable[i][j] === 'delete') {
            deletedPhonemes.push(a[i - 1]);
            operations.deletions++;
            i--;
        } else if (operationTable[i][j] === 'substitute') {
            substitutedPhonemes.push({ from: a[i - 1], to: b[j - 1] });
            operations.substitutions++;
            i--;
            j--;
        } else {
            i--;
            j--;
        }
    }

    return {
        distance: dp[a.length][b.length],
        operations,
        insertedPhonemes,
        deletedPhonemes,
        substitutedPhonemes,
    };
}






// 一致率を計算
function calculateMatchPercentage(a, b) {
    const maxLen = Math.max(a.length, b.length);
    const { distance } = calculateLevenshteinDistance(a, b);
    return ((1 - distance / maxLen) * 100).toFixed(2);
}

// 「評価する」ボタンが押されたときに発音評価を実行
function setupEvaluateButton() {
    console.log('setupEvaluateButton 関数が呼び出されました'); // デバッグ用ログ

    const evaluateButton = document.getElementById('evaluateButton');
    if (!evaluateButton) {
        console.error("評価するボタンが見つかりません。");
        return;
    }

    console.log('評価するボタンが見つかりました:', evaluateButton);

    evaluateButton.addEventListener('click', () => {
        console.log('評価するボタンがクリックされました');

        // 出題テキストの音素分解結果を取得
        const { filteredPhonemes: questionPhonemes } = decomposeQuestionTextToPhonemes();
        console.log('出題音素分解結果:', questionPhonemes);

        if (!questionPhonemes.length) {
            console.error('出題音素分解結果が空です');
            alert("出題テキストの音素分解に問題があります。");
            return;
        }

        // ユーザー音声認識結果を取得
        const phonemeTextElement = document.getElementById('phonemeText');
        if (!phonemeTextElement || phonemeTextElement.textContent.trim() === '') {
            console.error("ユーザー音声認識結果が見つかりません！");
            alert("ユーザー音声認識結果がありません！");
            return;
        }

        const userPhonemeText = phonemeTextElement.textContent.match(/音素分解:\s(.+)/);
        let userPhonemes = userPhonemeText ? userPhonemeText[1].trim().split(' ') : [];

        console.log('ユーザー音素分解結果:', userPhonemes);

        if (!userPhonemes.length) {
            console.error("ユーザー音素分解が空です！");
            alert("ユーザー音声認識結果の音素が正しく抽出されませんでした！");
            return;
        }

        // 発音評価を実行
        displayEvaluation(userPhonemes, questionPhonemes);

        // 逐文字比較結果を計算して表示
        const userText = userPhonemes.join('');
        const questionText = questionPhonemes.join('');
        const comparisonResult = compareTextsBasedOnUserInput(userText, questionText);

        console.log('逐文字比較結果:', comparisonResult);
        displayTextComparisonResult(comparisonResult); // 逐文字比較結果をビューに反映
    });
}


// 挿入された音素、削除された音素、置換された音素を表示する
function displayPhonemeDetails(details) {
    console.log('displayPhonemeDetails 呼び出し時のデータ:', details);

    const insertedPhonemesElement = document.getElementById('insertedPhonemes');
    const deletedPhonemesElement = document.getElementById('deletedPhonemes');
    const substitutedPhonemesElement = document.getElementById('substitutedPhonemes');

    if (!details || !details.insertedPhonemes || !details.deletedPhonemes || !details.substitutedPhonemes) {
        console.error('details オブジェクトが正しく渡されていません:', details);
        return;
    }

    if (!insertedPhonemesElement || !deletedPhonemesElement || !substitutedPhonemesElement) {
        console.error('必要なHTML要素が見つかりません。');
        return;
    }

    // 挿入、削除、置換された音素をHTMLに表示
    insertedPhonemesElement.textContent = details.insertedPhonemes.join(' ');
    deletedPhonemesElement.textContent = details.deletedPhonemes.join(' ');
    substitutedPhonemesElement.textContent = details.substitutedPhonemes
        .map(sub => `${sub.from}→${sub.to}`)
        .join(' ');
}






function evaluateUserPronunciation(userPhonemes, questionPhonemes) {
    console.log('ユーザー音声認識結果の音素:', userPhonemes);
    console.log('出題テキストの音素:', questionPhonemes);

    const userText = userPhonemes.join('');
    const questionText = questionPhonemes.join('');

    console.log('逐文字比較 - 出題テキスト:', questionText);
    console.log('逐文字比較 - ユーザー音声認識結果:', userText);

    const textComparisonResult = compareTextsBasedOnUserInput(userText, questionText);
    console.log('逐文字比較結果:', textComparisonResult);

    // 結果をビューに反映
    displayTextComparisonResult(textComparisonResult);
}





function compareTextsSequentially(questionText, userText) {
    const comparisonResult = [];
    const remainingQuestionChars = [...questionText]; // 出題テキストを文字配列に変換

    userText.split('').forEach(userChar => {
        if (remainingQuestionChars.length > 0 && remainingQuestionChars[0] === userChar) {
            // 一致する場合
            comparisonResult.push({ char: userChar, correct: true });
            remainingQuestionChars.shift(); // 一致した文字を削除
        } else {
            // 一致しない場合
            comparisonResult.push({ char: userChar, correct: false });
        }
    });

    // 残った出題テキストの文字を赤で追加
    remainingQuestionChars.forEach(remainingChar => {
        comparisonResult.push({ char: remainingChar, correct: false });
    });

    return comparisonResult;
}





// ページロード時とボタンイベントをまとめて設定
document.addEventListener('DOMContentLoaded', () => {
    const decomposeTextButton = document.getElementById('decomposeTextButton');
    decomposeTextButton?.addEventListener('click', decomposeAndDisplayQuestionPhonemes);

    setupEvaluateButton();
});

// ユーザー音声認識結果と出題テキストを逐文字比較
function compareTextsBasedOnUserInput(userText, questionText) {
    const comparisonResult = [];
    const remainingQuestionText = [...questionText]; // 出題テキストを配列に変換

    userText.split('').forEach((userChar, index) => {
        if (remainingQuestionText.length > 0 && remainingQuestionText[0] === userChar) {
            // 一致する場合、緑色で表示
            comparisonResult.push({ char: userChar, correct: true });
            remainingQuestionText.shift(); // 先頭を削除
        } else {
            // 一致しない場合、赤色で表示
            comparisonResult.push({ char: userChar, correct: false });
        }
    });

    // 出題テキストに残った文字を赤色で追加
    remainingQuestionText.forEach(remainingChar => {
        comparisonResult.push({ char: remainingChar, correct: false });
    });

    // デバッグ用ログを追加
    console.log('逐文字比較結果:', comparisonResult);
    console.log('残った出題テキスト:', remainingQuestionText);

    return comparisonResult;
}





// 逐文字比較結果をHTMLに表示
function displayTextComparisonResult(comparisonResult) {
    const resultContainer = document.getElementById('sequentialComparisonResult');
    if (!resultContainer) {
        console.error('sequentialComparisonResult 要素が見つかりません。');
        return;
    }

    // 結果をHTMLに描画
    resultContainer.innerHTML = comparisonResult
        .map(result => {
            return result.correct
                ? `<span style="color: green;">${result.char}</span>`
                : `<span style="color: red;">${result.char}</span>`;
        })
        .join('');
}