/*
 * ダウンロードのボタンのリンク先の定め（サイトの中でここ1か所だけ）。
 *
 * - 今は Microsoft Store のページが無いので、ページの中の「入手の方法」の節（#download）を指す。
 * - Microsoft Store で公開したら、下の STORE_URL を Store のページの URL（https: で始まるもの）に
 *   書き換える。index.html の data-store-link を付けたボタンが、すべてその URL を指すようになり、
 *   「公開の準備中です」の表示は消える。
 */
window.SUMI_SITE_CONFIG = Object.freeze({
  STORE_URL: '#download'
})
