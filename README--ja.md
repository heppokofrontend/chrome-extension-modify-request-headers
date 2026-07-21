# Modify Request Headers

[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)

指定したURLに対して、リクエストヘッダの追加・上書き・削除を行うブラウザ拡張です。

[English version is here.](./README.md)

## ダウンロード

[![Available in the Chrome Web Store](./images/iNEddTyWiMfLSwFD6qGq.png)](#)

## 使い方

1. このブラウザ拡張のアイコンをクリックしてポップアップを開く
2. フォームでマッチ方式（URL完全一致・URL前方一致・正規表現）を選び、対象のURLまたはパターンを入力
3. Header name、Operation（set：上書き / append：追加 / remove：削除）、Valueを入力し、保存ボタンをクリック
4. 以降、パターンに一致するリクエストのヘッダが自動的に書き換えられる

保存したルールは、マッチするパターンごとにグループ化されて一覧に表示され、一覧からルールの有効/無効切り替え、編集と削除ができます。
