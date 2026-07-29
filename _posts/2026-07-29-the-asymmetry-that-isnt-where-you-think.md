---
title: Timestomping and the Asymmetry That Isn't Where You Think
date: 2026-07-28 22:00:00 +0000
categories: [Defensive, Forensics & IR]
tags: [forensics, anti-forensics, timestomping, ntfs, incident-response, mitre-attack]
description: The two detections most often taught as definitive proof of timestomping are both trivially bypassable. The real asymmetry lives somewhere else entirely.
---

## 概要

Timestomping の検知として広く教えられている二つの手法 — `$SI` と `$FN` の不整合、秒以下がゼロに切り詰められる現象 — は、どちらも回避できる。`$SI` を書き換えたあとファイルを move / rename すれば `$FN` に偽の時刻が継承され、ナノ秒精度で任意値を書けるツールも公開されている。DFRWS EU 2020 の査読論文は「解析した全アーティファクトは能動的攻撃に耐えられない」と結論した。ではなぜ実務で検知できるのか。本当の非対称性は単一アーティファクトの頑健さではなく、痕跡を消す行為そのものが新しい痕跡を生む構造にある。コマンドは `/refs/` の forensics-ir シートにある。

## Introduction

There is a piece of DFIR folklore that gets repeated in training decks, blog posts, and certification material with remarkable consistency. It goes like this: NTFS keeps two sets of timestamps, one in `$STANDARD_INFORMATION` and one in `$FILE_NAME`. Attackers can change the first with a simple API call. They cannot change the second, because only the kernel writes it. Compare the two, find the mismatch, and you have caught your timestomper.

The folklore is wrong. Not subtly wrong, not wrong at the margins — wrong in a way that was demonstrated publicly at a Black Hat talk in 2005 and has been available to anyone reading the literature since.

The companion piece of folklore is that timestomping tools truncate sub-second precision, leaving `.0000000` where a genuine NTFS timestamp would carry 100-nanosecond granularity. Find the zeros, catch the attacker. This one is also wrong, and has been since public tooling appeared that writes arbitrary sub-second values.

Both of these detections work against the laziest tier of attacker. Neither works against anyone who has read the same research the defenders have. And yet timestomping is still caught, routinely, in real investigations. This piece is about why — which turns out to be a more interesting question than the folklore version, and points somewhere quite different for defenders deciding where to spend their preparation budget.

This is a companion to the earlier piece on Windows forensic artifact selection. That one asked which artifacts survive long enough to be worth reading. This one asks what happens when someone is actively working to make sure they do not.

## What the File System Actually Records

Every file on an NTFS volume gets an entry in the Master File Table. Inside that entry, two separate attributes each carry a full set of four timestamps.

`$STANDARD_INFORMATION` holds what Explorer shows and what most tooling reads: Modified, Accessed, MFT-entry Changed, and Born (creation). `$FILE_NAME` holds a second, independent copy of the same four values. Both are stored as 64-bit counts of 100-nanosecond intervals since January 1, 1601 UTC, which is the representation Microsoft documents for Windows file times generally.

The count of timestamps per file is larger than the two-attribute picture suggests. A file with both a long name and an 8.3 short name carries two `$FILE_NAME` attributes. The directory index that lists the file carries its own copy again. A single file can therefore be associated with well over a dozen stored timestamps, spread across the MFT entry and the parent directory's index structure, all of which can agree or disagree with each other.

One of the four values deserves a caveat before anything is built on it. Last Access updating has been progressively disabled on modern Windows. Since the 1803 release the controlling registry value became a bitfield rather than a simple toggle, and the behaviour depends on volume size — on system volumes above a size threshold, Last Access updates are off by default. An investigator treating Accessed as a reliable indicator of when a file was read is, on a large number of current systems, reading a value the operating system stopped maintaining.

The asymmetry that the folklore is reaching for is real at the API level. `SetFileTime` is a documented Win32 call that any process with write access to a handle can invoke, and it sets creation, last access, and last write times directly. Nothing about it requires elevation or kernel-mode code. That covers `$SI`. There is no equivalent documented call that writes `$FN`.

Where the folklore goes wrong is in concluding that no documented API means no path. `$FN` is written by the kernel, but the kernel writes it in response to ordinary operations that any user can trigger, and one of those operations copies values from `$SI`.

## Two Myths That Refuse to Die

**Myth one: `$FILE_NAME` cannot be timestomped.**

