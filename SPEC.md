# Study OS PWA v0.5.3 仕様

- 公開: アプリ本体のみ
- 問題: 個人用JSONから端末へ読み込み
- 保存: IndexedDB
- 履歴: localStorage
- 学習単位: 科目 × 分野（複数対応）
- 分野切替: ホームのセレクトボックス
- 重複判定: 問題ID
- 全体進捗分母: 1,250問
- 初回回答だけ全体進捗に加算
- 設定: PWA進捗リセット / 現在分野の問題データ削除 / アプリ情報
- 図問題: `imageDataUrl` / `imageAlt` を任意利用
- 複数正答: `acceptedAnswers` を任意利用。未指定時は `answer` の1肢を正答とする

## 問題JSON v1.1
- `answer`: 主正答。従来互換のため必須（1〜4）
- `acceptedAnswers`: 任意。公式措置等で複数正答がある場合に `[1, 4]` のように指定
- `acceptedAnswers` を指定する場合、`answer` をその配列に含める
- 従来の unit JSON v1 はそのまま読み込み可能

## バージョン表示ルール
- ヘッダーに完全なバージョン番号（major.minor.patch）を常時表示する。
- 設定 > アプリ情報にも同じ完全バージョンを表示する。
- README / SPEC / Service Worker cache / 静的アセットのcache-busting queryを同じバージョンにそろえる。
- 今回のVersion: `v0.5.3`
- Build: `2026-09-07`
- 問題データ形式: `unit JSON v1.1`

## 互換性
- `STORAGE_KEY = architect-study-os-v0.3` は変更しない。既存の端末内進捗を保持するため。
- IndexedDB名・ストア名も既存版から変更しない。
