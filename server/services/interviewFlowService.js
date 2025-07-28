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

        let nextQuestionPrompt = promptEngineer.getSystemPrompt() + `**GENERATE NEXT INTERVIEW QUESTION**

**INTERVIEW CONTEXT:**
- Company: ${name} (${type})
- Role: ${role} (${experienceLevel} level)
- Interview Type: ${interviewType}
- Elapsed Time: ${elapsedMinutes} minutes
- Remaining Time: ${config.maxDuration - elapsedMinutes} minutes
- Candidate: ${candidateName}

**CURRENT QUESTION CONTEXT:**
- Last Question Asked: "${promptEngineer.interviewContext.questionHistory[promptEngineer.interviewContext.questionHistory?.length - 1] || 'First question'}"
- Candidate's Response: "${transcript || 'No response yet'}"
- Tone Analysis: ${this.formatToneAnalysis(toneMetrics)}

${dsaProblemContext ? `
**DSA PROBLEM CONTEXT:**
- ${dsaProblemContext}` : ''}

**IMPORTANT:** The candidate is responding to the question above. Your next question should be a natural follow-up or continuation based on their response.

**INTERVIEW TYPE SPECIFIC INSTRUCTIONS:**

${interviewType === 'dsa' ? this.getDSAInstructions(promptEngineer, config) : ''}
${interviewType === 'resume_cs_fundamentals' ? this.getResumeCSInstructions(promptEngineer, config) : ''}
${interviewType === 'technical_behavioral' ? this.getTechnicalHRInstructions(promptEngineer, config) : ''}
${interviewType === 'behavioral' ? this.getHRInstructions(promptEngineer, config) : ''}

**RESPONSE FORMAT - JSON ONLY:**
{
  "question": "Your natural, conversational question",
  "feedback": "Your internal evaluation of their response",
  "shouldMoveToNextProblem": false,
  "showDSAProblem": false,
  "isWrapUp": false
}

**CRITICAL FLAG MANAGEMENT:**
- **shouldMoveToNextProblem**: Set to true ONLY when:
  * You have thoroughly discussed the current problem (at least 3-4 follow-up questions)
  * The candidate has shown sufficient depth of understanding
  * You are ready to move to the next problem
  * It's NOT during the introduction phase (first 2 rounds)
  * The candidate has demonstrated enough knowledge to proceed
  * You have asked enough follow-up questions to assess their understanding

- **showDSAProblem**: Set to true ONLY when:
  * You are introducing the FIRST DSA/coding problem
  * The problem should be displayed on the screen
  * Set to false for all other questions

**QUALITY INTERVIEW GUIDELINES:**
- Ask follow-up questions to dig deeper into responses
- Ensure sufficient depth before moving to next problem
- Only set shouldMoveToNextProblem: true after thorough discussion
- Make questions conversational and natural
- Acknowledge previous responses before asking new questions
- Adapt difficulty based on candidate performance
- **Only set "shouldMoveToNextProblem": true when thoroughly discussing the current problem and ready to move to the next one**`;

        const aiResponse = await ask(nextQuestionPrompt, promptEngineer.companyInfo);
        
        // Handle the enhanced response format from ask() function
        if (aiResponse && typeof aiResponse === 'object' && aiResponse.question) {
            console.log("AI Response received with flags:", {
                shouldMoveToNextProblem: aiResponse.shouldMoveToNextProblem,
                showDSAProblem: aiResponse.showDSAProblem,
                isWrapUp: aiResponse.isWrapUp
            });
            
            return {
                question: aiResponse.question,
                shouldMoveToNextProblem: aiResponse.shouldMoveToNextProblem || false,
                showDSAProblem: aiResponse.showDSAProblem || false,
                isWrapUp: aiResponse.isWrapUp || false
            };
        }
        
        return this.cleanAIResponse(aiResponse);
    }

   
    getDSAInstructions(promptEngineer, config) {
        const currentRound = promptEngineer.interviewContext.questionHistory?.length || 0;
        const currentProblem = promptEngineer.interviewContext.currentProblem;
        
        if (!currentProblem) {
            return `
**DSA INTERVIEW - PROBLEM PRESENTATION:**
- The DSA problem is now displayed on the right side of the screen
- Mention: "I've displayed the problem on your screen. Please take a look at it."
- Present the current problem: "Loading problem..."
- Ask if they understand the problem requirements
- Give them time to think and approach the solution
- Ask follow-up questions about their approach
- **CRITICAL:** Only set "shouldMoveToNextProblem": true when they've discussed their approach thoroughly
- Time management: ${config.maxDuration} minutes total for ${config.problemsCount} problems
- Current time: ${config.maxDuration} minutes remaining
- Current Round: ${currentRound}`;
        }

        return `
**DSA INTERVIEW - PROBLEM DISCUSSION:**
- Current Problem: "${currentProblem.title}" (displayed on screen)
- The problem statement, sample test cases, and code editor are visible on the right side
- Discuss their approach, time complexity, space complexity
- Ask about edge cases and optimizations
- Ask follow-up questions about their solution
- **CRITICAL:** Only set "shouldMoveToNextProblem": true when:
  * You have asked at least 3-4 follow-up questions about the current problem
  * The candidate has shown sufficient depth of understanding
  * You are ready to move to the next problem
  * The candidate has demonstrated enough knowledge to proceed
- **CRITICAL:** Only move to next problem after thorough discussion of current problem
- **QUALITY CHECK:** Ensure you've asked enough follow-up questions to assess their understanding before moving on
- Time management: ${config.maxDuration} minutes total for ${config.problemsCount} problems
- Current time: ${config.maxDuration} minutes remaining
- Current Round: ${currentRound}`;
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
- **IMPORTANT:** When introducing the FIRST DSA problem, set "showDSAProblem": true in your response
- **IMPORTANT:** Before introducing DSA, keep "showDSAProblem": false
- Choose an appropriate problem based on their experience level
- The problem will be displayed on the right side with a code editor
- Guide them through the problem-solving process

**Resume Content:**
${resumeText}

**Current Round:** ${currentRound}
**DSA Introduction Timing:** Introduce DSA problem around round 4-5
**showDSAProblem Flag:** Set to true ONLY when introducing the first DSA problem after that set it to false`;
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
- **IMPORTANT:** When introducing the FIRST coding problem, set "showDSAProblem": true in your response
- **IMPORTANT:** Before introducing coding, keep "showDSAProblem": false
- Choose a simple problem appropriate for their level
- The problem will be displayed on the right side with a code editor
- Guide them through the solution

**Resume Content:**
${resumeText}

**Current Round:** ${currentRound}
**Coding Introduction Timing:** Introduce coding around round 3-4
**showDSAProblem Flag:** Set to true ONLY when introducing the first coding problem`;
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
                showDSAProblem: response.showDSAProblem || false,
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
                showDSAProblem: false,
                isWrapUp: false
            };
        }
        return {
            question: 'Could you please elaborate on that?',
            feedback: '',
            shouldMoveToNextProblem: false,
            showDSAProblem: false,
            isWrapUp: false
        };
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