The `$FN` timestamps get written on file creation, and they get rewritten when a file is renamed or moved within the same volume. On a rename or an intra-volume move, the current `$SI` values are propagated into the freshly written `$FN` attribute. That is the whole technique. Timestomp `$SI` through the normal user-mode API, then rename the file or move it to another directory on the same volume, and the forged values land in `$FN` courtesy of the kernel itself. No driver, no exploit, no elevation beyond what the attacker already needed to write the file.

Lina Lau documented this publicly in 2022, and MITRE now cites that work directly in the T1070.006 entry, noting that `$FN` timestomping typically requires interacting with the kernel or moving or renaming a file. The technique has a name in the wild — "double timestomping" — and Matthew Dunwoody's 2022 note that he had observed it in the wild, including by APT29, is cited in the same MITRE entry.

There was also, historically, a more direct path. Tooling existed that wrote `$FN` through native API calls on older 32-bit Windows before Kernel Patch Protection, and later versions of that tooling switched to writing directly to the system drive. Microsoft closed the direct-write path in 2018, so on current Windows the raw-disk approach is no longer available. The rename trick, however, still works, because it is not a bug — it is the file system behaving as designed.

**Myth two: sub-second precision proves manipulation.**

Genuine NTFS timestamps carry 100-nanosecond granularity, and the value in the low digits is effectively arbitrary. Several widely used timestomping implementations set only whole seconds, leaving `.0000000` in the sub-second field. Kroll lists this as one of its indicators, and Magnet's AXIOM ships an artifact that flags either an `$SI`/`$FN` mismatch or fully zeroed milliseconds.

Public tooling that writes arbitrary 100-nanosecond values has existed for years. An attacker who copies the sub-second component from a neighbouring legitimate file produces timestamps that pass both the zero-check and any statistical test on the distribution of low digits.

Lau's assessment of the two checks together is blunt: bypassing both is close to trivial. This is not a theoretical objection filed against a mostly-working control. It is a statement that the two checks most often presented as definitive are the two that fail first.

Worth adding: even against the lazy tier, the `$SI`/`$FN` comparison is noisier than its reputation suggests. A practitioner experiment posted to Forensic Focus found roughly 440,000 mismatches across 640,000 MFT entries on a normal system, and that was after discarding fractional seconds to suppress the easiest source of noise. Archive extraction, installers, file copies, and synchronisation clients all produce mismatches and zeroed sub-second fields as a matter of routine. Magnet ships its mismatch artifact disabled by default in AXIOM Process, which is a reasonable choice given the base rate. The check is a triage filter, not a finding.

## The Escalation Ladder

Laying the detections against attacker capability tiers makes the shape of the problem visible.

![Detection survival by attacker capability tier](/assets/img/posts/the-asymmetry-that-isnt-where-you-think/detection-ladder.svg){: width="1000" height="680" }
_Each tier adds a single technique to the one before it. The two checks most often taught as definitive are the first two to go blind. The bottom row is the one that matters._

Tier one is the baseline: a user-mode API call against `$SI`. This is what the common offensive frameworks do out of the box, and it is what the textbook checks were designed against. Everything detects it.

Tier two adds a rename or an intra-volume move. `$FN` now carries the forged values, and the mismatch check is blind. Nothing else changes — the attacker did not need new tooling, only the knowledge that the file system will do the work.

Tier three adds sub-second control. The truncation check goes blind. At this point both of the classic MFT-only detections have failed, and an investigator working from a parsed `$MFT` alone has nothing left to flag.

Tier four attacks the journal. The change journal records a `USN_REASON_BASIC_INFO_CHANGE` entry when timestamps are altered, and that entry carries the real wall-clock time of the modification rather than the forged one. It and `$LogFile` are the two artifacts that hold across tiers one through three, which is why practitioner guidance that has actually tested the bypasses points at both rather than at the MFT. Deleting the journal removes the first. And here the ladder inverts: the deletion writes Event 3079 to the Application log, and `$LogFile` still carries the transaction that performed the timestomp, stamped with its own commit time rather than the forged one. The attacker traded one detection for two.

Tier five attacks `$LogFile` itself. The NTFS transaction log is small and circular — roughly 56 to 64 megabytes, holding a few hours of activity on a busy volume against the change journal's thirty-odd. Cycling enough write operations wraps the log past the evidence. Research demonstrated this with a script running on the order of a thousand iterations. But an abnormal burst of transaction volume is itself a pattern, and volume shadow copies may hold the prior state.

