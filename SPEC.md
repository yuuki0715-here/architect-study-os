# Study OS PWA v0.6.0 仕様

## 目的
一級建築士 学科Ⅰ「計画」10年分200問を、分野単位で高速に一巡する。

## ホームダッシュボード
1. 計画 全体進捗
   - 分母: 200
   - 分子: PWAで初回回答した計画のユニーク問題数
2. 現在の分野
   - 分野進捗
   - 学習開始 / 再開
3. 計画 分野一覧
   - 本試験の平均出題位置が早い順
   - 各分野の回答済み数 / 問題数
   - ミニ進捗バー
   - 1タップで分野切替
4. Study OS 5科目全体
   - 分母: 1,250

## 学習遷移
- 最終問題まで回答し、その分野が完了した場合:
  - 次の未完了分野があれば「次の分野へ」
  - 全分野完了なら「ホームへ戻る」

## データ
- 公開: アプリ本体のみ
- 問題: 個人用JSON → IndexedDB
- 履歴: localStorage
- 重複判定: 問題ID
- 図問題: imageDataUrl / imageAlt
- 複数正答: acceptedAnswers

## バージョン
- Version: v0.6.0
- Build: 2026-09-07
- 問題データ形式: unit JSON v1.1
- Service Worker cache: study-os-v0.6.0

## 互換性
- STORAGE_KEY = architect-study-os-v0.3 を維持
- DB_NAME = architect-study-os を維持
- 既存データ・進捗を引き継ぐ
