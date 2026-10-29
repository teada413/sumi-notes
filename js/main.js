/*
 * Sumi Notes の公式サイトのスクリプト（ビルドなし・外部の読み込みなし）。
 *
 * 1. ダウンロードのボタン: config.js の STORE_URL（1か所の定め）を、data-store-link の付いた
 *    すべてのリンクに入れる。STORE_URL が "#download" の間は「公開の準備中です」を出す。
 * 2. メインの画像の傾き: カーソルの位置に合わせて画像を傾け、斜めの光の帯を動かす。
 *    カーソルが離れたら、少しずつ（減衰しながら）傾き 0 に戻る。
 *    prefers-reduced-motion: reduce のとき、ホバーの無い画面（タッチ）、マウス以外のポインタでは動かさない。
 *    ホバーで動くのはメインの画像だけ（ほかの要素には何もしない）。
 * 3. ページの中のリンク（href が "#" で始まるもの）: 押すと、移った先へ滑らかにスクロールし、
 *    アドレスの #… を変え（ブラウザの戻るで元の位置に戻れる）、移った先の節の見出しにフォーカスを移す。
 *    prefers-reduced-motion: reduce のときは、途中を通らずに一瞬で移る。
 * 4. 表示のときのフェードイン（トップのページの data-reveal の要素）: 画面に入ったら（IntersectionObserver）
 *    .is-revealed を付けて現れさせる。同じときに入った要素は少しずつずらす。1回だけ。
 *    0. の準備が <html> に .reveal-ready を付けたときだけ動く（付いていなければ何もしない＝すべて見えている）。
 *    ページの中のリンク・# 付きのアドレスで移るときは、移った先とそれより上の要素を、動かさずにすぐ見せる。
 */
