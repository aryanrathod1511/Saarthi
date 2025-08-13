import {ask} from './gemini.js';
import { getDSAProblemIntroduction } from '../prompts.js';


class InterviewFlowService {
    constructor() {
        this.interviewTypes = {
            'dsa': {
                maxDuration: 50,
                wrapUpThreshold: 45,
                problemsCount: 4
            },
            'technical_behavioral': {
                maxDuration: 20,
                wrapUpThreshold: 18
            },
            'behavioral': {
                maxDuration: 20,
                wrapUpThreshold: 18
            }
        };
    }

   
    getInterviewConfig(interviewType) {
        return this.interviewTypes[interviewType.toLowerCase()] || this.interviewTypes['technical_behavioral'];
    }

    
    shouldWrapUp(interviewType, elapsedMinutes) {
        const config = this.getInterviewConfig(interviewType);
        return elapsedMinutes >= config.wrapUpThreshold;
    }

    async generateWelcomeMessage(promptEngineer) {
        const { interviewType } = promptEngineer.interviewContext;
        const { name, role } = promptEngineer.companyInfo;
        const candidateName = promptEngineer.resumeData?.name || 'the candidate';

        let welcomePrompt = `**INTERVIEW WELCOME**

You are starting a ${interviewType.toUpperCase()} interview at ${name} for ${role} position.

**Your Task:**
1. Welcome the candidate warmly: "Hi ${candidateName}, I'm [Indian male name] from ${name}. Thanks for joining us today."
2. Ask for their brief introduction: name, background.

${interviewType === 'dsa' ? `
**DSA INTERVIEW:** Mention that you'll work through 4 coding problems together, each displayed on screen with a code editor.` : ''}

Keep the introduction concise (2-3 minutes).`;

        const aiResponse = await ask(welcomePrompt, promptEngineer.companyInfo, promptEngineer.resumeData, promptEngineer.interviewContext);
        return this.cleanAIResponse(aiResponse);
    }


    async generateNextQuestion(promptEngineer, context = {}) {
        const { interviewType } = promptEngineer.interviewContext;
        const { name, role } = promptEngineer.companyInfo;
        const { transcript, elapsedMinutes, currentProblem, lastEvaluation } = context;
        const candidateName = promptEngineer.resumeData?.name || 'the candidate';
        const config = this.getInterviewConfig(interviewType);

        if (this.shouldWrapUp(interviewType, elapsedMinutes)) {
            return await this.generateWrapUpQuestion(promptEngineer, context);
        }

        const problemChanged = context.problemChanged || false;
        
        let nextQuestionPrompt = `**INTERVIEW - NEXT QUESTION**

**Context:** ${name} | ${role} | ${elapsedMinutes}/${config.maxDuration} min | ${candidateName}`;

        // Handle DSA interviews with optimizations
        if (interviewType === 'dsa') {
            if (problemChanged) {
                // New problem - don't send conversation history, use problem introduction
                const problemIndex = promptEngineer.interviewContext.currentProblemIndex + 1;
                const problemIntro = getDSAProblemIntroduction(
                    problemIndex, 
                    config.problemsCount, 
                    currentProblem?.description || 'Problem description not available'
                );
                nextQuestionPrompt += `\n\n${problemIntro}`;
            } else {
                // Same problem - include conversation history
                const conversationHistory = this.buildConversationHistory(promptEngineer);
                nextQuestionPrompt += `
**Problem:** ${currentProblem ? `${currentProblem.description} (${promptEngineer.interviewContext.currentProblemIndex + 1}/${config.problemsCount})` : 'Introduction'}

**Conversation History:**
${conversationHistory}

**Current Response:** "${transcript || 'No response yet'}"

**Your Task:**
- Analyze conversation history to determine current stage
- Ask ONE focused question that moves the interview forward
- Progress to next stage when they demonstrate understanding
- Stay in current stage if they need more work
- **CRITICAL:** Set shouldMoveToNextProblem: true when asking the FINAL question for this problem

**Move to next problem when:** All stages complete OR they've demonstrated good understanding.`;
            }
        } else {
            // Non-DSA interviews - include conversation history
            const conversationHistory = this.buildConversationHistory(promptEngineer);
            nextQuestionPrompt += `

**Conversation History:**
${conversationHistory}

**Current Response:** "${transcript || 'No response yet'}"

**Your Task:**
- Ask ONE focused question that moves the interview forward
- Adapt based on their previous responses
- Keep the conversation engaging and relevant`;
        }

        const aiResponse = await ask(nextQuestionPrompt, promptEngineer.companyInfo, promptEngineer.resumeData, promptEngineer.interviewContext);
        
        if (aiResponse && typeof aiResponse === 'object' && aiResponse.question) {
            return {
                question: aiResponse.question,
                feedback: aiResponse.feedback || this.generateDefaultFeedback(),
                shouldMoveToNextProblem: aiResponse.shouldMoveToNextProblem,
                isWrapUp: aiResponse.isWrapUp || false,
                currentStage: aiResponse.currentStage || "Analyzing",
                stageProgress: aiResponse.stageProgress || "Continuing"
            };
        }
        
        return this.cleanAIResponse(aiResponse);
    }

    generateDefaultFeedback() {
        return {
            score: 25,
            overallFeedback: "Response received, continuing interview",
            strengths: ["Engaged"],
            weaknesses: ["Need more analysis"]
        };
    }

    async generateWrapUpQuestion(promptEngineer, context) {
        const { name, role } = promptEngineer.companyInfo;
        const candidateName = promptEngineer.resumeData?.name || 'the candidate';

        let wrapUpPrompt = `**INTERVIEW WRAP-UP**

**Context:** ${name} | ${role} | ${candidateName}

**Your Task:**
1. Thank them for their time
2. Ask if they have questions about the role/company
3. Provide next steps
4. End professionally

**Response Format:**
{
  "question": "Your wrap-up message",
  "feedback": {
    "score": 0,
    "overallFeedback": "Interview completed",
    "strengths": [],
    "weaknesses": []
  },
  "shouldMoveToNextProblem": false,
  "isWrapUp": true
}`;

        const aiResponse = await ask(wrapUpPrompt, promptEngineer.companyInfo, promptEngineer.resumeData, promptEngineer.interviewContext);
        
        if (aiResponse && typeof aiResponse === 'object' && aiResponse.question) {
            return {
                question: aiResponse.question,
                feedback: aiResponse.feedback || this.generateDefaultFeedback(),
                shouldMoveToNextProblem: false,
                isWrapUp: true
            };
        }
        
        return this.cleanAIResponse(aiResponse);
    }

    cleanAIResponse(response) {
        if (typeof response === 'string') {
            return {
                question: response,
                feedback: this.generateDefaultFeedback(),
                shouldMoveToNextProblem: false,
                isWrapUp: false,
                currentStage: "Analyzing",
                stageProgress: "Continuing"
            };
        }
        
        // Ensure feedback is properly structured
        if (response && typeof response.feedback === 'string') {
            response.feedback = {
                score: 25,
                overallFeedback: response.feedback,
                strengths: ["Engaged"],
                weaknesses: ["Need more analysis"]
            };
        }
        
        return {
            question: response.question || "Please provide your response to continue the interview.",
            feedback: response.feedback || this.generateDefaultFeedback(),
            shouldMoveToNextProblem: response.shouldMoveToNextProblem || false,
            isWrapUp: response.isWrapUp || false,
            currentStage: response.currentStage || "Analyzing",
            stageProgress: response.stageProgress || "Continuing"
        };
    }

    buildConversationHistory(promptEngineer) {
        const history = promptEngineer.interviewContext.questionHistory || [];
        if (history.length === 0) return "No previous conversation.";
        
        return history.map((entry, index) => {
            const round = index + 1;
            const problemInfo = entry.problemTitle ? ` (${entry.problemTitle})` : '';
            return `Round ${round}${problemInfo}:
Q: ${entry.question}
A: ${entry.answer || 'No response'}`;
        }).join('\n\n');
    }

    formatToneAnalysis(toneMetrics) {
        if (!toneMetrics || Object.keys(toneMetrics).length === 0) {
            return 'No tone analysis available';
        }
        
        const metrics = [];
        if (toneMetrics.confidence !== undefined) metrics.push(`Confidence: ${toneMetrics.confidence.toFixed(2)}/10`);
        if (toneMetrics.stress !== undefined) metrics.push(`Stress: ${toneMetrics.stress.toFixed(2)}/10`);
        if (toneMetrics.engagement !== undefined) metrics.push(`Engagement: ${toneMetrics.engagement.toFixed(2)}/10`);
        
        return metrics.length > 0 ? metrics.join(', ') : 'No tone analysis available';
    }
}

export default new InterviewFlowService(); 