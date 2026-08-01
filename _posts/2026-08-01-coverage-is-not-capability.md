---
title: "Coverage Is Not Capability: Reading the ATT&CK Detection Model as an Investment Signal"
date: 2026-08-01 18:55:00 +0000
categories: [Defensive, Detection]
tags: [attack-v19, detection-engineering, telemetry, coverage, sysmon]
description: What the new ATT&CK Detection Strategies and Analytics measure, what they do not, and how the coverage curve misleads if read as capability.
---

## 概要

ATT&CK は 2025 年 10 月の v18 で検知の記述を作り替えた。各テクニックに文章で添えた検知方法とデータソースの一覧をやめ、Detection Strategy と Analytic の 2 種類のオブジェクトに分けた。Analytic には、どのログを見てどの閾値で判定するかが書き込まれる。検知ロジックが数えられる形になった。

数えられるなら、何から整えるかの指標に使いたくなる。どのログを集めれば ATT&CK の想定する検知を最も広くカバーできるか。Windows で計算すると、2 つのログソースだけで検知戦略の 98.5% に届く。

だがこの割合は検知能力を表さない。MITRE が Analytic を書くときにどのログ名を選んだかを数えているだけだ。本稿では、カバレッジ曲線が何を測って何を測っていないのかを解きほぐし、整備の優先順位にこの数字をどこまで使えるかを示す。

## Introduction

For ten years, ATT&CK told defenders how to detect a technique with a sentence or two of prose and a list of data sources. In October 2025, version 18 replaced that with something structured: Detection Strategies, each a versioned object that points to platform-specific Analytics, each Analytic naming its log sources, its data components, and the thresholds a defender is expected to tune. The legacy data source objects were deprecated in the same release and are scheduled for removal.

This is a real improvement, and it invites a specific temptation. Once detection guidance is structured data, it can be counted. Given 697 Detection Strategies and 1,758 Analytics in the v19 Enterprise matrix, and given that each Analytic names the log sources it needs, it becomes possible to ask which log sources cover the most of the framework. Answer that, the reasoning goes, and you have a defensible order for detection investment.

The answer is startlingly concentrated. On Windows, one log source covers 89.2% of the reachable Detection Strategies, and a second brings that to 98.5%. Across the whole Enterprise matrix, one source covers 64.9% before any other contributes. Read as a shopping list, ATT&CK appears to say that detection is nearly solved by two or three telemetry feeds.

That reading is wrong, and the way it is wrong is worth spelling out, because the mistake is easy to make and expensive to act on. The coverage number measures how MITRE chose to write its Analytics, not how detectable an adversary is in a running environment. A source that appears in many Analytics is a source MITRE reached for often when describing behaviour, which is correlated with real detection value but is not the same thing. Confusing the two leads to over-investing in a small number of feeds and treating the resulting coverage percentage as a capability score.

This article works through what the new model actually measures. It reads the coverage curve, explains why it is so steep, reframes the steepness as a fragility signal rather than a capability score, and connects the result back to the Stealth and Defense Impairment split covered in a companion piece. The figures are computed directly from the published STIX bundle, and the analysis carries the same caveat throughout: this is a measurement of a corpus, not of an estate.

## What v18 Replaced and Why It Matters

The old model had two moving parts. Each technique carried a free-text detection field and a list of data sources, the latter formalised into Data Source and Data Component objects in v10. In practice this told a defender what kind of data to collect but very little about how to turn it into a detection. The guidance to "monitor process creation" appeared on dozens of techniques with no indication of what specifically to look for.

Version 18 broke detection logic into two new object types. A Detection Strategy describes the behaviour to catch and links to one or more Analytics. An Analytic is platform-specific and telemetry-aware: it names the log sources it reads, specifies channels within those sources, and lists mutable elements, the parameters a defender is expected to adjust for their environment. The stated aim was to eliminate vague references and give each piece of detection logic its own lifecycle and version control.

The scale in v19 Enterprise is substantial. Every one of the 697 active techniques carries exactly one Detection Strategy. Those strategies reference 1,758 Analytics, an average of 2.5 per strategy, ranging from one to nine. The Analytics resolve to 98 distinct data components, surfaced through 266 concrete log source names such as WinEventLog:Sysmon, auditd:SYSCALL, and AWS:CloudTrail. This is enough structure to compute against, which is exactly why it needs handling with care.

