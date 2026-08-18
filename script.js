document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const inputText = document.getElementById('inputText');
    const countTotal = document.getElementById('countTotal');
    const countNoSpace = document.getElementById('countNoSpace');
    const countLines = document.getElementById('countLines');
    const countWords = document.getElementById('countWords');
    const countManuscript = document.getElementById('countManuscript');
    const readTime = document.getElementById('readTime');

    // 進行状況バー要素
    const xStatus = document.getElementById('xStatus');
    const xBar = document.getElementById('xBar');
    const manuscriptStatus = document.getElementById('manuscriptStatus');
    const manuscriptBar = document.getElementById('manuscriptBar');

    // ボタン類
    const cleanWhitespaceBtn = document.getElementById('cleanWhitespaceBtn');
    const removeNewlinesBtn = document.getElementById('removeNewlinesBtn');
    const zenToHanBtn = document.getElementById('zenToHanBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const toast = document.getElementById('toast');

    // ローカルストレージキー
    const STORAGE_KEY = 'textcounter_content';
    const THEME_KEY = 'textcounter_theme';

    // 1. カウント処理
    function updateCounts() {
        const text = inputText.value;

        // 全文字数
        const totalChars = text.length;

        // スペース・改行を除外した文字数
        const noSpaceChars = text.replace(/\s/g, '').length;

        // 行数 (テキストが空の場合は0行とする)
        const lines = text === '' ? 0 : text.split('\n').length;

        // 単語数 (英単語＋日本語の連続区切りを簡易的に計算)
        const trimmed = text.trim();
        const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;

        // 原稿用紙枚数 (400文字換算・繰り上げ)
        const manuscriptPages = Math.ceil(totalChars / 400);

        // 推定読了時間 (一般的な読書速度: 1分あたり約500文字)
        const minutes = Math.ceil(totalChars / 500);

        // UI反映
        countTotal.textContent = totalChars.toLocaleString();
        countNoSpace.textContent = noSpaceChars.toLocaleString();
        countLines.textContent = lines.toLocaleString();
        countWords.textContent = words.toLocaleString();
        countManuscript.textContent = `${manuscriptPages.toLocaleString()} 枚`;
        readTime.textContent = `${minutes.toLocaleString()} 分`;

        // プログレスバー更新
        updateProgress(totalChars, 140, xStatus, xBar);
        updateProgress(totalChars, 400, manuscriptStatus, manuscriptBar);

        // ローカルストレージ保存
        localStorage.setItem(STORAGE_KEY, text);
    }

    // プログレスバー描画用ヘルパー
    function updateProgress(current, max, statusEl, barEl) {
        statusEl.textContent = `${current.toLocaleString()} / ${max}`;
        const percentage = Math.min((current / max) * 100, 100);
        barEl.style.width = `${percentage}%`;

        if (current > max) {
            barEl.classList.remove('bg-blue-500', 'bg-purple-500');
            barEl.classList.add('bg-red-500');
        } else {
            barEl.classList.remove('bg-red-500');
            if (max === 140) barEl.classList.add('bg-blue-500');
            if (max === 400) barEl.classList.add('bg-purple-500');
        }
    }

    // 2. テキスト整形機能
    // 連続スペース・空行削除
    cleanWhitespaceBtn.addEventListener('click', () => {
        let text = inputText.value;
        // 連続する空行を1つに縮小
        text = text.replace(/\n\s*\n/g, '\n');
        // 行頭・行末の不要なスペース削除
        text = text.split('\n').map(line => line.trim()).join('\n');
        inputText.value = text;
        updateCounts();
        showToast('空行・連続スペースを削除しました');
    });

    // 改行一括削除
    removeNewlinesBtn.addEventListener('click', () => {
        inputText.value = inputText.value.replace(/\r?\n/g, '');
        updateCounts();
        showToast('改行を削除しました');
    });

    // 全角英数→半角変換
    zenToHanBtn.addEventListener('click', () => {
        let text = inputText.value;
        text = text.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        });
        inputText.value = text;
        updateCounts();
        showToast('全角英数を半角に変換しました');
    });

    // 3. クリップボードコピー & クリア
    copyBtn.addEventListener('click', async () => {
        if (!inputText.value) return;
        try {
            await navigator.clipboard.writeText(inputText.value);
            showToast('クリップボードにコピーしました');
        } catch (err) {
            showToast('コピーに失敗しました');
        }
    });

    clearBtn.addEventListener('click', () => {
        if (inputText.value && confirm('テキストを消去しますか？')) {
            inputText.value = '';
            updateCounts();
            showToast('テキストをクリアしました');
        }
    });

    // 4. CSV出力
    exportCsvBtn.addEventListener('click', () => {
        const text = inputText.value;
        const totalChars = text.length;
        const noSpaceChars = text.replace(/\s/g, '').length;
        const lines = text === '' ? 0 : text.split('\n').length;
        const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

        const csvContent = "\uFEFF" + 
            "項目,数値\n" +
            `総文字数(スペース込),${totalChars}\n` +
            `文字数(スペース除外),${noSpaceChars}\n` +
            `行数,${lines}\n` +
            `単語数,${words}\n`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `text_count_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('CSVを出力しました');
    });

    // 5. テーマ切替 (ダークモード / ライトモード)
    function initTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'dark'; // デフォルトはダークモード
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
            themeIcon.className = 'fa-solid fa-sun';
        } else {
            document.body.classList.remove('dark');
            themeIcon.className = 'fa-solid fa-moon';
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        themeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });

    // トースト表示機能
    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('opacity-0', 'pointer-events-none');
        toast.classList.add('opacity-100');
        setTimeout(() => {
            toast.classList.remove('opacity-100');
            toast.classList.add('opacity-0', 'pointer-events-none');
        }, 2000);
    }

    // 初期化処理
    inputText.addEventListener('input', updateCounts);

    // 保存データの復元
    const savedText = localStorage.getItem(STORAGE_KEY);
    if (savedText) {
        inputText.value = savedText;
    }

    initTheme();
    updateCounts();
});