---
title: How Defenders Pick What to Trust — Six Axes of Windows Forensic Artifacts
date: 2026-07-18 22:00:00 +0000
categories: [Defensive, Forensics & IR]
tags: [forensics, incident-response, windows, sysmon, mft, evtx]
description: Windows forensic artifacts don't rank on a single scale. This piece frames the tradeoff as six axes and shows why the same investigation reaches for different artifacts depending on when it starts.
---

## 概要

Windows フォレンジックには「これが最強」という artifact はない。 MFT / UsnJrnl, Prefetch, ShimCache + AmCache, Security EVTX, Sysmon EVTX, Memory — どれを信頼するかは、事案発覚のタイミング・環境の事前準備・攻撃者の tradecraft が組み合わさって決まる。 この記事は個別 artifact の使い方 (それは `/refs/` の forensics-ir シートにある) ではなく、意思決定を 6 軸(Retention / Reliability / Parse-Ease / Coverage / Tamper-Resistance / Availability)に分解する試みだ。 Initial Access 記事で attacker の 5 軸を分解したのと同じ構造で、defender 側を対称に描く。

## Introduction

Ask five DFIR practitioners what the most important Windows artifact is and you'll get five different answers before the coffee's cold. Memory. Sysmon. MFT. Prefetch. Registry. None of them are wrong. The question is under-specified.

Most important against what? Against ransomware detonation caught at hour zero, with the machine still running and an EDR agent already streaming telemetry? Against an insider threat that dates back six months, where the only surviving records are on-disk and the compromised account has been rotated three times since? Against an APT that ran entirely in memory, restarted the host to clear its own tracks, and left almost nothing on disk to correlate?

Different investigations. Different answers.

This piece is not a how-to. Commands, parsers, and tool invocations live in the `/refs/` forensics-ir sheet. What lives here is the framework: how the decision about which artifact to trust actually gets made, why the same practitioner picks different artifacts against different incidents, and what the current state of Windows telemetry — Sysmon becoming a native optional feature in early 2026, HVCI-protected kernels making memory acquisition harder, ShimCache reliability degrading in Windows 10+ — tells us about which axes matter most in 2026.

The six axes are Retention, Reliability, Parse-Ease, Coverage, Tamper-Resistance, and Availability. No single artifact wins on all six. Every artifact is a specific set of tradeoffs, and the investigator's job — before opening any parser — is to know which artifacts survived long enough to be worth reading.

## The Six Axes

Every Windows forensic artifact can be located on six roughly independent axes. Independent means moving one doesn't automatically move another.

**Retention** — how long the artifact holds evidence after the event of interest. Some artifacts are effectively permanent within the lifetime of the file system (MFT records persist until reused). Some rotate on a fixed size budget (Windows event logs default to 20 MB for Security, filling in hours on busy servers). Some vanish entirely at the first power cycle (memory). Retention is the axis that decides whether the artifact still exists to be examined.

**Reliability** — how unambiguously the artifact's contents map to what actually happened. Event 4624 with LogonType 3 from a specific source IP is a strong statement: someone authenticated over the network. A ShimCache entry from Windows 10 or later is weaker: the binary was on the system, probably viewed or shimmed, possibly executed. Practitioners have converged on the view that ShimCache on modern Windows is not evidence of execution on its own — the last four bytes of an entry help but do not close the question. Reliability is the axis that decides how much weight a finding carries in a report.

**Parse-Ease** — how quickly the artifact can be turned into structured data an investigator can work with. `.evtx` files parse with EvtxECmd in one command. `$MFT` parses with MFTECmd. Memory parses with Volatility 3 across dozens of plugins, each requiring interpretation. The Eric Zimmerman toolset has flattened parse cost dramatically over the last decade, but not uniformly. Some artifacts are still hard, and time spent extracting is time not spent thinking.