The deprecation matters for anyone whose tooling still reads the old fields. The x_mitre_data_sources field on techniques and the standalone Data Source objects are deprecated as of ATT&CK Specification 3.3.0 and will be removed in 4.0.0. A pipeline built to enumerate technique data sources will keep working until it silently stops. Any coverage analysis anchored on the legacy model is measuring a structure that no longer receives updates.

## Reading the Coverage Curve

![Detection strategy coverage against log source count](/assets/img/posts/coverage-not-capability/coverage-curve.svg){: width="900" height="600" }

_Figure 1. Cumulative Detection Strategy coverage as log sources are added in greedy order, for the whole Enterprise matrix and for Windows alone. Coverage here is corpus authorship, not detection efficacy._

To build the curve, each log source is treated as the set of Detection Strategies it can contribute to, via the Analytics that name it. A greedy set cover then picks, at each step, the source that adds the most previously uncovered strategies. This is the most favourable possible ordering, which is the point: it shows the ceiling of what coverage-counting can claim.

For the Enterprise matrix as a whole, the first source reaches 64.9% of the 652 strategies that any log source can touch. That source is WinEventLog:Sysmon. The second, macOS unified logging, brings the cumulative figure to 76.2%. By the eighth source the curve is at 95.1%, and the remaining sixteen sources together add less than five points, trailing off into single-technique contributions from platform-specific feeds like ESXi shell logs and Kubernetes audit logs.

Filtered to Windows, the curve is steeper still. The first source covers 89.2% of the Windows-reachable strategies, and the second, the Windows Security event log, reaches 98.5%. Everything after that is rounding. Two sources account for almost the entire Windows detection corpus as ATT&CK has written it.

The marginal gain line tells the same story from the other direction. It starts at 64.9 for the first source and collapses to 11.3 for the second, then below three by the fifth. After the eighth source, each additional feed contributes less than two points. This is not a gentle diminishing return; it is a cliff followed by a long flat tail. The shape is what needs explaining, and the explanation is not that detection is easy.

## Why the Curve Is So Steep

Three mechanisms produce the steepness, and none of them is "two log sources are enough to catch attackers."

The first is a naming convention. When MITRE writes an Analytic for behaviour observable through Windows process telemetry, it names the source WinEventLog:Sysmon. Sysmon is the reference producer of process creation, network connection, and image load events in the ATT&CK corpus. But those same events are produced by the Windows Security event log, by the kernel telemetry that every EDR product collects, and by other sensors. Counting coverage by the name in the Analytic credits Sysmon for detection data that, in a real environment, might come from any of several sources. The 89.2% is partly an artefact of which name got written down.

The second is behavioural overlap across techniques. A large fraction of Analytics rest on process creation with command-line capture, because a large fraction of techniques manifest as a process doing something. One rich source therefore touches an enormous number of strategies, not because it detects them well, but because process execution is the common substrate of most techniques. Coverage rewards breadth of applicability, which correlates only loosely with detection strength for any specific technique.

The third is uneven Analytic depth. Some strategies carry a single Analytic; others carry nine. A source named in a shallow strategy earns the same coverage credit as one named in a deep, well-instrumented strategy. The metric has no notion of how good the detection is, only whether the source appears. A curve built on presence cannot distinguish a source that reliably catches a technique from one that is mentioned once in passing.

Put together, these mean the curve measures the concentration of MITRE's authorship around a few high-applicability telemetry types. That concentration is real and worth knowing. It is simply not the same fact as "collecting these two sources detects 98.5% of adversary behaviour," and treating the coverage percentage as though it were that fact is the error the rest of this article is trying to prevent.

## Coverage as a Fragility Signal, Not a Capability Score

The steepness is useful once it is read as what it is. A detection model whose coverage concentrates in one or two sources is a model with one or two points of failure. That is a statement about fragility, and fragility is exactly what an operator on the other side of the engagement is looking for.

Read this way, the Windows curve says something sharp. If a single telemetry type accounts for 89.2% of the written detection logic, then degrading or blinding that one type removes most of the corpus at once. The coverage concentration that looked like efficiency from the defender's shopping-list perspective is, from the attacker's perspective, a target list with one entry at the top. The same number supports opposite conclusions depending on whether it is read as capability or as concentration.

