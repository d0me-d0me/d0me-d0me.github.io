/* ============================================================
   content.js — 唯一の編集点。ナレッジが増えたらここに足すだけ。
   大項目は domains[]、各巻は domain で紐付ける。
   ・チートシート追加: volumes[] に1項目追加 + sheets/<slug>.html を置く
   ・資格追加/削除:   certs[] を編集（assets/badges/<svg>.svg を用意）
   ホーム(索引・資格・件数)は app.js が大項目ごとに自動描画する。
   大字: 壱 弐 参 肆 伍 陸 漆 捌
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

  // チートシート。domain で大項目に紐付け、n(大字)は大項目ごとに振る。
  // status: "ready" は sheets/<slug>.html へリンク、"soon" は準備中表示。
  volumes: [
    // ---- offensive ----
    { domain: "offensive", n: "壱", slug: "active-directory", title: "Active Directory", jp: "認証と権限",
      topics: "enum · kerberoast · as-rep · delegation · dcsync", status: "ready" },
    { domain: "offensive", n: "弐", slug: "evasion",          title: "Evasion",          jp: "回避",
      topics: "amsi · etw · script-block logging · in-memory",   status: "ready" },
    { domain: "offensive", n: "参", slug: "lateral-movement", title: "Lateral Movement", jp: "横展開",
      topics: "pass-the-hash · winrm/wmi · ligolo · chisel",     status: "ready" },
    { domain: "offensive", n: "肆", slug: "command-control",  title: "Command & Control", jp: "指揮統制",
      topics: "payload delivery · listeners · egress",           status: "ready" },
    { domain: "offensive", n: "伍", slug: "web",              title: "Web",              jp: "ウェブ",
      topics: "auth · deserialization · ssti · upload",          status: "ready" },
    { domain: "offensive", n: "陸", slug: "tooling",          title: "Tooling",          jp: "道具",
      topics: "launch templates · reusable snippets",            status: "ready" },

    // ---- defensive ----
    { domain: "defensive", n: "壱", slug: "detection",        title: "Detection & Monitoring", jp: "検知・監視",
      topics: "sigma · event-id · siem · yara",                  status: "soon" },
    { domain: "defensive", n: "弐", slug: "forensics-ir",     title: "Forensics & IR",   jp: "フォレンジック・IR",
      topics: "triage · timeline · memory · log analysis",       status: "soon" },

    // ---- other ----
    { domain: "other",     n: "壱", slug: "crypto",           title: "Crypto & Protocols", jp: "暗号・プロトコル",
      topics: "tls · hashing · pki · jwt",                       status: "soon" },
    { domain: "other",     n: "弐", slug: "vuln-notes",       title: "Vuln Notes",       jp: "脆弱性メモ",
      topics: "cve解説 · poc読解 · patch diff",                 status: "soon" },
  ],
};
