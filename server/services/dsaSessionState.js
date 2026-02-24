/**
 * DSA Interview Session State
 *
 * Owns all state for a DSA interview. The server — not the AI — controls
 * stage transitions, problem advancement, and wrap-up.
 *
 * Structure:
 *   Interview
 *     └── problems[]
 *           ├── conversationHistory[]  (scoped to this problem only)
 *           ├── currentStage           (server-tracked)
 *           ├── stageHistory{}         (turns per stage, completion flags)
 *           └── codeSubmission         (set when candidate submits code)
 */

export const DSA_STAGES = [
    'PROBLEM_UNDERSTANDING',
    'INITIAL_APPROACH',
    'ALGORITHM_DESIGN',
    'COMPLEXITY_ANALYSIS',
    'IMPLEMENTATION',
    'CODE_REVIEW',
];

/**
 * Per-stage rules.
 * minTurns: minimum interviewer questions before AI hint can trigger advance.
 * maxTurns: hard cap — server force-advances regardless of AI hint.
 * IMPLEMENTATION has no cap; it ends only when the candidate submits code.
 */
export const STAGE_CONFIG = {
    PROBLEM_UNDERSTANDING: { minTurns: 1, maxTurns: 3 },
    INITIAL_APPROACH:      { minTurns: 1, maxTurns: 5 },
    ALGORITHM_DESIGN:      { minTurns: 2, maxTurns: 15 },
    COMPLEXITY_ANALYSIS:   { minTurns: 1, maxTurns: 5 },
    IMPLEMENTATION:        { minTurns: 0, maxTurns: Infinity }, // ends on code submit
    CODE_REVIEW:           { minTurns: 1, maxTurns: 5 },
};

export class DSASessionState {
    constructor(problems, companyInfo, candidateInfo) {
        this.sessionType = 'dsa';
        this.companyInfo = companyInfo || {};
        this.candidateInfo = candidateInfo || {};
        this.startTime = new Date();
        this.status = 'active'; // active | wrap_up | completed
        this.currentProblemIndex = 0;
        this.wrapUpTriggered = false;

        this.problems = problems.map(p => ({
            problemData: p,
            status: 'pending',   // pending | active | completed | skipped
            currentStage: DSA_STAGES[0],
            stageHistory: Object.fromEntries(
                DSA_STAGES.map(s => [s, { turns: 0, completed: false }])
            ),
            conversationHistory: [], // { role: 'interviewer'|'candidate', text, stage, timestamp }
            lastAIHint: null,        // 'continue' | 'ready_to_advance' — from last AI response
            codeSubmission: null,    // { code, language, evaluation }
            startedAt: null,
            completedAt: null,
        }));

        // Activate first problem immediately
        this.problems[0].status = 'active';
        this.problems[0].startedAt = new Date();
    }

    // ─── Accessors ──────────────────────────────────────────────────────────

    getCurrentProblem() {
        return this.problems[this.currentProblemIndex];
    }

    getCurrentStage() {
        return this.getCurrentProblem().currentStage;
    }

    getElapsedMinutes() {
        return Math.floor((Date.now() - this.startTime.getTime()) / 60000);
    }

    // ─── History ────────────────────────────────────────────────────────────

    /** Add a turn to the current problem's conversation history. */
    addTurn(role, text) {
        const problem = this.getCurrentProblem();
        problem.conversationHistory.push({
            role,
            text,
            stage: problem.currentStage,
            timestamp: new Date(),
        });
        // Count interviewer turns per stage (stage turn counter drives exit rules)
        if (role === 'interviewer') {
            problem.stageHistory[problem.currentStage].turns++;
        }
    }

    // ─── Stage FSM ──────────────────────────────────────────────────────────

    /**
     * Should the current stage advance?
     * Called AFTER the candidate's response is added to history.
     *
     * Priority:
     *   1. Max turns hit → force advance (ignores AI hint)
     *   2. Min turns met AND AI hinted ready → advance
     *   3. Otherwise → stay
     *
     * IMPLEMENTATION stage is excluded — it ends only via codeSubmitted().
     */
    shouldAdvanceStage() {
        const problem = this.getCurrentProblem();
        const stage = problem.currentStage;

        if (stage === 'IMPLEMENTATION') return false;

        const config = STAGE_CONFIG[stage];
        const turns = problem.stageHistory[stage].turns;

        if (turns >= config.maxTurns) return true;
        if (turns >= config.minTurns && problem.lastAIHint === 'ready_to_advance') return true;

        return false;
    }

    /** Advance to the next stage. Marks current as complete. */
    advanceStage() {
        const problem = this.getCurrentProblem();
        const idx = DSA_STAGES.indexOf(problem.currentStage);

        problem.stageHistory[problem.currentStage].completed = true;
        problem.lastAIHint = null;

        if (idx < DSA_STAGES.length - 1) {
            problem.currentStage = DSA_STAGES[idx + 1];
        }
    }

    /**
     * Called when the candidate submits code.
     * Stores the submission + evaluation, marks IMPLEMENTATION complete,
     * and advances to CODE_REVIEW.
     */
    codeSubmitted(code, language, evaluation) {
        const problem = this.getCurrentProblem();
        problem.codeSubmission = { code, language, evaluation };
        problem.stageHistory['IMPLEMENTATION'].completed = true;
        problem.currentStage = 'CODE_REVIEW';
        problem.lastAIHint = null;
    }

    // ─── Problem FSM ─────────────────────────────────────────────────────────

    /**
     * Should we advance to the next problem?
     * True when CODE_REVIEW stage is complete.
     */
    shouldAdvanceProblem() {
        return this.getCurrentProblem().stageHistory['CODE_REVIEW'].completed;
    }

    /**
     * Advance to the next problem.
     * Returns true if there is a next problem, false if all problems are done.
     */
    advanceProblem() {
        const current = this.getCurrentProblem();
        current.status = 'completed';
        current.completedAt = new Date();

        if (this.currentProblemIndex < this.problems.length - 1) {
            this.currentProblemIndex++;
            const next = this.getCurrentProblem();
            next.status = 'active';
            next.startedAt = new Date();
            return true;
        }
        return false;
    }

    // ─── Wrap-Up ─────────────────────────────────────────────────────────────

    /**
     * Wrap-up triggers when:
     *   - 45 minutes elapsed, OR
     *   - All problems completed/skipped, OR
     *   - Manually triggered
     */
    isWrapUp() {
        if (this.wrapUpTriggered) return true;
        if (this.getElapsedMinutes() >= 45) return true;
        const allDone = this.problems.every(p => p.status === 'completed' || p.status === 'skipped');
        return allDone;
    }

    triggerWrapUp() {
        this.wrapUpTriggered = true;
        this.status = 'wrap_up';
    }

    // ─── Summary (for final feedback) ────────────────────────────────────────

    getSummary() {
        return {
            duration: this.getElapsedMinutes(),
            companyInfo: this.companyInfo,
            candidateInfo: this.candidateInfo,
            problems: this.problems.map(p => ({
                title: p.problemData.title,
                difficulty: p.problemData.difficulty,
                topics: p.problemData.topics,
                status: p.status,
                stagesCompleted: DSA_STAGES.filter(s => p.stageHistory[s].completed),
                conversationTurns: p.conversationHistory.length,
                codeSubmission: p.codeSubmission
                    ? {
                        language: p.codeSubmission.language,
                        evaluation: p.codeSubmission.evaluation,
                    }
                    : null,
            })),
        };
    }
}
