import {ask} from './gemini.js';


class InterviewFlowService {
    constructor() {
        this.interviewTypes = {
            'dsa': {
                maxDuration: 50,
                wrapUpThreshold: 45,
                problemsCount: 4
            },
            'resume_cs_fundamentals': {
                maxDuration: 30,
                wrapUpThreshold: 28
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

        let welcomePrompt = promptEngineer.getSystemPrompt() + `**INTERVIEW WELCOME**

You are starting a ${interviewType.toUpperCase()} interview at ${name} for ${role} position.

**Your Task:**
1. Welcome the candidate warmly: "Hi ${candidateName}, I'm [Indian male name] from ${name}. Thanks for joining us today."
2. Ask for their brief introduction: name, background, what interests them about this role

${interviewType === 'dsa' ? `
**DSA INTERVIEW:** Mention that you'll work through 4 coding problems together, each displayed on screen with a code editor.` : ''}

Keep the introduction concise (2-3 minutes).`;

        const aiResponse = await ask(welcomePrompt, promptEngineer.companyInfo);
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

        const conversationHistory = this.buildConversationHistory(promptEngineer);
        const problemChanged = context.problemChanged || false;
        
        let nextQuestionPrompt = promptEngineer.getSystemPrompt() + `**DSA INTERVIEW - NEXT QUESTION**

**Context:** ${name} | ${role} | ${elapsedMinutes}/${config.maxDuration} min | ${candidateName}
**Problem:** ${currentProblem ? `${currentProblem.title} (${promptEngineer.interviewContext.currentProblemIndex + 1}/${config.problemsCount})` : 'Introduction'}
${problemChanged ? '**NEW PROBLEM:** Start fresh with Stage 1.' : ''}

**Conversation History:**
${conversationHistory}

**Current Response:** "${transcript || 'No response yet'}"

**Interview Stages:**
1. **Problem Intro** - "What are your initial thoughts?"
2. **Approach Discussion** - "How would you approach this?"
3. **Approach Refinement** - Discuss optimization if needed
4. **Complexity Analysis** - "What's the time/space complexity?"
5. **Edge Cases** - "What edge cases should we consider?"
6. **Implementation** - "Can you implement this?"
7. **Code Evaluation** - Ask followup questions based on code
8. **Completion** - Move to next problem when satisfied

**Your Task:**
- Analyze conversation history to determine current stage
- Ask ONE focused question that moves the interview forward
- Progress to next stage when they demonstrate understanding
- Stay in current stage if they need more work

**Response Format:**
{
  "question": "Your next question",
  "feedback": {
    "score": <0-50>,
    "overallFeedback": "<feedback>",
    "strengths": ["<strength>"],
    "weaknesses": ["<weakness>"]
  },
  "shouldMoveToNextProblem": false,
  "isWrapUp": false,
  "currentStage": "<stage_name>",
  "stageProgress": "<explanation>"
}

**Move to next problem when:** All stages complete OR they've demonstrated good understanding.`;

        const aiResponse = await ask(nextQuestionPrompt, promptEngineer.companyInfo);
        
        if (aiResponse && typeof aiResponse === 'object' && aiResponse.question) {
            return {
                question: aiResponse.question,
                feedback: aiResponse.feedback || this.generateDefaultFeedback(),
                shouldMoveToNextProblem: aiResponse.shouldMoveToNextProblem || false,
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

    getDSAInstructions(promptEngineer, config) {
        const currentProblem = promptEngineer.interviewContext.currentProblem;
        
        if (!currentProblem) {
            return `**INTRODUCTION:** Welcome and set expectations for ${config.problemsCount} coding problems.`;
        }

        return `**PROBLEM:** ${currentProblem.title} - Follow intelligent stage progression.`;
    }

    getResumeCSInstructions(promptEngineer, config) {
        const resumeText = promptEngineer.resumeData?.rawText || '';
        
        return `**RESUME + CS FUNDAMENTALS INTERVIEW**
- Focus on projects and technologies from resume
- Ask about CS fundamentals (DBMS, OS, Networks, OOPs)
- Integrate with projects mentioned
- After 3-4 questions, introduce a DSA problem

**Resume:** ${resumeText.substring(0, 200)}...`;
    }

    getTechnicalHRInstructions(promptEngineer, config) {
        const resumeText = promptEngineer.resumeData?.rawText || '';
        
        return `**TECHNICAL + HR INTERVIEW**
- Mix technical and behavioral questions
- Ask about background, projects, teamwork, goals
- After 2-3 questions, introduce a coding problem

**Resume:** ${resumeText.substring(0, 200)}...`;
    }

    getHRInstructions(promptEngineer, config) {
        return `**HR INTERVIEW**
- Focus on behavioral questions and cultural fit
- Use STAR method
- Ask about career goals, motivation, work style`;
    }

    async generateWrapUpQuestion(promptEngineer, context) {
        const { name, role } = promptEngineer.companyInfo;
        const candidateName = promptEngineer.resumeData?.name || 'the candidate';

        let wrapUpPrompt = promptEngineer.getSystemPrompt() + `**INTERVIEW WRAP-UP**

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

        const aiResponse = await ask(wrapUpPrompt, promptEngineer.companyInfo);
        
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