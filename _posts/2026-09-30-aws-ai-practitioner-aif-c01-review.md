---
title: "Passing AIF-C01: An Honest Review, and What a Foundational Cert Signals"
date: 2026-09-30 08:00:00 +0000
categories: [Other, Certifications]
tags: [aws, certification, aif-c01, review, career]
description: An honest review of the AWS Certified AI Practitioner (AIF-C01) — why I sat it, how I actually prepared, and what passing it does and does not measure.
---

## 概要

正直な受験記であって、対策ガイドではない。もともと AWS の基礎を学ぶつもりでいたところに AIF2Cloud キャンペーン (AIF-C01 が半額、合格で CLF が無料) が重なり、AIF-C01 を受けた。準備は公式の学習コンテンツと、数百問の練習問題をひたすら回しただけ。合格はしたが、この受け方で受かること自体が、この認定が「能力」ではなく「認識 — 見たことがあるか」を測っていることを露わにする。AI 分野を実際に学ぶには内容が浅く、その用途には向かない。資格としての意味の線引きを書く。

## Introduction

This is an honest review, not a study guide. I sat the AWS Certified AI Practitioner (AIF-C01) mostly because I was going to study the AI/generative-AI landscape anyway, and a fee discount made the timing cheap. I prepared with the official learning content and by drilling a few hundred practice questions until the patterns were automatic. I passed. But the fact that you *can* pass a foundational exam by pattern-drilling is the most interesting thing about it — it tells you what the credential measures and what it does not. If you've read [Coverage Is Not Capability](/posts/coverage-is-not-capability/), this is the same distinction applied to a certificate.

## Why I sat it

Two reasons, in order:

- I was going to work through the AWS foundational tier anyway — the managed-service vocabulary and the boundaries you meet in any threat model that touches AWS or an LLM.
- The economics lined up. AWS ran a promo ([AIF2Cloud](https://www.pearsonvue.com/us/en/aws/aif2cloud.html)): the promo code takes 50% off the AI Practitioner exam, and passing it unlocks a *free* Cloud Practitioner (CLF) exam. That turns one discounted sit into two foundational certs, which flips the "is it worth the money" math entirely.

No career mandate, no employer push. It was a low-stakes, opportunistic sit — pick the cheap entry point (AIF on promo) that also unlocks the next one (CLF free).

## How I actually prepared

Nothing elaborate:

- **Official learning content** for the vocabulary and the service catalog — where the concepts are defined the way the exam defines them, which matters because the exam grades on *its* phrasing.
- **Question drilling** — a few hundred practice questions, repeated until recognition was instant.

Honest caveat, because it is the whole point below: most of my "studying" was pattern recognition on practice questions, not building anything. Drilling third-party question banks is efficient for passing and poor for retaining, and the quality and provenance of unofficial banks vary — the official sample questions and a weekend of hands-on Amazon Bedrock are the defensible path if you want the knowledge to survive the exam. I optimized for the badge, and this review is me being upfront that it shows.

## The exam itself

Delivered online through remote proctoring (OnVUE). If you go that route, the well-documented operational basics apply: run the system test in advance to confirm your OS, browser, camera and network pass; expect a check-in with a photo and a room/desk scan; keep the desk clear, since notes, phones, second monitors and anyone else in the room are not allowed; and you cannot leave your seat or talk during the exam. A stable connection matters — a drop mid-exam is the classic OnVUE headache. None of this is exam-specific; it's the standard Pearson VUE online-proctoring flow, and knowing it ahead of time removes the only real friction.

The format itself is squarely foundational: scenario-style multiple-choice and multiple-response, 90 minutes, no code. Almost every question is the same shape — a short business scenario, then "which service / which approach fits." The skill under test is *placing* the scenario into the right bucket (is this RAG or fine-tuning? is this Comprehend or Rekognition? is this CloudTrail or CloudWatch?), not building or securing anything.

## The result, and what it actually measured

I passed, and comfortably. Here is the uncomfortable part: I passed largely by recognizing question shapes, not through capability I didn't already have. That is not a knock on AWS — foundational exams are, by design, recognition checks, not competence checks. But it means the credential signals **exposure**, not **ability**. It says "this person has seen the managed-AI landscape and can name its parts," which is a real and useful thing, and it does *not* say "this person can build or secure an AI system." Read it that way on anyone's profile, mine included.

This is the [coverage-is-not-capability](/posts/coverage-is-not-capability/) pattern again: a number you can pass, a box you can tick, standing in for a capability it does not actually verify. The map is not the territory; the badge is not the skill.

## Is it worth it?

For a security practitioner, split the answer:

- **Worth it** as a cheap forcing-function to skim the managed-AI surface you will meet in threat models anyway — Bedrock, guardrails, data boundaries, the responsible-AI vocabulary. A weekend, on discount, is a fine trade for that.
- **Not worth it** if you expect it to certify that you can build or secure AI systems. It doesn't; it certifies you can talk about them. Don't over-index on it, and don't let a hiring signal treat it as more than exposure.

And be clear about one thing it is *not*: a way to actually learn AI. The content is too shallow for that. It teaches you to name services and recite definitions, not to reason about models, data, or failure modes. If your goal is to understand the field, this exam is not the vehicle — read papers, build with the APIs, break things. The cert is a map label, not the territory.

My verdict: buy it when it's discounted, treat it as a structured skim, and move on. It is a low bar cleared cheaply, which is exactly what a foundational cert should be — as long as everyone reads it as that.

## What's next

Passing AIF-C01 unlocks the free Cloud Practitioner (CLF) exam under the same AIF2Cloud promo, so CLF is next — same foundational tier, same expectations, same "recognition, not capability" caveat. A free sit is a free sit; I'll take it and expect a shorter version of this same review.

## Key Takeaways

- AIF-C01 is a recognition exam: you can pass it by drilling question shapes, which is what makes it cheap.
- That means the credential signals *exposure* to the managed-AI landscape, not the ability to build or secure it — value it accordingly, on any profile.
- It's a good discounted skim of the AI surface a security practitioner meets in threat models; it is not proof of competence.
- If you want retention, do hands-on and use official questions; if you want the badge, drill. Know which one you're buying.

## References

- [AWS Certified AI Practitioner — certification overview](https://aws.amazon.com/certification/certified-ai-practitioner/)
- [AWS Certified AI Practitioner (AIF-C01) — exam guide](https://docs.aws.amazon.com/aws-certification/latest/examguides/ai-practitioner-01.html)
- [AIF2Cloud promotion (Pearson VUE)](https://www.pearsonvue.com/us/en/aws/aif2cloud.html)
