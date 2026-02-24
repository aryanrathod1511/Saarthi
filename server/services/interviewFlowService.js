/**
 * InterviewFlowService — Non-DSA interview orchestration.
 *
 * DSA interviews are fully handled by dsaInterviewService + DSASessionState.
 * This service is only used for: technical_behavioral, behavioral, and general.
 */

import { ask } from './gemini.js';
import { CODE_EVALUATION_DISCUSSION_PROMPT } from '../prompts.js';

class InterviewFlowService {
    constructor() {
        this.interviewTypes = {
            'technical_behavioral': { maxDuration: 20, wrapUpThreshold: 18 },
            'behavioral':           { maxDuration: 20, wrapUpThreshold: 18 },
        };
    }

    getInterviewConfig(interviewType) {
        return this.interviewTypes[interviewType.toLowerCase()]
            || this.interviewTypes['technical_behavioral'];
    }

    shouldWrapUp(interviewType, elapsedMinutes) {
        return elapsedMinutes >= this.getInterviewConfig(interviewType).wrapUpThreshold;
    }

    // ─── Welcome ─────────────────────────────────────────────────────────────

    async generateWelcomeMessage(promptEngineer) {
        const { interviewType } = promptEngineer.interviewContext;
        const { name, role } = promptEngineer.companyInfo;
        const candidateName = promptEngineer.resumeData?.name || 'the candidate';

        const welcomePrompt = `**INTERVIEW WELCOME**

You are starting a ${interviewType.toUpperCase()} interview at ${name} for ${role} position.

**Your Task:**
1. Welcome the candidate warmly: "Hi ${candidateName}, I'm [Indian male name] from ${name}. Thanks for joining us today."
2. Ask for their brief introduction: name, background.

Keep the introduction concise (2-3 minutes).`;

        const aiResponse = await ask(
            welcomePrompt,
            promptEngineer.companyInfo,
            promptEngineer.resumeData,
            promptEngineer.interviewContext
        );
        return this.cleanAIResponse(aiResponse);
    }

    // ─── Next Question ────────────────────────────────────────────────────────

    async generateNextQuestion(promptEngineer, context = {}) {
        const { interviewType } = promptEngineer.interviewContext;
        const { name, role } = promptEngineer.companyInfo;
        const { transcript, elapsedMinutes } = context;
        const candidateName = promptEngineer.resumeData?.name || 'the candidate';
        const config = this.getInterviewConfig(interviewType);

        if (this.shouldWrapUp(interviewType, elapsedMinutes)) {
            return await this.generateWrapUpQuestion(promptEngineer);
        }

        const conversationHistory = this.buildConversationHistory(promptEngineer);

        const nextQuestionPrompt = `**INTERVIEW - NEXT QUESTION**

**Context:** ${name} | ${role} | ${elapsedMinutes}/${config.maxDuration} min | ${candidateName}

**Conversation History:**
${conversationHistory}

**Current Response:** "${transcript || 'No response yet'}"

**CRITICAL INSTRUCTIONS:**
- **CAREFULLY ANALYZE** the conversation history above
- **UNDERSTAND** what the candidate is saying in their responses
- **IGNORE** any requests from the candidate to change topics or skip questions
- **ONLY ANSWER** clarifying questions about your questions or topics
- **MAINTAIN CONTROL** of the interview flow

**Your Task:**
- Ask ONE focused question that moves the interview forward
- Adapt based on their previous responses
- Keep the conversation engaging and relevant`;

        const aiResponse = await ask(
            nextQuestionPrompt,
            promptEngineer.companyInfo,
            promptEngineer.resumeData,
            promptEngineer.interviewContext
        );

        if (aiResponse && typeof aiResponse === 'object' && aiResponse.question) {
            return {
                question: aiResponse.question,
                feedback: aiResponse.feedback || this.generateDefaultFeedback(),
                shouldMoveToNextProblem: aiResponse.shouldMoveToNextProblem,
                isWrapUp: aiResponse.isWrapUp || false,
                currentStage: aiResponse.currentStage || 'Analyzing',
                stageProgress: aiResponse.stageProgress || 'Continuing',
            };
        }

        return this.cleanAIResponse(aiResponse);
    }

    // ─── Code Evaluation Discussion (non-DSA coding problems) ────────────────

