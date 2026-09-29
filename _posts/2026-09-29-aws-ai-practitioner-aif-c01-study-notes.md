---
title: "AWS Certified AI Practitioner (AIF-C01): A Domain Map and Study Notes"
date: 2026-09-29 12:00:00 +0000
categories: [Other, Certifications]
tags: [aws, certification, aif-c01, ai, generative-ai, bedrock, sagemaker, study-notes]
description: A study-note map of the AWS Certified AI Practitioner (AIF-C01) exam — domains and weightings, the services in scope, and the distinctions the questions actually turn on.
---

## 概要

AWS Certified AI Practitioner (AIF-C01) は、AI/ML と生成 AI の基礎、および AWS のマネージド AI サービスの用途を問う入門レベルの認定。コーディングやモデルの数式は問われず、「どの状況でどの手法・どのサービスを選ぶか」の判別が中心になる。

このノートは体験記ではなく対策マップとして書いている。出題ドメインと配点、対象サービス、そして設問が実際に依拠している区別 (RAG と fine-tuning と prompt engineering の使い分け、Clarify の役割、Bedrock のデータ取り扱いなど) を、公式 Exam Guide を一次情報として整理した。数値・形式は受験時点の公式ガイドで必ず再確認すること。

## Introduction

AIF-C01 is a foundational-level exam. It does not ask you to write code or derive model math; it asks you to place a scenario into the right category and pick the right managed service. That makes it a vocabulary-and-distinctions exam more than a hands-on one. These notes map the exam guide's five domains to the concepts and services each one leans on, and call out the distinctions that questions repeatedly turn on.

All figures below are transcribed from the official exam guide; verify them against the current guide before you sit the exam, since AWS revises these periodically.

## Exam at a glance

| Item | Value |
|------|-------|
| Questions | 65 total — 50 scored, 15 unscored |
| Time | 90 minutes |
| Score | 100–1,000; pass at 700 |
| Scoring | Compensatory (you pass on the overall score, not per-domain) |
| Question formats | Multiple choice, multiple response, ordering, matching, case study |
| Level | Foundational |

The 15 unscored questions are indistinguishable from scored ones, so budget time as if all 65 count. Multiple-response items require *every* correct option and no incorrect ones to earn credit — they are where careless reading costs the most.

## Domains and weightings

| Domain | Weight | Focus |
|--------|:------:|-------|
| 1. Fundamentals of AI and ML | 20% | AI/ML/DL/GenAI vocabulary, learning types, the ML lifecycle |
| 2. Fundamentals of Generative AI | 24% | Foundation models, tokens, embeddings, prompting, benefits/limits |
| 3. Applications of Foundation Models | 28% | Designing FM apps: RAG, fine-tuning, prompt engineering, Bedrock features |
| 4. Guidelines for Responsible AI | 14% | Bias, fairness, transparency, explainability, governance |
| 5. Security, Compliance, and Governance | 14% | IAM, data protection, privacy, audit, compliance |

Domain 3 is the largest single block and, together with Domain 2, means roughly half the exam is generative-AI application design. Weight your preparation accordingly.

## Domain notes

### 1 — Fundamentals of AI and ML (20%)

Core distinctions: AI ⊃ ML ⊃ deep learning, with generative AI as a subset built on deep learning. Learning types — **supervised** (labeled data), **unsupervised** (find structure in unlabeled data), **reinforcement** (reward signal). Training vs inference. Features vs labels. Overfitting vs underfitting. The ML lifecycle (data → train → evaluate → deploy → monitor), which is where Amazon SageMaker sits.

**Gotchas.** Classify examples into the right learning type (classification/regression = supervised; clustering = unsupervised; game/robotics agents = reinforcement). Know when ML is the *wrong* tool — deterministic, rule-expressible problems do not need it.

### 2 — Fundamentals of Generative AI (24%)

Foundation models (FMs) and large language models; **tokens** as the unit of input/output and of pricing; **embeddings** as vector representations used for semantic search and similarity. Prompt engineering basics. Common use cases: summarization, text/image generation, chatbots, code assistance. Amazon Bedrock as the managed access point to multiple FMs; Amazon Q as the assistant layer.

**Gotchas.** Foundation models are non-deterministic and can **hallucinate** — treat confident-but-wrong output as an expected failure mode, not an edge case. Distinguish embeddings (representation for retrieval/similarity) from fine-tuning (changing the model). Pricing is token-based, so verbosity has a cost.

### 3 — Applications of Foundation Models (28%)

This is the exam's center of gravity. The decisive theme is choosing among three ways to adapt an FM to your data and task:

- **Prompt engineering** — steer the base model with instructions/examples (zero-shot, few-shot, chain-of-thought). Cheapest, no training, no data pipeline.
- **Retrieval-Augmented Generation (RAG)** — retrieve relevant documents from a knowledge store (a vector database; on AWS, Amazon OpenSearch Serverless or a Bedrock Knowledge Base, with Amazon Kendra for managed retrieval) and inject them into the prompt. Use when answers must reflect current or proprietary facts without retraining.
- **Fine-tuning** — further-train the model on your data to change its behavior/style. Use when prompt + RAG cannot achieve the needed task specialization; costs the most and needs curated data.

