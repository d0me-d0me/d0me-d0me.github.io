---
layout: page
icon: fas fa-stream
order: 1
title: Posts
---

<style>
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
