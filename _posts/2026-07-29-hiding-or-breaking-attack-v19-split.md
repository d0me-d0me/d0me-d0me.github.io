---
title: "Hiding or Breaking: The Operator's Side of the ATT&CK v19 Split"
date: 2026-07-29 22:00:00 +0000
categories: [Offensive, Evasion]
tags: [attack-v19, stealth, defense-impairment, evasion, telemetry]
description: How the v19 Stealth and Defense Impairment split maps onto real technique selection, and what each side costs.
---

## 概要

2026 年 4 月の ATT&CK v19 で、Defense Evasion 戦術が Stealth (TA0005) と Defense Impairment (TA0112) の 2 つに分割された。分類の基準は、監視の仕組みには手を出さず正常な活動に紛れるのか、監視の仕組み自体を止めるか信用できない状態にするのか、という違いだ。

この線引きは分類の話では終わらない。前者は、記録として残ったイベントを検索すれば見つかる。後者は、出ていたはずのログが止まったことに気づかなければ見つからない。検知側にとって、この 2 つはまったく別の問題になる。

攻撃側がどちらを選ぶかで、防御側に残される検知手段まで決まる。この記事では 5 つの技術プロファイルを 6 軸で比較し、その決まり方を追う。

## Introduction

ATT&CK v19, published in April 2026, cut Defense Evasion in two. Stealth kept the original identifier TA0005. Defense Impairment arrived as TA0112. The sorting criterion MITRE applied was a single question: is the adversary hiding, or are they breaking something?

That question is not documentation housekeeping, because it has a consequence that lands on the defender rather than on the framework. Techniques that leave the collection points intact are found by locating an event that occurred. Techniques that degrade the collection points are found by noticing an event that stopped occurring. The first is a search problem over data that exists. The second is an inference problem over data that is missing. Different tooling, different cost, different failure modes.

The reason an operator should care is that the same question gets answered before touching a host, usually without being asked out loud. Deciding whether to reach for a signed system binary or to interfere with a sensor is not a preference about style. It sets the privilege floor, determines what fires on failure, fixes how long the approach survives patch cycles, and decides whether the activity can be walked back afterwards.

This article makes the argument in three steps. First, what the split actually changed in the framework, including the identifiers that no longer exist. Second, how five technique profiles distribute across the boundary, and what six axes of operator cost say about each. Third, why the resulting detection asymmetry is lopsided enough to be an input to approach selection rather than an afterthought.

The scoring used in the figures is editorial judgment rather than measurement, and the figures say so. The numbers are there to show the shape of the tradeoff, which turns out to be considerably more one-sided than the old single-tactic view suggested.

## What the v19 Split Actually Changed

ATT&CK v19 was published on 28 April 2026. Enterprise now carries fifteen tactics, 222 techniques, 475 sub-techniques, and 697 detection strategies. The additional tactic is entirely accounted for by the Defense Evasion split, and the split applies to the Enterprise matrix specifically, so mappings that span matrices now have to bridge two different taxonomies for the same behaviour.

Stealth carries the definition most people already had in mind when they said defense evasion. It covers techniques that reduce the likelihood of detection by blending in with legitimate activity or by minimising observable signals. The distinguishing characteristic is concealment: avoiding, obfuscating, or mimicking normal operations. The definition is explicit that these techniques do not modify security controls and do not compromise collection and monitoring feeds. The goal is to be indistinguishable from benign activity while the defensive systems stay intact and functional. Thirty techniques sit under it.

Defense Impairment covers techniques that degrade, disable, or undermine the effectiveness and trustworthiness of security controls and monitoring mechanisms. The distinguishing characteristic is direct interference. The objective is not to look normal but to reduce the defender's capacity to detect, interpret, or respond at all. The tactic was created in mid-April 2026 and currently holds eighteen techniques.

The renumbering underneath is where existing mappings break. Impair Defenses, T1562, was revoked. Its content was absorbed into a new parent, Disable or Modify Tools, at T1685, which now carries sub-techniques covering Windows event log tampering, cloud log tampering, tool user interface spoofing, Linux audit system tampering, and log clearing on both Windows and Unix-like systems. Several other techniques arrived new under the tactic: System Firewall modification at T1686, Exploitation for Defense Impairment at T1687, Safe Mode Boot at T1688, Downgrade Attack at T1689, and Prevent Command History Logging at T1690.