The bottom row of the figure is the point. From tier four onward, the attacker's cleanup actions generate their own artifacts. The ladder does not run out of detections; it changes what the detections are looking at.

## The Cleanup Cascade

The tier-four inversion is not a special case. It is the general structure of anti-forensics on a journaling file system.

![The cleanup cascade](/assets/img/posts/the-asymmetry-that-isnt-where-you-think/cleanup-cascade.svg){: width="1000" height="860" }
_Every removal is an event the system records somewhere else. Each layer is cheap in isolation. Knowing that every layer exists, and reaching all of them before telemetry leaves the host, is not._

Change a timestamp, and the change journal notes it with an honest clock reading. Delete the journal, and the Application log notes the deletion while `$LogFile` still holds the transaction that made the original change, carrying a commit time the attacker did not choose. Flood `$LogFile` to bury those, and the flood is a measurable anomaly in write volume against the host's own baseline. Clear the event log to remove the 3079, and Event 104 records the clearing — and an empty Security log on a machine that has been running for weeks is not a subtle condition.

None of these individual steps is expensive. Each is a single command or a short script. What the cascade costs the attacker is not compute or privilege. It is completeness: knowing that all of these layers exist, in the right order, on this specific Windows build, and getting to all of them before anything has been forwarded off the host.

That last clause carries most of the weight. Every artifact in the cascade lives on the compromised machine. An attacker with sufficient privilege can reach all of them given enough time. Telemetry that has already been shipped to a collector is outside that reach entirely, and the window between an action and its forwarding is measured in seconds on a properly configured host.

The cascade is also a property of NTFS specifically, not of timestomping as a technique. MITRE lists the sub-technique across Linux, macOS, and ESXi as well as Windows, and on those platforms the equivalent operation is a single `touch` invocation. Casework involving hypervisor hosts has documented exactly that: timestamps adjusted on an ESXi host before malicious components were introduced. Without a change journal and a transaction log to contend with, there is no cascade to work through — the residue that makes the Windows version expensive to clean up simply does not accumulate. Any defender extending this reasoning to a Linux estate or a virtualisation layer should assume the asymmetry runs the other way there, and compensate with off-host logging rather than expecting the file system to keep receipts.

## What the Research Actually Concluded

The most rigorous published treatment of this question is Palmbach and Breitinger's paper at DFRWS EU 2020, which evaluated the change journal, prefetch, LNK files, and the Windows event log alongside the previously known `$LogFile` approach, testing three separate timestomping implementations against each.

Their conclusion, stated plainly: "none of the artifacts analyzed can withstand active exploitation."

The specifics are worth carrying, because they are more useful than the headline. `$LogFile` cannot be edited directly, but its small circular size makes it floodable. The change journal is trivially deletable, which led the authors to state that it should not be treated as a reliable source of information on its own. Prefetch and LNK files are ordinary files and can simply be deleted, with only partial recovery available through carving. The Windows event log is the most persistent of the set, but it can be cleared, and it does not record the timestomping act in the first place.

The authors also observed something that supports the cascade argument: in their testing, every manipulated file generated a `BASIC_INFO_CHANGE` record showing a real timestamp later than the forged one. The artifact worked. It worked reliably. It just could also be deleted afterwards.

Their broader statement is that no current method can consistently prove timestamp manipulation, because the evidence can always be deleted or altered. More recent work published in 2025 has moved toward machine-learning approaches specifically because the existing `$LogFile` and change-journal methods produce too many false positives in real environments to be used as bright-line rules.

An honest reading of this literature does not support the confident tone of most timestomping detection guidance. It supports something closer to: these artifacts are strong evidence against an attacker who stopped early, and they are recoverable context rather than proof against one who did not.

## Why Detection Still Works

Given all of the above, the practical question is why timestomping continues to be caught.

Three reasons, in rough order of how often they apply.

**Most attackers stop at tier one or two.** The MITRE procedure list for T1070.006 runs to dozens of documented cases across nation-state and criminal groups, and the pattern in the published casework is that timestomping is applied to specific files as a discrete step, not pursued as a full cleanup campaign. Microsoft's write-up of one ransomware operation describes it setting encrypted files and the ransom note to a fixed date of January 1, 2000 — which is not an attempt at blending in, it is a bulk normalisation that stands out immediately against a populated file system. Other documented cases match a backdoor's timestamps to legitimate system files, which is more careful, but is still a `$SI` operation on a handful of files rather than a campaign against the journal. The most disciplined pattern in the published casework is different again: an implant that recorded a file's original timestamps, operated on it, and then restored the originals when finished. That approach defeats the neighbourhood comparison described below, because the file ends up consistent with everything around it. It is also markedly rarer than the other two.

