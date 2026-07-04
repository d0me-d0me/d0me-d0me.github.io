# assets/badges — 資格バッジ

各デザインのバッジ枠はここの SVG を参照する。同梱の8ファイルは **currentColor 追従のプレースホルダ**(デザインのアクセント色で描画)。公式アートを持っている資格は、同じファイル名で上書きするだけで差し替わる。

## ファイル名の対応

| ファイル | 資格 | 発行元 |
|---|---|---|
| `oscp.svg` | OSCP | OffSec |
| `osep.svg` | OSEP | OffSec |
| `cpts.svg` | CPTS | Hack The Box |
| `sal1.svg` | SAL1 | TryHackMe |
| `cysa.svg` | CySA+ | CompTIA |
| `ccna.svg` | CCNA | Cisco |

## 差し替え手順

1. 公式バッジ(SVG推奨、無ければ PNG)を用意する。
2. 上表のファイル名にリネームして `assets/badges/` に上書きコピー。
   - PNG を使う場合は拡張子込みでファイル名を変え、HTML 側の `src` も `.svg`→`.png` に修正する。
3. SVG の場合、正方形〜縦長(概ね 1:1〜1:1.2)に整える。枠は 96–120px 想定。
4. 差し替え後は currentColor が効かない(公式アートは自己配色)。これは正常。

読み込み失敗時は各デザインの JS/`onerror` がテキストチップにフォールバックするため、未配置でも崩れない。

## 入手元(自己ホスト前提)

- OffSec (OSCP/OSEP) / CompTIA (CySA+) / Cisco (CCNA) — Credly の各バッジページからバッジ画像を保存。
  - Credly: https://www.credly.com
- Hack The Box (CPTS) — HTB Academy のアチーブメント/バッジ資産。https://academy.hackthebox.com
- TryHackMe (SAL1) — https://tryhackme.com

## OPSEC

- バッジ**画像**は資格ごとの汎用アート。匿名性には影響しない。ダウンロードして自己ホストする。
- 危険なのは Credly 等の**検証(share)ページURL**。氏名・IDに解決するため、`<a href>` で検証ページに繋がない。
- ホットリンク(発行元サーバの画像URLを直参照)も避ける。リクエストで参照元が記録され得る。必ずリポジトリ内に取り込む。
- 画像の EXIF/メタデータは事前に除去する(`exiftool -all= badge.png`)。SVG は不要な `<metadata>`/コメントを削除。
