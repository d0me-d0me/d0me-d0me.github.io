---
title: "MS17-010 (EternalBlue) — A Type-Confusion That Became a Worm"
date: 2026-10-04 09:00:00 +0000
categories: [Offensive, Exploitation]
tags: [cve, ms17-010, eternalblue, smb, kernel, wormable]
description: EternalBlue was the first CVE I reproduced and analysed end to end. The bug is small — a size miscalculation reachable through an SMBv1 transaction type confusion — but it reached the kernel pool pre-auth, and that is why it became WannaCry. Mechanism, detection and mitigation, no weaponized payload.
---

## 概要

EternalBlue (MS17-010 / CVE-2017-0144) は、私が最初に自分のラボで最後まで再現し、分析した脆弱性だ。バグ自体は小さい — SMBv1 の OS/2 FEA リスト変換で、サイズ計算が DWORD を WORD に切り詰めるという算術ミス。だがそれが、SMB のトランザクション種別の取り違えを通じて、事前認証のまま非ページプールへの境界外書き込みに届く。そこから SRVNET バッファのグルーミングでカーネル任意書き込みに化け、SYSTEM 相当の RCE になる。この「小さなバグ」が WannaCry と NotPetya を生んだ理由を、原理・検知・緩和まで公開情報の範囲で整理する。武器化された payload は載せない。

## Summary

EternalBlue is the exploit the Shadow Brokers leaked in April 2017, built on a set of SMBv1 flaws Microsoft patched a month earlier in MS17-010. It is the textbook "small bug, enormous blast radius" case: a size-calculation error in Windows' SMBv1 server, reachable **before authentication** over TCP/445, that corrupts the non-paged kernel pool and — with some reliable pool grooming — yields remote code execution in the kernel. It was wormable, and six weeks after the leak it was WannaCry.

This was the first disclosed CVE I reproduced and analysed end to end, in an isolated lab. What follows is the mechanism and the defender's side, from public references only — no weaponized payload, consistent with this site's scope.

## Root cause

Two flaws compose. Neither is dramatic alone; together they are catastrophic.

**1. Transaction type confusion.** SMBv1 lets a client send a large request as a *transaction* split across several packets: a primary request plus `_SECONDARY` continuations. Windows' `srv.sys` decides how to parse the whole reassembled transaction from the SMB command in the **last** packet it received. So a transaction can be *started* as an `NT_TRANS` request — whose size fields are large (DWORD) — and *finished* with a `TRANS2_SECONDARY`, causing the server to treat the whole oversized thing as a `TRANSACTION2`, whose accounting expects much smaller (WORD) sizes. The two code paths disagree about how big the data is.

**2. A DWORD truncated to a WORD.** When the server converts the request's OS/2-style extended-attribute (FEA) list into the NT format, `srv!SrvOs2FeaListToNt` walks the list and calls `srv!SrvOs2FeaListSizeToNt` to total the required size. That function contains the actual arithmetic bug: a subtraction that stores a 32-bit (DWORD) result into a 16-bit (WORD) field, truncating it. The computed size comes out **smaller** than the data that will actually be copied.

The server then allocates a buffer in the **NonPagedPool** using the undersized figure and copies the larger FEA data into it — an out-of-bounds write in the kernel pool. The transaction confusion is what lets the attacker get an oversized, attacker-shaped FEA list to that conversion path in the first place.

## Reproduction

In an isolated lab: an unpatched Windows 7 SP1 x64 target with SMBv1 enabled (the classic, deterministic case) and a host on the same segment to drive crafted SMB traffic. The trigger is to open an SMB transaction as `NT_TRANS`, continue it so the final packet makes `srv.sys` parse it as `TRANSACTION2`, and carry an FEA list sized to drive `SrvOs2FeaListSizeToNt` into the truncation — so the pool allocation undershoots and the copy overflows.

Turning that overflow into control is the part worth understanding, and it is pure pool feng shui: the exploit first *grooms* the non-paged pool by opening SMBv2 connections so the server allocates many `SRVNET` buffers of a predictable size, arranging one to sit **immediately after** the buffer the FEA conversion will overflow. The overflow then corrupts the adjacent `SRVNET_BUFFER` header — specifically the pointer/MDL the server trusts when it later processes that buffer — which is converted into a controlled write and, ultimately, execution of attacker-supplied kernel code. The original tooling installed the **DoublePulsar** kernel implant at this stage.