**Cleanup is scoped to the file, but detection is scoped to the system.** An attacker timestomps the files they planted. They do not timestomp the thousands of unrelated files whose timestamps establish the normal pattern of the volume. A file whose `$SI` Born predates its own parent directory, or predates the operating system installation, or falls outside the cluster of activity that every other file in that path shares, is anomalous regardless of how carefully its own attributes were forged. The comparison that catches this is not `$SI` against `$FN`. It is the file against its neighbourhood.

**The convergence requirement is asymmetric.** For a defender to reach a conclusion, several independent sources need to agree. For an attacker to prevent that conclusion, every one of those sources needs to be silenced. Execution evidence in prefetch, an entry in the shim cache, a journal record, a shadow copy from before the intrusion, a forwarded event, an EDR process tree — the defender needs any two to line up. The attacker needs all of them gone. This is the actual asymmetry, and it runs the opposite direction from the one the folklore describes.

The MITRE entry is direct about the consequence for prevention: this technique cannot be readily mitigated with preventive controls, because it abuses system features working as intended. Detection is the only lever, and detection here means correlation rather than any single check.

## The Defender's Practice

Concrete preparation, ordered by how much it changes the picture.

**Forward telemetry off the host, quickly.** Everything in the cleanup cascade is reachable by an attacker with local privilege. A record that has already been shipped to a collector is not. Windows Event Forwarding, an EDR agent streaming to a cloud tenant, or a Sysmon-to-SIEM pipeline all achieve this at different price points. The specific mechanism matters less than the latency between an event occurring and it being somewhere the attacker cannot reach.

**Deploy live interception, and accept that it is noisy.** Sysmon Event ID 2 fires when a process changes a file creation time, and records both the previous and the new value. It captures the act rather than the residue, which is why it holds across every tier in the ladder. Two caveats: it requires an explicit `FileCreateTime` rule to emit anything, so a default configuration produces nothing, and Microsoft's own documentation notes that many processes legitimately change creation times. Scope it to directories where the behaviour is unusual rather than enabling it globally and drowning.

**Preserve the journal, and monitor its removal.** Enlarge the change journal past its default allocation so the retention window covers a realistic investigation lag. Alert on journal deletion directly — Elastic publishes detection content for the `fsutil` deletion path, and Event 3079 is a clean signal, rare enough on a workstation that it warrants a look every time.

**Treat the classic checks as triage, not findings.** Run the `$SI`/`$FN` comparison and the sub-second check to generate a candidate list. Filter for the direction that matters — `$SI` Born earlier than `$FN` Born is the condition the file system does not produce on its own — and exclude the paths where installers and archive extraction generate routine noise. Then corroborate before writing anything down.

**Build the neighbourhood comparison into the workflow.** A single file's timestamps mean little. The same file's timestamps against its directory, against the install date, and against the surrounding activity cluster mean a great deal. Super timeline tooling exists to make this comparison cheap, and its MFT parser emits `$SI` and `$FN` values as separate events specifically so that disagreements surface in the timeline rather than having to be hunted.

**Keep shadow copies, and check them.** A volume shadow copy taken before the intrusion holds a pre-manipulation view of the MFT that no amount of on-host cleanup touches. This is one of the few artifacts in the picture that sits outside the attacker's reach without requiring pre-incident deployment of anything new.

One thing worth stating explicitly for anyone writing an incident report: when the evidence available is a mismatch or a truncation and nothing else, the finding is that the timestamps are inconsistent with normal file system behaviour, not that timestomping occurred. The distinction matters when the report is read by someone with an incentive to challenge it.

## Key Takeaways