This reframing also changes what the curve is good for. It is a poor tool for deciding that detection is adequate, because a high coverage percentage can be reached without any of the underlying detections being tuned or validated. It is a good tool for deciding where single-source dependence is dangerous. A defender who knows that most of their ATT&CK-aligned detection rides on one feed can prioritise redundancy for that feed, monitor its health, and treat its disappearance as a high-severity event in itself.

The distinction matters most under adversarial pressure. A capability score implicitly assumes the telemetry keeps flowing. A fragility signal assumes it might not. In an environment where an adversary can reach the privilege needed to interfere with collection, the second assumption is the correct one, and the coverage curve becomes a map of what the defender stands to lose rather than a measure of what they have.

## The Impairment Mirror: Where the Curve Meets the Split

A companion article traced how ATT&CK v19 split Defense Evasion into Stealth and Defense Impairment, and argued that the two demand different detection modes: Stealth activity is found by locating events that occurred, while Defense Impairment is found by noticing events that stopped. The coverage data adds a quantitative edge to that argument.

Measuring Analytic density per tactic shows where the framework's detection writing is thick and where it is thin. Stealth is the most heavily instrumented tactic in the matrix: 148 techniques, 343 Analytics, and references to 100 distinct log sources, more source variety than any other tactic. Defense Impairment sits far lower, at 56 techniques, 110 Analytics, and 44 source references. Among the post-access tactics, it has the thinnest source variety of any of them.

![Analytic density per tactic across the ATT&CK v19 Enterprise matrix](/assets/img/posts/coverage-not-capability/tactic-density.svg){: width="900" height="640" }

_Figure 2. Per-tactic counts of techniques, Analytics, Analytics per technique, and distinct log sources. The two tactics from the split article are outlined. Density reflects how much MITRE wrote, not how detectable the tactic is live._

The two figures point at the same place. The coverage curve says most Windows detection rides on one or two sources. The density table says the tactic dedicated to degrading those sources is itself among the least instrumented. An adversary who chooses the impairment path is aiming at the concentrated dependency the coverage curve exposes, in a region where the framework offers defenders the fewest analytic building blocks to work with. The companion article ended by observing that absence-based detection pays against only one of five technique profiles. The density data explains why that one column is thinly covered: the corpus itself has less to say about breaking sensors than about hiding from them.

None of this means Defense Impairment is undetectable. It means the detection has to lean on the specific signal these techniques produce, which is loud at the moment of the act, driver loads and integrity events, and then quiet afterwards. That is precisely the signal a coverage-counting exercise undervalues, because the quiet is not an event any Analytic names.

The split itself is an Enterprise-only development, and the detection model makes that visible. The two-tier structure of Detection Strategies and Analytics reached all three ATT&CK matrices in v19, but the density behind it did not, and neither did the separation of hiding from breaking.

![The detection model across the three ATT&CK v19 matrices](/assets/img/posts/coverage-not-capability/domain-compare.svg){: width="900" height="520" }

_Figure 3. Detection Strategies, Analytics, and the evasion tactic across the three matrices. Only Enterprise splits Defense Evasion; Mobile and ICS keep it whole._

Enterprise carries 697 strategies and 1,758 Analytics at 2.5 Analytics per strategy. Mobile sits at 124 and 211, a ratio of 1.7. ICS holds 97 strategies and exactly 97 Analytics, one apiece. The container reached every matrix, but only Enterprise has the behavioural depth to sustain the split, and only Enterprise separates the tactic that hides from the tactic that breaks. For a defender working outside the Windows-and-cloud estate, the coverage curve and the density table both thin out, and the fragility argument sharpens: there is less written detection to lose, and losing it is easier.

## What Coverage Should and Should Not Decide

The practical guidance divides cleanly. Coverage counting answers some questions well and others not at all, and the failures are the expensive ones.

It should not be used to declare a detection programme adequate. A coverage percentage rises when a source is collected, regardless of whether the detections built on it are written, tuned, or tested. Reaching 95% coverage by collecting eight log sources says nothing about whether the alerts fire, whether they are triaged, or whether they survive an evasion attempt. Using the percentage as a maturity metric rewards collection over engineering, which is the opposite of what the new model was built to encourage.

