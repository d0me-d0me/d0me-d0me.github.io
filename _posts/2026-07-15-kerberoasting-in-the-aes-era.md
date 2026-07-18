---
title: Why Kerberoasting Still Works — The Asymmetry of the AES Era
date: 2026-07-15 10:00:00 +0000
categories: [Offensive, Active Directory]
tags: [kerberos, kerberoasting, active-directory, detection, hardening]
description: AES encryption was supposed to end Kerberoasting. A decade later it's still the first move against Active Directory. This is about the asymmetry that keeps it alive.
---

## 概要

AES 化すれば Kerberoasting はもう防げる、という誤解は、この 10 年で最も繰り返されたものの一つだ。 この記事は手順書ではなく、AES 化された Active Directory でもなぜ Kerberoasting が第一選択の権限昇格経路であり続けるのかを、攻撃側と防御側の非対称性という視点で整理する。 RC4 と AES256 のクラック速度差が実は 3 桁あること、それでも弱いパスワードは AES でも落ちること、gMSA 移行が進まない運用実務、RC4 downgrade の余地、targetedKerberoast による攻撃面の拡張、そして検知の本質的な非対称性までを扱う。 攻撃者は 1 つの弱いアカウントを見つければ勝ち、防御側はすべてを守り切らねば負ける — この不均衡は AD の設計に根ざしており、パッチでは消えない。 具体的なコマンドは `/refs/` の Active Directory シートにまとめてある。

## Introduction

Kerberoasting has sat at the center of Active Directory intrusion for over a decade. Tim Medin disclosed it in 2014. Since then the encryption moved from RC4 to AES, defensive tooling matured, and detection guidance proliferated. And yet, across lab exercises, red team reports, and pentest write-ups shared in the community, this technique remains the first thing anyone reaches for.

"Just enforce AES and you're safe" is one of the most repeated misconceptions of the last ten years. Why does it still work? Why hasn't defense caught up? This piece isn't a how-to — the commands live in the `/refs/` Active Directory sheet. It's an attempt to lay out the asymmetry that keeps the technique alive.

## A Short Refresher

The core of Kerberoasting is that it abuses normal, intended Kerberos behavior.

Any authenticated domain user can request a TGS (Ticket Granting Service ticket) for any account that has an SPN (Service Principal Name) attached. Part of the TGS the KDC returns is encrypted with a key derived from the service account's password. The attacker receives that encrypted blob over the network and runs offline dictionary and brute-force attacks against it.

The critical property is that none of this looks anomalous. Issuing a TGS is the daily business of a domain. Microsoft itself classifies the relevant Event ID 4769 as occurring at "Very High" volume — healthy environments generate enormous numbers of them. The attacker's traffic is indistinguishable from an ordinary employee's.

## What AES Actually Changed

Since Windows Server 2008, the `msDS-SupportedEncryptionTypes` attribute controls which etypes are permitted. Disabling RC4 (etype 23) and enforcing AES128/256 (etype 17/18) has spread gradually over the past decade.

The effect on crack speed is dramatic when you look at the numbers. On a single high-end GPU, hashcat's mode 13100 (Kerberos 5 TGS-REP etype 23, RC4) runs on the order of 1,500–2,500 MH/s, while mode 19700 (etype 18, AES256) runs closer to 500 kH/s. That's roughly three orders of magnitude. A dictionary attack that finishes in minutes against RC4 takes days to weeks against AES256.

![hashcat crack speed: RC4 vs AES256](/assets/img/posts/kerberoasting-aes-era/crack-speed.svg){: width="720" height="420" }
_The gap between RC4 (mode 13100) and AES256 (mode 19700) crack speed spans about three orders of magnitude on a single high-end GPU. AES buys roughly 1000× more cracking time — but time bought is not the same as prevention._

Here's the catch: that gap buys time, it doesn't provide prevention. A sufficiently short password still falls in hours to days even under AES256, using dictionary plus rules. A fully random 8-character password across the full character set would take AES256 into year-scale territory — but service accounts that actually reach "fully random" are the minority. Only once you get past roughly 20 characters of true randomness does the timeline move outside any realistic threat model.

