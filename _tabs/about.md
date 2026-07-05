---
# the default layout is 'page'
icon: fas fa-info-circle
order: 4
---

普段の作業で残しているメモがそこそこ溜まっていて、読み返すと、なんとなく形にできそうなものと、そうでないものがある。前者を集めて外から読めるようにしておく場所として、このサイトを立てた。基本は自分向けの備忘録だが、同じところで詰まった誰かが読めるようにもしている。

技術情報そのものは、もう十分に世に出ている。同じ話を焼き直すつもりはあまりない。ただ、同じ手法でも「どこで詰まったか」「どう納得したか」は書き手ごとに違っていて、その差分は自分で書くしかない。整理して残しておくと、あとで自分でも読み返す。誰かの引っかかりが一段浅くなるなら、それだけで書いた価値もある。

「井の中の蛙、大海を知らず」とよく言うが、自分の場合は蛙のままで、大河があることだけは知っている、という状態に近い。全部を知ろうとするのは早い段階で諦めた。それでも蛙なりに、井戸の中でできることを一段ずつ積み上げていきたい、というつもりで書いている。

Techniques are described neutrally, always paired with detection and defensive countermeasures. No live engagement data, private tooling, or working exploit payloads are published here.

## 中身

ざっくり 2 つに分かれている。

- **blog** (`/`): テーマ単位の記事。手法の背景、比較、実装上の落とし穴、みたいなものを扱う。
- **refs** (`/refs/`): cheat sheet 群。単発トピックを最短で引くための静的ページで、terminal 風の別体スタイルにしている。

役割ははっきり分けているつもりで、blog は「なぜその手を選ぶか」を書き、refs は「その手をどう打つか」を引く。記事から cheat sheet に飛んだり、その逆で戻ったり、を想定している。

## refs のドメイン

3 つの大枠に分けている。

- **Offensive 攻** — Active Directory、Evasion、Lateral Movement、C2、Web、Tooling
- **Defensive 守** — 検知観点、IR、hardening(順次充足)
- **Other 雑** — 分類外(順次充足)

トップには各ドメインから最新 3 件のプレビューが自動で並ぶようにしてある。全量から引きたいときは `/refs/all.html` に一覧とキーワード検索(`/` でフォーカス、`Esc` でクリア)がある。

[**Security Field Refs →**](/refs/)

## 攻撃と防御を分けないこと

evasion を掘っているときは、検知側が何を見ているかを頭の中で常に走らせている。逆に検知やハンティングを考えているときも、攻撃側の視点でその証跡がどう見えるかを追っている。詳細のレイヤーは別軸でも、思考の向き自体は最初から結合している気がしていて、だからこのサイトも両方を同じ枠のなかに置くことにした。

## 使い方

- 特定手法の**引き方**がほしい → refs のドメインを開く、あるいは `/refs/all.html` で検索
- ある手法を**選ぶかどうか**を悩んでいる → blog をタグで絞る
- 「この検知に対して、攻撃側はどう動くか」を考えたい → blog を offensive と defensive の交差タグで辿る

## いまの状態

Offensive を軸に埋め始めた段階で、Defensive と Other は暫定的に soon 表示にしている。カテゴリ・タグ・表記の細部は、運用しながら整えていくつもりでいる。

## Certifications

OSCP · OSEP · CPTS · SAL1 · CySA+ · CCNA

---

> 我以外皆我師 — everyone I meet has something to teach me.
