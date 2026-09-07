# Study OS PWA v0.7.0 仕様

## 科目
- 学科Ⅰ 計画: 200問
- 学科Ⅱ 環境・設備: 200問
- 学科Ⅲ 法規: 300問
- 学科Ⅳ 構造: 300問
- 学科Ⅴ 施工: 250問
- 合計: 1,250問

## UI
- 科目スイッチャー
- 選択科目の全体進捗
- 読み込み済み問題数
- 分野一覧
- 分野別進捗
- 5科目全体進捗

## 学習
- 分野単位で一巡
- 分野内の最終問題を回答後、同科目の次の未完了分野へ移動
- 各科目の分野順は10年分の平均問題番号順

## データ
- 問題本文は個人用JSON → IndexedDB
- 進捗はlocalStorage
- 問題IDで重複排除
- unit JSON v1 / v1.1互換
- acceptedAnswersによる複数正答対応
- imageDataUrlによる図問題対応

## バージョン
- Version: v0.7.0
- Build: 2026-09-07
- Service Worker cache: study-os-v0.7.0

## 互換性
- STORAGE_KEY = architect-study-os-v0.3 を維持
- IndexedDB名を維持
- v0.6.0以前の問題・進捗を引き継ぐ
