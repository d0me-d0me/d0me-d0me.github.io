# d0me — security field references

Terminal-mono(近黒地 × 近白フォスファーの無彩)で統一した静的サイト。ビルド不要。GitHub Pages に置くだけで公開できる。内容は `content.js` 一元管理、ホームは**大項目(Offensive / Defensive / Other)ごと**に自動描画。

- Home: コンソール枠のヒーロー(プロンプト+点滅カーソル)、`##` 見出し、`ls` 風の索引、括弧型の資格バッジ。
- 大項目: Offensive(攻)/ Defensive(守)/ Other(雑)の3軸。
- トップ(`index.html`): 各大項目の**最新3件をプレビュー**表示(煩雑さ回避)。`date`(任意)降順、無ければ記載順。
- 全索引(`all.html`): 全巻を大項目ごとに一覧+**キーワード検索**(title・日本語・topics・slug を横断。`/` でフォーカス, `Esc` で消去)。
- Sheets(Offensive, 全6巻): Active Directory / Evasion / Lateral Movement / Command & Control / Web / Tooling。Defensive / Other は枠を用意(準備中)。各手法に防御/検知を併記。
- 全内容はラボ・CTF・公開 CVE 前提のプレースホルダ表記。実関与データなし。

## セットアップ(2手)

1. `content.js` の先頭を編集(唯一の設定・内容点)。

   ```js
   window.CONTENT = {
     handle:    "d0me",
     githubUrl: "https://github.com/d0me-d0me",
     blogUrl:   "https://d0me-d0me.github.io",
     // domains[] / certs[] / volumes[] …
   };
   ```

2. リポジトリに配置して push。GitHub → Settings → Pages → Source を `main` / `/(root)`(または `public-vault` なら `/docs`)。詳細は同梱の DEPLOY 手順を参照。

## 構成

```
.
├── index.html               # ホーム（各大項目 最新3件プレビュー）
├── all.html                 # 全索引 + キーワード検索
├── content.js               # ★内容の一元管理（certs / volumes / 文言）
├── app.js                   # ホーム描画エンジン
├── theme-terminal.css       # ホームのテーマ（配色は data-accent で切替可）
├── assets/
│   ├── css/sheet.css        # チートシートのテーマ（terminal-mono）
│   ├── js/sheet.js          # シートの copy / toc / reveal / nav
│   ├── img/favicon.svg
│   └── badges/*.svg         # 資格バッジ（同名で公式SVGに差し替え可）
└── sheets/
    ├── active-directory.html
    ├── evasion.html
    ├── lateral-movement.html
    └── template.html        # 新規シートのひな形
```

## ナレッジ追加(最頻)

1. `content.js` の `volumes[]` に1項目追加(`domain` で大項目に紐付け、`n` は大項目ごとの大字, `slug` が `sheets/<slug>.html` に対応)。新しい大項目が要れば `domains[]` に追加。
2. `sheets/template.html` を複製して本文を書き、`sheets/<slug>.html` として置く。
3. `status` を `"ready"` にすると索引が自動でリンク付きになり、件数も更新される。

資格の増減は `content.js` の `certs[]` と `assets/badges/<svg>.svg` を編集するだけ。詳細は MANAGE.md(design-options 同梱)方式に準拠。

## 配色の変更(任意)

無彩の mono が既定。別配色にするなら `index.html` の `<html data-accent="mono">` を `amber / green / cyan / ice / vermilion` に変更(パレットは `theme-terminal.css` 冒頭)。シート側の配色を合わせる場合は `assets/css/sheet.css` の `:root` を対応させる。

## OPSEC

- 公開素材はサニタイズ後のみ。IP・FQDN・ハッシュ・パス・利用者名はプレースホルダに置換。
- `content.js` に実値を書かない。識別子は `handle` / `githubUrl` / `blogUrl` のみ。
- 資格バッジは自己ホスト。Credly 等の検証(share)ページURLは張らない(氏名・IDに解決するため)。
- メディア添付時は EXIF・パス・プロンプトの写り込みを除去(このリポジトリは既定でメディアなし)。

## ライセンス

コンテンツ: CC BY-NC-SA 4.0(推奨)。`LICENSE` を追加して明示すること。