On the Stealth side, T1211 was renamed Exploitation for Stealth. The framework now holds two exploitation techniques distinguished purely by intent: exploiting a flaw to avoid being seen, and exploiting a flaw to reduce what can see you. System Binary Proxy Execution at T1218 received a major version bump. Reflective Code Loading at T1620, Process Injection at T1055, Rootkit at T1014, Obfuscated Files or Information at T1027, Masquerading at T1036, and Indicator Removal at T1070 all remain on the Stealth side, the last of these including Timestomp at T1070/006.

One structural detail deserves attention from anyone who writes detection content. Detection strategies are objects in the framework in their own right, and v19 shipped a new one specifically for the impairment case while deprecating an older cross-platform strategy for Impair Defenses. The framework is beginning to encode the asymmetry described later in this article rather than leaving individual defenders to notice it.

## Five Profiles on Either Side of the Line

![Decision flow separating the stealth path from the defense impairment path](/assets/img/posts/attack-v19-split/split-decision-flow.svg){: width="900" height="750" }

_Figure 1. The branch that decides which detection mode the defender is left with._

Five profiles are enough to populate both sides of the boundary without turning this into a technique catalogue. Three sit in Stealth and two in Defense Impairment.

**System binary proxy execution (T1218).** Execution is routed through a binary that ships with the operating system and carries a vendor signature. Nothing is installed, nothing is modified, and the signature chain validates exactly as designed. The approach depends on the trust model working correctly rather than on breaking it. Its weakness is not technical fragility but saturation: this is among the most heavily hunted areas in the Windows estate, and the relevant binaries appear in vendor-maintained block rule sets that grow over time.

**Trusted developer utility proxy execution (T1127).** The same idea shifted to build and development tooling. The advantage over the previous profile is a thinner detection literature in many environments. The disadvantage is a prerequisite: the utility has to be present, which makes the approach conditional on what the host was provisioned for. On a developer workstation this is a reasonable bet. On a finance user's laptop it is not, and the presence of the toolchain becomes anomalous in itself.

**Reflective and in-memory code loading (T1620, with T1055 where the target is another process).** No file is written where a scanner would look for one. Microsoft's own documentation describes reflective DLL injection as loading a module into process memory without it being on disk, which evades the operating system mechanism that tracks loading executable modules. This is the profile that most reliably defeats disk-centric controls, and it is also the profile most exposed to one specific piece of instrumentation. Vendor documentation lists AMSI coverage across PowerShell, JScript, VBScript, Windows Script Host, Windows Management Instrumentation, and .NET Framework 4.8 or newer with scanning of all assemblies. That last entry closed a gap the framework documented on release: assemblies loaded from a byte array rather than from disk had previously gone unscanned. The consequence is sharper than an ordinary detection. The AMSI DotNet event carries the entire portable executable contents of the in-memory loaded assembly, so a failure here does not hand the defender an alert. It hands them the artefact.

**Trust control subversion (T1553).** Rather than satisfying a trust decision, the trust decision itself is altered. This falls under Defense Impairment because the control is left in a degraded state that no longer means what it claims to mean. It typically requires administrative privilege, it changes durable host configuration, and it leaves the host in a condition the operator cannot silently restore.

**Sensor disablement through exploitation (T1687, together with T1685).** The collection points themselves are the target. This is the most direct route to reducing what the defender can see, and it is the most expensive option on every axis considered below. It generally requires local administrative privilege as a floor, it produces durable changes, and it is the profile most exposed to a control that improves on a schedule outside the operator's influence.

The branch shown above places these five on either side of a single question, which is deliberately narrow: does reaching the objective require a collection point to stop producing signal? If the answer is no, the Stealth path applies and every sensor keeps reporting. If the answer is yes, the impairment path applies and the engagement acquires a timeline it did not previously have.

## Two Techniques, One Trust Model, Opposite Sides

The most instructive detail in the reorganisation is that two profiles resting on the same foundation ended up sorted differently.

System binary proxy execution and trust control subversion both depend on Windows signature trust. The first depends on that trust functioning correctly. A signed vendor binary is presented, the signature validates, the execution proceeds, and the control has done precisely what it was designed to do. The second depends on that trust being altered so it validates something it should not, or stops validating at all.