> AES enforcement only means something when it's paired with a real increase in password strength. Switching the etype to AES while leaving the password short is like upgrading the lock's metal to steel while keeping the shackle 6mm thin.
{: .prompt-warning }

## Why It Still Works

### 1. The reality of service account operations

In theory, gMSA (Group Managed Service Accounts) solves this: AD generates the password automatically and rotates it on a default interval of 30 days. The generated password is 256 bytes of full randomness — not a realistic cracking target.

The problem is that migration to gMSA doesn't happen. Legacy SQL Server, old web applications, vendor-delivered services. Even when documentation doesn't say "gMSA incompatible," you often don't know whether it works until you switch and test. Weighing the rollback effort if it breaks against the assumed impact of a password leak, many organizations choose to keep the existing operational account.

The result is that published AD intrusion write-ups feature service accounts whose passwords haven't changed in five-plus years with striking regularity. The naming convention reveals the purpose, and the password is often a derivative of the organization's name or a year.

There's a compounding effect worth naming. Service accounts accumulate. Every application deployment, every integration, every "temporary" proof of concept that quietly became production leaves an account behind. Nobody owns the cleanup, because deleting a service account carries the same asymmetric risk as failing to migrate one: if it's still in use somewhere undocumented, removing it breaks production at an unpredictable time. So the population only grows, and each addition is another lottery ticket for the attacker. The oldest accounts — the ones most likely to predate any password-strength policy the organization now has — are also the ones least likely to have a living owner who could safely rotate or retire them.

### 2. Weak passwords fall even under AES

Password policy "complexity requirements" haven't kept pace with modern GPU cracking speeds. Ten characters mixing upper, lower, digit, and symbol satisfies the policy but is short against the real threat.

Service accounts don't log in interactively, so they're in a position to carry very long passphrases without worrying about user experience. But in practice, the tradeoff between operator memory and documentation hygiene collapses them down to 8–12 characters.

Kerberoasting targets exactly this band: passwords that satisfy the policy but are weak by modern standards, in a form the attacker can verify offline at their leisure.

### 3. Room for RC4 downgrade

Even with AES enforced domain-wide, if a single account has `msDS-SupportedEncryptionTypes` unset or misconfigured, the TGS for that account can still be issued under RC4.

Tools like Rubeus can explicitly request the desired etype during the TGS request. If the attacker requests RC4 and the target account permits it, an RC4 hash comes out of an environment that was supposed to enforce AES — handing the attacker the three-orders-of-magnitude speed advantage directly.

This misconfiguration is easy to miss in audits, because the organization-level conclusion ("AES enforcement policy applied") is disconnected from the account-level verification ("is that policy actually effective on every account"). The attacker only looks at the latter.

### 4. The attack surface isn't just SPN-holding accounts

It's tempting to think the target set is "accounts that already have an SPN," but there's another tier.

If you hold `WriteProperty` rights (`GenericAll`, `GenericWrite`, or write access to `serviceprincipalname`) over any domain user, you can add a temporary SPN to that user. A three-move attack becomes available: add the SPN, Kerberoast, remove the SPN, then crack offline. This variant — targetedKerberoast — becomes especially dangerous in environments where `WriteProperty` edges are densely connected in BloodHound.

In other words, an inventory of "accounts holding SPNs" doesn't fully capture the attack surface. You also have to look at "who can write whose SPN."

![The asymmetry of Kerberoasting](/assets/img/posts/kerberoasting-aes-era/asymmetry.svg){: width="720" height="480" }
_The attacker requests a TGS for every SPN — normal traffic — and needs just one weak account to win. Most accounts here are hardened (gMSA, long passphrases), but a single five-year-old weak service account, or one writable non-SPN user promotable via targetedKerberoast, is enough to reach domain compromise._

### 5. The asymmetry of detection

Event ID 4769 is the noisiest event in a healthy environment. A TGS request in ordinary business and a TGS request during Kerberoasting are nearly indistinguishable at the single-event level.