- The `$SI` versus `$FN` comparison fails against an attacker who renames or moves the file after timestomping. The kernel propagates `$SI` values into a freshly written `$FN` attribute, so the forged timestamps land in both places without any driver or elevation.
- The sub-second truncation check fails against public tooling that writes arbitrary 100-nanosecond values. Copying the low digits from a neighbouring legitimate file defeats both the zero-check and any distribution test. These two are the checks most frequently taught as definitive, and they are the first two to go blind as attacker capability rises.
- The change journal's `BASIC_INFO_CHANGE` record is the strongest single artifact, because it carries the real modification time rather than the forged one. It is also deletable in one command, which is why it should not be relied on alone.
- Deleting the journal is not free. It writes Event 3079, and `$LogFile` still carries the transaction that performed the timestomp with a commit time the attacker did not choose. Every layer of cleanup generates its own artifact, and the cascade does not terminate.
- Peer-reviewed work concluded that none of the commonly cited artifacts withstands active exploitation, and that no current method consistently proves manipulation because the evidence can always be removed. Detection guidance that sounds more confident than this is overstating the case.
- Detection works in practice for three reasons: most attackers stop early, cleanup is scoped to the planted files while detection is scoped to the whole volume, and the defender needs any two sources to agree while the attacker needs all of them silenced.
- The cascade is a property of NTFS, not of the technique. MITRE lists the sub-technique on Linux, macOS, and ESXi, where a single `touch` accomplishes the same thing and no journal or transaction log accumulates residue. The asymmetry described here does not transfer to those platforms.
- The real asymmetry favours the defender, but not through artifact durability. It comes from the completeness requirement on the attacker's side, and it collapses if all the evidence stays on the compromised host.
- Off-host forwarding is the single highest-value preparation. Live interception through Sysmon Event ID 2 or EDR API monitoring is second, with the caveat that it needs explicit configuration and produces legitimate noise.
- In reporting, a mismatch alone supports "inconsistent with normal file system behaviour" rather than "timestomping occurred". Corroboration across independent artifacts is what upgrades the finding.

## References

- MITRE ATT&CK — T1070.006 Indicator Removal: Timestomp: <https://attack.mitre.org/techniques/T1070/006/>
- MITRE ATT&CK — T1070 Indicator Removal: <https://attack.mitre.org/techniques/T1070/>
- Microsoft Learn — File Times: <https://learn.microsoft.com/en-us/windows/win32/sysinfo/file-times>
- Microsoft Learn — SetFileTime function: <https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfiletime>
- Microsoft Security Blog — The five-day job: A BlackByte ransomware intrusion case study: <https://www.microsoft.com/en-us/security/blog/2023/07/06/the-five-day-job-a-blackbyte-ransomware-intrusion-case-study/>
- inversecos — Defence Evasion Technique: Timestomping Detection, NTFS Forensics: <https://www.inversecos.com/2022/04/defence-evasion-technique-timestomping.html>
- Palmbach & Breitinger — Artifacts for Detecting Timestamp Manipulation in NTFS on Windows and Their Reliability (DFRWS EU 2020): <https://www.sciencedirect.com/science/article/pii/S2666281720300159>
- Kroll — Anti-Forensics Tactics: Timestomping: <https://www.kroll.com/en/publications/cyber/anti-forensic-tactics/anti-forensics-tactics-timestomping>
- Magnet Forensics — Expose Evidence of Timestomping with the NTFS Timestamp Mismatch Artifact: <https://www.magnetforensics.com/blog/expose-evidence-of-timestomping-with-the-ntfs-timestamp-mismatch-artifact-in-magnet-axiom-4-4/>
- Andrea Fortuna — Going beneath NTFS: USN Journal, dfir_ntfs, and artefact-driven investigations: <https://andreafortuna.org/2026/07/06/ntfs-forensics-deep-dive/>
- deaddisk — Correlating NTFS $LogFile and $UsnJrnl: A DFIR Practitioner's Guide: <https://www.deaddisk.com/posts/logfile_and_usnjrnl/>
- Elastic Security — Delete Volume USN Journal with Fsutil: <https://www.elastic.co/guide/en/security/8.18/delete-volume-usn-journal-with-fsutil.html>
- EventSentry — Sysmon Event ID 2, file creation time changed: <https://system32.eventsentry.com/sysmon/event/2>
- Forensic Focus — $MFT: $SI differs from $FN for 50% of the files: <https://www.forensicfocus.com/forums/general/mft-si-differs-from-fn-for-50-of-the-files/>
- A practical approach to detecting file timestamp manipulation for digital forensic investigations (Expert Systems with Applications, 2025): <https://www.sciencedirect.com/science/article/abs/pii/S0957417425022493>

---

> 我以外皆我師 — everyone I meet has something to teach me.
