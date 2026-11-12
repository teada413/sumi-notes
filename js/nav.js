/*
 * Sumi Notes の公式サイトのヘッダーのメニュー（ハンバーガーメニュー。Sprint 53）。
 * 3つのページ（トップ・プライバシーポリシー・更新履歴）で同じ作り。ビルドなし・外部の読み込みなし。
 *
 * - 読み込まれてすぐ（表示の前に）<html> に .nav-ready を付ける。site.css は、このクラスがあるときだけ、
 *   狭い幅でリンクの並びを隠してボタン（[data-nav-toggle]）を出す。JavaScript が動かないときは、
 *   今までどおりリンクの並びがそのまま見える。
 * - 切り替える幅は site.css の @media の1か所で決める（ここでは、ボタンが表示されているかで判断する）。
 * - ボタン: Enter・Space（button の既定の動き）で開け閉めする。aria-expanded を true・false にする。
 *   aria-controls はリンクの並び（#site-nav-list）を指す。
 * - 閉じる: リンクを押したとき（移った先へはそのまま移る）、Esc（フォーカスをボタンに戻す）、
 *   メニューの外を押したとき、フォーカスがメニューの外へ出たとき、広い幅に戻ったとき。
 * - 開け閉めの動きは site.css（tokens.css の --nav-menu-duration。prefers-reduced-motion: reduce では動かない）。
 */
;(function () {
  'use strict'

  document.documentElement.classList.add('nav-ready')

  function setup() {
    var nav = document.querySelector('[data-site-nav]')
    var button = nav ? nav.querySelector('[data-nav-toggle]') : null
    var list = button ? document.getElementById(button.getAttribute('aria-controls') || '') : null
    if (!nav || !button || !list) return

    /** ボタンが出ている（狭い幅で、メニューに切り替わっている）か。 */
    function collapsed() {
      return window.getComputedStyle(button).display !== 'none'
    }

    function isOpen() {
      return button.getAttribute('aria-expanded') === 'true'
    }

    function open() {
      button.setAttribute('aria-expanded', 'true')
      nav.classList.add('is-open')
    }

    function close(focusButton) {
      if (!isOpen()) return
      button.setAttribute('aria-expanded', 'false')
      nav.classList.remove('is-open')
      if (focusButton) button.focus()
    }

    button.addEventListener('click', function () {
      if (isOpen()) close(false)
      else open()
    })

    // リンクを押したら閉じる（移る先への移動は、ブラウザと main.js のページの中のリンクの処理に任せる）
    list.addEventListener('click', function (e) {
      var link = e.target && e.target.closest ? e.target.closest('a[href]') : null
      if (link) close(false)
    })

    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()) {
        e.preventDefault()
        close(true)
      }
    })

    // メニューの外を押したら閉じる
    document.addEventListener('click', function (e) {
      if (isOpen() && !nav.contains(e.target)) close(false)
    })

    // Tab などでフォーカスがメニューの外へ出たら閉じる
    nav.addEventListener('focusout', function (e) {
      var next = e.relatedTarget
      if (isOpen() && next && !nav.contains(next)) close(false)
    })

    // 広い幅に戻ったら、閉じた状態に戻す（今のリンクの並びが出る）
    window.addEventListener('resize', function () {
      if (isOpen() && !collapsed()) close(false)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup)
  } else {
    setup()
  }
})()
