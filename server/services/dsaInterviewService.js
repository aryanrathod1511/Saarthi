/**
 * DSA Interview Service
 *
 * Orchestrates the DSA interview flow using a server-side FSM.
 * The AI generates question content; the server controls all transitions.
 *
 * Flow per turn:
 *   1. Add candidate response to problem history
 *   2. Check if current stage should advance (server rules + AI hint)
 *   3. Check if current problem should advance (CODE_REVIEW complete)
 *   4. Check wrap-up
 *   5. Build focused context package for current stage
 *   6. Call AI → get question + stageReadiness hint
 *   7. Store AI hint, add question to history
 *   8. Return question to controller
 */

import { askDSA } from './gemini.js';
import { DSA_STAGES, STAGE_CONFIG } from './dsaSessionState.js';
import { buildDSAPrompt } from '../prompts.js';

class DSAInterviewService {

    // ─── Context Package Builder ────────────────────────────────────────────

    /**
     * Builds the minimal, focused context package sent to AI each turn.
     * Only current-problem history is included — no cross-problem data.
     */
    buildContextPackage(sessionState) {
        const problem = sessionState.getCurrentProblem();
        const stage = problem.currentStage;
        const stageConfig = STAGE_CONFIG[stage];
        const stageTurns = problem.stageHistory[stage].turns;
        const isFinalTurnInStage = stage !== 'IMPLEMENTATION'
            && stageTurns >= stageConfig.maxTurns - 1;

        return {
            stage,
            isFinalTurnInStage,

            problem: {
                title: problem.problemData.title,
                description: problem.problemData.description,
                difficulty: problem.problemData.difficulty,
                examples: problem.problemData.examples || null,
            },

            // Current problem's conversation ONLY
            conversationHistory: problem.conversationHistory,

            // Code evaluation results (set only when in CODE_REVIEW)
            codeEvaluation: stage === 'CODE_REVIEW' && problem.codeSubmission
                ? problem.codeSubmission.evaluation
                : null,

            candidate: {
                name: sessionState.candidateInfo?.name || 'Candidate',
                level: sessionState.candidateInfo?.level || 'Entry',
            },

            companyInfo: sessionState.companyInfo,

            problemProgress: {
                current: sessionState.currentProblemIndex + 1,
                total: sessionState.problems.length,
            },

            stageProgress: {
                currentStage: stage,
                stageIndex: DSA_STAGES.indexOf(stage) + 1,
                totalStages: DSA_STAGES.length,
                turnsInStage: stageTurns,
            },
        };
    }

    // ─── Welcome Message ────────────────────────────────────────────────────

    /**
     * Generates the opening welcome message.
     * Uses a simple static template — no AI needed for a greeting.
     */
    generateWelcome(sessionState) {
        const { name: companyName = 'the company', role = 'Software Engineer' } = sessionState.companyInfo;
        const candidateName = sessionState.candidateInfo?.name || 'there';
        const totalProblems = sessionState.problems.length;

        const question = `Hi ${candidateName}! I'm your interviewer today from ${companyName}. ` +
            `We'll be working through ${totalProblems} coding problem${totalProblems > 1 ? 's' : ''} ` +
            `for the ${role} role. Each problem is displayed on screen with a code editor. ` +
            `Please think out loud as you work — that's an important part of the evaluation. ` +
            `Any questions before we begin?`;

        return {
            question,
            currentStage: 'INTRO',
            problemIndex: 0,
            currentProblem: sessionState.getCurrentProblem().problemData,
            totalProblems,
            isWrapUp: false,
        };
    }

    // ─── Next Question ──────────────────────────────────────────────────────

