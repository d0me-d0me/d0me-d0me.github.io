---
title: "Userland Evasion and What the Kernel Still Sees"
date: 2026-10-06 09:00:00 +0000
categories: [Defensive, Detection]
tags: [evasion, syscall, etw-ti, amsi, stack-spoofing, detection, kernel]
description: A modern userland evasion loader combines indirect syscalls, SSN resolution, stack spoofing, AMSI/ETW patching, and encrypted shellcode — six techniques that defeat every userland detection surface. None of them touch the kernel. That gap is the structural weakness, and it is where detection engineering should invest.
---

## 概要

現代の userland 回避 loader は、indirect syscall、SSN 動的解決 (Hell's Gate / Halo's Gate)、stack spoofing、AMSI パッチ、ETW パッチ、暗号化 shellcode + W^X フローという 6 つの技術を組み合わせる。これらは userland の検知面 — EDR の inline hook、AMSI、userland ETW — をすべて無効化する。だがカーネルには一切届かない。ETW-TI はカーネルドライバから発火し、`.pdata` / UNWIND_INFO はスタック偽装を検証し、TEB のスタック境界チェックはヒープ上の偽装スタックを検出し、ACG は動的コードの実行権限付与そのものをブロックする。

この loader が「何を回避しているか」よりも「何を回避できていないか」を整理することで、検知投資の優先順位が見える。具体的な回避コマンドは [Evasion シート](/refs/sheets/evasion.html)にある。

## Introduction

The security industry's evasion literature tends to read forward: here is a technique, here is how to use it, here is why it works. This piece reads the same set of techniques backward — from the defender's side — and asks a different question. Not what does the loader evade, but what does it structurally fail to evade, and what does that tell a detection programme about where to invest.

The subject is a common architecture, not a single tool. A modern userland evasion loader typically combines six techniques into a pipeline: indirect syscalls to bypass EDR hooks in ntdll, dynamic SSN resolution to work even when those hooks are present, stack frame spoofing to defeat call-stack inspection, AMSI patching to blind in-memory scan events, ETW patching to silence userland telemetry providers, and AES-encrypted shellcode with a Write-XOR-Execute memory flow to evade both static signatures and RWX heuristics.

Each of these techniques is well documented individually. What matters here is the pattern they form together and the single architectural boundary they all share: every one of them operates in userland. Not one reaches the kernel. That is not a detail of this particular loader. It is a structural property of the approach class, and it has direct consequences for where detection is robust and where it is not.

A C# reference implementation demonstrating this architecture is [available on GitHub](https://github.com/d0me-d0me/d0me-d0me.github.io/blob/main/assets/code/OSEPUltimateEvolution.cs). It contains placeholder shellcode and intentional debug output; it is published for educational reference, not operational use.

## The Six Techniques and What They Target

![Userland evasion techniques mapped against kernel and userland detection surfaces](/assets/img/posts/userland-evasion-layers/defense-layers.svg){: width="900" height="650" }

_Figure 1. Six evasion techniques mapped against the detection surfaces they target. The kernel layer remains unaffected._

The six techniques sort into three functional layers. Understanding them as layers rather than as a list makes the detection picture clearer.

### Syscall-layer evasion

**Indirect syscalls.** The loader executes `NtAllocateVirtualMemory` and `NtProtectVirtualMemory` not by calling the ntdll exports — where EDR inline hooks sit — but by jumping to a `syscall; ret` instruction sequence inside ntdll's own `.text` section via `jmp r11`. The hook is never reached. The syscall still fires identically from the kernel's perspective.

**SSN dynamic resolution (Hell's Gate / Halo's Gate).** The System Service Numbers that identify each NT syscall change across Windows builds. The loader scans the ntdll export table for the `4C 8B D1 B8 [SSN]` byte pattern at each function's entry point. When an EDR's hook has overwritten those bytes, the Halo's Gate variant walks to adjacent, unhook-ed syscall stubs and calculates the target SSN by offset. This makes the loader independent of both hardcoded SSN tables and the presence of hooks.

