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
        const { interviewType, experienceLevel } = promptEngineer.interviewContext;
        const { name, type, role } = promptEngineer.companyInfo;
        const candidateName = promptEngineer.resumeData?.name || 'the candidate';
        const config = this.getInterviewConfig(interviewType);

        let welcomePrompt = promptEngineer.getSystemPrompt() + `**INTERVIEW WELCOME MESSAGE**

You are starting a ${interviewType.toUpperCase()} interview at ${name}. 

**INTERVIEW CONFIGURATION:**
- Duration: ${config.maxDuration} minutes
- Wrap-up threshold: ${config.wrapUpThreshold} minutes
- Experience Level: ${experienceLevel}

**Your Task:**
1. **Welcome the candidate warmly** - "Hi ${candidateName}, I'm [Select an indian name (male only)] from ${name}. Thanks for joining us today."
2. **Introduce yourself** briefly
3. **Set interview expectations** - mention this is a ${interviewType} interview for ${role} position
4. **Ask for their brief introduction** - name, background, what interests them about this role
5. **Be professional but warm** - make them comfortable

${interviewType === 'dsa' ? `
**DSA INTERVIEW SPECIFIC:**
- After their introduction response, mention: "We'll be working through 4 coding problems together. Each problem will be displayed on your screen with a code editor where you can write and submit your solutions."
- Explain the format: "For each problem, you'll see the problem statement, sample test cases, and a code editor on the right side of your screen."
` : ''}

**Important Guidelines:**
- Keep the introduction concise (2-3 minutes)
- Ask only ONE question to start (their introduction)
- Don't rush into technical questions yet
- Make it feel like a real interview starting

**Candidate Info:**
- Name: ${candidateName}
- Resume: ${promptEngineer.resumeData?.rawText || 'Not provided'}`;

        const aiResponse = await ask(welcomePrompt, promptEngineer.companyInfo);
        return this.cleanAIResponse(aiResponse);
    }


    async generateNextQuestion(promptEngineer, context = {}) {
        const { interviewType, experienceLevel } = promptEngineer.interviewContext;
        const { name, type, role } = promptEngineer.companyInfo;
        const { transcript, toneMetrics, elapsedMinutes, currentProblem, dsaProblemContext } = context;
        const candidateName = promptEngineer.resumeData?.name || 'the candidate';
        const config = this.getInterviewConfig(interviewType);

        if (this.shouldWrapUp(interviewType, elapsedMinutes)) {
            return await this.generateWrapUpQuestion(promptEngineer, context);
        }

        // Build conversation history
        const conversationHistory = this.buildConversationHistory(promptEngineer);
        
        // Check if problem changed
        const problemChanged = context.problemChanged || false;
        
        // Check if flag was already set for current problem
        const flagAlreadySet = promptEngineer.interviewContext.flagSetForCurrentProblem || false;
        
        let nextQuestionPrompt = promptEngineer.getSystemPrompt() + `**DSA INTERVIEW - NEXT QUESTION**

**CONTEXT:**
- Company: ${name} | Role: ${role} | Type: ${interviewType}
- Time: ${elapsedMinutes}/${config.maxDuration} minutes
- Candidate: ${candidateName}
- Current Problem: ${currentProblem ? `${currentProblem.title} (${promptEngineer.interviewContext.currentProblemIndex + 1}/${config.problemsCount})` : 'Introduction'}
${problemChanged ? `
**PROBLEM CHANGED:** You are now discussing a NEW problem. Start fresh with Phase 1.` : ''}
${flagAlreadySet ? `
**FLAG ALREADY SET:** shouldMoveToNextProblem was already set for this problem. DO NOT set it again.` : ''}

**CONVERSATION HISTORY (ANALYZE CAREFULLY):**
${conversationHistory}

**CURRENT RESPONSE:**
"${transcript || 'No response yet'}"

**YOUR TASK:**
1. **Analyze the conversation history** - understand what phases have been completed
2. **Determine the next phase** based on the 9-phase structure
3. **Ask ONE focused question** that moves the interview forward
4. **Set shouldMoveToNextProblem: true** if ready to move to next problem

**9-PHASE STRUCTURE:**
1. **Approach Discussion** - discuss solution approach
2. **Clarifying Questions** - answer candidate questions
3. **Edge Cases** - discuss edge cases
4. **Time Complexity** - discuss O(n) analysis
5. **Space Complexity** - discuss memory usage
6. **Constraints Check** - compare with problem constraints
7. **Implementation Request** - ask for code
8. **Code Evaluation** - evaluate submitted code
9. **Move to Next** - set flag and move on

**SMART PHASE DETECTION:**
- If candidate mentioned implementation/code → Phase 7-8 complete
- If discussed complexity → Phase 4-5 complete  
- If discussed edge cases → Phase 3 complete
- If asked about approach → Phase 1 complete
- **Don't repeat completed phases**

**RESPONSE FORMAT:**
{
  "question": "Your next question",
  "feedback": "Analysis of their response",
  "shouldMoveToNextProblem": false,
  "isWrapUp": false
}

**FLAG RULES:**
- Set shouldMoveToNextProblem: true ONLY ONCE per problem when:
  * All phases for current problem are complete
  * OR discussed same problem for 3+ questions
  * OR candidate explained implementation
- **CRITICAL:** Once you set shouldMoveToNextProblem: true, NEVER set it again for the same problem
- **CRITICAL:** After setting the flag, the problem will change automatically - don't set it again
- **CRITICAL:** Only set this flag when you're 100% ready to move to the next problem`;

        const aiResponse = await ask(nextQuestionPrompt, promptEngineer.companyInfo);
        
        // Handle the enhanced response format from ask() function
        if (aiResponse && typeof aiResponse === 'object' && aiResponse.question) {
            console.log("AI Response received with flags:", {
                shouldMoveToNextProblem: aiResponse.shouldMoveToNextProblem,
                isWrapUp: aiResponse.isWrapUp
            });
            
            return {
                question: aiResponse.question,
                shouldMoveToNextProblem: aiResponse.shouldMoveToNextProblem || false,
                isWrapUp: aiResponse.isWrapUp || false
            };
        }
        
        return this.cleanAIResponse(aiResponse);
    }

   
    getDSAInstructions(promptEngineer, config) {
        const currentRound = promptEngineer.interviewContext.questionHistory?.length || 0;
        const currentProblem = promptEngineer.interviewContext.currentProblem;
        const currentProblemIndex = promptEngineer.interviewContext.currentProblemIndex || 0;
        
        // Introduction phase (first 2 rounds)
        if (!currentProblem || currentRound <= 2) {
            return `
**INTRODUCTION PHASE:**
- Welcome candidate and set expectations
- Mention ${config.problemsCount} coding problems will be displayed on screen
- Ask for brief introduction and background
- **Don't set shouldMoveToNextProblem during introduction**`;
        }

        return `
**PROBLEM DISCUSSION PHASE:**
- Current: "${currentProblem.title}" (${currentProblemIndex + 1}/${config.problemsCount})
- Problem is already displayed on screen
- Follow 9-phase structure from main prompt
- **Don't repeat completed phases**
- **Move to next problem when ready**`;
    }

    getResumeCSInstructions(promptEngineer, config) {
        const resumeText = promptEngineer.resumeData?.rawText || '';
        const currentRound = promptEngineer.interviewContext.questionHistory?.length || 0;
        
        return `
**RESUME + CS FUNDAMENTALS INTERVIEW:**
- Focus on projects mentioned in their resume
- Ask about technologies, challenges, and learning experiences
- Include CS fundamentals questions (Database management system, Operating system, Computer networks, OOPs, etc)
-Do intensive discussions on the CS fundamnetals subjects mentioned above. also stir them with the project metioned.
- Ask about their technical background and interests
- Time management: ${config.maxDuration} minutes total
- Current time: ${config.maxDuration} minutes remaining

**DSA PROBLEM INTEGRATION:**
- After 3-4 questions, introduce a DSA problem: "Now let's work on a coding problem together."
- Choose an appropriate problem based on their experience level
- The problem will be displayed on the right side with a code editor
- Guide them through the problem-solving process

**Resume Content:**
${resumeText}

**Current Round:** ${currentRound}
**DSA Introduction Timing:** Introduce DSA problem around round 4-5`;
    }

    
    getTechnicalHRInstructions(promptEngineer, config) {
        const resumeText = promptEngineer.resumeData?.rawText || '';
        const currentRound = promptEngineer.interviewContext.questionHistory?.length || 0;
        
        return `
**TECHNICAL + HR INTERVIEW:**
- Mix technical questions with behavioral/HR questions
- Ask about their technical background and projects
- Include behavioral questions about teamwork, challenges, goals
- Ask about their interest in the company and role
- Time management: ${config.maxDuration} minutes total
- Current time: ${config.maxDuration} minutes remaining

**CODING INTEGRATION:**
- After 2-3 questions, introduce a coding problem: "Let's work on a small coding challenge."
- Choose a simple problem appropriate for their level
- The problem will be displayed on the right side with a code editor
- Guide them through the solution

**Resume Content:**
${resumeText}

**Current Round:** ${currentRound}
**Coding Introduction Timing:** Introduce coding around round 3-4`;
    }

    
    getHRInstructions(promptEngineer, config) {
        return `
**HR INTERVIEW:**
- Focus on behavioral questions and cultural fit
- Use STAR method for all behavioral questions
- Ask about career goals, motivation, and work style
- Assess communication and soft skills
- Time management: ${config.maxDuration} minutes total
- Current time: ${config.maxDuration} minutes remaining`;
    }

    
    async generateWrapUpQuestion(promptEngineer, context) {
        const { name, role } = promptEngineer.companyInfo;
        const candidateName = promptEngineer.resumeData?.name || 'the candidate';
        const { elapsedMinutes } = context;

        const wrapUpPrompt = promptEngineer.getSystemPrompt() + `**INTERVIEW WRAP-UP**

You are wrapping up the interview at ${name}. The interview has been running for ${elapsedMinutes} minutes.

**Your Task:**
1. **Acknowledge the time** - "We're coming to the end of our time together."
2. **Thank them** for their time and participation
3. **Ask if they have questions** - "Do you have any questions for me about the role, the team, or ${name}?"
4. **Be prepared to answer** their questions about the company, role, or next steps
5. **End professionally** - mention next steps in the process

**Important:**
- Be warm and professional
- Give them a chance to ask questions
- Provide helpful information about next steps
- End on a positive note

**Candidate Info:**
- Name: ${candidateName}
- Role: ${role}`;

        const aiResponse = await ask(wrapUpPrompt, promptEngineer.companyInfo);
        const response = this.cleanAIResponse(aiResponse);
        
        return {
            ...response,
            isWrapUp: true,
            shouldMoveToNextProblem: false
        };
    }


    cleanAIResponse(response) {
        
        if (response && typeof response === 'object' && response.question) {
            return {
                question: response.question,
                feedback: response.feedback || '',
                shouldMoveToNextProblem: response.shouldMoveToNextProblem || false,
                isWrapUp: response.isWrapUp || false
            };
        }

        // Handle string response (fallback)
        if (response && typeof response === 'string') {
            let cleanedQuestion = response
                .replace(/\*\*/g, '')
                .replace(/#{1,6}\s/g, '')
                .replace(/```[\s\S]*?```/g, '')
                .replace(/`/g, '')
                .trim();

            cleanedQuestion = cleanedQuestion.replace(/^["']|["']$/g, '');
            
            return {
                question: cleanedQuestion || 'Could you please elaborate on that?',
                feedback: '',
                shouldMoveToNextProblem: false,
                isWrapUp: false
            };
        }
        return {
            question: 'Could you please elaborate on that?',
            feedback: '',
            shouldMoveToNextProblem: false,
            isWrapUp: false
        };
    }

    buildConversationHistory(promptEngineer) {
        const questions = promptEngineer.interviewContext.questionHistory || [];
        const responses = promptEngineer.interviewContext.candidateResponses || [];
        
        if (questions.length === 0) {
            return 'No previous conversation';
        }

        let history = '';
        const maxHistory = Math.min(questions.length, 5); // Last 5 exchanges
        
        for (let i = Math.max(0, questions.length - maxHistory); i < questions.length; i++) {
            const question = questions[i];
            const response = responses[i] || 'No response';
            
            history += `**Round ${i + 1}:**\n`;
            history += `Q: ${question}\n`;
            history += `A: ${response}\n\n`;
        }
        
        return history;
    }

    formatToneAnalysis(toneMetrics) {
        if (!toneMetrics || Object.keys(toneMetrics).length === 0) {
            return 'No tone data available';
        }

        return Object.entries(toneMetrics)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    }
}

export default new InterviewFlowService(); 