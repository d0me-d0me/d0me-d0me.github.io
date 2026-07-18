/* ============================================================
   content.js — 唯一の編集点。ナレッジが増えたらここに足すだけ。
   大項目は domains[]、各巻は domain で紐付ける。
   ・チートシート追加: volumes[] に1項目追加 + sheets/<slug>.html を置く
   ・資格追加/削除:   certs[] を編集（assets/badges/<name>.png を用意）
   ホーム(索引・資格・件数)は app.js が大項目ごとに自動描画する。

   識別子ポリシー:
     - slug: 不変の永続キー。URL anchor と内部リンクに使用。一度確定したら変更しない。
             kebab-case、英小文字+数字+ハイフンのみ。
     - title / jp: 表示専用。改訂自由(URL は壊れない)。
     - domain: 主分類(offensive / defensive / other)。表示順の一次キー。
     - tags:   横断的属性。多重付与可。将来の filter view の基盤。
     - 番号は使用しない。表示順は配列順で暗黙的に制御する。
   ============================================================ */
window.CONTENT = {
  handle:    "d0me",
  githubUrl: "https://github.com/d0me-d0me",
  blogUrl:   "/",   // 同一オリジン: Chirpy blog ルート。standalone プレビュー時は http サーバ root に解決
  motto:     ["静粛", "正確", "無痕"],
  taglineEn: "Field references for offensive and defensive security — anchored to labs, CTFs and disclosed CVEs.",
  taglineJp: "ラボと CTF で再現した、攻撃と防御の実務ノート。",

  // 大項目（トップレベル分類）。表示順はこの配列順。
  domains: [
    { id: "offensive", label: "Offensive", jp: "攻撃", glyph: "攻" },
    { id: "defensive", label: "Defensive", jp: "防御", glyph: "守" },
    { id: "other",     label: "Other",     jp: "その他", glyph: "雑" },
  ],

  // 保有資格
  certs: [
    { code: "OSCP",  issuer: "OffSec",       img: "oscp.png" },
    { code: "OSEP",  issuer: "OffSec",       img: "osep.png" },
    { code: "CPTS",  issuer: "Hack The Box", img: "cpts.png" },
    { code: "SAL1",  issuer: "TryHackMe",    img: "sal1.png" },
    { code: "CySA+", issuer: "CompTIA",      img: "cysa.png" },
    { code: "CCNA",  issuer: "Cisco",        img: "ccna.png" },
  ],

  // チートシート。slug が永続キー(URL anchor)、domain が主分類、tags が横断属性。
  // status: "ready" は sheets/<slug>.html へリンク、"soon" は準備中表示。
  volumes: [
    // ---- offensive ----
    { domain: "offensive", slug: "situational-awareness", title: "Situational Awareness", jp: "状況把握",
      topics: "identity · defense probe · privesc · creds · dpapi",
      keywords: ["winpeas","seatbelt","watson","sherlock","snaffler","privesccheck","lazagne","unquoted service path","alwaysinstallelevated","modifiable service","vault","cmdkey","dpapi","masterkey","consolehost_history","psreadline","scriptblocklogging","unattend","sysprep","integrity level","mandatory label","post-exploitation","situational awareness","host triage","whoami","systeminfo","sysmon"],
      tags: ["post-exploitation", "windows", "privesc"], status: "ready" },
    { domain: "offensive", slug: "reconnaissance",  title: "Reconnaissance",  jp: "偵察",
      topics: "nmap · rustscan · service enum · web enum · pivot recon",
      keywords: ["rustscan","masscan","fping","netdiscover","whatweb","nikto","gobuster","ffuf","feroxbuster","smbclient","netexec","crackmapexec","enum4linux","kerbrute","wpscan","onesixtyone","subfinder","amass","arjun","wfuzz","proxychains","autoroute","socks","port scan","host discovery","service enumeration","vhost fuzzing"],
      tags: ["recon", "enumeration", "nmap"], status: "ready" },
    { domain: "offensive", slug: "ad-compromise", title: "Active Directory Compromise", jp: "AD 侵害キルチェーン",
      topics: "MITRE ATT&CK-aligned kill chain across Discovery to Impact for domain-joined environments.",
      keywords: ["kerberoast","kerberoasting","asrep","asreproast","golden ticket","silver ticket","krbtgt","pth","pass-the-hash","ptt","pass-the-ticket","unconstrained delegation","constrained delegation","rbcd","s4u","dcsync","ntds","shadow credentials","adminsdholder","adcs","ad cs","certipy","esc1","petitpotam","spoolsample","sid history","rubeus","mimikatz","bloodhound","sharphound","powerview","powerup","powerupsql","lsass"],
      tags: ["kerberoast", "delegation", "dcsync", "golden-ticket", "forest"], status: "ready" },
    { domain: "offensive", slug: "evasion",          title: "Evasion",          jp: "回避",
      topics: "applocker · clm · amsi · defender · ppl · edr-evasion",
      keywords: ["applocker","wdac","installutil","msbuild","regsvr32","lolbas","clm","constrainedlanguage","amsi","amsibypass","amsiscanbuffer","defender","tamperprotection","mpcmdrun","ppl","runasppl","lsass","uac","fodhelper","seimpersonate","printspoofer","godpotato","process-injection","direct-syscall","syswhispers","etw","unhook"],
      tags: ["evasion", "windows", "in-memory"], status: "ready" },
    { domain: "offensive", slug: "lateral-movement", title: "Lateral Movement", jp: "横展開",
      topics: "primitives · smb/wmi/dcom · winrm · rdp · kerberos transport · mssql · pivot topology",
      keywords: ["pass-the-hash","pth","overpass-the-hash","pass-the-ticket","ptt","s4u","psexec","wmiexec","dcomexec","atexec","smbexec","winrm","evil-winrm","psremoting","invoke-command","enter-pssession","dcom","mmc20","shellwindows","wmi","win32_process","restricted admin","rdp hijack","tscon","mssql lateral","linked server","xp_cmdshell","ligolo","chisel","socks pivot","double pivot","proxyjump","ssh key reuse","ssh agent hijack","laps","kerberos delegation lateral","protected users","local admin"],
      tags: ["lateral-movement", "pivoting", "windows", "kerberos", "cross-platform"], status: "ready" },
    { domain: "offensive", slug: "command-control",  title: "Command & Control", jp: "指揮統制",
      topics: "payload delivery · listeners · egress",
      keywords: ["sliver","metasploit","msf","msfconsole","msfvenom","meterpreter","implant","beacon","callback","stager","stageless","sacrificial process","mtls","http listener","dns listener","wireguard","shellcode","donut","reflective dll","srdi","bof","armory","alias","sliver extension","sliver generate","execute-assembly","sideload","sharpsh","invoke-binary","hashdump","kiwi","getsystem","migrate","loot","jump-winrm","autoroute","portfwd","socks_proxy"],
      tags: ["c2", "payload", "egress"], status: "ready" },
    { domain: "offensive", slug: "web",              title: "Web",              jp: "ウェブ",
      topics: "recon · injection · ssti · ssrf/xxe · client-side · api",
      keywords: ["sqli","xss","csrf","lfi","rfi","idor","jwt","oauth","saml","nosqli","sqlmap","jwt_tool","ysoserial","phpggc","jinja2","freemarker","twig","pug","graphql","gopher","cors","samesite","race-condition","command-injection","mass-assignment","log-poisoning","deserialization","webshell"],
      tags: ["web", "appsec"], status: "ready" },
    { domain: "offensive", slug: "tooling",          title: "File Transfer",          jp: "ファイル転送",
      topics: "http · smb · base64 · exfil · av-evasion",
      keywords: ["certutil","bitsadmin","smbserver","pyftpdlib","impacket-smbserver","base64 transfer","xor encode","split transfer","in-memory","reflective load","dns tunnel","meterpreter","nishang","netcat","dnscat2","scp","wget","curl","exfiltration","loot","data transfer","iwr","invoke-webrequest","webclient","proxychains","dd","file transfer"],
      tags: ["file-transfer", "snippets"], status: "ready" },

    // ---- defensive ----
    { domain: "defensive", slug: "hardening",       title: "Linux Hardening", jp: "Linux 強化",
      topics: "sysctl · pam · backup · web · db · ufw · audit",
      keywords: ["sysctl","syncookies","pam_faillock","pam_pwquality","auditd","aide","unattended-upgrades","limits.conf","sshd_config","permitrootlogin","maxauthtries","server_tokens","log_format","bind-address","listen_addresses","mynetworks","nginx","apache","mariadb","postgresql","unbound","postfix","proftpd","memcached","tomcat","groupsession","wordpress","wp-cli","eccube","phpmyadmin"],
      tags: ["hardening", "defensive", "linux", "web-stack"], status: "ready" },

    { domain: "defensive", slug: "forensics-ir", title: "Forensics & IR", jp: "フォレンジック・IR",
      topics: "triage · memory · timeline · registry · event log",
      keywords: ["kape","velociraptor","volatility","memprocfs","winpmem","dumpit","mftecmd","recmd","evtxecmd","pecmd","appcompatcacheparser","amcacheparser","regripper","plaso","log2timeline","chainsaw","hayabusa","sysmon","event id","prefetch","shimcache","amcache","usn journal","autoruns","live response","memory forensics","super timeline","picerl","persistence","anti-forensics"],
      tags: ["forensics", "ir", "memory", "timeline", "windows"], status: "ready" },
    // ---- other ----
  ],
};
