---
layout: page
icon: fas fa-stream
order: 1
title: Posts
---

<style>
/* Keep the tab title "Posts" (short sidebar label + correct <title>), but
   show a terminal-window hero matching Security Field Refs / Notes. */
.dynamic-title{display:none;}
.dome-frame{
  border:1px solid rgba(217,220,207,.15);border-radius:6px;overflow:hidden;
  background:linear-gradient(180deg,rgba(217,220,207,.06),transparent);
  margin:.3rem 0 2rem;
}
.dome-bar{
  display:flex;align-items:center;gap:.5rem;padding:.5rem .85rem;
  border-bottom:1px solid rgba(217,220,207,.15);background:rgba(217,220,207,.045);
  font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#8F8875;
}
.dome-bar .d{width:9px;height:9px;border-radius:50%;background:rgba(217,220,207,.15);}
.dome-bar .d.a{background:#E0533B;}
.dome-bar .d.b{background:#E6B450;}
.dome-bar .d.c{background:#48B44A;}
.dome-bar .t{margin-left:.35rem;letter-spacing:.02em;}
.dome-frame-body{padding:clamp(1.4rem,4vw,2.3rem);}
.dome-prompt{font-family:'JetBrains Mono',monospace;color:#8F8875;font-size:.85rem;margin:0 0 .55rem;}
.dome-prompt b{color:#F2F4EA;font-weight:700;}
.dome-journal-h{
  font-family:'JetBrains Mono',monospace;font-weight:700;letter-spacing:-.02em;
  font-size:clamp(1.9rem,6.2vw,3.4rem);line-height:1.04;
  color:#F2F4EA;margin:.15rem 0 .1rem;
}
.dome-journal-h .cur{
  display:inline-block;width:.6ch;height:.9em;background:#48B44A;
  vertical-align:-.08em;margin-left:.12em;animation:dome-blink 1.1s steps(1) infinite;
}
.dome-sub{
  margin:1rem 0 0;color:#D9DCCF;font-family:'Zen Kaku Gothic New',sans-serif;
  font-size:clamp(1rem,2.4vw,1.15rem);line-height:1.55;
}
.dome-sub .en{
  display:block;margin-top:.35rem;color:#8F8875;
  font-family:'JetBrains Mono',monospace;font-size:.86rem;line-height:1.5;
}
@keyframes dome-blink{50%{opacity:0;}}
@media(prefers-reduced-motion:reduce){.dome-journal-h .cur{animation:none;}}
.dome-postlist{list-style:none;margin:1.4rem 0 0;padding:0;}
.dome-postlist li{
  display:flex;align-items:baseline;gap:.9rem;
  padding:.55rem 0;border-bottom:1px solid rgba(205,211,194,.12);
}
.dome-postlist time{
  font-family:'JetBrains Mono',monospace;font-size:.8rem;
  color:rgba(205,211,194,.55);white-space:nowrap;flex:none;
}
.dome-postlist a{font-size:1rem;text-decoration:none;}
.dome-postlist a:hover{text-decoration:underline;}
.dome-postlist .pin{
  font-family:'JetBrains Mono',monospace;font-size:.7rem;
  color:rgba(205,211,194,.55);border:1px solid rgba(205,211,194,.25);
  border-radius:2px;padding:0 .35rem;flex:none;
}
.dome-postlist-empty{color:rgba(205,211,194,.55);margin-top:1.2rem;}
</style>

<div class="dome-frame">
  <div class="dome-bar">
    <span class="d a"></span><span class="d b"></span><span class="d c"></span>
    <span class="t">— d0me — field-journal — 80×24</span>
  </div>
  <div class="dome-frame-body">
    <p class="dome-prompt"><b>d0me</b>:~$ ls -t journal/</p>
    <h1 class="dome-journal-h">Security<br>Field Journal<span class="cur"></span></h1>
    <p class="dome-sub">攻撃と防御の現場から書き起こした考察と記録。<span class="en">Essays and writeups from both sides of the field.</span></p>
  </div>
</div>

{% assign pinned = site.posts | where: "pin", true %}
{% assign rest = site.posts | where_exp: "p", "p.pin != true" %}

<ul class="dome-postlist">
{% for post in pinned %}
  <li>
    <time>{{ post.date | date: "%Y-%m-%d" }}</time>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
    <span class="pin">pin</span>
  </li>
{% endfor %}
{% for post in rest %}
  <li>
    <time>{{ post.date | date: "%Y-%m-%d" }}</time>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
  </li>
{% endfor %}
</ul>

{% if site.posts.size == 0 %}
<p class="dome-postlist-empty">No posts yet.</p>
{% endif %}
