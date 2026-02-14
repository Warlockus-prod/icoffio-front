# 🤖 MULTI-AGENT PROTOCOL (MAP)

> **Effective Date:** 2026-02-13
> **Status:** ACTIVE

This protocol defines the operating procedures for the "Four Agents" workflow simulation within the AI Assistant.

## 🎭 ROLES

### 1. Product Manager (PM) 👔
- **Focus:** Requirements, Documentation, Planning.
- **Responsibilities:**
    - Maintains `PROJECT_MASTER_DOCUMENTATION.md` and `task.md`.
    - Defines the `implementation_plan.md`.
    - Facilitates communication with the USER.
    - **Authority:** Can block Development if requirements are unclear.

### 2. Lead Developer (DEV) 👨‍💻
- **Focus:** Code Implementation, Architecture, Refactoring.
- **Responsibilities:**
    - Writes code in `app/`, `components/`, `lib/`.
    - Adheres to `DEVELOPMENT_RULES.md`.
    - Commits code with semantic messages.
    - **Authority:** Decides *how* to implement features.

### 3. QA Engineer (QA) 🕵️
- **Focus:** Verification, Testing, Stability.
- **Responsibilities:**
    - Maintains `tests/` directory.
    - Runs `sh scripts/pre-deploy.sh` before every "release".
    - Creates `TEST_REPORT.md`.
    - **Authority:** **VETO POWER**. Can block any deployment/handover if tests fail.

### 4. Monetization Specialist (AD-TECH) 💰
- **Focus:** Ad Revenue, Ad Configuration, User Experience.
- **Responsibilities:**
    - Manages `lib/config/adPlacements.ts`.
    - Optimizes `UniversalAd` component.
    - Maintains `ADVERTISING_CODES_GUIDE.md`.
    - Monitors Core Web Vitals impact of scripts.
    - **Authority:** Can veto changes that degrade ad performance or SEO.

---

## 🔄 WORKFLOW LOOPS

### A. The "Feature" Loop
1.  **User Request** -> **PM** analyzes -> Updates `task.md`.
2.  **PM** drafts `implementation_plan.md` -> **User** approves.
3.  **DEV** implements changes (iterations).
4.  **AD-TECH** reviews (if ads involved) -> checks `layout.tsx` impact.
5.  **QA** runs tests -> fails? -> Back to **DEV**.
6.  **QA** passes -> **PM** updates docs -> **PM** notifies User.

### B. The "Fix" Loop
1.  **QA/User** reports bug -> **PM** logs it.
2.  **DEV** fixes.
3.  **QA** verifies.

## 📝 HANDOVER PROTOCOLS

- **DEV -> QA**: "I have implemented X. Ready for testing." (Implicitly requires build success).
- **QA -> PM**: "Tests passed. Report generated. Ready for release."
- **AD-TECH -> DEV**: "Ad placement X is causing CLS issues. Fix required."

## 🚫 RESTRICTIONS

1.  **NO** pushing to `main` without **QA** sign-off (simulated).
2.  **NO** ad changes without **AD-TECH** review.
3.  **NO** new features without **PM** documentation update.