**Coverage** — the breadth and type of activity the artifact captures. Prefetch captures execution. MFT captures file existence and lifecycle. Security event logs, when configured, cover authentication, process creation, object access, and privilege use — TrustedSec estimates process creation alone covers 452 ATT&CK techniques, more than any other single telemetry source. Sysmon extends that with network connections, DLL loads, and process access. Memory is the only source for anything reflectively loaded, injected, or in-memory only. Coverage decides whether a specific TTP is even in scope for this artifact.

**Tamper-Resistance** — how hard the artifact is for the attacker to delete, modify, or fabricate after the fact. Event logs can be cleared with `wevtutil` — the clearing itself generates Event 1102 in the Security log, which is a signal, but it means the underlying records are gone. Registry hives can be tampered with by anyone with write access. MFT and `$UsnJrnl` are harder to modify from user space because they're actively managed by the kernel. Memory is the hardest to fabricate because it requires kernel-mode capability, but the attacker who has that capability can produce a misleading snapshot.

**Availability** — how likely the artifact exists in the first place, without any pre-incident preparation by the defender. NTFS metadata exists everywhere Windows runs. Prefetch is on by default on workstation SKUs but disabled on Server SKUs. Sysmon is on nowhere unless the defender put it there — and while Windows 11 gained native optional Sysmon in early 2026, it remains disabled by default and requires explicit configuration. Availability decides whether "we have the artifact" is even the right assumption at the start of the engagement.

The reason to separate these axes is that no artifact optimizes for a single one. The strongest artifacts on Coverage and Reliability tend to be the weakest on Retention and Availability, and vice versa. This is not a coincidence — it is a structural feature of how Windows telemetry accretes.

## Six Common Artifacts

Six representative artifacts cover most of what Windows-based investigations actually work with.

**MFT / $UsnJrnl** — the NTFS master file table records every file that has ever existed on the volume, and the update sequence number journal records the sequence of changes to those files. Together they answer questions like "was this file present on the system at time T," "when was it created, modified, and last accessed," and "was it renamed or moved." Both persist across reboots. MFT records are not immediately overwritten when a file is deleted; they are marked free and reused only when the file system needs the space, which on modern volumes can mean months of grace. This is the closest thing Windows has to a permanent record of file activity, and it is available on every NTFS volume without any pre-incident preparation.

**Prefetch** — `C:\Windows\Prefetch\*.pf` files created by the Windows prefetcher when applications launch. Each file records the executable name, the hash of its path plus command line, up to eight recent execution timestamps, and a list of files the binary touched in the ten seconds after launch. Prefetch is a strong statement of execution: the file was created because a process was created. Windows 8 through 11 workstations retain up to 1024 prefetch files with first-in-first-out rotation. Windows Server SKUs disable prefetching by default, which is the reason server-side investigations often have to fall back on shim infrastructure artifacts instead.

**ShimCache and AmCache** — both live in the Windows application compatibility infrastructure. ShimCache (also called AppCompatCache, stored in the SYSTEM registry hive) records path plus file metadata plus timestamps for binaries the system has seen, but on Windows 10 and later it no longer reliably distinguishes viewed from executed. The last four bytes of an entry are set to `1` when execution is likely, but Eric Zimmerman's guidance is explicit: this signal should not be used to prove execution on its own. AmCache (in `AmCache.hve`) is a richer registry hive with SHA1 hashes, first-install times, and per-binary metadata. Its populator is `compattelrunner.exe`, the Microsoft Compatibility Appraiser, which scans executables on a schedule. That scheduling detail matters: Kaspersky's Securelist analysis in 2025 confirmed that AmCache entries can be created for files the Appraiser scanned but that were never executed. AmCache is therefore best described as strong evidence of file presence and probable execution rather than a definitive execution log. Cross-referenced with Prefetch or Event 4688, it becomes decisive.