Under the old taxonomy both were defense evasion and the distinction was left to prose. Under v19 the first stays in Stealth and the second sits under Defense Impairment. That is worth checking rather than assuming, because MITRE has been explicit that some behaviours map to both tactics. Subvert Trust Controls is not one of them: the technique page lists Defense Impairment as its only tactic, across all six of its sub-techniques. The framework is encoding a difference that matters more than the shared mechanism suggests.

Consider what each leaves behind. In the first case the trust control has no adverse observation to report, because from its own perspective nothing adverse happened. The activity has to be caught elsewhere, by whatever recorded the process, the command line, the module loads, or the network behaviour. The control is not a detection surface here; it is a surface the operator passed through legitimately.

In the second case the trust control is itself the evidence. Its configuration changed, its validation behaviour changed, or its store gained an entry it should not have. That state is durable, it is enumerable, and it persists until someone reverts it. The operator has traded a transient event for a standing artefact, and standing artefacts survive log rotation. The framework now ships a detection strategy for exactly this, correlating abnormal installation of root or code-signing certificates with suspicious trust provider registry keys and module loads from non-standard locations. Nothing equivalent is possible for the profile that passed through the control legitimately, because there is no state change to correlate against.

This is the clearest available illustration of what the split is sorting. Not the mechanism, not the privilege level, not even the sophistication. The criterion is whether the defensive apparatus emerges functional and honest, or degraded and misleading. A technique that passes through a control cleanly and a technique that corrupts the same control are different kinds of act with different consequences, and treating them as one category obscured that for years.

## Six Axes of Operator Cost

![Evasion approach profiles across six operator cost axes](/assets/img/posts/attack-v19-split/profile-radar.svg){: width="900" height="700" }

_Figure 2. Five profiles scored on six operator cost axes. Scores are editorial judgments, not measurements._

Every axis is oriented the same way. A higher score means greater cost or exposure to the operator, so a smaller shape is a cheaper approach.

- **Telemetry exposure.** How many independent collection points record the activity as it happens.
- **Failure noise.** What fires when the approach does not work.
- **Update fragility.** How likely the next patch cycle is to break it.
- **Privilege cost.** The floor of what the approach demands before it is available at all.
- **Irreversibility.** How much of the host cannot be put back afterwards.
- **Absence signal.** How much of the detectable footprint takes the form of expected signal that stopped rather than unexpected signal that appeared.

Telemetry exposure puts system binary proxy execution at the top of the scale. Process creation, command line capture, image loads, and in some sub-techniques script content all record it, and it carries the heaviest hunting literature of the five. Sensor disablement, perhaps counter-intuitively, scores below the maximum. The sensor under attack is also the sensor that would report the attack, so the exposure is partially self-limiting. That self-limitation is a timing artefact rather than a real reduction, which the flow diagram handles and a radar chart cannot.

Failure noise is where reflective loading pays for its advantage. A blocked in-memory .NET load can deliver the assembly itself rather than a verdict about it. Sensor disablement scores at the maximum, because a blocked driver load produces code integrity records and a failed attempt against a security agent sits close to the highest-severity event an endpoint product will emit.

Update fragility separates the two sides by a mechanism the operator does not control. The Stealth profiles score in the low to middle range because they rest on architectural properties that persist across releases. Sensor disablement scores at the maximum. Microsoft's vulnerable driver blocklist has been enabled by default on all devices since the Windows 11 2022 Update, is additionally enforced when memory integrity, Smart App Control, or S mode is active, with Windows Server 2016 as a documented exception, and is refreshed with each new major Windows release, typically once or twice a year. Any approach resting on a specific signed driver has a half-life measured against that cadence.

Privilege cost and irreversibility move together and both favour the Stealth side heavily. The three Stealth profiles operate at user level, with cross-process work raising the requirement modestly, and they score at the bottom of the irreversibility axis because there is nothing to restore. Both impairment profiles require administrative privilege as a starting point, which means they are not available until other objectives have already been met, and both leave state changes behind: a modified trust store, a loaded driver, a stopped agent. Each of those can be found later by someone who was not watching at the time.

Absence signal is the axis the old taxonomy had no vocabulary for, and it separates the two sides more cleanly than any other. The three Stealth profiles score at the bottom. The impairment profiles score at or near the top.

Read together, the aggregate is lopsided. The three Stealth profiles total between eleven and fifteen across six axes. The two impairment profiles total eighteen and twenty-nine. The gap is not evenly distributed either: it concentrates in privilege, irreversibility, and absence signal, which is to say in the axes describing permanent consequences rather than momentary risk.

