# assets/badges — 資格バッジ

各デザインのバッジ枠はここの PNG を参照する。公式提供の汎用バッジアートを配置する。

## ファイル名の対応

| ファイル | 資格 | 発行元 |
|---|---|---|
| `oscp.png` | OSCP | OffSec |
| `osep.png` | OSEP | OffSec |
| `cpts.png` | CPTS | Hack The Box |
| `sal1.png` | SAL1 | TryHackMe |
| `cysa.png` | CySA+ | CompTIA |
| `ccna.png` | CCNA | Cisco |

## 差し替え手順

1. 公式提供の PNG バッジ(汎用アート)を用意する。個人の Credly 検証バッジは実名解決するため不可。
2. 上表のファイル名にリネームして `assets/badges/` に上書きコピー。
3. EXIF/メタデータを除去してから add する(`exiftool -all= badge.png`)。氏名・ID・日付の写り込みを目視確認。
4. 正方形想定(1:1)。表示枠は 96–120px。

読み込み失敗時は各デザインの JS/`onerror` がテキストチップにフォールバックするため、未配置でも崩れない。

## 入手元(自己ホスト前提)

- OffSec (OSCP/OSEP) / CompTIA (CySA+) / Cisco (CCNA) — Credly の各バッジページから汎用アートを保存(検証ページ URL ではなく画像のみ)。
- Hack The Box (CPTS) — HTB Academy のアチーブメント/バッジ資産。
- TryHackMe (SAL1) — https://tryhackme.com のバッジアート。

## OPSEC

- バッジ**画像**は資格ごとの汎用アート。匿名性には影響しない。ダウンロードして自己ホストする。
- 危険なのは Credly 等の**検証(share)ページ URL**。氏名・ID に解決するため、`<a href>` で検証ページに繋がない。
- ホットリンク(発行元サーバの画像 URL を直参照)も避ける。リクエストで参照元が記録され得る。必ずリポジトリ内に取り込む。
- 画像の EXIF/メタデータは事前に除去する(`exiftool -all= badge.png`)。
