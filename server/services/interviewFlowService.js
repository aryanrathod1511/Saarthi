import {ask} from './gemini.js';
import {ask} from './gemini.js';

class InterviewFlowService {
    constructor() {
        this.interviewTypes = {
            'dsa': {
                maxDuration: 50, // 50 minutes
                wrapUpThreshold: 45, // Start wrapping up at 45 minutes
                problemsCount: 4,
                phases: ['introduction', 'problem_solving', 'wrap_up']
            },
            'resume_cs': {
                maxDuration: 20, // 20 minutes
                wrapUpThreshold: 18, // Start wrapping up at 18 minutes
                phases: ['introduction', 'resume_discussion', 'technical_fundamentals', 'wrap_up']
            },
            'technical_hr': {
                maxDuration: 20, // 20 minutes
                wrapUpThreshold: 18, // Start wrapping up at 18 minutes
                phases: ['introduction', 'technical_assessment', 'behavioral_assessment', 'wrap_up']
            },
            'hr': {
                maxDuration: 20, // 20 minutes
                wrapUpThreshold: 18, // Start wrapping up at 18 minutes
                phases: ['introduction', 'behavioral_assessment', 'cultural_fit', 'wrap_up']
            }
        };
    }

    /**
     * Get interview configuration for a specific type
     */
    getInterviewConfig(interviewType) {
        return this.interviewTypes[interviewType.toLowerCase()] || this.interviewTypes['technical_hr'];
    }

    /**
     * Check if interview should wrap up based on time
     */
    shouldWrapUp(interviewType, elapsedMinutes) {
        const config = this.getInterviewConfig(interviewType);
        return elapsedMinutes >= config.wrapUpThreshold;
    }