## Finding What Happened Versus Noticing What Stopped

![Telemetry source visibility against five evasion approach profiles](/assets/img/posts/attack-v19-split/telemetry-matrix.svg){: width="900" height="640" }

_Figure 3. Which collection point observes which approach. Every cell where the source itself becomes the target falls in the Defense Impairment columns._

Mapping eight collection points against the five profiles produces a result easier to see than to argue. Cells where a source records the activity, records it partially, or records nothing are distributed across the whole grid. Cells where the source itself becomes the target of the technique appear only in the two Defense Impairment columns. There are five of them, and not one falls on the Stealth side.

That is the asymmetry in its most compact form. Against the Stealth profiles a defender works with data that exists. The question is whether the right query was written, whether the retention window is long enough, and whether the baseline is clean enough for an anomaly to stand out. These are hard problems, and the first rows of the matrix show that the Stealth profiles are well covered by ordinary process and module telemetry, with reflective loading partially escaping the disk-oriented sources while running directly into AMSI.

Against the impairment profiles a defender works with a hole. Event Tracing for Windows, kernel callbacks, and the Windows event log all appear as targets in the sensor disablement column. Signature and trust validation appears as a target in the trust subversion column. The bottom row, agent heartbeat, is the extreme case: four of the five profiles produce nothing at all there, and the one profile that lights it up does so by attacking it.

The consequence for a detection programme runs in both directions. Investment in absence-based detection, meaning heartbeat monitoring, expected-volume baselines, control health attestation, and alerting on the disappearance of a provider, only pays against one column of five. That is a poor return if the threat model is dominated by Stealth activity. It is the only thing that works if the threat model includes an adversary willing to spend administrative privilege on reducing visibility.

The same reasoning read from the operator's side explains the shape of the tradeoff. Choosing the impairment path does not make the activity invisible. It converts the detection problem from one the defender is probably already tooled for into one they probably are not. Whether that is an improvement depends entirely on the maturity of the specific environment, which is a judgment about the target rather than about the technique. In an estate with mature control health monitoring, degrading a sensor is closer to announcing an intrusion than concealing one.

This is also where the timeline in the first figure earns its place. The impairment path has three distinct phases. At the moment of the act the activity is loudly recorded, because driver load and integrity mechanisms are still functioning. After the act succeeds the affected rows go quiet, which is the intended effect. At recovery the quiet period is bounded on both ends by the last and first records from the sources that stopped, which makes the gap itself a searchable object. Stealth produces no equivalent structure. Nothing stops, so nothing has edges.

## Why the Impairment Side Is the Side That Moves

One development in progress bears directly on telemetry exposure and update fragility, and it needs reading carefully rather than at headline level.

Following the endpoint disruption of July 2024, Microsoft began work on a platform allowing security vendors to operate outside kernel mode. A June 2025 post announced delivery of a private preview of the Windows endpoint security platform to a set of Microsoft Virus Initiative partners, describing capabilities that let antivirus and endpoint protection products run in user mode as ordinary applications do. A November 2025 post refers back to that release as the first private preview and states that it shifted antivirus enforcement from the kernel into user mode. The two posts do not agree precisely on the month, and availability beyond private preview is not something this article can speak to with confidence. The platform should be read as in flight rather than settled.

The reading that requires care is what moved. Vendor documentation from the same period states that security products can continue to use optimised sensors operating in kernel mode for data collection and enforcement. Enforcement components moving to user mode is not the same as telemetry collection leaving the kernel. An approach built on the assumption that kernel-resident observation is disappearing would be built on a misreading of the announcement.

The same November post records a second change on a separate track. From April 2025, version 3.0 of the Microsoft Virus Initiative added requirements that antivirus partners must meet to retain signing rights for Windows antivirus drivers. Read alongside the platform work, the direction is consistent: the kernel is becoming a more conditional place to run code, including for the defenders.

If that direction holds, the effect on the axes is uneven rather than uniform. Kernel-resident collection becoming a narrower and more standardised surface would make its behaviour more predictable across products, which cuts both ways. Fewer per-vendor differences to discover, and fewer per-vendor gaps to find. The privilege floor for reaching kernel-level collection points does not fall. If anything, a smaller and more scrutinised kernel surface with a documented interface is harder to interfere with quietly than a large and varied one.