Realistic detection takes the form of a pattern — "one user requests TGS for many SPNs in a short window" — or a honeypot: a TGS request against an SPN that should never be used. But the former can be evaded by spreading and slowing the requests, and the latter only works in organizations that seeded honeypot SPNs in advance.

Detection is fundamentally probabilistic; the attack is deterministic. The attacker needs to succeed once. The defender has to detect every time.

This is worth stating in base-rate terms, because it explains why so many organizations that "have detection for Kerberoasting" still get caught by it. Suppose the behavioral rule catches 80% of Kerberoasting attempts — a generous number in practice. An attacker who knows the rule exists doesn't run the loud version; they request a handful of tickets per day, spread across a week, from an account that has a plausible reason to touch those services. Against that pattern, the 80% collapses toward the false-negative floor, while the false-positive cost of tightening the threshold rises until the SOC turns the rule down or off. The defender is fighting the base rate: millions of legitimate 4769 events per day, against a signal deliberately shaped to look like them. The honeypot SPN sidesteps this precisely because it inverts the base rate — a ticket request against an account that has zero legitimate reason to be touched is a near-perfect signal, which is why it outperforms every behavioral rule despite being far simpler.

### 6. Why it stays the first move

Put together, Kerberoasting has the following properties from the attacker's side.

| Property | Detail |
|----------|--------|
| Privilege required | Authenticated domain user only (low) |
| Target | Accepted by any domain controller |
| Network footprint | Indistinguishable from normal business (low) |
| Post-success work | Completes offline (no re-request) |
| Risk on failure | Near zero (the request is normal behavior) |
| Attack surface | Extensible via SPN-holders + WriteProperty |

Right after initial compromise, it's worth running in parallel with situational awareness. There's nothing to lose on failure, and on success it feeds directly into lateral movement and privilege escalation via the service account.

## The Attacker's Reasoning

The commands sit in the refs Active Directory sheet, so here I'll only trace the decision flow.

Immediately after initial compromise, look at the SPN distribution first. Build the full picture, then decide priority — don't fixate on a specific account from the start. Keep "where the SPNs are" separate from "what that account can do."

Members of high-privilege groups that also hold an SPN get immediate priority. A Domain Admins member holding an SPN is not rare even in 2026. If a weak password comes out, the path from there to domain dominance is nearly linear.

Even mid-privilege accounts that can serve as a stepping stone for Constrained Delegation get recorded. Kerberoasting doesn't end on its own — it becomes the foothold for later delegation abuse.

Accounts with an old `pwdLastSet` carry a double likelihood: not gMSA, and a password set in a weaker era. But since gMSA also rotates periodically, you can't rule out gMSA by `pwdLastSet` alone — confirm whether `objectClass` is `msDS-GroupManagedServiceAccount`.

## The Defender's Practice

### SPN and ACL inventory

Don't attach SPNs to privileged accounts. This is the single cheapest and most effective countermeasure. Make it a monthly automated check that no member of Domain Admins, Enterprise Admins, or Schema Admins has an SPN bound to it.

At the same time, inventory the principals that hold `WriteProperty` over any user. This is where the targetedKerberoast attack surface is determined. Run a BloodHound query along the lines of `MATCH (n)-[:GenericAll|GenericWrite|WriteProperty]->(m:User)` periodically to catch unexpected write rights.

### gMSA / MSA / dMSA migration plan

Make gMSA the default for new service accounts. Inventory existing operational accounts for gMSA compatibility and put them on a roadmap. Incompatible accounts will persist, but shrinking that population is itself meaningful.

The dMSA (delegated Managed Service Account) introduced in Windows Server 2025 is worth watching as a migration path, since it can inherit an existing service account while disabling password authentication.

That said, gMSA isn't a cure-all. In the Golden gMSA attack, an attacker who obtains read access to the KDS root key's secret attributes (by default only Domain Admins) can compute the passwords of every gMSA tied to that root key, offline. Restrict read access to the KDS root key object to DA-equivalent only, and continuously audit KDS permission grants.