**Stack spoofing.** Before issuing a syscall, the loader switches RSP to a heap-allocated buffer and constructs a forged RBP-based frame chain that mimics the `BaseThreadInitThunk` → `RtlUserThreadStart` call sequence of a legitimate thread. After the syscall completes, RSP is restored. An EDR that inspects the call stack at the moment of the syscall sees what appears to be a normal thread entry.

### Scan-layer evasion

**AMSI patch.** The loader overwrites the first bytes of `amsi.dll!AmsiScanBuffer` with `mov eax, 0x80070057; ret` — returning `E_INVALIDARG` instead of a scan result. The .NET CLR's in-memory assembly scan path treats this as a clean result. The choice of `E_INVALIDARG` over `S_OK` is deliberate: some EDR signatures specifically watch for `xor eax, eax; ret` (the `S_OK` variant), making the error-code path less immediately flagged.

**ETW patch.** The loader overwrites the first byte of `ntdll!EtwEventWrite` with `ret` (0xC3), silencing every userland ETW provider in the process. The primary target is `Microsoft-Windows-DotNET-Runtime`, which would otherwise report in-memory assembly loads.

### Payload-layer evasion

**AES-256-CBC encrypted shellcode with W^X flow.** The shellcode is stored AES-encrypted. At runtime it is decrypted, written to a region allocated as RW (`PAGE_READWRITE`), then the region's protection is flipped to RX (`PAGE_EXECUTE_READ`) via `NtProtectVirtualMemory`. The RWX permission — simultaneously writable and executable — is never used. This defeats static signature scans (the payload is ciphertext on disk) and avoids the RWX allocation heuristic that many products flag.

## What the Kernel Still Sees

The six techniques above are comprehensive against userland detection. They are collectively useless against the kernel. That is not a gap in this particular loader. It is an architectural ceiling of the approach.

### ETW-TI

The `Microsoft-Windows-Threat-Intelligence` provider is not a userland ETW session. Its sensors are kernel callbacks registered by the EDR's kernel driver — typically `WdFilter.sys` for Microsoft Defender, or an equivalent for third-party products. When `NtAllocateVirtualMemory` or `NtProtectVirtualMemory` is called, regardless of whether it arrived through ntdll's export or through an indirect syscall gadget, the kernel-mode callback fires. The userland `EtwEventWrite` patch does not touch it, because the event is never routed through `EtwEventWrite` in the first place.

ETW-TI specifically records the RW → RX protection change on unbacked memory — a private allocation with no file mapping behind it. That single event captures the W^X flow's critical transition: the moment encrypted shellcode becomes executable. The loader's careful avoidance of RWX is irrelevant here; the RX grant on an unbacked region is the signal.

### .pdata and UNWIND_INFO validation

Windows x64 structured exception handling relies on `.pdata` sections that map every function's address range to a `RUNTIME_FUNCTION` entry containing unwind information. The RBP-based frame chain the stack spoofer constructs has no corresponding `.pdata` entries, because the frames point into a heap allocation that is not a loaded module. A stack walker that validates frames against `.pdata` — rather than simply following RBP pointers — will find that the unwind chain is not registered. The spoofed frames fail validation not because they look wrong syntactically, but because they have no structural backing in the executable metadata.

### TEB stack bounds

Every thread's Thread Environment Block records its stack boundaries in `StackBase` and `StackLimit`. The spoofed stack is allocated with `AllocHGlobal`, which returns heap memory. Heap memory is outside the thread's stack bounds by definition. Comparing RSP against `TEB.StackBase` / `TEB.StackLimit` at the moment of a sensitive syscall is a single comparison that catches heap-based stack spoofing regardless of how convincing the forged frames are.

### Return address validation

Complementing `.pdata` validation, a defender can verify that each return address in the call stack points to the instruction immediately following a `CALL` opcode. A spoofed frame chain can place return addresses at plausible locations within legitimate modules, but the instruction preceding that address must actually be a `CALL` that targets the next frame's function. Constructing frames that satisfy this constraint across arbitrary module versions is significantly harder than placing addresses that merely fall within a module's address range.

### ACG (Arbitrary Code Guard)