The driver blocklist illustrates the same pattern from a different angle: a control that tightens on a schedule while keeping a documented dependency. It is default-enabled on modern Windows, and it is additionally enforced where memory integrity, Smart App Control, or S mode is active. The strength of the control therefore varies with how those features are distributed across an estate, which is an environmental fact rather than a property of any technique.

The practical conclusion for approach selection is unglamorous. The impairment side is the side where the ground moves. Its cost profile is set by vendor release cadence, default configuration decisions, and platform architecture changes, none of which are under operator control and all of which have trended toward tightening. The Stealth side depends on architectural properties of the operating system that change far more slowly. That difference in volatility is a legitimate input to the choice, and it points the same direction as the privilege and irreversibility axes.

## Key Takeaways

- ATT&CK v19, published on 28 April 2026, split Defense Evasion into Stealth at TA0005 and Defense Impairment at TA0112. Enterprise now carries fifteen tactics.
- The sorting question MITRE applied is whether the adversary is hiding or breaking something. Stealth leaves collection and monitoring feeds intact by definition; Defense Impairment degrades them by definition.
- Mappings written against T1562 need rework. Impair Defenses was revoked into Disable or Modify Tools at T1685, and new techniques including Exploitation for Defense Impairment at T1687 and Safe Mode Boot at T1688 arrived under the new tactic.
- Two techniques resting on the same signature trust foundation were sorted differently. Passing through a trust control as designed is Stealth; altering the control so it no longer means what it claims is Defense Impairment.
- Across six axes of operator cost, the three Stealth profiles total eleven to fifteen while the two impairment profiles total eighteen and twenty-nine. The gap concentrates in privilege, irreversibility, and absence signal.
- Failure on the impairment side is loud in a specific way. A blocked driver load produces integrity records, and a failed attempt against a security agent sits near the top of an endpoint product's severity scale.
- A blocked in-memory .NET load can deliver the assembly rather than a verdict, since the AMSI DotNet event carries the full portable executable contents of what was loaded.
- Every cell in the telemetry matrix where a collection point becomes the target of the technique falls in the Defense Impairment columns. Absence-based detection pays against one profile column of five, and it is the only thing that pays there.
- The impairment path acquires a three-phase timeline: loud at the moment of the act, quiet after it succeeds, and bounded at both ends during recovery, which turns the quiet period into a searchable object. Stealth produces no equivalent structure.
- Update fragility is asymmetric by construction. The impairment side is governed by blocklist refresh cadence, default configuration changes, and platform architecture in motion, while the Stealth side rests on slower-moving properties of the operating system.

## References

- MITRE — ATT&CK v19 release notes and updates, April 2026: <https://attack.mitre.org/resources/updates/updates-april-2026/>
- MITRE — Defense Impairment tactic (TA0112): <https://attack.mitre.org/tactics/TA0112/>
- MITRE — Stealth tactic (TA0005): <https://attack.mitre.org/tactics/TA0005/>
- MITRE — Subvert Trust Controls (T1553), tactic assignment and detection strategy DET0452: <https://attack.mitre.org/techniques/T1553/>
- Microsoft Learn — Microsoft recommended driver block rules and the vulnerable driver blocklist: <https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/design/microsoft-recommended-driver-block-rules>
- Microsoft Learn — AMSI integration with Microsoft Defender Antivirus, including the list of covered components: <https://learn.microsoft.com/en-us/defender-endpoint/amsi-on-mdav>
- Microsoft Learn — Antimalware Scan Interface overview: <https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal>
- Microsoft .NET Blog — Announcing the .NET Framework 4.8, on scanning assemblies loaded from byte arrays: <https://devblogs.microsoft.com/dotnet/announcing-the-net-framework-4-8/>
- Microsoft — The Windows Resiliency Initiative and the endpoint security platform private preview: <https://blogs.windows.com/windowsexperience/2025/06/26/the-windows-resiliency-initiative-building-resilience-for-a-future-ready-enterprise/>
- Microsoft — Windows security and resiliency update, November 2025: <https://blogs.windows.com/windowsexperience/2025/11/18/preparing-for-whats-next-windows-security-and-resiliency-innovations-help-organizations-mitigate-risks-recover-faster-and-prepare-for-the-era-of-ai/>
- Red Canary — Better know a data source: Antimalware Scan Interface, on the structure of DotNet scan events: <https://redcanary.com/blog/threat-detection/better-know-a-data-source/amsi/>

---

> 我以外皆我師 — everyone I meet has something to teach me.
