/*
 * ダウンロードのボタンのリンク先の定め（サイトの中でここ1か所だけ）。
 *
 * - Sumi Notes は 2026-11-02 に Microsoft Store で公開された（1.0.1）。STORE_URL は Store のページの URL。
 * - index.html の data-store-link を付けたボタン（ヒーローと締め）は、main.js がすべてこの URL に向ける。
 *   押すと、同じタブで Store のページへ移る（新しいタブは開かない）。
 * - 受け付けるのは https://apps.microsoft.com/ で始まる URL だけ。それ以外の値のときは、ボタンはページの中の
 *   「入手の方法」の節（#download。HTML に書いてある控え）を指したままになる。
 */
window.SUMI_SITE_CONFIG = Object.freeze({
  STORE_URL: 'https://apps.microsoft.com/detail/9MWQTQW12S86'
})