**Security EVTX** — the Windows Security event log, primarily useful for authentication events (4624, 4625, 4634, 4648), process creation (4688), privilege use, and object access. On paper this is the richest single source of activity on the host. In practice, most of the interesting events are disabled by default. Process creation auditing requires explicit enablement through Advanced Audit Policy. Command line inclusion in Event 4688 requires a second, separate policy — a fact that reliably surprises defenders who assumed enabling process auditing was enough. Without command line, Event 4688 records that a process was created but not what it was told to do, which one TrustedSec analysis compared to a security camera that captures someone entering a building but doesn't record what they're carrying.

**Sysmon EVTX** — Sysinternals' System Monitor, writing to the `Microsoft-Windows-Sysmon/Operational` channel. When configured with a modern template such as Olaf Hartong's `sysmon-modular` or SwiftOnSecurity's baseline, Sysmon captures process creation with hashes and full command lines (Event 1), network connections (Event 3), driver loads (Event 6), file creation (Event 11), registry modifications (Event 12-14), DNS queries (Event 22), and process access (Event 10). Coverage is the highest of any Windows-native telemetry source. Availability is the lowest. Sysmon began native inclusion in Windows 11 in early 2026 as an optional feature, but it remains disabled by default and requires manual configuration. As Florian Roth observed at the time of the announcement, this quality-of-life improvement doesn't change the operational reality: IR teams still walk into cases and find Sysmon not deployed.

**Memory (RAM)** — the entire physical memory contents of the host, captured while it is running. Volatility 3 and MemProcFS are the analysis frontends. Memory is the only artifact source for anything that never touched disk: reflectively loaded assemblies, decrypted strings, in-memory-only payloads, the process tree at capture time including exited children whose disk traces have been cleaned. Memory acquisition on modern Windows has become materially harder in the last two years. HVCI (Hypervisor-Protected Code Integrity) with VBS enabled rejects the cross-signed drivers most acquisition tools ship with. Defender Tamper Protection intercepts kernel memory reads even after a driver loads. ERNW's 2025 REcon whitepaper on WinpMem concluded that the tool is "dangerous by design" and that its read-anything-where interface should be considered unsafe in practice, quite apart from specific implementation bugs. Practitioners in 2026 increasingly rely on EDR-integrated memory acquisition where the vendor has already solved the HVCI compatibility problem, at the cost of trusting the EDR agent to produce a faithful snapshot.

## Reading the Radar

Placing each artifact on the six axes produces a shape.

![Six-axis Windows forensic artifact landscape](/assets/img/posts/how-defenders-pick-what-to-trust/artifact-radar.svg){: width="950" height="780" }
_No artifact dominates every axis. Coverage and Availability trade off systematically. The strongest telemetry (Sysmon, Memory) requires pre-incident work; the always-on artifacts (MFT, ShimCache) trade breadth for guaranteed presence._

The shape everyone stares at first is Sysmon. On paper it wins Coverage and Reliability outright — process creation with command line and hashes, network connections tied to originating process, DLL loads catching sideloading. Then it collapses on Availability, sitting at the bottom of the scale because Sysmon is not installed on almost any Windows system by default. Its value is entirely conditional on defender preparation before the incident. A DFIR engagement that arrives at a host without Sysmon deployed is not going to install it retroactively and recover anything useful.

