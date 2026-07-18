---
title: How Attackers Pick the First Move — Five Axes of Initial Access
date: 2026-07-18 10:00:00 +0000
categories: [Offensive, Initial Access]
tags: [initial-access, phishing, valid-accounts, exploitation, mitre-attack]
description: Initial access has no single "best" technique. This piece frames the decision as five axes and shows why the winner depends more on the defender than on the tool.
---

## 概要

Initial access には「これが最強」という答えはない。 Phishing, Valid Accounts, Public-Facing App の exploit, External Remote Services, Supply Chain — どれを選ぶかは attacker の予算と時間軸、target defender の成熟度が組み合わさって決まる。 この記事は個別 technique の手順書ではなく、意思決定を 5 軸(Stealth / Cost / Persistence / Auth Bypass / Maturity Tolerance)に分解して整理する試みだ。 Mandiant M-Trends 2026 の mean time-to-exploit が -7 日に振れた事実と、Verizon DBIR の base rate が年ごとに揺れる事実が、選択の背景条件を作っている。 具体的なコマンドは `/refs/` の関連シートにある。

## Introduction

If you polled a room of red teamers on "the best way to get initial access," you would get five different answers before the second cup of coffee. Not because anyone is wrong, but because the question is under-specified. Best against whom? Against a mid-sized regional bank running Duo push MFA and a two-year-old VPN appliance? Against a Fortune 100 tech company with FIDO2 hardware keys and a mature bug bounty program? Against a target you have never touched, with a two-week engagement window and no budget for zero-days?

Different defenders. Different answers.

This piece is not a how-to. Commands and payload recipes sit in the `/refs/` sheets. What lives here is the framework: how the technique selection actually gets made, why the answer changes across engagements, and what the current base-rate data from Verizon DBIR, Mandiant M-Trends, and CrowdStrike GTR tells us about which axes matter most in 2026.

The five axes are Stealth, Cost, Persistence, Auth Bypass, and Maturity Tolerance. No single technique wins on all five. Every technique is a specific set of tradeoffs, and the attacker's job — before writing any payload — is to know which tradeoffs the target's defense makes acceptable.

## The Five Axes

Every initial access technique can be located on five roughly independent axes. Independent means moving one doesn't automatically move another, and the attacker weighs them separately.

**Stealth** — the inverse of detection probability. How much telemetry does executing this technique produce? Does it stand out against the environment's baseline, or does it look like legitimate traffic? Phishing landing on a mailbox is loud (email gateway, sandbox, user report). A successful login using stolen credentials from an infostealer log is nearly silent — it looks exactly like the user logging in.

**Cost** — the sum of infrastructure, tooling, and preparation effort measured in attacker resources. Sending 100,000 phishing emails is cheap. Buying a zero-day is expensive. Compromising a software vendor to deliver a supply chain attack is very expensive, both in time and in operational security overhead.

**Persistence** — the durability of the access once obtained. Some techniques give you a session that dies when the user logs out. Others hand over long-lived credentials, API tokens, or trust relationships that survive password rotations and workstation reimaging. This matters because initial access is not the objective; downstream tactics are, and access that dies before the attacker moves laterally is wasted.

**Auth Bypass** — the ability to defeat authentication controls, in particular MFA and conditional access. A stolen password gets you nothing against phishing-resistant MFA. An exploit against a public-facing application often bypasses the identity layer entirely because it hits code paths before authentication runs. Supply chain compromise puts the attacker inside the trust boundary before authentication is even a question.

**Maturity Tolerance** — how well the technique holds up as the defender improves. Some techniques are cheap tricks that stop working the moment the target deploys the standard 2020s controls. Others keep working against organizations with world-class security programs, because the vulnerability they exploit lives somewhere no organization can fully close.

The reason to separate these axes is that attackers do not optimize for a single one. They optimize for the combination that fits the target and the mission. A short engagement against a mature defender rewards a completely different technique than a long dwell-time operation against a startup.

