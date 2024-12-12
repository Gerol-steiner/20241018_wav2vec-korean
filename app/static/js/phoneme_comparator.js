// サーバーから音素分解結果を取得してHTMLに表示
// サーバーから音素分解結果を取得してHTMLに表示
function displayPhonemes(_, transcribedPhonemes) { // 第1引数を使わない場合はアンダースコアを使用
    const phonemeText = document.getElementById('phonemeText');
    if (!phonemeText) {
        console.error('phonemeText 要素が見つかりません。');
        return;
    }

    console.log('音素分解結果を表示する要素が見つかりました:', phonemeText);

    // 音素分解結果のみをフォーマットして表示
    phonemeText.textContent = `ユーザー音声認識結果の音素分解: ${transcribedPhonemes.join(' ')}`;
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
    const matchPercentageDisplay = document.getElementById('matchPercentageText'); // 一致率の表示用タグ

    if (!resultDisplay) {
        console.error('evaluationText 要素が見つかりません。');
        return;
    }

    if (!matchPercentageDisplay) {
        console.error('matchPercentageText 要素が見つかりません。');
        return;
    }

    console.log('evaluationText 要素が見つかりました:', resultDisplay);
    console.log('matchPercentageText 要素が見つかりました:', matchPercentageDisplay);

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
        // 既存の詳細情報を更新
        resultDisplay.innerHTML = `
            <strong>編集回数:</strong> ${distance}<br>
            <strong>音素列長:</strong> 出題(${questionPhonemes.length}), ユーザー(${transcribedPhonemes.length})<br>
            <strong>編集距離:</strong> ${distance}<br>
            <strong>編集距離の内訳:</strong> 挿入(${operations.insertions}), 削除(${operations.deletions}), 置換(${operations.substitutions})<br>
        `;

        // 一致率を別タグに設定
        matchPercentageDisplay.textContent = `一致率: ${matchPercentage}%`;

        console.log('評価結果がevaluationTextに設定されました。');
        console.log('一致率がmatchPercentageTextに設定されました。');
    } catch (error) {
        console.error('評価結果の設定中にエラー:', error);
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
    // 入力データの整合性チェック
    if (!Array.isArray(a) || !Array.isArray(b)) {
        throw new Error('Input must be arrays of phonemes');
    }

    console.log('ユーザー音素:', a);
    console.log('出題音素:', b);

    // 動的計画法テーブルの初期化
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    const operations = { insertions: 0, deletions: 0, substitutions: 0 };

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    const operationTable = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(null));

    // DPテーブルの計算
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

    // 編集操作の追跡
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

    // 編集距離と操作のログ出力
    console.log('編集距離:', dp[a.length][b.length]);
    console.log('挿入操作:', insertedPhonemes);
    console.log('削除操作:', deletedPhonemes);
    console.log('置換操作:', substitutedPhonemes);

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





// 出題テキストを音素に分解する関数
function decomposeAndDisplayQuestionText() {
    const questionTextElement = document.getElementById('wordDisplay');
    const questionPhonemeTextElement = document.getElementById('questionPhonemeText');

    if (!questionTextElement || !questionTextElement.textContent.trim()) {
        console.error("出題テキストが設定されていません。");
        return;
    }

    const questionText = questionTextElement.textContent.trim();
    const decomposedPhonemes = decomposeQuestionTextToPhonemes(questionText); // 既存の分解ロジックを利用

    // 結果を表示
    questionPhonemeTextElement.textContent = `音素分解: ${decomposedPhonemes.filteredPhonemes.join(' ')}`;
    console.log('出題テキストの音素分解結果を表示しました:', decomposedPhonemes);
}


// ユーザー音声認識結果と出題テキストを逐文字比較
function compareTextsBasedOnUserInput(userText, questionText) {
    const comparisonResult = [];
    const questionChars = [...questionText].filter(char => !['.', '?', '!', ','].includes(char)); // 出題テキストの句読点を除外
    const userChars = [...userText].filter(char => !['.', '?', '!', ','].includes(char)); // ユーザー音声認識結果の句読点を除外

    userChars.forEach(userChar => {
        if (questionChars.length > 0 && questionChars[0] === userChar) {
            // 完全一致の場合、緑色で表示
            comparisonResult.push({ char: userChar, correct: true });
            questionChars.shift(); // 一致した文字を削除
        } else if (questionChars.includes(userChar)) {
            // 出題テキスト内に存在する場合も緑色で表示
            comparisonResult.push({ char: userChar, correct: true });
            questionChars.splice(questionChars.indexOf(userChar), 1); // 該当文字を削除
        } else {
            // 一致しない場合、赤色で表示
            comparisonResult.push({ char: userChar, correct: false });
        }
    });

    // 残った出題テキスト（不足部分）を赤色で表示
    questionChars.forEach(remainingChar => {
        comparisonResult.push({ char: `(${remainingChar})`, correct: false, isInsert: true });
    });

    return comparisonResult;
}