;(function () {
  'use strict'

  var PENDING = '#download'

  // --- 0. 表示のときのフェードインの準備（読み込まれてすぐ、表示の前に） ---------------------
  //
  // 次の条件がそろったときだけ、<html> に "reveal-ready" を付ける。site.css は、このクラスがあるときだけ
  // data-reveal の要素を隠す（JavaScript が動かないときは、最初からすべて見えている）。
  // - prefers-reduced-motion: reduce ではない
  // - IntersectionObserver がある
  // 3秒以内に 4. のフェードインが始まらなければ、クラスを外して、すべて見せる（見えないまま残さない）。
  // 印刷では site.css の側で隠さない（@media screen の中だけで隠す）。
  ;(function prepareReveal() {
    var root = document.documentElement
    var reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof window.IntersectionObserver !== 'function') return
    root.classList.add('reveal-ready')
    window.setTimeout(function () {
      if (!root.hasAttribute('data-reveal-started')) root.classList.remove('reveal-ready')
    }, 3000)
  })()

  // --- 1. ダウンロードのボタン ----------------------------------------------------------

  function storeUrl() {
    var config = window.SUMI_SITE_CONFIG
    var url = config && typeof config.STORE_URL === 'string' ? config.STORE_URL.trim() : ''
    if (url === PENDING) return PENDING
    // Store のページは https: だけを受け付ける。それ以外（空・別の形）は準備中の扱いにする。
    return /^https:\/\/[^\s"'<>]+$/i.test(url) ? url : PENDING
  }

  function applyStoreLink() {
    var url = storeUrl()
    var pending = url === PENDING
    var links = document.querySelectorAll('a[data-store-link]')
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute('href', url)
      if (pending) {
        // "#download" を指す間は、3. のページの中のリンクとして扱う（滑らかなスクロールとフォーカス）
        links[i].removeAttribute('rel')
      } else {
        links[i].setAttribute('rel', 'noopener noreferrer')
      }
    }
    var notices = document.querySelectorAll('[data-store-pending]')
    for (var j = 0; j < notices.length; j++) notices[j].hidden = !pending
  }

  // --- 2. メインの画像の傾き ------------------------------------------------------------

  function setupHeroTilt() {
    var el = document.querySelector('[data-hero-tilt]')
    if (!el || typeof window.matchMedia !== 'function') return

    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)')
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    var enabled = function () {
      return canHover.matches && !reduce.matches
    }

    var styles = window.getComputedStyle(document.documentElement)
    var num = function (name, fallback) {
      var v = parseFloat(styles.getPropertyValue(name))
      return isFinite(v) ? v : fallback
    }
    var maxTilt = num('--hero-tilt-max', 6)
    var returnRate = Math.min(Math.max(num('--hero-tilt-return', 0.08), 0.01), 1)
    var glareMax = Math.min(Math.max(num('--hero-glare-max', 0.6), 0), 1)
    var followRate = 0.2

    var cur = { x: 0, y: 0 }
    var target = { x: 0, y: 0 }
    var glare = { x: 50, y: 50 }
    var hovering = false
    var frame = 0

    function write() {
      var magnitude = Math.min(1, Math.sqrt(cur.x * cur.x + cur.y * cur.y) / maxTilt)
      el.style.setProperty('--tilt-x', cur.x.toFixed(3) + 'deg')
      el.style.setProperty('--tilt-y', cur.y.toFixed(3) + 'deg')
      el.style.setProperty('--glare-x', glare.x.toFixed(2) + '%')
      el.style.setProperty('--glare-y', glare.y.toFixed(2) + '%')
      el.style.setProperty('--glare-opacity', (glareMax * magnitude).toFixed(3))
      el.dataset.tiltX = cur.x.toFixed(3)
      el.dataset.tiltY = cur.y.toFixed(3)
    }

    function reset() {
      if (frame) window.cancelAnimationFrame(frame)
      frame = 0
      hovering = false
      cur.x = cur.y = target.x = target.y = 0
      el.classList.remove('is-tilting')
      el.classList.remove('is-hovered')
      el.style.removeProperty('--tilt-x')
      el.style.removeProperty('--tilt-y')
      el.style.removeProperty('--glare-x')
      el.style.removeProperty('--glare-y')
      el.style.removeProperty('--glare-opacity')
      el.dataset.tiltX = '0'
      el.dataset.tiltY = '0'
    }

    function step() {
      frame = 0
      var rate = hovering ? followRate : returnRate
      cur.x += (target.x - cur.x) * rate
      cur.y += (target.y - cur.y) * rate
      var settled = Math.abs(target.x - cur.x) < 0.01 && Math.abs(target.y - cur.y) < 0.01
      if (settled && !hovering) {
        // 傾き 0 に戻りきった: 変形をはずす（transform: none）
        reset()
        return
      }
      if (settled) {
        cur.x = target.x
        cur.y = target.y
      }
      write()
      if (!settled) frame = window.requestAnimationFrame(step)
    }

    function kick() {
      if (!frame) frame = window.requestAnimationFrame(step)
    }

    el.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !enabled()) return
      var rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      var px = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
      var py = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1)
      hovering = true
      // カーソルの側が沈む: 右なら右の端が奥へ（rotateY が正）、下なら下の端が奥へ（rotateX が負）
      target.y = (px - 0.5) * 2 * maxTilt
      target.x = -(py - 0.5) * 2 * maxTilt
      glare.x = px * 100
      glare.y = py * 100
      el.classList.add('is-tilting')
      el.classList.add('is-hovered')
      kick()
    })

    el.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return
      if (!enabled()) {
        reset()
        return
      }
      hovering = false
      target.x = 0
      target.y = 0
      el.classList.remove('is-hovered')
      kick()
    })

    var onChange = function () {
      if (!enabled()) reset()
    }
    if (typeof reduce.addEventListener === 'function') {
      reduce.addEventListener('change', onChange)
      canHover.addEventListener('change', onChange)
    }

    reset()
  }

  // --- 3. ページの中のリンク -----------------------------------------------------------

  function setupInPageLinks() {
    var reduce =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : { matches: false }
    var anim = 0

    function stop() {
      if (anim) window.cancelAnimationFrame(anim)
      anim = 0
    }

    /** 移った先の要素。"#features" の形で、ページの中にその id があるときだけ。 */
    function targetOf(link) {
      var href = link.getAttribute('href') || ''
      if (href.charAt(0) !== '#' || href.length < 2) return null
      var id
      try {
        id = decodeURIComponent(href.slice(1))
      } catch {
        return null
      }
      return document.getElementById(id)
    }

    /** 上に固定されたヘッダーがあれば、その高さ（今のヘッダーは固定していないので 0）。 */
    function headerOffset() {
      var header = document.querySelector('.site-header')
      if (!header) return 0
      var pos = window.getComputedStyle(header).position
      return pos === 'fixed' || pos === 'sticky' ? header.getBoundingClientRect().height : 0
    }

    /** 移った先の上端が、画面の上端（固定のヘッダーがあればその下）に来るスクロールの位置。 */
    function destinationOf(target) {
      var margin = parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0
      var top = target.getBoundingClientRect().top + window.scrollY - headerOffset() - margin
      var max = document.documentElement.scrollHeight - window.innerHeight
      return Math.max(0, Math.min(Math.round(top), Math.max(0, max)))
    }

    /** フォーカスを移す先: 節なら、その中の最初の見出し（tabindex="-1"）。 */
    function focusTargetOf(target) {
      var heading = target.matches('h1, h2, h3') ? target : target.querySelector('h1, h2, h3')
      var el = heading || target
      if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
        el.setAttribute('tabindex', '-1')
      }
      return el
    }

    /** 初めに速く、着く手前でゆっくりになる（押してすぐに動き出したことが分かるように）。 */
    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3)
    }

    function scrollToY(y) {
      stop()
      var from = window.scrollY
      var distance = y - from
      if (reduce.matches || Math.abs(distance) < 1) {
        window.scrollTo({ top: y, left: window.scrollX, behavior: 'instant' })
        return
      }
      // 距離に合わせて 450〜900ms
      var duration = Math.min(900, Math.max(450, Math.abs(distance) * 0.4))
      var t0 = 0
      function frame(now) {
        if (!t0) t0 = now
        var t = Math.min(1, (now - t0) / duration)
        window.scrollTo({
          top: from + distance * easeOutCubic(t),
          left: window.scrollX,
          behavior: 'instant'
        })
        anim = t < 1 ? window.requestAnimationFrame(frame) : 0
      }
      anim = window.requestAnimationFrame(frame)
    }

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      var link = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null
      if (!link) return
      var target = targetOf(link)
      if (!target) return
      e.preventDefault()
      var hash = link.getAttribute('href')
      // アドレスの #… を変える（同じ #… のときは履歴を増やさない）。戻るで元の位置に戻れる。
      if (window.location.hash === hash) window.history.replaceState(null, '', hash)
      else window.history.pushState(null, '', hash)
      var y = destinationOf(target)
      revealUpTo(y)
      scrollToY(y)
      focusTargetOf(target).focus({ preventScroll: true })
    })

    // 利用者がスクロールし始めたら、滑らかなスクロールを止める（取り合いにしない）
    var interrupt = function () {
      stop()
    }
    window.addEventListener('wheel', interrupt, { passive: true })
    window.addEventListener('touchstart', interrupt, { passive: true })
    window.addEventListener('keydown', interrupt)
    window.addEventListener('popstate', interrupt)
  }

  // --- 4. 表示のときのフェードイン ---------------------------------------------------------

  var revealUpTo = function () {}

  function setupReveal() {
    var root = document.documentElement
    if (!root.classList.contains('reveal-ready')) return
    if (typeof window.IntersectionObserver !== 'function') {
      root.classList.remove('reveal-ready')
      return
    }
    root.setAttribute('data-reveal-started', '')

    var styles = window.getComputedStyle(root)
    var ms = function (name, fallback) {
      var raw = styles.getPropertyValue(name).trim()
      var v = parseFloat(raw)
      if (!isFinite(v)) return fallback
      return /ms$/.test(raw) || !/s$/.test(raw) ? v : v * 1000
    }
    var duration = ms('--reveal-duration', 600)
    var stagger = ms('--reveal-stagger', 80)
    var totalMax = ms('--reveal-total-max', 1200)
    var threshold = parseFloat(styles.getPropertyValue('--reveal-threshold'))
    if (!(threshold >= 0 && threshold <= 1)) threshold = 0.12
    // ずらす間隔の上限: 1つの画面の要素が、すべて totalMax 以内に現れ終わるように
    var maxDelay = Math.max(0, totalMax - duration)

    var pending = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'))
    var observer = new window.IntersectionObserver(onEntries, { threshold: threshold })

    function show(el, delay, instant) {
      if (instant) el.classList.add('is-revealed-instant')
      else el.style.setProperty('--reveal-delay', Math.round(delay) + 'ms')
      el.classList.add('is-revealed')
      observer.unobserve(el)
      var i = pending.indexOf(el)
      if (i >= 0) pending.splice(i, 1)
    }

    function onEntries(entries) {
      var entering = entries
        .filter(function (e) {
          return e.isIntersecting && pending.indexOf(e.target) >= 0
        })
        .map(function (e) {
          return e.target
        })
        .sort(function (a, b) {
          // 文書の順（上から）にずらす
          return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        })
      entering.forEach(function (el, i) {
        show(el, Math.min(i * stagger, maxDelay), false)
      })
      // 一気に通り過ぎた（画面に入らないまま上へ行った）要素は、見えないまま残さず、すぐに見せる
      pending.slice().forEach(function (el) {
        if (el.getBoundingClientRect().bottom <= 0) show(el, 0, true)
      })
    }

    /** スクロールの位置 y で画面の下端より上にある要素を、動かさずにすぐ見せる。 */
    revealUpTo = function (y) {
      var bottom = y + window.innerHeight
      pending.slice().forEach(function (el) {
        if (el.getBoundingClientRect().top + window.scrollY < bottom) show(el, 0, true)
      })
    }

    // # 付きのアドレスで開いたとき: 移った先とそれより上は、すぐに見せる
    if (window.location.hash.length > 1) {
      var target
      try {
        target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
      } catch {
        target = null
      }
      if (target) revealUpTo(target.getBoundingClientRect().top + window.scrollY)
    }
    // 戻る・進むで移ったとき: 移った先の画面の中は、すぐに見せる
    window.addEventListener('popstate', function () {
      window.requestAnimationFrame(function () {
        revealUpTo(window.scrollY)
      })
    })

    pending.forEach(function (el) {
      observer.observe(el)
    })
  }

  function start() {
    applyStoreLink()
    setupHeroTilt()
    setupReveal()
    setupInPageLinks()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start)
  } else {
    start()
  }
})()
