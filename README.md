# 文化祭パーカー購入・申込サイト ＆ Googleスプレッドシート連携ガイド

生徒・購入者向けオンライン申込Webサイトです。
HP上にはスプレッドシート関連の表示を一切出さず、裏側で指定のGoogleスプレッドシートへ「送信時間」付きで自動送信・保存します。

---

## 📊 連携先 Googleスプレッドシート
- **スプレッドシート**: [パーカー申込状況 - Google スプレッドシート](https://docs.google.com/spreadsheets/d/1V-VU4-wJMkHqke5FzX4gnf9G9oB5yX9C9ONXuBsMdBw/edit?gid=0#gid=0)
- **スプレッドシート ID**: `1V-VU4-wJMkHqke5FzX4gnf9G9oB5yX9C9ONXuBsMdBw`

---

## ⚡ 送信時間対応・確定版 GAS コード

以下のコードを Google Apps Script (`拡張機能` > `Apps Script`) に貼り付けて最新バージョンとして保存・デプロイしてください。

```javascript
function doPost(e) {
  try {
    // 対象のスプレッドシートを取得
    var spreadsheet = SpreadsheetApp.openById("1V-VU4-wJMkHqke5FzX4gnf9G9oB5yX9C9ONXuBsMdBw");
    var sheet = spreadsheet.getActiveSheet();
    
    // 受信したデータを解析
    var data;
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }
    
    // 現在の送信日時（フォーマット例: 2026/09/24 09:35:20）
    var sendTime = data.timestamp || Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
    
    // スプレッドシートの末尾に新しい行を追加
    sheet.appendRow([
      sendTime,         // 1. 送信時間（タイムスタンプ）
      data.orderId,     // 2. 注文ID
      data.grade,       // 3. 学年
      data.className,   // 4. クラス
      data.number,      // 5. 出席番号
      data.name,        // 6. 氏名
      data.color,       // 7. カラー（ネイビー）
      data.size,        // 8. サイズ
      data.quantity,    // 9. 購入枚数
      data.notes,       // 10. 備考
      data.totalPrice   // 11. 概算合計金額
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 🚨 重要なデプロイ設定
データが送信されない場合の99%の原因はデプロイ設定の権限不足です。必ず以下の設定を確認してください：

1. Apps Script 画面右上の **「デプロイ」 > 「デプロイの管理」**（または新しいデプロイ）を開きます。
2. 編集（鉛筆アイコン）を押し、**「バージョン: 新しいバージョン」** を選択します。
3. **アクセスできるユーザー** を **「全員」 (Anyone)** に設定します。（※「自分のみ」になっているとブラウザからのPOSTが拒否されます）
4. **「デプロイ」** をクリックします。