### AES enforcement and etype whitelisting

Set `msDS-SupportedEncryptionTypes` explicitly on every account. Unset accounts fall back to a default, and that's where the hole opens. Verify at the account level, not the organization-policy level. Restrict Kerberos encryption to AES128/256 only on the group policy side as well.

Microsoft's published scripts `List-AccountKeys.ps1` and `Get-KerbEncryptionUsage.ps1` let you visualize the etype distribution of TGS actually being issued. Strongly prefer measuring with these before concluding "AES is enforced" in an audit.

### Defend with password length

Base service account passwords on 25-plus characters of randomness. An account that never logs in interactively doesn't need "memorability." Assume storage in a password manager and give up on memory. Get outside the threat model with length, not complexity.

### Detection design

Combine the following three layers.

- **Honeypot SPN**: attach an SPN to an unused dummy service account and make any TGS request against it a high-priority alert. Near-zero false-positive rate and the highest cost-effectiveness.
- **etype monitoring**: extract Event ID 4769 entries with `Ticket Encryption Type = 0x17` (RC4) and visualize frequency and source. RC4 issued in an AES-enforced environment is also evidence of misconfiguration. The January 2025 Windows Server cumulative update officially added Ticket Encryption Type and Session Encryption Type to these events on Windows Server 2016 and later, lowering the SIEM implementation burden.
- **Behavioral pattern detection**: many TGS requests against many SPNs from a single source account in a short window. Thresholds need per-environment tuning and produce many false positives early on.

## The Asymmetry

Let me restate the "asymmetry" that recurred throughout this piece one more time.

Kerberoasting abuses a design feature of AD; it's not the kind of vulnerability you can patch away. "An authenticated user can request a TGS for an SPN-holding account" is the intended behavior of Kerberos. You can't fix it, only reduce its impact.

The attacker wins by finding one weak service account — or one excessive `WriteProperty`. The defender loses unless they cover every service account and every ACL. That imbalance is structural, and it doesn't disappear as long as you operate a system as long-lived as AD.

That's exactly why this technique will still be the first move ten years from now. And it's why the defender has to design toward "make the attack economically irrational" rather than "prevent it completely." gMSA, password length, honeypot SPNs, ACL inventory — every one of these is a tool for pushing the cracking time and the detection probability up past the point where they're worth the attacker's cost.

## Key Takeaways

- AES enforcement buys time, it doesn't solve the problem. The hashcat mode 13100 vs 19700 speed gap is about three orders of magnitude, but that doesn't mean "uncrackable."
- gMSA migration is the best current answer. But neglecting KDS root key permission management gets it nullified by Golden gMSA. Treat root key protection and gMSA migration as one package.
- The attack surface isn't just "SPN-holding accounts." Inventory the principals holding `WriteProperty` for targetedKerberoast too.
- RC4 downgrade is verified at the account level, not the organization-policy level. A single misconfiguration opens a hole. Microsoft's PowerShell scripts let you measure it.
- Detection works in practice through honeypot SPNs combined with etype monitoring. Since January 2025, Event 4769 on Windows Server carries Ticket Encryption Type officially, easing SIEM implementation.
- Understanding the asymmetry is the starting point of defensive design. Build toward raising the attacker's cost, not toward preventing completely.

## References

- MITRE ATT&CK — T1558.003 Steal or Forge Kerberos Tickets: Kerberoasting: <https://attack.mitre.org/techniques/T1558/003/>
- Microsoft Learn — Group Managed Service Accounts Overview: <https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-managed-service-accounts/group-managed-service-accounts/group-managed-service-accounts-overview>
- Microsoft Learn — Detect and Remediate RC4 Usage in Kerberos: <https://learn.microsoft.com/en-us/windows-server/security/kerberos/detect-remediate-rc4-kerberos>
- Microsoft Learn — 4769(S, F) A Kerberos service ticket was requested: <https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4769>
- Semperis — Golden gMSA Attack: <https://www.semperis.com/blog/golden-gmsa-attack/>

---

> 我以外皆我師 — everyone I meet has something to teach me.