MFT is the mirror image. Files-only Coverage means it can tell you what existed but not what ran or who authenticated. In exchange it gets the highest Retention, highest Availability (it's guaranteed present on every NTFS volume), and near-highest Reliability. The MFT is the artifact investigators reach for when the incident is old and the volatile evidence has rotated off.

Memory is the only artifact that scores 1.0 on Coverage without also scoring high on Reliability qualifiers. When you have a memory image captured during the incident, it is often the definitive source. But its Retention is essentially zero — one power cycle and the entire artifact is gone. And its Availability is conditional on a defender or IR team getting to the host while it is still running, with the tooling and privileges to acquire memory over HVCI-protected kernel restrictions.

ShimCache and AmCache together form an interesting shape. Neither is strong individually — ShimCache has degraded reliability on Windows 10 and later, AmCache mixes execution evidence with Appraiser scan artifacts. But their Availability is essentially universal (both are populated on every Windows system without any pre-incident preparation), their Retention runs into months, and cross-correlating the two produces one of the most reliable long-tail evidence sources available.

Two structural observations are worth stating explicitly. First, the axes that matter most in early triage (Reliability, Coverage) are almost inversely correlated with the axes that matter most in cold-case investigation (Retention, Availability). Second, the artifacts that require the most defender preparation to be useful are exactly the ones that most improve early-triage capability — which means "we invested in Sysmon and audit policy" is a bet on catching incidents early, not on being able to investigate them late.

## Evidence Decay Over Time

The radar is a snapshot of what each artifact offers. The more consequential question is what happens to each artifact as the calendar advances between the malicious activity and the investigation.

![Evidence decay across time since incident](/assets/img/posts/how-defenders-pick-what-to-trust/evidence-decay.svg){: width="950" height="620" }
_The strongest telemetry decays fastest. Sysmon and Security event logs give the richest picture — for a window measured in days, not months. For long-tail investigations, MFT and the ShimCache/AmCache pair are what survive._

Three curves are worth staring at longer.

Memory shows a discontinuous cliff. Between hour zero and the first power cycle, memory contains ground truth. After the power cycle, memory contains nothing. There is no gradual decay; there is either a snapshot or there is not. Every successful memory-based investigation begins with a decision that was made before the memory was analyzed: someone acquired it while the host was running. Investigations that arrive after shutdown, or after the environment's normal patch cycle rebooted the host, have zero memory to work with regardless of how sophisticated the analysis capabilities are.

Security event logs show fast rotation, then a sharp knee. The default 20 MB channel size on a busy server rotates in hours to a day or two. Enterprise deployments typically expand these channels or forward events to a SIEM, both of which effectively push the rotation problem elsewhere — but "elsewhere" also has a retention policy, usually 30 to 90 days. Six months into the incident timeline, native Security event log evidence is almost always gone, and whatever survives has been extracted, indexed, and possibly summarized by upstream systems that lose fidelity relative to the raw evtx.

The Sherlock Forensics observation captures the practical consequence: when investigations open weeks or months after the relevant activity, ShimCache plus AmCache often provide the only surviving execution evidence, because Security event log and Sysmon log retention have rolled off. This is the specific reason the shim infrastructure artifacts retain outsized importance in modern DFIR despite their known reliability weaknesses. They are what survives.

MFT and ShimCache + AmCache stay above 70% at the six-month mark. On active file systems, MFT records for files that were deleted during the incident get reused eventually, but the reuse process is slow and irregular — the file system does not scan for reusable records aggressively, and modern NTFS volumes have enough capacity that reuse pressure is low. Six months is often not enough time to lose the MFT trace of a specific file that was created and deleted during a compromise. This is why timeline reconstruction from `$MFT` combined with `$UsnJrnl` remains a foundational technique even when nothing else survived.

## The Investigator's Reasoning

With the framework laid out, the actual investigation flow becomes visible.

The first move is not picking an artifact. It's estimating the time since the malicious activity. Hour-zero triage against a running host prioritizes Memory, live process listings, network connections, and any streaming EDR telemetry. Same-day IR shifts weight toward Security event logs and Sysmon if they exist. Weekly SOC investigation starts leaning on Prefetch, since Security event logs have often begun rotating. Multi-month retro hunts and audit-driven investigations begin from MFT, AmCache, and Registry, because everything else has likely rolled off. Six-month cold-case investigations often have nothing else.

Given a time bucket, the axes prioritize themselves. Early in the timeline, Reliability and Coverage matter most because the goal is to reconstruct the exact activity as tightly as possible. Late in the timeline, Availability and Retention dominate because the goal has shifted to "is there any surviving evidence at all." The same investigator makes different artifact choices against the same technique depending on when the investigation starts.

The artifact the investigator chooses is not the one that maximizes any single axis. It is the one where all six axes are acceptable given the constraints of this specific incident. This is why the same incident type — say, a ransomware detonation — can be investigated through radically different artifact sets depending on whether the host is still running, whether Sysmon was deployed, and whether the incident was detected at hour zero or discovered during a routine audit six months later.

There is a second layer of reasoning worth naming: the corroboration protocol. Mature DFIR teams do not rely on any single artifact for a critical finding. Execution of a specific binary at a specific time is a stronger conclusion when Prefetch, AmCache, and Event 4688 all agree. If Event 4688 has rolled off but Prefetch and AmCache still agree, the conclusion is still strong. If only ShimCache remains and none of the other execution artifacts corroborate, the finding degrades to "the binary was present, execution is probable but not proven." The framework does not just help pick which artifact to read — it helps calibrate the confidence of the finding produced.

## The Defender's Practice

The mirror-image observation for defenders is that no single control shifts every axis simultaneously. Each axis has its own preparation.

**Against Retention** — expand and forward. Enlarge event log channel sizes past their 20 MB defaults. Enable Windows Event Forwarding to a collector, or SIEM ingest with a retention policy chosen for the worst-case investigation window rather than the typical one. Consider that most organizations discover breaches months after initial access; the retention policy should reflect this, not the operational log-review window.

**Against Reliability** — pick telemetry with unambiguous semantics. Prefer Event 4688 with command line enabled over ShimCache for execution proof. Prefer Sysmon Event 1 with hashes over Event 4688 when both are available. Understand which artifacts have known ambiguity in modern Windows, and don't build conclusions on ambiguous signals in isolation. AmCache is strong evidence of file presence and probable execution, not definitive execution — a report that treats it as definitive is a report that can be undermined.

**Against Parse-Ease** — standardize on tooling and get it into the responder's hands before the incident. KAPE with `!EZParser` for triage extraction. EvtxECmd for event log flattening. MFTECmd for filesystem. Volatility 3 for memory. Every hour spent in the incident wrestling with tooling is an hour not spent finding the adversary. Investment in tooling and muscle memory is invisible until you need it.

**Against Coverage** — deploy Sysmon, enable command line auditing for Event 4688, and enable PowerShell script block logging (Event 4104). These three changes triple the observable ground truth of what runs on Windows. They are also the three most-often-skipped baseline configurations, because none of them is on by default and each requires a specific policy decision.

**Against Tamper-Resistance** — forward telemetry off-host at speed. Any log that only exists on the compromised host can be modified or deleted from that host. Windows Event Forwarding, streaming EDR telemetry to a cloud tenant, or Sysmon-to-SIEM pipelines all address this at different price points. Event 1102 (Security log cleared) is a useful signal but does not undo the loss.

**Against Availability** — accept that some artifacts must be created before the incident, or they do not exist. Sysmon deployment before compromise cannot be substituted post-facto. Audit policy enablement before compromise cannot be substituted post-facto. This is the axis where defender maturity most directly determines what evidence exists to work with when the investigation begins. It's also the axis where "we'll set it up when we need it" fails structurally, because by definition you learn you need it after it would have needed to already exist.

Notice that no single preparation shows up in more than one paragraph. That is intentional. Each axis needs its own answer, and vendor claims to solve "forensic readiness" as a single category typically overinvest in one axis while leaving others exposed.

## Key Takeaways

- Windows forensics has no single best artifact. Selection is a set of tradeoffs across six axes: Retention, Reliability, Parse-Ease, Coverage, Tamper-Resistance, and Availability.
- The axes that matter most in early triage (Reliability, Coverage) are almost inversely correlated with the axes that matter most in cold-case investigation (Retention, Availability). The same investigator picks different artifacts against the same TTP depending on when the investigation starts.
- Sysmon offers the highest Coverage and Reliability of any Windows-native telemetry but the lowest Availability. Its value is entirely conditional on pre-incident deployment. Windows 11's native optional Sysmon in early 2026 does not change the operational reality — it is still disabled by default.
- ShimCache reliability has degraded materially on Windows 10 and later. It should not be used as sole proof of execution. The last-four-bytes indicator is a probability signal, not a determination.
- AmCache is populated by the Compatibility Appraiser and can contain entries for files scanned but never executed. Cross-reference with Prefetch or Event 4688 is required to upgrade an AmCache finding from "present and probably executed" to "definitely executed."
- Event 4688 without command line auditing is diagnostic-only. Both the Audit Process Creation policy and the "Include command line in process creation events" policy must be enabled — this is a two-part configuration that reliably surprises defenders.
- Memory acquisition has become materially harder on HVCI-protected Windows kernels. Traditional cross-signed drivers such as WinpMem's are rejected, and Defender Tamper Protection intercepts kernel memory reads. EDR-integrated acquisition is displacing standalone tools, at the cost of trusting vendor code paths.
- For investigations opening weeks or months after activity, ShimCache + AmCache and MFT + $UsnJrnl are often the only surviving execution and file evidence. Long-retention artifacts are structurally important precisely because their short-retention alternatives have rolled off.
- Defender preparation determines what artifacts exist. Retention, Availability, Coverage, and Parse-Ease all improve with specific pre-incident actions; Reliability and Tamper-Resistance are properties of the artifact itself and cannot be improved through preparation.
- Corroboration outperforms any single artifact. A finding supported by Prefetch + AmCache + Event 4688 is stronger than the same finding from any one of them alone. Investigators calibrate confidence to the number of independent artifacts that agree.

## References

- Microsoft Learn — Enable and configure Sysmon in Windows: <https://learn.microsoft.com/en-us/windows/security/operating-system-security/sysmon/how-to-enable-sysmon>
- Microsoft Learn — Event 4688 (A new process has been created): <https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4688>
- Microsoft Learn — Command line process auditing: <https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/component-updates/command-line-process-auditing>
- Microsoft Learn — Memory integrity and VBS: <https://learn.microsoft.com/en-us/windows/security/hardware-security/enable-virtualization-based-protection-of-code-integrity>
- Cyber Triage — ShimCache and AmCache Forensic Analysis 2026: <https://www.cybertriage.com/blog/shimcache-and-amcache-forensic-analysis-2026/>
- Magnet Forensics — ShimCache vs AmCache: <https://www.magnetforensics.com/blog/shimcache-vs-amcache-key-windows-forensic-artifacts/>
- Kaspersky Securelist — AmCache artifact: forensic value and a tool for data extraction: <https://securelist.com/amcache-forensic-artifact/117622/>
- Menno van Veenendaal — Windows Prefetch Files: <https://www.mennovanveenendaal.com/posts/Windows-Prefetch-files/>
- Sherlock Forensics — Windows ShimCache and AmCache: Forensic Process Execution Attribution: <https://www.sherlockforensics.com/blog/windows-shimcache-amcache-forensic-process-execution-attribution.html>
- TrustedSec — Building a Detection Foundation Part 2 (Windows Security Events): <https://trustedsec.com/blog/building-a-detection-foundation-part-2-windows-security-events>
- Insinuator (ERNW) — WinpMem Driver Vulnerabilities whitepaper (REcon 2025): <https://insinuator.net/2025/10/white-paper-73-analyzing-winpmem-driver-vulnerabilities/>
- Splunk Lantern — Enabling Windows event log process command line logging: <https://lantern.splunk.com/Security_Use_Cases/Threat_Hunting/Enabling_Windows_event_log_process_command_line_logging_via_group_policy_object>
- Elastic — Audit Process Creation And Command Line prebuilt rule: <https://www.elastic.co/docs/reference/security/prebuilt-rules/audit_policies/windows/audit_process_creation_and_command_line>
- Kandi Brian — Windows Execution Artifacts: Prefetch, ShimCache, AmCache, BAM/DAM: <https://kandibrian.com/articles/windows-execution-artifacts-prefetch-shimcache-amcache-bam.html>

---

> 我以外皆我師 — everyone I meet has something to teach me.