I am deliberately staying at the level of mechanism — reliable public analyses exist (linked below), and reproducing it is a reading-and-debugging exercise against `srv.sys`, not a copy-paste. No exploit code is published here.

## Impact

Everything that made this bug matter is in the preconditions, not the bug:

- **Pre-authentication.** The vulnerable path is reachable before any login. No credentials, no user interaction.
- **Kernel / SYSTEM.** Code runs in the kernel, the highest privilege on the box — no privilege escalation step needed.
- **Wormable.** The target is a network service on a fixed port (TCP/445) present on virtually every Windows host of the era, with SMBv1 on by default. One compromised host can scan and hit the next with no human in the loop.
- **Ubiquitous legacy surface.** SMBv1 — and the OS/2 FEA compatibility code the bug lives in — is decades-old backwards-compatibility cruft almost nobody used, but it was still listening.

Multiply those together and you get WannaCry (May 2017) and NotPetya (June 2017): self-propagating malware that crossed flat networks in minutes.

## Detection & mitigation

**Mitigation (in priority order):**
- Apply **MS17-010**. It has existed since March 2017.
- **Disable SMBv1** entirely — it should not be running on a modern network regardless of this CVE. Modern Windows ships with it off/removable.
- **Segment and filter.** TCP/445 should never be reachable flat across a network or from untrusted zones. The worm spread because it could.

**Detection:**
- Any **SMBv1** negotiation on the wire is, today, a finding in its own right — inventory and alert on it.
- Network signatures for the exploit's anomalous transaction shape (the `NT_TRANS` → `TRANS2` mismatch and oversized FEA list) are well established in IDS rulesets.
- The **DoublePulsar** implant has a distinctive SMB ping/response signature (the Multiplex ID behaviour) that scanners and IDS detect directly.
- Host-side: unexpected SYSTEM-level processes spawned from `services.exe`/`spoolsv.exe` lineage, and SMBv1 use by hosts that have no business speaking it — the kind of baseline deviation the [forensics-ir sheet](/refs/sheets/forensics-ir.html) is built to surface. Its role as a spread vector — SMB-based remote execution across a segment — is the [lateral-movement](/refs/sheets/lateral-movement.html) side.

## The asymmetry

The lesson I took from reproducing this is not "patch your stuff." It is where the asymmetry actually sits. The bug is a two-line size error in a code path — OS/2 extended-attribute conversion — that essentially no one had used in twenty years. The defender's exposure had nothing to do with whether that code was *good*; it had to do with the fact that it was *reachable*: on by default, pre-auth, on a flat network, on every host. The attacker needed one obscure arithmetic mistake; the defender was carrying the entire legacy surface that made it reachable.

That is the recurring shape of these events, and it is the same point as [coverage-is-not-capability](/posts/coverage-is-not-capability/) from the other direction: the thing that determines impact is rarely the cleverness of the bug. It is the preconditions you left standing around it — the default-on protocol, the missing segmentation, the compatibility code still listening. EternalBlue is remembered as a brilliant exploit. It is better remembered as a brilliant exploit of ordinary, boring, ambient attack surface.

## Key Takeaways

- MS17-010 is a composition of two small flaws: an SMBv1 transaction **type confusion** that lets oversized data reach the OS/2 FEA conversion, and a **DWORD→WORD truncation** in `SrvOs2FeaListSizeToNt` that undersizes the pool allocation — giving a pre-auth NonPagedPool overflow.
- Control comes from **pool grooming**: placing an `SRVNET` buffer next to the overflow and corrupting its header into a kernel write.
- The devastation was in the preconditions — pre-auth, kernel, wormable, SMBv1-on-by-default, flat networks — not the bug's size.
- Defenders: disable SMBv1, patch, segment TCP/445, and treat any SMBv1 on the wire as a finding. DoublePulsar and the exploit's transaction shape are directly detectable.
- The durable lesson is about ambient, reachable legacy surface — not the exploit's ingenuity.

## References

- [Microsoft Security Bulletin MS17-010](https://learn.microsoft.com/en-us/security-updates/securitybulletins/2017/ms17-010)
- [CVE-2017-0144 (NVD)](https://nvd.nist.gov/vuln/detail/CVE-2017-0144)
- [Check Point Research — EternalBlue: Everything There Is To Know (2017)](https://research.checkpoint.com/2017/eternalblue-everything-know/)
- [zerosum0x0 — ETERNALBLUE: Exploit Analysis and Port to Microsoft Windows 10 (2017)](https://zerosum0x0.blogspot.com/2017/06/eternalblue-exploit-analysis-and-port.html)
