```markdown
---
# the default layout is 'page'
icon: fas fa-info-circle
order: 4
---

Field notes on offensive and defensive security, built through lab work, CTFs, and reproductions of publicly disclosed CVEs.
Originally written as a notebook for myself, but published in the hope that someone stuck on the same problem might find a shortcut.

攻撃・防御両面のフィールドノート。ラボ、CTF、公開済み CVE の再現を通じて得た知見を記録している。
もともとは自分のための備忘録だが、同じところで詰まった誰かの遠回りを少しでも減らせればと思い公開している。

## Scope

Techniques are presented from a neutral perspective and accompanied by detection and hardening considerations whenever relevant.
No client data, private tooling, proprietary research, or functional exploit payloads are published here.

手法は中立に記述し、必要に応じて検知・防御・ハードニングの観点を添える。
実案件の情報、非公開ツール、独自研究、実用可能な exploit payload は掲載しない。

## Structure

This site has two complementary surfaces.

- **blog** (`/`) — longer articles exploring why a technique matters, where it works, its limitations, and how it compares with alternatives.
- **refs** (`/refs/`) — concise terminal-style cheat sheets optimized for quick lookup during practice.

blog は「なぜその手法なのか」を、refs は「どう使うか」を扱う。
記事から cheat sheet へ、そして cheat sheet から背景記事へ行き来できる構成にしている。

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

evasion を考えるときは、検知側から何が見え、どこに痕跡が残るかを同時に考える。
逆に検知やハンティングを考えるときは、その証跡を攻撃側の視点から追い直す。
見ている層は違っても、思考の流れは最初から切り離せない。
だからこのサイトでも、攻撃と防御を別々には扱っていない。

## A note on perspective

There is a Japanese saying:
*"井の中の蛙、大海を知らず"* — *the frog in the well knows nothing of the great ocean.*
If anything, I am simply a frog that knows the ocean exists.
Trying to understand everything was never realistic. What remains is to keep climbing, one layer at a time, learning a little more than yesterday.

## Certifications

- **OSCP** / **OSEP** — Offensive Security
- **CPTS** — HackTheBox
- **SAL1** — TryHackMe
- **CySA+** — CompTIA
- **CCNA** — Cisco

---

> 我以外皆我師  
> *Everyone I meet has something to teach me.*
```

OPSEC確認: 取得日・IPA資格名は不記載(denylist通り)。他の識別子該当なし。push前PART C grep実施を推奨。