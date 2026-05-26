# Module: Smart Reminders

## 1. Overview
Moves beyond traditional cron alerts to context-aware, prioritized notifications based on user focus.

## 2. Smart Priority Score (SPS)
`SPS = (Urgency * 0.45) + (Importance * 0.35) + (ContextFit * 0.20)`

## 3. Adaptive Learning
- Tracks user interaction (Snooze count).
- Penalizes `ContextFit` weight if a task is snoozed in a specific environment.
- Eventually learns optimal context for specific task categories.

## 4. AI Deadline Prediction
- Specialist agent extracts implicit timelines from unstructured notes and emails.
- Auto-populates the temporal scheduler.