## Five Common Techniques

Five representative initial access techniques cover the vast majority of intrusions in the wild. All five are documented in MITRE ATT&CK under TA0001.

**Phishing (T1566)** — email, voice, or messaging designed to trick a human into running attacker code or handing over credentials. Sub-techniques split by delivery: attachment, link, service, and voice call (vishing). Verizon's 2026 DBIR puts phishing at 16% of confirmed initial access vectors. Mandiant's 2026 M-Trends puts voice phishing at 11%, separate from email-based phishing. Both numbers have stayed remarkably stable over five years — evidence that AI-assisted phishing has raised the baseline of lure quality without materially increasing success rates against organizations that already have detection in place.

**Valid Accounts (T1078)** — the attacker signs in through legitimate authentication channels using credentials obtained elsewhere. Sub-techniques cover default credentials, domain accounts, local accounts, and cloud accounts. Verizon 2025 put credential abuse at 22% of initial access — the top single vector that year. The 2026 report split pretexting out into its own category, dropping the credential-abuse line to 13% while identity-based access aggregated (phishing + credential + pretext) still added to roughly 35%. Infostealer logs are the primary supply line: Verizon 2025 found that 30% of corporate-managed devices and 46% of unmanaged devices in infostealer logs contained company credentials.

**Exploit Public-Facing Application (T1190)** — vulnerabilities in internet-exposed systems: VPN appliances, mail servers, SharePoint, CMS platforms, edge devices. Mandiant's 2026 M-Trends puts exploitation at 32% of initial infection vectors, holding the top spot for six consecutive years. In EMEA the number climbs to 51%. The Google Threat Intelligence Group tracked 90 zero-days exploited in the wild during 2025, with 48% targeting enterprise technologies. Their headline metric, mean time-to-exploit, moved from 63 days in 2018 to -1 day in 2024 to an estimated -7 days in 2025. Negative means the average exploited vulnerability is being weaponized before a public patch exists.

**External Remote Services (T1133)** — brute force, credential stuffing, or misconfiguration abuse against RDP, SSH, VPN, or remote administration interfaces exposed to the internet. Effectiveness depends heavily on whether MFA is present and whether the service enforces rate limiting, geo-restriction, and account lockout. Against an environment with none of these, brute forcing a single administrative account can take minutes; against an environment with FIDO2 and conditional access on every remote entry point, the technique effectively fails at zero cost to the attacker (they just move on).

**Supply Chain Compromise (T1195)** — compromising an upstream vendor, library, or update mechanism to reach the target through a trusted channel. SolarWinds, 3CX, and Kaseya are the public reference points. This technique is rare in raw base rate but disproportionately impactful: a single successful compromise reaches every downstream customer, and detection is structurally hard because the malicious code arrives inside a signed update from a trusted source.

## Reading the Radar

Placing each technique on the five axes produces a shape.

![Five-axis initial access framework](/assets/img/posts/how-attackers-pick-the-first-move/five-axis-radar.svg){: width="900" height="700" }
_No profile dominates every axis. Supply Chain occupies the largest area but is the most expensive to deliver. External Remote Services and Phishing share low cost but collapse on maturity tolerance. Public-Facing App carves out the highest auth-bypass score, because exploitation often runs before authentication runs. Valid Accounts leads on persistence and stealth._

A few observations worth stating explicitly, because they are not obvious from the technique names alone.

Supply Chain is the largest polygon, and if you drew the radar without thinking about cost, you might conclude it's the strongest option. It isn't — the cost axis is the whole reason it stays rare. Building a supply chain intrusion capability requires either significant time (months of preparation, dedicated tooling, operational security across a long dwell period) or significant money (buying access from a broker who did that work already). The reason APT groups use it is that the alternative techniques don't work against their targets. The reason financially motivated groups use it less often is that the math doesn't compute for a two-week ransomware operation.