`SetProcessMitigationPolicy` with `ProcessDynamicCodePolicy` prohibits a process from granting execute permission to dynamically generated code. When ACG is enabled, the `NtProtectVirtualMemory` call that would change the shellcode region from RW to RX returns `STATUS_DYNAMIC_CODE_BLOCKED`. This is a process-level policy enforced by the kernel's memory manager. It blocks both the W^X flow and the initial bootstrap step where the loader grants execute permission to its own syscall stubs. No userland patch can disable it.

## The Bootstrap Seam

One detail in the loader's architecture deserves separate attention because it is the one moment where the evasion pipeline is not yet active.

The very first syscall stub — the one for `NtProtectVirtualMemory` itself — cannot be called via indirect syscall, because the indirect syscall mechanism is not yet executable. The loader resolves this by calling `kernel32!VirtualProtect` through the normal Win32 API to make that first stub executable. `VirtualProtect` internally calls `ntdll!NtProtectVirtualMemory`, which passes through whatever EDR hook is installed there.

This is a structural bootstrapping problem. The loader needs `NtProtectVirtualMemory` to make its own `NtProtectVirtualMemory` stub executable, and the only available path for that first call is the hooked one. Every subsequent memory operation goes through the indirect syscall path, but the first one does not and cannot. An EDR that records the call stack of this initial `VirtualProtect` call will see a .NET managed-code origin making a protection change on a small, newly allocated region — the syscall stub being prepared for use. That is a narrow but reliable detection point.

## Detection Surface Resilience

![Detection surfaces ranked by resilience against userland evasion](/assets/img/posts/userland-evasion-layers/detection-priority.svg){: width="900" height="520" }

_Figure 2. Detection surfaces ranked by resilience. The top five are kernel-level and immune to userland patching. The bottom two are directly bypassed._

The ranking is not controversial once the architectural boundary is visible. Kernel-level detection surfaces — ETW-TI, kernel callbacks, `.pdata` validation, TEB bounds checks, ACG — are immune to userland patching by construction. They cannot be reached without a kernel driver or a kernel exploit, neither of which this class of loader attempts. The integrity monitoring layer — periodic hash verification of ntdll's `.text` section — sits in between: it operates in userland but detects the act of patching itself rather than relying on the patched code path to report. The bottom two — EDR userland hooks and userland ETW — are the direct targets of the loader's evasion techniques and score accordingly.

The practical consequence for a detection programme: if detection depends solely on userland hooks and userland ETW, a loader of this class defeats it entirely. If detection includes any kernel-level surface, the loader is visible at every sensitive operation it performs.

## A Common Misunderstanding About ETW

One point requires explicit correction because it recurs in offensive tooling documentation. The claim that patching `ntdll!EtwEventWrite` "silences Microsoft-Windows-Threat-Intelligence" is incorrect.

ETW-TI's memory-operation events are emitted by the kernel driver directly into a protected kernel-mode session. They do not pass through the userland `EtwEventWrite` function at any point. The userland patch silences providers that do route through `EtwEventWrite` — notably `Microsoft-Windows-DotNET-Runtime`, which reports assembly loads and is a legitimate detection source. But ETW-TI is architecturally separate, and the confusion between the two leads to a false sense of coverage that is dangerous to the operator and useful to the defender.

The distinction matters on both sides. The operator who believes ETW-TI is silenced will not account for the kernel-level telemetry that is still recording every `NtAllocateVirtualMemory` and `NtProtectVirtualMemory` call. The defender who understands the separation knows that ETW-TI data is trustworthy even when a process's userland ETW is confirmed dead — and that a dead userland ETW provider is itself an indicator.

## The Entropy and Key Problem

The payload-layer evasion has a separate, non-architectural weakness. AES-256-CBC produces ciphertext with entropy approaching the theoretical maximum (7.9+ on an 8.0 scale). A PE section or .NET resource containing a blob at that entropy level is a standard automated flag.

More directly: when the key and IV are embedded in the binary alongside the ciphertext, the encryption provides no protection against an analyst with access to the file. It defeats automated static signature scans — which is its purpose — but it does not survive manual triage. The key material is plaintext bytes in a .NET assembly that is trivially decompilable. This is a design tradeoff rather than a flaw: the encryption buys time against automated scanning, not against a human.

