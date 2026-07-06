---
title: "Setting up a Chirpy-based Jekyll site: a reproducible walkthrough"
date: 2026-07-06 10:30:00 +0000
categories: [meta]
tags: [jekyll, chirpy, github-pages, opsec, setup]
pin: true
---

# Setup guide

A reproducible walkthrough for building a Jekyll + [Chirpy](https://chirpy.cotes.page/) site on GitHub Pages, with an optional static passthrough directory for hand-written pages outside Jekyll's control. Written to be usable by anyone from a clean environment.

Jekyll + Chirpy テーマで GitHub Pages のサイトを構築する手順書。Jekyll のビルドを経由しない静的パススルー領域を併設する構成にも対応する。前提知識ゼロの状態から再現できることを目的にしている。

## What this produces

- A Jekyll blog served at `https://<handle>.github.io/`
- Optional hand-written HTML tree at any subpath (e.g. `/refs/`) bypassing Jekyll rendering
- Automated builds and deployment on push via GitHub Actions

Jekyll ブログを `https://<handle>.github.io/` に配信し、必要に応じて任意のサブパス(例:`/refs/`)に Jekyll を経由しない静的 HTML ツリーを併置する。ビルドとデプロイは push 時に GitHub Actions が自動実行する。

## Prerequisites

### All platforms

- Git 2.30 or later
- Ruby **3.1.x or 3.2.x** (Ruby 4.x is not yet supported by Chirpy)
- Bundler (bundled with Ruby)
- Node.js 18 LTS or later
- A GitHub account

### Platform-specific installation

#### Windows

- Git for Windows — https://git-scm.com/download/win
- RubyInstaller with DevKit — https://rubyinstaller.org/downloads/
  - Choose the "Ruby+Devkit 3.2.x (x64)" installer
  - After installation, run `ridk install` and select option 3 (MSYS2 + MinGW toolchain)
- Node.js LTS — https://nodejs.org/

#### macOS

- Homebrew — https://brew.sh/
- `brew install git node`
- Install Ruby via `rbenv` or `asdf` (system Ruby is too old and requires sudo):

  ```bash
  brew install rbenv
  rbenv install 3.2.6
  rbenv global 3.2.6
  ```

#### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install git ruby-full ruby-dev build-essential nodejs zlib1g-dev
```

Verify Ruby version is 3.1.x or 3.2.x. If the distribution's Ruby is too old or too new, install via `rbenv` or `asdf`.

### Sanity check

```bash
git --version
ruby --version    # 3.1.x or 3.2.x
bundle --version
node --version    # 18.0.0 or higher
```

### `.ruby-version` file (recommended)

At the repository root, create a `.ruby-version` file with the exact Ruby version:

```
3.2.6
```

`rbenv` and `asdf` will auto-switch to this version when entering the directory. The GitHub Actions workflow can also read this file to keep the runner in sync.

前提ソフトウェアは Git 2.30 以上、**Ruby 3.1.x または 3.2.x**(Chirpy は Ruby 4.x 未対応)、Node.js 18 LTS 以上、GitHub アカウント。Windows は RubyInstaller の DevKit を必ず入れる(`ridk install` で MSYS2 と MinGW を追加)。macOS のシステム Ruby は古すぎるため `rbenv` か `asdf` で 3.1.x / 3.2.x を固定する。リポジトリ直下に `.ruby-version` を置けばバージョン管理ツールが自動追従する。

## Step 1: Repository setup

Two paths are available. Option A is the officially recommended path for new users.

### Option A: Use the template on GitHub (recommended)

1. Navigate to https://github.com/cotes2020/chirpy-starter
2. Click the green **Use this template** button → **Create a new repository**
3. Set the repository name to exactly `<handle>.github.io` (replacing `<handle>` with your lowercase GitHub username for a user site, or any name for a project site)
4. Set visibility to **Public** (private repositories require a paid plan for GitHub Pages)
5. Clone your new repository locally:

   ```bash
   git clone git@github.com:<handle>/<handle>.github.io.git
   cd <handle>.github.io
   ```

   Or via HTTPS:

   ```bash
   git clone https://github.com/<handle>/<handle>.github.io.git
   cd <handle>.github.io
   ```

### Option B: Clone locally and start fresh

Use this when you want to work offline first, or when you want a clean commit history without a template fork trail.

```bash
git clone https://github.com/cotes2020/chirpy-starter.git <handle>.github.io
cd <handle>.github.io
rm -rf .git
git init -b main
```

Removing `.git` and re-initializing severs the starter's commit history so the starter's authors and dates do not propagate into the new repository.

### Configure identity and line endings (both options)

```bash
git config user.name "<your name or handle>"
git config user.email "<your email>"
git config --local core.autocrlf false
```

`core.autocrlf false` prevents cross-platform CRLF conversion, which is especially important when the same repository is edited from both Windows and Linux/macOS.

Chirpy を使う出発点として、Template 経路(Option A)と Clone 経路(Option B)がある。**Option A が公式推奨**で、GitHub 上で "Use this template" ボタンから新規リポジトリを作成し、そのままローカルに clone する — 履歴がクリーンで、リモートも自動で紐付く。**Option B** はオフライン先行で作業したい場合や、template fork の痕跡すら残したくない場合に使う(`.git` を削除して初期化するため starter の作者・日付情報を新リポジトリに引き継がせない)。いずれの経路でも、identity の設定と `core.autocrlf false` は同じ。

## Step 2: Install dependencies

```bash
bundle install
```

If the site will be deployed via GitHub Actions (Ubuntu runner) but developed on Windows or macOS, add the Linux platform to the lockfile so Bundler resolves gems for both environments:

```bash
bundle lock --add-platform x86_64-linux
```

This is one of the most common causes of first-time Actions failures.

`bundle install` で依存を解決する。Windows / macOS で開発して Actions(Ubuntu ランナー)でビルドする構成の場合、`Gemfile.lock` に `x86_64-linux` プラットフォームを追加する必要がある — これを忘れると初回デプロイで gem 解決失敗として顕在化する。

## Step 3: Local preview

Two ways to start the local server:

### Via the bundled utility script

```bash
bash tools/run.sh
```

This is the script shipped by chirpy-starter. It handles a few Chirpy-specific setup steps before invoking Jekyll. On Windows, run it from Git Bash.

### Via Jekyll directly

```bash
bundle exec jekyll serve --host 127.0.0.1 --port 4000
```

Add `--livereload` for auto-reload on edits.

On Windows, if live reload fails to detect file changes (a known NTFS + inotify issue), add `--force_polling`:

```bash
bundle exec jekyll serve --livereload --force_polling
```

Open `http://127.0.0.1:4000` in a browser. Stop with `Ctrl+C`.

Changes to `_config.yml` are **not** picked up while `jekyll serve` is running — you must restart the server to see them.

ローカルプレビューの起動方法は2つ:starter 同梱の `tools/run.sh` を叩くか、`bundle exec jekyll serve` を直接実行するか。前者は Chirpy 固有の準備処理を含むため安全。Windows で `--livereload` が効かない場合(NTFS + inotify の既知問題)は `--force_polling` を付ける。`_config.yml` の変更は `jekyll serve` 実行中には反映されない — サーバ再起動が必要。

## Step 4: Configure `_config.yml`

Edit at minimum:

```yaml
title: <site title>
tagline: <short subtitle>
description: <one-sentence description for SEO and feeds>
url: "https://<handle>.github.io"
baseurl: ""              # empty for a user site; use "/<repo-name>" for a project site
timezone: <IANA timezone>
lang: <primary language code>

github:
  username: <handle>

social:
  name: <display name>
  links:
    - https://github.com/<handle>

theme_mode:              # empty for auto with toggle; "dark" or "light" to lock
```

The **`baseurl` setting is the single most common cause of first-time deployment failures**:

- **User site** (repository named `<handle>.github.io`): `baseurl: ""`
- **Project site** (any other repository name): `baseurl: "/<repo-name>"`

A mismatched `baseurl` produces broken asset paths across the entire site.

初回デプロイで最も詰まりやすいのが `baseurl` の設定。ユーザーサイト(`<handle>.github.io`)は空、プロジェクトサイト(それ以外のリポジトリ名)は `/<repo-name>` を指定する。ここが噛み合わないと全アセットのパスが壊れて表示崩れになる。

## Step 5: Clean up starter defaults

chirpy-starter ships with sample content that needs to be removed or edited before publishing your own site.

### Sample posts

```bash
ls _posts/
# 2019-08-08-write-a-new-post.md
# 2019-08-09-text-and-typography.md
# ...
```

Delete all sample posts:

```bash
rm _posts/*.md
```

### Default about page

`_tabs/about.md` ships with placeholder content. Edit it to describe your site.

### Contact icons and share buttons

- `_data/contact.yml` — icons that appear at the bottom of the sidebar. Comment out any you do not use, and add URLs for those you do.
- `_data/share.yml` — social sharing buttons at the bottom of each post. Comment out platforms you do not want to expose.

Any icon left defined but without a corresponding URL in `_config.yml` (e.g. `twitter.username` empty) will render as an inert link. Either fill in the URL or comment out the entry in the YAML file — do not leave orphans.

### Ready-to-use default tabs

The starter also ships with tabs that work without modification:

- `_tabs/categories.md` — automatic category index
- `_tabs/tags.md` — automatic tag index
- `_tabs/archives.md` — chronological post archive

These are populated automatically by the `jekyll-archives` plugin from your posts' front matter. No editing needed.

starter は見本記事、既定 About ページ、連絡先アイコン、シェアボタンを同梱している。公開前に見本記事は全削除、About は自分の内容に編集、`_data/contact.yml` と `_data/share.yml` は使わないものをコメントアウトする。`_config.yml` 側で URL やユーザ名が未設定のアイコンを残すと空リンクが表示されるため、片方だけの中途半端な状態を残さないこと。categories / tags / archives の各タブは `jekyll-archives` プラグインが自動生成するのでそのまま動く。

## Step 6: First post

Create `_posts/YYYY-MM-DD-<slug>.md`:

```markdown
---
title: <post title>
date: YYYY-MM-DD HH:MM:SS +0000
categories: [<top>, <sub>]
tags: [<tag1>, <tag2>]
---

Body in Markdown.
```

- The filename date and front-matter date must match.
- Future-dated posts are skipped by the build until their date arrives.
- `categories` accepts up to two nested values.
- Use the `+0000` (UTC) timezone offset for consistency across environments.

投稿ファイルは `_posts/YYYY-MM-DD-<slug>.md` 形式。ファイル名の日付と front matter の `date` は一致させる。未来日付は build 時点でスキップされる。`categories` は2階層までネスト可能。timezone offset は環境差を避けるため `+0000`(UTC)で統一する。

## Step 7: Static passthrough directory (optional)

To publish hand-written HTML pages outside Jekyll's rendering pipeline (a reference tree, a static index, a portfolio, etc.), drop them under a subdirectory.

Two constraints apply:

- **No front matter** on HTML files inside the passthrough directory. Front matter triggers Liquid rendering, which will misinterpret raw `{{ }}` inside inline JavaScript.
- **No same-named tab file**. Creating `_tabs/refs.md` while `refs/index.html` exists causes both to emit `/refs/index.html`, and they collide.

Exclude the passthrough from the PWA cache in `_config.yml`:

```yaml
pwa:
  cache:
    deny_paths:
      - "/refs"
```

This prevents the Chirpy-registered service worker from caching stale versions of your hand-written pages.

Jekyll はソースルート配下を既定で全て `_site` に転写するため、`/refs/` などのサブディレクトリに静的 HTML を置くだけでパススルーとして機能する。制約は2点:(1)配下 HTML に front matter を付けない — Liquid が JS 内の `{{ }}` を誤処理する。(2)同名の `_tabs/<name>.md` を作らない — 生成される index が実体ファイルと衝突する。PWA の Service Worker が古いバージョンをキャッシュに残すのを防ぐため `pwa.cache.deny_paths` で明示的に除外する。

## Step 8: Customize the theme (optional)

Override CSS variables in `assets/css/jekyll-theme-chirpy.scss`:

```scss
---
---
@use "main";

html[data-mode="dark"],
html:not([data-mode]),
:root[data-bs-theme="dark"] {
  --main-bg:    #<hex> !important;
  --bs-body-bg: #<hex> !important;
  --sidebar-bg: #<hex> !important;
  --topbar-bg:  rgba(<r>, <g>, <b>, <a>) !important;
}
```

Three selectors are needed. Chirpy sets the mode attribute on `html` after first paint; Bootstrap reads `data-bs-theme` on `:root`. Covering only one leaves a flash of unstyled content on load.

The leading `---` fences are required for Jekyll to process the file through the SCSS pipeline.

Chirpy の dark 変数を上書きする場合、セレクタは3つ書く必要がある。Chirpy が初回描画後に `html` へ mode 属性を付ける挙動と、Bootstrap が `:root` の `data-bs-theme` を参照する挙動が競合するため、片方だけでは FOUC(flash of unstyled content)が残る。ファイル冒頭の空 front matter(`---` × 2)は Jekyll に SCSS として処理させるために必須。

## Step 9: Replace the home page (optional)

Chirpy's default home is a paginated post list. To use a fixed landing page instead:

1. Move the post list to a tab. Create `_tabs/posts.md`:

   ```markdown
   ---
   layout: page
   icon: fas fa-stream
   order: 1
   title: Posts
   ---

   <ul>
   {% for post in site.posts %}
     <li>
       <time>{{ post.date | date: "%Y-%m-%d" }}</time>
       <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
     </li>
   {% endfor %}
   </ul>
   ```

2. Replace `index.html` at the repository root with landing content, using `layout: default`.

Chirpy 既定のトップは記事一覧のページネーションだが、固定 landing に差し替える場合は `_tabs/posts.md` に記事一覧を退避し、リポジトリ直下の `index.html` を `layout: default` で書き換える。

## Step 10: Favicons

Chirpy expects the following filenames under `assets/img/favicons/`:

```
favicon.ico
favicon.svg
favicon-16x16.png
favicon-32x32.png
apple-touch-icon.png
android-chrome-192x192.png
android-chrome-512x512.png
```

If using [RealFaviconGenerator](https://realfavicongenerator.net/), rename its current output (`favicon-96x96.png`, `web-app-manifest-*.png`, etc.) to match this set. Exclude `site.webmanifest` — Chirpy generates its own.

Chirpy が参照するファイル名の集合は上記の通り。RealFaviconGenerator の現行出力(`favicon-96x96.png` や `web-app-manifest-*.png` を含む)とは名前が一致しないため、Chirpy 期待名にリネームする。`site.webmanifest` は Chirpy 側が独自生成するため配置しない。

## Step 11: Post images

Chirpy uses the following conventions for images:

### Post body images

Place images under `assets/img/posts/<slug>/` (any structure works, but this keeps posts organized). Reference them in Markdown:

```markdown
![alt text](/assets/img/posts/<slug>/screenshot.png)
```

### Post preview image

Add to the post's front matter:

```yaml
image:
  path: /assets/img/posts/<slug>/cover.png
  alt: cover image description
```

The preview image appears at the top of the post and in social media OpenGraph tags.

投稿本文の画像は `assets/img/posts/<slug>/` 配下に置き、Markdown からは `/assets/img/posts/<slug>/foo.png` で参照する。投稿のカバー画像は front matter に `image:` ブロックで指定する。ここで指定した画像は投稿冒頭と OpenGraph の og:image に使われる。

## Step 12: Self-host static assets (optional)

By default, Chirpy loads static assets (fonts, syntax highlighting themes, MathJax, Mermaid, etc.) from the jsDelivr CDN. This works out of the box, but external CDN requests expose visitor IPs to the CDN operator.

To self-host these assets:

```bash
git submodule add https://github.com/cotes2020/chirpy-static-assets.git assets/lib
```

Then in `_config.yml`:

```yaml
assets:
  self_host:
    enabled: true
    env:                 # empty means both dev and prod; or "production" to limit
```

Self-hosting increases repository size and build time but eliminates the third-party dependency.

**This step is opt-in and not required for a working site.**

Chirpy は既定で jsDelivr CDN から静的アセット(フォント、syntax highlight テーマ、MathJax、Mermaid 等)を読み込む。動作としては問題ないが、外部 CDN への通信は訪問者 IP を CDN 提供者に渡す。self-host するには `chirpy-static-assets` を submodule として追加し、`_config.yml` の `assets.self_host.enabled` を有効化する。リポジトリサイズとビルド時間は増えるが、第三者依存が消える。**これは opt-in で、標準構成では不要**。

## Step 13: Last-modified hook (optional)

To populate `last_modified_at` automatically from git history, create `_plugins/posts-lastmod-hook.rb`:

```ruby
Jekyll::Hooks.register :posts, :post_init do |post|
  commit_num = `git rev-list --count HEAD "#{ post.path }"`
  if commit_num.to_i > 1
    lastmod_date = `git log -1 --pretty="%ad" --date=iso "#{ post.path }"`
    post.data['last_modified_at'] = lastmod_date
  end
end
```

The `commit_num > 1` guard prevents the initial commit from being labeled as an update. The hook uses the committer identity from `git log`, so whatever `user.email` is configured to will appear in build metadata.

git 履歴から `last_modified_at` を自動反映するフック。`commit_num > 1` の判定で「初回コミット=更新」の誤表示を避ける。フックは `git log` の committer 情報を拾うため、`user.email` の設定はそのままビルドメタデータに伝播する。

## Step 14: Publish

### If you used Option A (Use this template)

The remote is already configured. Just push:

```bash
git add -A
git commit -m "initial commit"
git push origin main
```

### If you used Option B (Clone locally)

Create an empty public repository on GitHub named exactly `<handle>.github.io` — **do not initialize it** with README, `.gitignore`, or license (the local repository already has content).

Add the remote. Choose HTTPS or SSH:

**HTTPS** (works out of the box with credential managers):

```bash
git remote add origin https://github.com/<handle>/<handle>.github.io.git
```

**SSH** (requires SSH keys configured on GitHub — https://docs.github.com/en/authentication/connecting-to-github-with-ssh):

```bash
git remote add origin git@github.com:<handle>/<handle>.github.io.git
```

Push:

```bash
git add -A
git commit -m "initial commit"
git push -u origin main
```

### Enable GitHub Actions deployment (both options)

1. On the repository page: **Settings → Pages → Source → "GitHub Actions"**
   This is required. The default "Deploy from a branch" will not build Chirpy.

2. Watch the **Actions** tab. The workflow (`.github/workflows/pages-deploy.yml`, shipped with chirpy-starter) will build and deploy automatically.

3. The first build typically takes **5–10 minutes** due to gem installation on the runner. Subsequent builds are faster.

4. When the workflow completes successfully, the site is live at `https://<handle>.github.io/`.

Option A(Template)の場合、リモートは既に設定済みなので直接 push できる。Option B(Clone)の場合、GitHub 上で `<handle>.github.io` という名前の空リポジトリを作成し(README・.gitignore・license で初期化しない)、リモートを追加する。HTTPS(credential manager でそのまま使える)と SSH(鍵設定必須)の両方が使える。

いずれの経路でも `Settings → Pages → Source` を **GitHub Actions** に切り替える必要がある — 既定の "Deploy from a branch" では Chirpy はビルドされない。初回ビルドは gem インストールで **5〜10 分**かかるため「詰まった」と誤解しないこと。

## Step 15: Diagnosing common failures

### The Actions build fails

Read the workflow log from the bottom up. Typical causes:

| Symptom | Cause | Fix |
|---|---|---|
| `Could not find gem 'X-linux-...'` | `Gemfile.lock` missing Linux platform | `bundle lock --add-platform x86_64-linux`, commit, push |
| `fatal: No url found for submodule path 'assets/lib'` | Submodule referenced but not added | Only occurs with self-hosted assets — re-add with `git submodule add ...` |
| All assets 404 in production but work locally | `baseurl` set incorrectly | Empty for user site, `/<repo>` for project site |
| Ruby version error | Workflow `ruby-version` vs `Gemfile.lock` mismatch | Align both to the installed Ruby |
| Site builds but Pages returns 404 | Pages source not set to "GitHub Actions" | Settings → Pages → Source → "GitHub Actions" |

### The page loads but changes do not appear

Chirpy registers a service worker, and GitHub Pages sits behind the Fastly CDN. Both cache aggressively.

Verify the remote state independently of any client cache:

```bash
git show origin/main:<path> | file -
```

Force-refresh in the browser via an incognito window, or append a cache-buster query string (`?v=<n>`) to the URL.

### Binary files appear corrupted after commit

chirpy-starter ships with a `.gitattributes` file at the repository root. If you add rules to it (e.g. to enforce LF line endings under a subdirectory), rule order matters:

`.gitattributes` rules are evaluated **last-match-wins per attribute**. A broad rule like `refs/** text eol=lf` placed after `*.png binary` will silently reclassify PNGs under that path as text and apply line-ending conversion, corrupting them.

Fix by appending narrower rules **after** the broad rule:

```
*.png binary
refs/** text eol=lf
refs/**/*.png binary
refs/**/*.png -text
```

Verify with `git check-attr -a <path>` — the PNG should show `binary: set` and `text: unset`. Recovery: `git rm --cached <file>` then re-add from the original source.

### `_site` cache issues locally

If local preview shows stale content that no source file explains:

```bash
bundle exec jekyll clean
bundle exec jekyll serve
```

`jekyll clean` removes `_site/` and `.jekyll-cache/` and forces a full rebuild.

Actions ビルド失敗の診断はログを末尾から読む。よくある原因は Gemfile.lock のプラットフォーム不足、submodule 参照の欠落(self-host asset を使う場合のみ発生)、`baseurl` の不整合、Ruby バージョンのずれ、Pages Source の設定ミス。「反映されない」現象の大半は Chirpy の Service Worker と Fastly CDN の二重キャッシュであり、ビルド失敗ではない。バイナリファイルが破損する場合は `.gitattributes` の**行順**を確認する — 属性は後勝ちで評価されるため、広いルールを先に、狭いルールを後に置く。ローカルプレビューが古いままの場合は `bundle exec jekyll clean` で `_site` と `.jekyll-cache` を消してから再起動する。

## Step 16: Next steps

- **Custom domain**: See https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site. Add a `CNAME` file at the repository root containing your domain, and configure DNS.
- **Link and HTML validation**: chirpy-starter ships with `html-proofer` in the `test` group. Run `bundle exec htmlproofer _site --disable-external` after a build to catch broken links and malformed HTML. The starter also includes `tools/test.sh` which wraps this.
- **Upgrading Chirpy**: Bump the version in `Gemfile` (e.g. `gem "jekyll-theme-chirpy", "~> 7.7"`), run `bundle update jekyll-theme-chirpy`, review the release notes at https://github.com/cotes2020/jekyll-theme-chirpy/releases for breaking changes.
- **Adding comments**: Chirpy supports Disqus, utterances, and giscus out of the box. Configure via `_config.yml` under `comments:`.
- **Adding analytics**: Chirpy supports Google Analytics, GoatCounter, Umami, Matomo, Cloudflare, and Fathom. Configure under `analytics:`.

その先の作業として、独自ドメイン設定(`CNAME` ファイル + DNS 設定)、リンク切れ検査(`bundle exec htmlproofer` または `tools/test.sh`)、Chirpy 本体のアップグレード(`Gemfile` 更新 + `bundle update` + release notes 確認)、コメント欄(Disqus / utterances / giscus)、アクセス解析(GA / GoatCounter / Umami / Matomo / Cloudflare / Fathom)の追加がある。いずれも `_config.yml` で設定する。

## Optional appendix: Privacy-conscious setup

For anyone publishing under a pseudonym or minimizing metadata exposure, the following adjustments are recommended. Everything above works without them.

### Use GitHub's noreply email

```bash
git config user.email "<id>+<username>@users.noreply.github.com"
```

Find `<id>` at https://github.com/settings/emails, under "Keep my email addresses private".

The last-modified hook (Step 13) pulls the committer identity from `git log`, so using a noreply address ensures no personal email leaks into the built site's metadata.

### Commit under UTC

Every git commit records the committer's local timezone offset (`+0900`, `-0500`, ...). It survives in `git log`, is exposed via the GitHub REST API, and can propagate to rendered `datetime` attributes on the built site via the last-modified hook. This is effectively a geographic signal reaching the frontend.

**Per-session:**

```bash
export TZ=UTC
git commit -m "..."
```

**Permanently (recommended):**

Add to `~/.bashrc`, `~/.zshrc`, or shell profile:

```bash
export TZ=UTC
```

Or set at the OS level. On Windows Git Bash, add to `~/.bashrc`:

```bash
echo 'export TZ=UTC' >> ~/.bashrc
```

Existing history can be rewritten with `git filter-branch --env-filter` or `git filter-repo --commit-callback`, but on a repository that has not been pushed yet, resetting and recommitting under `TZ=UTC` is simpler.

Verify with:

```bash
git log --format="%ai" | head
# All entries should end in +0000
```

### Disable analytics, comments, and verifications

In `_config.yml`, leave these blocks blank:

```yaml
webmaster_verifications:
  google:
  bing:
  # ...

analytics:
  google:
    id:
  # ...

comments:
  provider:
```

Empty values are not emitted as meta tags, so nothing external can be correlated.

### Self-host external assets

Third-party CDNs (fonts, scripts, images) expose visitor IPs to the CDN operator. Self-host anything that would otherwise be loaded from an external origin — enable Chirpy's self-host mode (Step 12) and replace any external `<link>` or `<script>` tags with local paths.

### Strip image metadata

```bash
exiftool -all= <file>
```

Verify with `exiftool <file>` — the output should contain only structural fields, no `CreateDate`, `GPSLatitude`, `Software`, or `Author`. Apply to all images placed in `assets/img/` including favicons.

### GPG-signed commits — check what is exposed

If you enable `git config commit.gpgsign true`, verify what identity is embedded in the signature. `git log --show-signature` displays the signer info. A GPG key tied to a real-name identity will link every commit to that identity, undoing the noreply email measure.

### Pre-push denylist check

Before each push, grep the working tree for private strings you do not want published. Use `find + -prune` to reliably exclude vendor directories:

```bash
find . -path ./.git -prune -o -path ./assets/lib -prune \
  -o -type f -print | xargs grep -nE '<pattern1>|<pattern2>'
```

`--exclude-dir` is unreliable during recursive traversal in some shells (notably Git Bash on Windows), so the `find + -prune` form is preferred. Maintain the denylist as a personal file **outside** the repository — the denylist itself is a fingerprint.

### 匿名運用のための補足

疑似匿名で運用する場合、上記各項目に加えて以下が要点になる。

- `git config user.email` を noreply アドレスに設定する。`<id>` は GitHub 設定ページの「Keep my email addresses private」欄から取得する。last-modified フックが committer 情報を拾うため、これを設定しないと個人メールがビルド出力に混入する経路が開く。
- コミット時に `TZ=UTC` を強制する。ローカル TZ の offset は `git log` にも GitHub API にも残り、last-modified フック経由でサイトの `datetime` 属性まで到達する — 実質的に地理情報がフロントエンドまで漏れる経路になる。セッション単位で毎回設定するのは忘れやすいため、shell profile に `export TZ=UTC` を追加して永続化するのが確実。`git log --format="%ai"` の結果が全て `+0000` で終わることを検証する。
- `_config.yml` の `webmaster_verifications` / `analytics` / `comments` は空欄のままにする。空欄は meta タグとして出力されないため、外部との突き合わせ経路が絶たれる。
- 第三者 CDN(フォント・スクリプト・画像)は訪問者 IP を CDN 提供者に渡してしまうため、self-host mode を有効化する(Step 12 参照)。
- 公開する画像は `exiftool -all=` でメタデータを除去してから add する。favicon も対象。
- GPG 署名を有効化する場合、鍵に紐づく identity がコミット署名に埋まる。実名の GPG 鍵を使うと noreply メール対策が無効化される — 署名鍵の identity は `git log --show-signature` で確認する。
- push 前に作業ツリーに対して denylist grep を通す。`--exclude-dir` は Git Bash の再帰探索で信頼できない場合があるため、`find + -prune` の形で確実にベンダーディレクトリを除外する。denylist ファイル自体はリポジトリ外で管理する — denylist そのものが指紋になるため、公開リポジトリに commit してはならない。

## Key takeaways

- Use the **template** path via GitHub for the cleanest starting point; the clone path is available when offline work is preferred.
- Set Pages source to **GitHub Actions**, not branch deployment — Chirpy requires the Actions build.
- Windows and macOS contributors must add `x86_64-linux` to `Gemfile.lock` for the Ubuntu runner to resolve gems.
- The `baseurl` setting differs between user sites (empty) and project sites (`/<repo-name>`) — most first-time failures come from this.
- Clean up starter defaults (sample posts, default about, orphan contact icons) before publishing.
- The `assets/lib` submodule is **not** part of the default setup — it's only needed when self-hosting static assets.
- Service worker plus CDN caching is the usual reason "the change didn't apply", not a build failure. Verify remote state with `git show origin/main:<path>`.
- `.gitattributes` rules are last-match-wins per attribute; narrower rules must appear after broader ones.
- The privacy-conscious appendix is opt-in and independent of the main flow.

### 要点

- 出発点として **template** 経路(GitHub 上での "Use this template")が最もクリーン。オフライン先行なら clone 経路。
- Pages の Source は **GitHub Actions** に必ず切り替える。既定の branch deploy では Chirpy はビルドされない。
- Windows / macOS で開発する場合は `Gemfile.lock` に `x86_64-linux` プラットフォームを追加する。
- `baseurl` はユーザーサイトで空、プロジェクトサイトで `/<repo-name>`。初回失敗の大半はこの1点。
- 公開前に starter 同梱の既定コンテンツ(サンプル投稿・既定 About・URL 未設定の連絡先アイコン)を整理する。
- `assets/lib` submodule は**標準構成では不要**。self-host static assets を有効化する場合のみ追加する。
- 「反映されない」現象の大半は Service Worker + CDN の二重キャッシュであってビルド失敗ではない。remote 側を独立に検証する癖をつける。
- `.gitattributes` は属性ごとに後勝ちで評価される。狭いルールを後ろに置く。
- 匿名運用の appendix は opt-in。本編の手順とは独立している。

---

> 我以外皆我師 — everyone I meet has something to teach me.