Phishing and External Remote Services look similar on the radar. They occupy adjacent shapes. But their failure modes are different in ways the radar doesn't capture. Phishing fails when the user reports the email. External Remote Services fails when the exposed service refuses connections from unknown IPs. The former is a per-attempt failure with negligible attacker cost; the latter is a per-target failure that removes the entire technique from consideration for that engagement.

Valid Accounts scores highest on persistence, because a session obtained through legitimate authentication looks legitimate to every downstream telemetry system. It scores lower on auth bypass than you might expect, because MFA — where actually enforced — blocks the raw password. This is why credential-based initial access has been growing more slowly than exploitation-based access in the last two years of DBIR data: MFA deployment is finally moving the needle at the population level.

Public-Facing App is the polygon to watch. It doesn't win any single axis, but it is the only technique that stays reasonably high on both auth bypass and maturity tolerance simultaneously. That combination is what makes it the top vector in Mandiant's caseload for six years running.

## The Defender Maturity Shift

The radar is a snapshot. The more consequential question is what happens to each technique as the defender improves.

![Effectiveness across defender maturity](/assets/img/posts/how-attackers-pick-the-first-move/maturity-shift.svg){: width="900" height="600" }
_Effectiveness curves across five maturity bands. External Remote Services collapses fastest — the standard controls (MFA, rate limiting, geo-restriction) are cheap and effective. Valid Accounts falls sharply once FIDO2 and conditional access are enforced. Phishing degrades gradually because it fights a human element that even mature organizations cannot fully solve. Public-Facing App barely moves, because the mean time-to-exploit has gone negative — the exploit reaches production before the patch does. Supply Chain barely moves either, because the trust relationship it abuses is fundamental._

Two curves are worth staring at longer.

External Remote Services shows the steepest fall. This matches operational reality: an environment with FIDO2 on every VPN endpoint, geo-fenced RDP access, and account lockout policies presents essentially no attack surface to raw brute force. This is a cheap win for defenders, which is exactly why it's the fastest-improving control across the industry. If your target is in this category, brute forcing their VPN is a waste of the engagement clock.

Public-Facing App is almost flat. This is the important finding, and it's the one most defenders don't want to accept. Mandiant's mean time-to-exploit metric has been declining for eight years — 63 days in 2018, 44 days in 2020, 32 days in 2022, -1 day in 2024, and an estimated -7 days in 2025. Negative time-to-exploit means the exploit is running in the wild before the vendor patch exists. Google TIG's 2025 tracking counted 90 zero-days exploited in the wild that year. The distinction between zero-day and n-day exploitation has collapsed for high-value internet-facing systems, because attackers now weaponize the vulnerability before defenders have a patch to deploy.

The consequence for the framework is straightforward. When patch speed no longer keeps pace with weaponization speed, the effectiveness of Public-Facing App exploitation stops depending on defender patch maturity. It starts depending on which vulnerabilities the attacker has access to. Against a target with a mature security program, an attacker with a zero-day for their SAP or Oracle deployment still wins.

Supply Chain is almost flat for a different reason. The trust boundary it exploits is defined by the vendor's controls, not the target's controls. A mature target can invest in every possible internal defense and still ingest a malicious update signed by a legitimate vendor certificate. There is no purchasable enterprise control that closes this attack surface — only architectural choices (signed reproducible builds, SBOM verification, vendor risk management) that push the cost up somewhat but never to prohibitive levels.

Phishing degrades gradually. AI-assisted phishing has raised the baseline lure quality across the industry, and one reading of the 2026 DBIR data is that AI may be uplifting less-experienced attackers to a higher baseline of lure quality without meaningfully increasing success rates against organizations that already have detection in place. So mature targets remain harder to phish, but the population that is easier to phish continues to grow. The technique doesn't die, it just picks up different targets.

## The Attacker's Reasoning

With the framework laid out, the actual decision flow becomes visible.