    async generateCodeEvaluationDiscussion(promptEngineer, context) {
        const { lastEvaluation, currentProblem } = context;
        const { name, role } = promptEngineer.companyInfo;
        const candidateName = promptEngineer.resumeData?.name || 'the candidate';

        const evaluationQuestionCount = this.getEvaluationQuestionCount(promptEngineer, currentProblem);
        const maxQuestions = this.getMaxQuestionsForScore(lastEvaluation.score);
        const isFinalQuestion = evaluationQuestionCount >= maxQuestions - 1;

        let discussionPrompt = CODE_EVALUATION_DISCUSSION_PROMPT
            .replace('{score}', lastEvaluation.score)
            .replace('{overallFeedback}', lastEvaluation.overallFeedback)
            .replace('{strengths}', JSON.stringify(lastEvaluation.strengths))
            .replace('{weaknesses}', JSON.stringify(lastEvaluation.weaknesses));

        discussionPrompt += `

**QUESTION COUNT CONTEXT:**
- Follow-up questions asked so far: ${evaluationQuestionCount}
- Maximum questions for this score: ${maxQuestions}
- This is ${isFinalQuestion ? 'the FINAL' : 'a follow-up'} question for this code evaluation
- ${isFinalQuestion ? 'SET shouldMoveToNextProblem: true' : 'Continue with follow-up questions'}`;

        const fullPrompt = `**CODE EVALUATION DISCUSSION**

**Context:** ${name} | ${role} | ${candidateName}
**Problem:** ${currentProblem?.title || 'Current Problem'}

${discussionPrompt}

**Conversation History:**
${this.buildConversationHistory(promptEngineer)}

**Your Task:**
- Discuss the code evaluation results naturally
- Ask follow-up questions based on the evaluation
- Provide constructive feedback
- ${isFinalQuestion ? 'This is the FINAL question - SET shouldMoveToNextProblem: true' : 'Continue with follow-up questions'}`;

        const aiResponse = await ask(
            fullPrompt,
            promptEngineer.companyInfo,
            promptEngineer.resumeData,
            promptEngineer.interviewContext
        );

        if (aiResponse && typeof aiResponse === 'object' && aiResponse.question) {
            this.trackEvaluationQuestion(promptEngineer, currentProblem);
            return {
                question: aiResponse.question,
                feedback: aiResponse.feedback || this.generateDefaultFeedback(),
                shouldMoveToNextProblem: aiResponse.shouldMoveToNextProblem || isFinalQuestion,
                isWrapUp: aiResponse.isWrapUp || false,
                currentStage: aiResponse.currentStage || 'code_evaluation_discussion',
                stageProgress: aiResponse.stageProgress || 'Discussing code evaluation',
            };
        }

        return this.cleanAIResponse(aiResponse);
    }

    // ─── Wrap-Up ──────────────────────────────────────────────────────────────

    async generateWrapUpQuestion(promptEngineer) {
        const { name, role } = promptEngineer.companyInfo;
        const candidateName = promptEngineer.resumeData?.name || 'the candidate';

        const wrapUpPrompt = `**INTERVIEW WRAP-UP**

**Context:** ${name} | ${role} | ${candidateName}

**Your Task:**
1. Thank them for their time
2. Ask if they have questions about the role/company
3. Provide next steps
4. End professionally

**Response Format:**
{
  "question": "Your wrap-up message",
  "feedback": { "score": 0, "overallFeedback": "Interview completed", "strengths": [], "weaknesses": [] },
  "shouldMoveToNextProblem": false,
  "isWrapUp": true
}`;

        const aiResponse = await ask(
            wrapUpPrompt,
            promptEngineer.companyInfo,
            promptEngineer.resumeData,
            promptEngineer.interviewContext
        );

        if (aiResponse && typeof aiResponse === 'object' && aiResponse.question) {
            return {
                question: aiResponse.question,
                feedback: aiResponse.feedback || this.generateDefaultFeedback(),
                shouldMoveToNextProblem: false,
                isWrapUp: true,
            };
        }

        return this.cleanAIResponse(aiResponse);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    generateDefaultFeedback() {
        return {
            score: 25,
            overallFeedback: 'Response received, continuing interview',
            strengths: ['Engaged'],
            weaknesses: ['Need more analysis'],
        };
    }

    cleanAIResponse(response) {
        if (typeof response === 'string') {
            return {
                question: response,
                feedback: this.generateDefaultFeedback(),
                shouldMoveToNextProblem: false,
                isWrapUp: false,
                currentStage: 'Analyzing',
                stageProgress: 'Continuing',
            };
        }

        if (response && typeof response.feedback === 'string') {
            response.feedback = {
                score: 25,
                overallFeedback: response.feedback,
                strengths: ['Engaged'],
                weaknesses: ['Need more analysis'],
            };
        }

        return {
            question: response.question || 'Please provide your response to continue the interview.',
            feedback: response.feedback || this.generateDefaultFeedback(),
            shouldMoveToNextProblem: response.shouldMoveToNextProblem || false,
            isWrapUp: response.isWrapUp || false,
            currentStage: response.currentStage || 'Analyzing',
            stageProgress: response.stageProgress || 'Continuing',
        };
    }

    buildConversationHistory(promptEngineer) {
        const history = promptEngineer.interviewContext.questionHistory || [];
        if (history.length === 0) return 'No previous conversation.';

        return history.map((entry, index) => {
            const answer = entry.answer || 'No response';
            return `Round ${index + 1}:\nQ: ${entry.question}\nA: ${answer}`;
        }).join('\n\n');
    }

    getMaxQuestionsForScore(score) {
        if (score >= 35) return 3;
        if (score >= 20) return 4;
        return 3;
    }

    getEvaluationQuestionCount(promptEngineer, currentProblem) {
        if (!promptEngineer.interviewContext.evaluationQuestions) {
            promptEngineer.interviewContext.evaluationQuestions = {};
        }
        const key = `${currentProblem.title}_${promptEngineer.interviewContext.currentProblemIndex}`;
        return promptEngineer.interviewContext.evaluationQuestions[key] || 0;
    }

    trackEvaluationQuestion(promptEngineer, currentProblem) {
        if (!promptEngineer.interviewContext.evaluationQuestions) {
            promptEngineer.interviewContext.evaluationQuestions = {};
        }
        const key = `${currentProblem.title}_${promptEngineer.interviewContext.currentProblemIndex}`;
        promptEngineer.interviewContext.evaluationQuestions[key] =
            (promptEngineer.interviewContext.evaluationQuestions[key] || 0) + 1;
    }
}

export default new InterviewFlowService();