Bedrock features you should be able to place: **Knowledge Bases** (managed RAG), **Agents** (multi-step tool use), **Guardrails** (content filtering/safety), and model evaluation.

**Gotchas.** The single most common decision the exam tests is *RAG vs fine-tuning vs prompt engineering* — memorize the "reflect new/private facts → RAG; change behavior/style → fine-tune; cheap steering → prompt" mapping. Know that a vector database backs RAG, and which Bedrock feature does what.

### 4 — Guidelines for Responsible AI (14%)

Dimensions of responsible AI: fairness/bias, transparency, explainability, robustness, privacy, safety, veracity/controllability. On AWS: **Amazon SageMaker Clarify** detects bias and provides explainability; **SageMaker Model Monitor** watches deployed models for drift; **Model Cards** document a model's intended use and limits.

**Gotchas.** Match the responsibility concern to the service: bias/explainability → Clarify; drift/quality in production → Model Monitor; content safety on generative output → Bedrock Guardrails. Understand that bias can enter through the *training data*, not just the model.

### 5 — Security, Compliance, and Governance (14%)

IAM least-privilege for AI workloads; encryption at rest and in transit (AWS KMS); data governance and lineage. Bedrock's data handling — your prompts and data are **not** used to train the base foundation models, and stay within your control. Auditing with **AWS CloudTrail**, monitoring with **Amazon CloudWatch**, and compliance reports via **AWS Artifact**. The shared responsibility model applies to AI workloads as to any other.

**Gotchas.** Separate audit (CloudTrail — *who did what*) from monitoring (CloudWatch — *metrics/logs/alarms*). Know AWS Artifact is where compliance reports live. Bedrock data-privacy phrasing is a favorite question.

## Service quick reference

| Service | One-line purpose |
|---------|------------------|
| Amazon Bedrock | Managed access to multiple foundation models; RAG, Agents, Guardrails |
| Amazon SageMaker | Build/train/deploy custom ML models; Clarify, Model Monitor |
| Amazon Q | Generative AI assistant (business and builder) |
| Amazon Comprehend | NLP: sentiment, entities, key phrases, PII detection |
| Amazon Rekognition | Image/video analysis |
| Amazon Textract | Extract text/data from documents |
| Amazon Transcribe | Speech-to-text |
| Amazon Polly | Text-to-speech |
| Amazon Translate | Machine translation |
| Amazon Lex | Conversational bots (ASR + NLU) |
| Amazon Kendra | Managed intelligent search (RAG retrieval) |
| Amazon Personalize | Recommendations |
| Amazon Fraud Detector | Fraud-risk scoring |

Know these by *what problem they solve*, not by feature lists — the exam gives a scenario and asks which service fits.

## A study approach

A domain-weighted order that mirrors the exam's own emphasis:

1. Read the official exam guide end to end and build the domain map (this note is one).
2. Spend the most time on Domains 2 and 3 (generative AI), since together they are ~52% of the exam. Anchor everything to the RAG / fine-tuning / prompt-engineering decision.
3. Learn the managed-service catalog as a scenario → service lookup.
4. Cover Domains 4 and 5 as service-mapping (Clarify, Guardrails, CloudTrail vs CloudWatch, Artifact).
5. Take official sample questions and at least one full practice exam under time; review every wrong answer to the underlying distinction, not just the correct letter.

Use practice exams to find weak distinctions, not to memorize items. The exam rewards knowing *why* one option beats a plausible neighbor.

## Key Takeaways

- AIF-C01 is a distinctions exam: place the scenario in the right category, pick the right managed service.
- ~52% of the exam is generative AI (Domains 2 + 3); Domain 3 alone is 28%.
- The pivotal decision is **RAG vs fine-tuning vs prompt engineering** — new/private facts → RAG, behavior/style → fine-tune, cheap steering → prompt.
- Map responsibility and governance concerns to services: Clarify (bias/explainability), Guardrails (generative safety), CloudTrail (audit) vs CloudWatch (monitoring), Artifact (compliance).
- Verify all format/scoring figures against the current official exam guide before exam day.

## References

- [AWS Certified AI Practitioner — certification overview](https://aws.amazon.com/certification/certified-ai-practitioner/)
- [AWS Certified AI Practitioner (AIF-C01) — exam guide](https://docs.aws.amazon.com/aws-certification/latest/examguides/ai-practitioner-01.html)
- [AWS Certified AI Practitioner (AIF-C01) — exam guide (PDF)](https://d1.awsstatic.com/training-and-certification/docs-ai-practitioner/AWS-Certified-AI-Practitioner_Exam-Guide.pdf)