The first move is not picking a technique. It's classifying the target's maturity band. Baseline (no MFA anywhere), Basic (SMS or app push MFA on some critical services), Standard (push MFA everywhere plus reasonable patching cadence), Advanced (FIDO2 or hardware keys plus conditional access), or Frontier (zero-trust architecture with continuous verification). The recon output from the reconnaissance phase feeds directly into this classification. Public LinkedIn shows the CISO's stack. Job postings show the tooling. Certificate transparency logs show the identity provider. Domain records show the email security stack.

Given a maturity band, the axes prioritize themselves. Against Baseline or Basic, cost dominates — the cheapest technique that works is the right one, and External Remote Services or password spraying against Valid Accounts often produces access in hours. Against Standard, auth bypass starts to matter, and the calculus tilts toward exploitation of Public-Facing Applications where authentication can be bypassed at the code layer. Against Advanced or Frontier, stealth and persistence matter more than either, because loud techniques get caught and short-lived access is nearly useless — Supply Chain becomes proportionally more attractive despite its cost, and highly targeted spearphishing against specific individuals with known device profiles becomes viable.

The technique the attacker chooses is not the one that maximizes any single axis. It is the one where all five axes are acceptable given the constraints. This is why identical attackers make different choices against different targets, and why the same target can be reached by radically different techniques by different actors.

There is a second layer of reasoning worth naming: what happens if the first choice fails. Mature attackers do not commit to a single technique. Phishing runs in parallel with Public-Facing App scanning runs in parallel with credential stuffing against exposed cloud portals. The engagement effectively runs a mini-experiment across the axes to see which one converges first. Whichever produces authenticated access earliest becomes the operational path; the rest becomes redundant infrastructure that can be recycled into the next engagement.

## The Defender's Practice

The mirror-image observation for defenders is that no single control shifts every attacker curve simultaneously. Each axis has its own defensive lever.

**Against Cost** — raise the price of the cheapest options. Rate limiting on remote services makes credential stuffing take days instead of minutes. Email authentication (SPF, DKIM, DMARC in enforcement mode) increases the tooling cost of convincing phishing. Bug bounty programs draw n-day vulnerabilities into disclosure before they reach the attacker's hands. Each of these individually moves few decisions, but collectively they push the cheapest paths out of the attacker's budget.

**Against Stealth** — increase telemetry coverage for the axes that go silent. Identity provider logs need conditional access enforcement, not just enablement, because "enabled but not enforced" produces the same login trace as legitimate use. Egress DNS logging catches command-and-control after initial access even if the entry point was invisible. Honey tokens seeded across identity systems produce near-zero-false-positive signals for the Valid Accounts path.

**Against Persistence** — shorten the useful life of any single credential or session. Short access token lifetimes, aggressive refresh token rotation, and continuous re-evaluation of conditional access on session activity all convert a stolen credential from a durable asset into a perishable one. Even a successful initial access that produces a valid session becomes worth less if the session dies in an hour.

**Against Auth Bypass** — get to phishing-resistant MFA. FIDO2 or WebAuthn on every human account, hardware-attested device identity on every service account. Push-based MFA remains fundamentally not phishing-resistant, and MFA fatigue attacks continue to convert stolen passwords into successful logins at scale — Microsoft's telemetry recorded over 382,000 MFA fatigue attempts in a single year with a roughly 1% acceptance rate at the user level. Number matching helped, but phishing-resistant factors are the durable answer.

**Against Maturity Tolerance** — the hardest axis. Public-Facing App exploitation and Supply Chain both hold up against mature defenders because they exploit trust relationships that cannot be fully removed. The only reliable move here is compartmentalization: assume the initial access will succeed, and design so that a compromised edge system, or a compromised vendor update, has as little onward reach as possible. Segment aggressively. Deny lateral movement paths at the network layer. Instrument identity flows so that a compromise on one leg doesn't automatically grant access to the next.

Notice that no single control shows up in more than one paragraph. That is intentional. Each axis needs its own answer, and controls that promise to solve "initial access" as a single category are almost always overselling on one axis to distract from another.

## Key Takeaways

