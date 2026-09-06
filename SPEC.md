# Study OS PWA v0.3 仕様

- 学習単位: 計画 ＞ 西洋建築
- 問題バンク: ユーザーがJSONを端末へインポート
- 公開サイト側には問題本文を保持しない
- バンク検証条件:
  - origin = real_past_exam
  - verified = true
  - subject = 計画
  - field = 西洋建築
  - 4選択肢
  - 正答1〜4
  - 出典情報あり
- 問題保存: IndexedDB
- 進捗保存: localStorage
- 採点: クライアント側即時
- PWA: Service Worker / manifest / iOS home screen metadata