It should not be used to rank telemetry by name. The concentration on WinEventLog:Sysmon is a corpus artefact. A shop running a capable EDR is already collecting most of what that name represents, and buying or deploying Sysmon specifically because it tops the coverage chart is paying for a label rather than a capability. The right question is which behaviours a feed makes visible, not which name ATT&CK attached to them.

It should be used to find single-source dependence. The steepness of the curve is a genuine and actionable fact: most ATT&CK-aligned detection concentrates on a handful of telemetry types, and those types are worth hardening, making redundant, and monitoring for health. A feed that silently stops should page someone.

It should be used to locate thin coverage against high-value tactics. The density table shows Defense Impairment under-instrumented relative to its consequences. That is an argument for investing detection engineering effort where the framework offers least, rather than adding another rule to the already-saturated process-creation pile. Coverage counting is at its best when it points at gaps, and at its worst when it is read as a score.

The through-line is that the ATT&CK detection model is a description of behaviour and the telemetry that reveals it, not a scoreboard. Counted carefully, it shows where detection is concentrated and where it is sparse. Counted carelessly, it produces a number that looks like capability and behaves like a liability, most of all in exactly the situations, an adversary actively degrading collection, where the defender can least afford the confusion.

## Key Takeaways

- ATT&CK v18 (October 2025) replaced free-text Detections and Data Sources with Detection Strategies and Analytics. Legacy data source objects are deprecated as of Specification 3.3.0 and scheduled for removal in 4.0.0.
- v19 Enterprise holds 697 Detection Strategies, one per active technique, referencing 1,758 Analytics that resolve to 98 data components across 266 concrete log source names.
- A greedy set cover shows one log source reaching 64.9% of reachable strategies for the whole matrix, and 89.2% for Windows alone, with a second Windows source reaching 98.5%.
- The steepness is produced by naming convention (Sysmon as the reference producer of process telemetry), behavioural overlap (most techniques manifest as process execution), and uneven Analytic depth. It is not evidence that two feeds detect most adversaries.
- Coverage measures how MITRE wrote its Analytics, not how detectable an adversary is in a live environment. Reading it as a capability score over-invests in a few feeds and treats the percentage as adequacy.
- Read as a fragility signal instead, the same steepness identifies single-source dependence, which is actionable: harden, make redundant, and monitor the health of the concentrated feeds.
- Per-tactic density places Stealth as the most instrumented tactic (148 techniques, 343 Analytics, 100 source references) and Defense Impairment among the least (56, 110, 44), the thinnest source variety of any post-access tactic.
- The two-tier detection model reached all three matrices in v19, but only Enterprise splits evasion into Stealth and Defense Impairment. ICS sits at one Analytic per strategy: the container exists, the behavioural depth does not yet.
- Coverage should locate single-source dependence and thin coverage against high-value tactics. It should not declare a programme adequate or rank telemetry by the name ATT&CK happened to use.
- The tactic dedicated to degrading telemetry is itself the thinnest in the corpus, which is why absence-based detection is both essential against that tactic and poorly served by coverage counting.

## References

- MITRE ATT&CK — What Comes After Detection Rules? Smarter Detection Strategies in ATT&CK: <https://medium.com/mitre-attack/what-comes-after-detection-rules-smarter-detection-strategies-in-att-ck-7e6738fec31f>
- MITRE ATT&CK — v18 Detection Strategies announcement: <https://medium.com/mitre-attack/att-ck-v18-detection-strategies-more-adversary-insights-8f82d839ee9e>
- MITRE ATT&CK — Detections, Data Sources, and STIX data model, including deprecation notices: <https://mitre-attack.github.io/attack-data-model/docs/principles/attack-detections/>
- MITRE ATT&CK — ATT&CK v19 release notes and updates, April 2026: <https://attack.mitre.org/resources/updates/updates-april-2026/>
- MITRE ATT&CK — attack-stix-data repository, source of the computed figures: <https://github.com/mitre-attack/attack-stix-data>
- MITRE ATT&CK — Stealth tactic (TA0005): <https://attack.mitre.org/tactics/TA0005/>
- MITRE ATT&CK — Defense Impairment tactic (TA0112): <https://attack.mitre.org/tactics/TA0112/>

---

> 我以外皆我師 — everyone I meet has something to teach me.