    /**
     * Main entry point called by the controller on each candidate response.
     *
     * @param {DSASessionState} sessionState
     * @param {string|null} candidateResponse - transcribed text, null on first call
     * @returns {object} - { question, currentStage, stageIndex, problemIndex, currentProblem, totalProblems, isWrapUp }
     */
    async generateNextQuestion(sessionState, candidateResponse) {
        // 1. Record candidate response
        if (candidateResponse && candidateResponse.trim()) {
            sessionState.addTurn('candidate', candidateResponse);
        }

        // 2. Check wrap-up before anything else
        if (sessionState.isWrapUp()) {
            return this._generateWrapUp(sessionState);
        }

        // 3. Apply AI hint from previous turn to decide stage advancement
        //    (We stored the hint after the last AI call; now the candidate has responded)
        const problem = sessionState.getCurrentProblem();
        if (problem.lastAIHint === 'ready_to_advance' && sessionState.shouldAdvanceStage()) {
            sessionState.advanceStage();
        }

        // 4. Force-advance stage if max turns hit (catches cases where AI never hinted)
        if (sessionState.shouldAdvanceStage()) {
            sessionState.advanceStage();
        }

        // 5. Check if problem should advance (CODE_REVIEW completed)
        if (sessionState.shouldAdvanceProblem()) {
            const hasNext = sessionState.advanceProblem();
            if (!hasNext) {
                return this._generateWrapUp(sessionState);
            }
        }

        // 6. Re-check wrap-up after any advancement
        if (sessionState.isWrapUp()) {
            return this._generateWrapUp(sessionState);
        }

        // 7. Build context package and call AI
        const contextPackage = this.buildContextPackage(sessionState);
        const prompt = buildDSAPrompt(contextPackage);
        const aiResponse = await askDSA(prompt);

        // 8. Store AI hint for next turn's stage-advance decision
        sessionState.getCurrentProblem().lastAIHint = aiResponse.stageReadiness || 'continue';

        // 9. Add AI question to history
        sessionState.addTurn('interviewer', aiResponse.question);

        return {
            question: aiResponse.question,
            feedback: aiResponse.feedback || null,
            currentStage: sessionState.getCurrentStage(),
            stageIndex: DSA_STAGES.indexOf(sessionState.getCurrentStage()),
            problemIndex: sessionState.currentProblemIndex,
            currentProblem: sessionState.getCurrentProblem().problemData,
            totalProblems: sessionState.problems.length,
            isWrapUp: false,
        };
    }

    // ─── Code Submission ─────────────────────────────────────────────────────

    /**
     * Called when the candidate submits code.
     * Transitions IMPLEMENTATION → CODE_REVIEW and generates the first review question.
     *
     * @param {DSASessionState} sessionState
     * @param {string} code
     * @param {string} language
     * @param {object} evaluation - result from codeEvaluationService
     * @returns {object} - { question, evaluation, currentStage, ... }
     */
    async handleCodeSubmission(sessionState, code, language, evaluation) {
        // Transition to CODE_REVIEW
        sessionState.codeSubmitted(code, language, evaluation);

        // Build context — now includes codeEvaluation since stage is CODE_REVIEW
        const contextPackage = this.buildContextPackage(sessionState);
        const prompt = buildDSAPrompt(contextPackage);
        const aiResponse = await askDSA(prompt);

        sessionState.getCurrentProblem().lastAIHint = aiResponse.stageReadiness || 'continue';
        sessionState.addTurn('interviewer', aiResponse.question);

        // Check if CODE_REVIEW is done (max turns reached already — shouldn't happen on first call
        // but guard it anyway)
        if (sessionState.shouldAdvanceStage()) {
            sessionState.advanceStage(); // marks CODE_REVIEW complete
        }

        return {
            question: aiResponse.question,
            evaluation,
            currentStage: 'CODE_REVIEW',
            stageIndex: DSA_STAGES.indexOf('CODE_REVIEW'),
            problemIndex: sessionState.currentProblemIndex,
            currentProblem: sessionState.getCurrentProblem().problemData,
            totalProblems: sessionState.problems.length,
            isWrapUp: false,
            isCodeEvaluationDiscussion: true,
        };
    }

    // ─── Wrap-Up ─────────────────────────────────────────────────────────────

    _generateWrapUp(sessionState) {
        sessionState.triggerWrapUp();

        const completed = sessionState.problems.filter(p => p.status === 'completed').length;
        const total = sessionState.problems.length;
        const { name: companyName = 'the company', role = 'the role' } = sessionState.companyInfo;

        const question = completed === total
            ? `We've worked through all ${total} problems — great effort today! ` +
              `We'll review everything and get back to you. Do you have any questions about ${role} at ${companyName}?`
            : `We're at the end of our time today. You worked through ${completed} of ${total} problems — ` +
              `that's solid progress. We'll review everything and be in touch. ` +
              `Any questions about the team or the role before we wrap up?`;

        return {
            question,
            currentStage: 'WRAP_UP',
            stageIndex: DSA_STAGES.length,
            problemIndex: sessionState.currentProblemIndex,
            currentProblem: sessionState.getCurrentProblem()?.problemData || null,
            totalProblems: sessionState.problems.length,
            isWrapUp: true,
        };
    }
}

export default new DSAInterviewService();
