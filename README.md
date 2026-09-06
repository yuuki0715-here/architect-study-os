# 一級建築士 Study OS PWA v0.3（公開用アプリ本体）

このフォルダは **Webに公開してよいアプリ本体だけ** を入れています。
過去問本文・選択肢・正答・解説は含めていません。

## 使い方
1. このフォルダの中身を GitHub Pages 等で公開する。
2. iPhoneのSafariで公開URLを開く。
3. ホーム画面に追加する。
4. アプリを開き、「問題データを読み込む」を押す。
5. 別ファイル `study-os-private-western-architecture-10.json` を選ぶ。
6. 以後は端末内保存され、通常演習では再読込不要。

## なぜ問題データを分離したか
JAEICは過去問について、個人利用以外の無断転載・複製を禁止しています。
そのため、GitHub Pages等に問題本文を公開せず、個人学習用データは端末内だけに保存する設計にしています。

## 保存先
- 問題データ: IndexedDB
- 進捗・現在地: localStorage

## 公開するファイル
- index.html
- styles.css
- app.js
- service-worker.js
- manifest.webmanifest
- icon.svg
- apple-touch-icon.png
- icon-192.png
- icon-512.png

README.md / SPEC.md は公開しても動作には影響しません。
