# Post templates

Skeletons for the hands-on layer of the site. This directory is excluded from
the Jekyll build (`exclude` in `_config.yml`), so nothing here is published.

サイトの実作業レイヤ (writeup / CVE 再現) の投稿ひな形。本ディレクトリは Jekyll の
`exclude` 対象で、ここのファイルは公開されない。

## Categories

| Content | Top category | Sub category |
|---|---|---|
| CTF / lab writeups | `Writeups` | platform (HackTheBox, TryHackMe, Lab, CTF) |
| Disclosed-CVE reproductions | `CVEs` | vendor or class (Microsoft, Linux, Web) |

These sit alongside the existing `Offensive` / `Defensive` / `Other`
categories; Chirpy generates the category pages automatically once the first
post in each lands.

## Workflow

1. Copy `writeup.md` or `cve.md` into `_posts/` as
   `YYYY-MM-DD-slug.md`.
2. Fill the front matter (real `date`, `title`, `categories`, `tags`,
   `description`).
3. Follow the site conventions: bilingual `## 概要` (JP) then the English
   body; commands stay in `/refs/`; retired or writeup-permitted targets
   only; no operational payloads (see `_tabs/about.md`).

To iterate before publishing, drop the file in `_drafts/` instead and build
with `bundle exec jekyll serve --drafts`.