// 逐文字比較結果をHTMLに表示
function displayTextComparisonResult(comparisonResult, questionText) {
    const resultContainer = document.getElementById('sequentialComparisonResult');
    if (!resultContainer) {
        console.error('sequentialComparisonResult 要素が見つかりません。');
        return;
    }

    // questionTextが文字列かどうか確認
    if (typeof questionText !== 'string') {
        console.error('questionText が文字列ではありません:', questionText);
        return;
    }

    // ユーザー音声認識結果の表示を構築
    const userTextDisplay = comparisonResult
        .filter(result => !result.isInsert) // 挿入部分は除外
        .map(result => {
            return result.correct
                ? `<span style="color: green;">${result.char}</span>` // 一致部分を緑
                : `<span style="color: red;">${result.char}</span>`;  // 不一致部分を赤
        })
        .join('');

    // 出題テキストの不足部分を赤で表示
    const questionTextDisplay = Array.from(questionText) // 配列に変換
        .map(char => {
            const isMissing = comparisonResult.some(
                result => result.isInsert && result.char.replace(/[()]/g, '') === char
            );
            return isMissing
                ? `<span style="color: red;">${char}</span>` // 不足部分を赤で表示
                : char; // それ以外は黒
        })
        .join('');

    // タイトルを保持したまま結果を更新
    resultContainer.innerHTML = `
        <h3>逐文字比較結果</h3>
        <div>ユーザー音声認識結果: ${userTextDisplay}</div>
        <div>出題テキスト: ${questionTextDisplay}</div>
    `;
}


function evaluateUserInput() {
    console.log('evaluateUserInput 関数が呼び出されました');

    // 出題テキストの音素分解結果を取得
    const { filteredPhonemes: questionPhonemes } = decomposeQuestionTextToPhonemes();

    const transcriptionResultElement = document.getElementById('transcriptionResult');
    if (!transcriptionResultElement || !transcriptionResultElement.textContent.trim()) {
        console.error("ユーザー音声認識結果が見つかりません！");
        alert("ユーザー音声認識結果がありません！");
        return;
    }

    const userText = transcriptionResultElement.textContent.trim();
    console.log('ユーザー音声認識結果:', userText);

    // Whisperレスポンスの音素分解結果を取得
    const phonemeTextElement = document.getElementById('phonemeText');
    let userPhonemes = [];
    try {
        const phonemesMatch = phonemeTextElement.textContent.match(/音素分解:\s(.+)/);
        userPhonemes = phonemesMatch ? phonemesMatch[1].trim().split(' ') : [];
        if (!userPhonemes.length) {
            throw new Error("音素分解が空です。");
        }
    } catch (error) {
        console.warn("音素分解中にエラーが発生しました:", error);
    }

    console.log('ユーザー音素:', userPhonemes);

    // 発音評価（音素が空でも続行）
    if (questionPhonemes.length > 0) {
        displayEvaluation(userPhonemes, questionPhonemes);
    } else {
        console.warn("出題テキストの音素が不足しているため、発音評価をスキップします。");
    }

    // 音素比較結果を表示
    displayPhonemeComparison(userPhonemes, questionPhonemes);

    // 逐文字比較
    const comparisonResult = compareTextsBasedOnUserInput(userText, document.getElementById('wordDisplay').textContent.trim());
    displayTextComparisonResult(comparisonResult, document.getElementById('wordDisplay').textContent.trim());
}





function comparePhonemes(userPhonemes, questionPhonemes) {
    const userResult = [];
    const questionResult = [];
    const maxLength = Math.max(userPhonemes.length, questionPhonemes.length);

    let userIndex = 0;
    let questionIndex = 0;

    for (let i = 0; i < maxLength; i++) {
        const userPhoneme = userPhonemes[userIndex] || '';
        const questionPhoneme = questionPhonemes[questionIndex] || '';

        if (userPhoneme && questionPhoneme && userPhoneme === questionPhoneme) {
            // 一致する音素
            userResult.push({ phoneme: userPhoneme, correct: true });
            questionResult.push({ phoneme: questionPhoneme, correct: true });
            userIndex++;
            questionIndex++;
        } else if (userPhoneme && (!questionPhoneme || userPhoneme !== questionPhoneme)) {
            // ユーザーの音素が正解に含まれない（不一致）
            userResult.push({ phoneme: userPhoneme, correct: false });
            if (questionPhoneme) {
                questionResult.push({ phoneme: questionPhoneme, correct: false });
            }
            userIndex++;
            questionIndex++;
        } else if (!userPhoneme && questionPhoneme) {
            // 出題テキストに余る音素
            questionResult.push({ phoneme: questionPhoneme, correct: false });
            questionIndex++;
        } else if (userPhoneme && !questionPhoneme) {
            // ユーザー音素に余る場合
            userResult.push({ phoneme: userPhoneme, correct: false });
            userIndex++;
        }
    }

    return { userResult, questionResult };
}


function displayPhonemeComparison(userPhonemes, questionPhonemes) {
    console.log('displayPhonemeComparison 呼び出し');
    console.log('ユーザー音素:', userPhonemes);
    console.log('出題音素:', questionPhonemes);

    if (!userPhonemes.length || !questionPhonemes.length) {
        console.error('音素分解結果が不足しています。');
        return;
    }

    const { userResult, questionResult } = comparePhonemes(userPhonemes, questionPhonemes);

    const userDisplay = userResult.map(result =>
        `<span style="color: ${result.correct ? 'green' : 'red'};">${result.phoneme}</span>`
    ).join(' ');

    const questionDisplay = questionResult.map(result =>
        `<span style="color: ${result.correct ? 'black' : 'red'};">${result.phoneme}</span>`
    ).join(' ');

    const userPhonemeElement = document.getElementById('userPhonemeComparison');
    const questionPhonemeElement = document.getElementById('questionPhonemeComparison');

    if (!userPhonemeElement || !questionPhonemeElement) {
        console.error('HTML要素が見つかりません。');
        return;
    }

    userPhonemeElement.innerHTML = `ユーザー音声認識結果の音素分解: ${userDisplay}`;
    questionPhonemeElement.innerHTML = `出題テキストの音素分解: ${questionDisplay}`;
    console.log('音素比較結果を更新しました。');
}


