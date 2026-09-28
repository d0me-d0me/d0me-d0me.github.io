---
# the default layout is 'page'
# layout: about
icon: fas fa-info-circle
order: 5
description: "About d0me — pseudonymous notes and references on offensive and defensive security: penetration testing, red and blue team, and OSCP/OSEP/CPTS-level practice."
---

Field notes on offensive and defensive security, built through lab work, CTFs, and reproductions of publicly disclosed CVEs.
Originally written as a notebook for myself, but published in the hope that someone stuck on the same problem might find a shortcut.

攻撃と防御、双方の視点で書き留めた実務ノート。ラボ、CTF、公開済み CVE の再現を通じて得た知見を記録している。
もともとは自分のための備忘録だが、同じところで詰まった誰かのためになればと思い公開している。

## Scope

Techniques are presented from a neutral perspective and accompanied by detection and hardening considerations whenever relevant.
No client data, private tooling, proprietary research, or functional exploit payloads are published here.

手法は中立に記述し、必要に応じて検知・防御・ハードニングの観点を添える。
実案件の情報、非公開ツール、実用可能な exploit payload は掲載しない。

## Authorized use only

This material documents offensive and defensive techniques for education and
for authorized security work. Use it only against systems you own, or ones you
have explicit, written permission to test. What you do with it is your own
responsibility; nothing here is an invitation to break the law, and no
liability is accepted for misuse.

掲載する手法は、学習および許可された環境でのセキュリティ業務のための情報である。
自身が所有するシステム、または明示的な書面による許可を得た対象に対してのみ使用すること。
利用の結果はすべて利用者の責任であり、違法行為を推奨するものではなく、悪用による一切の責任を負わない。

## Structure

This site has two complementary surfaces.

- **Posts** (`/posts/`) — longer articles exploring why a technique matters, where it works, its limitations, and how it compares with alternatives. They share the same top-level axis as the cheat sheets — `Offensive`, `Defensive`, `Other` — each with a topical subcategory (`Active Directory`, `Reconnaissance`, `Forensics & IR`, `Detection`, and so on). Lab/CTF writeups and disclosed-CVE reproductions, when published, are filed under the same domains.
- **Refs** (`/refs/`) — concise terminal-style cheat sheets optimized for quick lookup during practice.

Posts は「知見と考察」を、refs は「計画と手順」を扱う。
Posts の記事は Categories に整理している。cheat sheet と同じ `Offensive` / `Defensive` / `Other` を top-level に置き、`Active Directory`・`Reconnaissance`・`Forensics & IR`・`Detection` などのトピックを sub-category として付ける。ラボ/CTF の writeup や公開 CVE の再現も、公開する際は同じドメインの下に置く。
記事から cheat sheet へ、そして cheat sheet から記事へ行き来できる構成にしている。

[**Security Field Refs →**](/refs/)

## Domains (refs)

- **Offensive**
- **Defensive**
- **Other**

Each section opens with the three most recent entries.
For the complete index and keyword search, see `/refs/all.html` (`/` to focus, `Esc` to clear).

## Attack and defense belong together

When studying evasion, I naturally think about what defenders would observe, where they would observe it, and which artefacts remain.
When working on detection or threat hunting, I reverse the perspective and ask how the same activity appears from the operator's side.
The level of detail changes, but the way of thinking does not. Attack and defense are simply two viewpoints of the same system, which is why both live in the same place here.

セキュリティ機能の回避を考えるときは、検知側から何が見え、どこに痕跡が残るかを考える。
逆に検知や脅威ハンティングを考えるときは、その証跡を攻撃側の視点から考える。
視点は違っても、思考の流れは攻撃と防御を切り離すことはできない。

## A note on perspective

There is a Japanese saying:
*"井の中の蛙、大海を知らず"* — *the frog in the well knows nothing of the great ocean.*
If anything, I am simply a frog that knows the ocean exists.
Trying to understand everything was never realistic. What remains is to keep climbing, one layer at a time, learning a little more than yesterday.

日本の諺に「井の中の蛙、大海を知らず」がある。
自分は大海の存在を知っている蛙にすぎない。
すべてを理解しようとするのは現実的ではない。
できるのは昨日より少しだけ多くを知ることである。

## Certifications

<!-- Single source: _data/certs.yml (also rendered as the badge wall on the home page). -->
{% for c in site.data.certs -%}
- **{{ c.code }}** — [{{ c.issuer }}]({{ c.url }})
{% endfor %}

*Self-asserted; each link points to the issuer's certification page, not a verification record.*
各リンクは発行元の資格ページであり、本人確認用の verify リンクではない。

---

> 我以外皆我師 — everyone I meet has something to teach me.