    /**
     * Generate welcome message for interview start
     */
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
1. **Welcome the candidate warmly** - "Hi ${candidateName}, I'm [Your Name] from ${name}. Thanks for joining us today."
2. **Introduce yourself** briefly
3. **Set interview expectations** - mention this is a ${interviewType} interview for ${role} position
4. **Ask for their brief introduction** - name, background, what interests them about this role
5. **Be professional but warm** - make them comfortable

${interviewType === 'dsa' ? `
**DSA INTERVIEW SPECIFIC:**
- After their introduction, mention: "We'll be working through 4 coding problems together. Each problem will be displayed on your screen with a code editor where you can write and submit your solutions."
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

    /**
     * Generate next question based on interview type and context
     */
    async generateNextQuestion(promptEngineer, context = {}) {
        const { interviewType, currentPhase, experienceLevel } = promptEngineer.interviewContext;
        const { name, type, role } = promptEngineer.companyInfo;
        const { transcript, toneMetrics, elapsedMinutes, currentProblem, dsaProblemContext, aiFollowUpQuestion } = context;
        const candidateName = promptEngineer.resumeData?.name || 'the candidate';
        const config = this.getInterviewConfig(interviewType);

        // Check if we should wrap up
        if (this.shouldWrapUp(interviewType, elapsedMinutes)) {
            return await this.generateWrapUpQuestion(promptEngineer, context);
        }

        let nextQuestionPrompt = promptEngineer.getSystemPrompt() + `**GENERATE NEXT INTERVIEW QUESTION**

**INTERVIEW CONTEXT:**
- Company: ${name} (${type})
- Role: ${role} (${experienceLevel} level)
- Interview Type: ${interviewType}
- Current Phase: ${currentPhase}
- Elapsed Time: ${elapsedMinutes} minutes
- Remaining Time: ${config.maxDuration - elapsedMinutes} minutes
- Candidate: ${candidateName}

**CURRENT QUESTION CONTEXT:**
- Last Question Asked: "${promptEngineer.interviewContext.questionHistory[promptEngineer.interviewContext.questionHistory?.length - 1] || 'First question'}"
- Candidate's Response: "${transcript || 'No response yet'}"
- Tone Analysis: ${this.formatToneAnalysis(toneMetrics)}

${dsaProblemContext ? `
**DSA PROBLEM CONTEXT:**
- ${dsaProblemContext}
- AI Follow-up Question: "${aiFollowUpQuestion || 'No specific follow-up question'}"
` : ''}

**IMPORTANT:** The candidate is responding to the question above. Your next question should be a natural follow-up or continuation based on their response.

**INTERVIEW TYPE SPECIFIC INSTRUCTIONS:**

${interviewType === 'dsa' ? this.getDSAInstructions(currentProblem, config) : ''}
${interviewType === 'resume_cs' ? this.getResumeCSInstructions(promptEngineer, config) : ''}
${interviewType === 'technical_hr' ? this.getTechnicalHRInstructions(promptEngineer, config) : ''}
${interviewType === 'hr' ? this.getHRInstructions(promptEngineer, config) : ''}

**RESPONSE FORMAT - JSON ONLY:**
{
  "question": "Your natural, conversational question",
  "phase": "${currentPhase}",
  "shouldMoveToNextProblem": false,
  "showDSAProblem": false,
  "isWrapUp": false,
  "timeContext": "Brief mention of time if relevant"
}

**CRITICAL:**
- Make questions conversational and natural
- Acknowledge their previous response
- Adapt difficulty based on their performance
- Keep track of time and phase progression
- Set "showDSAProblem": true when introducing DSA/coding problems for resume_cs and technical_hr interviews`;

        const aiResponse = await ask(nextQuestionPrompt, promptEngineer.companyInfo);
        return this.parseAIResponse(aiResponse);
    }

    /**
     * Generate DSA-specific instructions
     */
    getDSAInstructions(currentProblem, config) {
        if (!currentProblem) {
            return `
**DSA INTERVIEW - PROBLEM PRESENTATION:**
- The DSA problem is now displayed on the right side of the screen
- Mention: "I've displayed the problem on your screen. Please take a look at it."
- Present the current problem: "${currentProblem?.title || 'Loading...'}"
- Ask if they understand the problem requirements
- Give them time to think and approach the solution
- Ask follow-up questions about their approach
- Only set "shouldMoveToNextProblem": true when they've discussed their approach thoroughly
- Time management: ${config.maxDuration} minutes total for ${config.problemsCount} problems
- Current time: ${config.maxDuration} minutes remaining`;
        }

        return `
**DSA INTERVIEW - PROBLEM DISCUSSION:**
- Current Problem: "${currentProblem.title}" (displayed on screen)
- The problem statement, sample test cases, and code editor are visible on the right side
- Discuss their approach, time complexity, space complexity
- Ask about edge cases and optimizations
- Ask follow-up questions about their solution
- Only set "shouldMoveToNextProblem": true when discussion is complete
- Time management: ${config.maxDuration} minutes total for ${config.problemsCount} problems
- Current time: ${config.maxDuration} minutes remaining`;
    }

    /**
     * Generate Resume + CS instructions
     */
    getResumeCSInstructions(promptEngineer, config) {
        const resumeText = promptEngineer.resumeData?.rawText || '';
        const currentRound = promptEngineer.interviewContext.questionHistory?.length || 0;
        
        return `
**RESUME + CS FUNDAMENTALS INTERVIEW:**
- Focus on projects mentioned in their resume
- Ask about technologies, challenges, and learning experiences
- Include CS fundamentals questions (algorithms, data structures, system design)
- Ask about their technical background and interests
- Time management: ${config.maxDuration} minutes total
- Current time: ${config.maxDuration} minutes remaining

**DSA PROBLEM INTEGRATION:**
- After 3-4 questions, introduce a DSA problem: "Now let's work on a coding problem together."
- When introducing DSA, set "showDSAProblem": true in your response
- Choose an appropriate problem based on their experience level
- The problem will be displayed on the right side with a code editor
- Guide them through the problem-solving process

**Resume Content:**
${resumeText.substring(0, 500)}...

**Current Round:** ${currentRound}
**DSA Introduction Timing:** Introduce DSA problem around round 4-5`;
    }

    /**
     * Generate Technical + HR instructions
     */
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
- When introducing coding, set "showDSAProblem": true in your response
- Choose a simple problem appropriate for their level
- The problem will be displayed on the right side with a code editor
- Guide them through the solution

**Resume Content:**
${resumeText.substring(0, 500)}...

**Current Round:** ${currentRound}
**Coding Introduction Timing:** Introduce coding around round 3-4`;
    }

    /**
     * Generate HR instructions
     */
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

    /**
     * Generate wrap-up question
     */
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

    /**
     * Clean AI response
     */
    cleanAIResponse(response) {
        // Handle object response from gemini.ask
        if (response && typeof response === 'object' && response.question) {
            return {
                question: response.question,
                feedback: response.feedback || ''
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
                feedback: ''
            };
        }

        // Fallback for invalid responses
        return {
            question: 'Could you please elaborate on that?',
            feedback: ''
        };
    }

    /**
     * Parse AI response to extract structured data
     */
    parseAIResponse(response) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    question: parsed.question || response,
                    phase: parsed.phase || 'general',
                    shouldMoveToNextProblem: parsed.shouldMoveToNextProblem || false,
                    showDSAProblem: parsed.showDSAProblem || false,
                    isWrapUp: parsed.isWrapUp || false,
                    timeContext: parsed.timeContext || ''
                };
            }
            
            // Fallback: return the response as a question
            return {
                question: response,
                phase: 'general',
                shouldMoveToNextProblem: false,
                showDSAProblem: false,
                isWrapUp: false,
                timeContext: ''
            };
        } catch (error) {
            console.error('Error parsing AI response:', error);
            return {
                question: response,
                phase: 'general',
                shouldMoveToNextProblem: false,
                showDSAProblem: false,
                isWrapUp: false,
                timeContext: ''
            };
        }
    }

    /**
     * Format tone analysis for AI context
     */
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