- Initial access has no single best technique. Selection is a set of tradeoffs across five axes: Stealth, Cost, Persistence, Auth Bypass, and Maturity Tolerance.
- Base rates from Verizon DBIR, Mandiant M-Trends, and CrowdStrike GTR disagree in absolute numbers because they draw from different customer populations, but they agree on the ranking: exploitation, credential abuse, and phishing collectively account for over 60% of confirmed initial access vectors in 2025-2026.
- Google TIG's mean time-to-exploit moved from 63 days in 2018 to -7 days in 2025. Negative TTE means the average exploited vulnerability is being weaponized before a public patch exists. Public-Facing App exploitation no longer depends on defender patch speed.
- MFA quality matters more than MFA presence. Push-based MFA is not phishing-resistant; MFA fatigue and adversary-in-the-middle proxies convert stolen passwords into successful logins at scale. FIDO2 or WebAuthn is the durable answer.
- External Remote Services collapses fastest as defender maturity rises. If the target has FIDO2 on their VPN, brute forcing it is not a strategy — it is a way to waste the engagement clock.
- Supply Chain is expensive but almost immune to defender maturity. This asymmetry is why it is over-represented in APT casework and under-represented in ransomware operations.
- Attackers classify the target's maturity band before picking a technique. Reconnaissance output feeds directly into this classification. The reconnaissance-to-technique-selection pipeline is where the operation is actually decided.
- Defenders should not try to prevent initial access as a single category. Assume it succeeds, invest in compartmentalization, and stack per-axis controls (rate limiting for cost, telemetry for stealth, session rotation for persistence, FIDO2 for auth, segmentation for maturity tolerance).
- The right question at the start of an engagement is not "what should I try first" but "what maturity band does this target sit in." The answer to the first question falls out of the second.

## References

- MITRE ATT&CK — TA0001 Initial Access: <https://attack.mitre.org/tactics/TA0001/>
- MITRE ATT&CK — T1566 Phishing: <https://attack.mitre.org/techniques/T1566/>
- MITRE ATT&CK — T1078 Valid Accounts: <https://attack.mitre.org/techniques/T1078/>
- MITRE ATT&CK — T1190 Exploit Public-Facing Application: <https://attack.mitre.org/techniques/T1190/>
- MITRE ATT&CK — T1133 External Remote Services: <https://attack.mitre.org/techniques/T1133/>
- MITRE ATT&CK — T1195 Supply Chain Compromise: <https://attack.mitre.org/techniques/T1195/>
- MITRE ATT&CK — T1621 Multi-Factor Authentication Request Generation: <https://attack.mitre.org/techniques/T1621/>
- Verizon — 2025 Data Breach Investigations Report: <https://www.verizon.com/business/resources/reports/2025-dbir-data-breach-investigations-report.pdf>
- Push Security — Verizon DBIR 2026 review: <https://pushsecurity.com/blog/verizon-dbir-2026-review>
- Google Cloud — M-Trends 2025: <https://cloud.google.com/blog/topics/threat-intelligence/m-trends-2025/>
- Help Net Security — Mandiant M-Trends 2026 findings: <https://www.helpnetsecurity.com/2026/03/24/mandiant-m-trends-2026-report/>
- Reliance Cyber — The Exploitation Era (M-Trends 2026 analysis, EMEA breakdown): <https://www.reliancecyber.com/blog/the-exploitation-era/>
- Google Cloud — Time-to-Exploit Trends 2023: <https://cloud.google.com/blog/topics/threat-intelligence/time-to-exploit-trends-2023/>
- ManageEngine — MFA bombing attacks (Microsoft telemetry, 382,000/year figure): <https://www.manageengine.com/products/self-service-password/blog/password-management/mfa-bombing.html>
- Prophet Security — MFA fatigue and number matching: <https://www.prophetsecurity.ai/blog/what-is-mfa-fatigue-attack-mfa-bombing-best-practices>

---

> 我以外皆我師 — everyone I meet has something to teach me.