## What This Means for Detection Investment

The analysis above points to a priority ordering that is not the one most organisations follow. The typical deployment invests heavily in userland hooks (the EDR agent's primary interception mechanism) and userland ETW (the telemetry pipeline those hooks feed). Both are necessary, but both sit at the bottom of the resilience ranking against this class of evasion.

The detection surfaces that survive intact are:

1. **ETW-TI** — records every memory protection change at kernel level, including the RW → RX transition on unbacked memory that is the loader's critical moment.
2. **Kernel callbacks** — process creation, image load, and thread creation notifications that fire regardless of userland hook state.
3. **.pdata / UNWIND_INFO stack validation** — structural verification that spoofed call stacks cannot satisfy without registering fake function entries in executable metadata.
4. **TEB stack bounds comparison** — a single-comparison check that catches any syscall issued from outside the thread's legitimate stack region.
5. **ACG** — a kernel-enforced process policy that blocks the entire W^X flow and the bootstrap step in one setting.

The first two require a kernel-mode component. The third and fourth can be performed by any agent with access to the process's memory. The fifth is a policy that can be applied to specific processes without a per-host agent.

The detection programme that covers the first two and deploys the fifth where applicable is robust against this entire class of loader without relying on the surfaces the loader is specifically designed to defeat.

## Key Takeaways

- A modern userland evasion loader combines six techniques — indirect syscalls, SSN dynamic resolution, stack spoofing, AMSI patching, ETW patching, and encrypted shellcode with a W^X flow — that collectively defeat every userland detection surface.
- All six operate below a single architectural boundary: none of them reach the kernel. This is a structural property of the approach class, not a gap in a particular tool.
- ETW-TI fires from the kernel driver and is unaffected by the userland `EtwEventWrite` patch. The common claim that patching `EtwEventWrite` silences ETW-TI is incorrect and leads to a false sense of coverage.
- `.pdata` / UNWIND_INFO validation detects stack spoofing structurally: the forged frames have no registered `RUNTIME_FUNCTION` entries because they point into heap memory.
- TEB stack bounds (`StackBase` / `StackLimit`) catch heap-based stack spoofing with a single comparison, regardless of how convincing the forged frame chain is.
- ACG blocks both the W^X shellcode flow and the bootstrap step's execute-permission grant, enforced by the kernel memory manager.
- The bootstrap `VirtualProtect` call is the one moment the loader passes through the hooked path. It is a narrow but reliable detection point.
- AES-encrypted payloads with hardcoded keys defeat automated static scanning but not manual triage or entropy analysis.
- Detection investment should prioritise kernel-level surfaces (ETW-TI, kernel callbacks, ACG) over the userland surfaces (hooks, userland ETW) that this loader class is specifically designed to bypass.

## References

- MDSec — Porting Hell's Gate to Modern EDRs (indirect syscalls and SSN resolution): <https://www.mdsec.co.uk/2022/04/porting-hells-gate-to-modern-edrs/>
- am0nsec / smelly__vx — Hell's Gate (original SSN resolution technique): <https://github.com/am0nsec/HellsGate>
- Elastic Security Labs — Peeling Back the Curtain with Call Stacks (stack spoofing detection): <https://www.elastic.co/security-labs/peeling-back-the-curtain-with-call-stacks>
- xpnsec — Hiding Your .NET (ETW bypass technique): <https://blog.xpnsec.com/hiding-your-dotnet-etw/>
- Microsoft Learn — Antimalware Scan Interface (AMSI) portal: <https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal>
- Microsoft Learn — Process Mitigation Policies (ACG / ProcessDynamicCodePolicy): <https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-setprocessmitigationpolicy>
- Microsoft Learn — RUNTIME_FUNCTION and structured exception handling on x64: <https://learn.microsoft.com/en-us/cpp/build/exception-handling-x64>
- Microsoft Learn — ETW Threat Intelligence provider: <https://learn.microsoft.com/en-us/windows/win32/etw/threat-intelligence-provider>

---

> 我以外皆我師 — everyone I meet has something to teach me.
