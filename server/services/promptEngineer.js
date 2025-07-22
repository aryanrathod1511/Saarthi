
/**
 * Enhanced prompt engineering for realistic interview simulation
 * Supports natural interview flow based on experience level, position, company, and interview type
 */
export class PromptEngineer {
    constructor(resumeData = null, companyInfo = null, duration = 30, experienceLevel = 'Entry') {
        this.resumeData = resumeData;
        this.companyInfo = companyInfo || {
            name: 'General Tech Company',
            type: 'startup', // startup, enterprise, unicorn, faang
            industry: 'technology',
            role: 'Software Development Engineer',
            level: 'Entry level' // Entry, Mid, Senior, Lead, Principal
        };
        
        this.interviewContext = {
            startTime: new Date().getTime(),
            currentTime: new Date().getTime(),
            questionHistory: [],
            candidateResponses: [],
            toneAnalysis: [],
            companyResearch: null,
            interviewType: 'Technical', // Technical, HR, technical + hr
            currentPhase: 'introduction', // introduction, technical_discussion, behavioral, closing
            duration: duration * 60 * 1000,
            experienceLevel: experienceLevel // Auto-detected from resume or provided
        };
    }

    setInterviewType(interviewType) {
        this.interviewContext.interviewType = interviewType;
        this.interviewContext.currentPhase = 'introduction';
    }

    setDuration(duration) {
        this.interviewContext.duration = duration * 60 * 1000;
    }

    setResumeData(resumeData) {
        this.resumeData = resumeData;
        // Auto-detect experience level from resume
        if (resumeData && resumeData.rawText) {
            this.interviewContext.experienceLevel = this.detectExperienceLevel(resumeData.rawText);
        }
    }

    setCompanyInfo(companyInfo) {
        this.companyInfo = {
            name: companyInfo.name || 'General Tech Company',
            type: companyInfo.type || 'startup',
            industry: companyInfo.industry || 'technology',
            role: companyInfo.role || 'Software Development Engineer',
            level: companyInfo.level || 'Entry-level'
        };
    }

    updateContext(newContext) {
        this.interviewContext.currentRound = newContext.currentRound;
        if(newContext.currentQuestion) this.interviewContext.questionHistory.push(newContext.currentQuestion);
       if(newContext.transcript) this.interviewContext.candidateResponses.push(newContext.transcript);
       if(newContext.toneMetrics) this.interviewContext.toneAnalysis.push(newContext.toneMetrics);
        // Update current time for time tracking
        this.interviewContext.currentTime = new Date().getTime();
    }

    /**
     * Calculate remaining time in minutes
     */
    getRemainingTime() {
        const elapsedTime = this.interviewContext.currentTime - this.interviewContext.startTime;
        const remainingTime = this.interviewContext.duration - elapsedTime;
        return Math.max(0, Math.floor(remainingTime / (60 * 1000))); // Convert to minutes
    }

    /**
     * Check if interview should start wrapping up (less than 2 minutes remaining)
     */
    shouldWrapUp() {
        return this.getRemainingTime() < 2;
    }

    /**
     * Get time-based flow instructions
     */
    getTimeBasedFlowInstructions() {
        const remainingTime = this.getRemainingTime();
        const shouldWrapUp = this.shouldWrapUp();
        
        if (shouldWrapUp) {
            return `**TIME-BASED FLOW CONTROL - WRAPPING UP:**
- **Remaining Time**: ${remainingTime} minutes
- **Action Required**: Start wrapping up the interview gradually.
- **Current Phase**: Should transition to 'closing' phase
- **Instructions**: 
  * If not in closing phase, transition immediately to closing
  * Ask final questions about candidate's goals and expectations
  * Allow candidate to ask questions about the company/role
  * Provide brief closing remarks
  * Do NOT start new technical or behavioral questions
  * Focus on concluding the interview professionally`;
        } else {
            return `**TIME-BASED FLOW CONTROL - CONTINUING:**
- **Remaining Time**: ${remainingTime} minutes
- **Action Required**: Continue with normal interview flow
- **Phase Progression**: Continue through phases naturally based on interview type
- **Instructions**:
  * Continue with appropriate questions for current phase
  * Progress to next phase when appropriate
  * Maintain interview flow and timing
  * Monitor time and prepare for wrap-up when approaching 2 minutes remaining`;
        }
    }

    /**
     * Update interview phase based on time and context
     */
    updatePhaseBasedOnTime() {
        if (this.shouldWrapUp() && this.interviewContext.currentPhase !== 'closing') {
            this.interviewContext.currentPhase = 'closing';
        }
    }

    /**
     * Get current interview time status
     */
    getTimeStatus() {
        const remainingTime = this.getRemainingTime();
        const shouldWrapUp = this.shouldWrapUp();
        const elapsedTime = Math.floor((this.interviewContext.currentTime - this.interviewContext.startTime) / (60 * 1000));
        
        return {
            remainingTime,
            shouldWrapUp,
            elapsedTime,
            totalDuration: Math.floor(this.interviewContext.duration / (60 * 1000)),
            currentPhase: this.interviewContext.currentPhase
        };
    }

   
    /**
     * Generate the main system prompt for the AI interviewer
     */
    generateSystemPrompt() {
        const basePrompt = this.getBaseSystemPrompt();
        const companyContext = this.getCompanyContext();
        const resumeContext = this.getResumeContext();
        const interviewTypeContext = this.getInterviewTypeContext();
        const researchInstructions = this.getResearchInstructions();
        const responseRules = this.getResponseRules();

        return ` ${basePrompt}

${companyContext}

${resumeContext}

${interviewTypeContext}

${researchInstructions}

${responseRules}`;
    }

    /**
     * Alias for generateSystemPrompt for backward compatibility
     */
    getSystemPrompt() {
        return this.generateSystemPrompt();
    }

    /**
     * Get base system prompt with enhanced intelligence
     */
    getBaseSystemPrompt() {
        return `You are an expert interviewer conducting a realistic job interview.

**CRITICAL RESPONSE FORMAT - YOU MUST FOLLOW THIS EXACTLY:**

You MUST respond with ONLY a JSON object like this:
{
  "NEXT_QUESTION": "Your direct question to ask the candidate - clean and professional",
  "FEEDBACK": "Your internal evaluation of their previous response - honest and detailed"
}

**STRICT RULES:**
1. **NEXT_QUESTION field**: This will be displayed directly to the user. Make it:
   - Direct and clear
   - Professional and complete
   - No thinking text, no explanations
   - Just the question you want to ask
   - Include any brief encouragement if needed

2. **FEEDBACK field**: This is for internal analysis only. Make it:
   - Honest and detailed
   - Include technical assessment
   - Include communication evaluation
   - Include confidence/stress analysis
   - Don't hesitate to be critical for improvement

**NO THINKING TEXT, NO EXPLANATIONS, NO VERBOSE RESPONSES**
**ONLY THE JSON OBJECT WITH NEXT_QUESTION AND FEEDBACK**

**Your Capabilities:**
- Real-time research for company-specific questions
- Adaptive difficulty based on candidate performance
- Professional interview conduct
- Intelligent clarification handling without revealing answers

**Remember**: The NEXT_QUESTION is what the candidate sees. Make it perfect.`;
    }

    /**
     * Get company context for targeted interviews
     */
    getCompanyContext() {
        const { name, type, industry, role, level } = this.companyInfo;
        const { experienceLevel } = this.interviewContext;
        
        const companyTypeDescription = {
            'startup': 'fast-paced, innovative, hands-on, resource-constrained, Development skiils focused',
            'FAANG': 'rigorous, algorithm-focused, large-scale, high-standards, More focus on problem solving like codeforces, leetcode, etc.'
        };

        const levelDescription = {
            'Entry': 'fundamental concepts, basic problem-solving, learning potential',
            'Mid': 'practical experience, system design, technical depth',
            'Senior': 'leadership, architecture, mentorship, strategic thinking',
            'Lead': 'team leadership, technical direction, project management',
            'Principal': 'technical strategy, innovation, organizational impact'
        };
        
        return `**Target Company Context:**
- Company: ${name}
- Type: ${type} (${companyTypeDescription[type] || 'general tech company like google, uber, amazon etc.'})
- Industry: ${industry}
- Role: ${role}
- Level: ${level}
- Expected Experience: ${experienceLevel}

**Research Requirements:**
1. **Company-Specific Research**: Research ${name}'s actual interview process, question patterns, and evaluation criteria
2. **Industry Standards**: Understand current ${industry} industry interview trends for ${role} positions
3. **Company Culture**: Adapt your interview style to match ${name}'s culture and values
4. **Question Database**: Access real interview questions asked at ${name} and similar companies
5. **Difficulty Standards**: Research the typical difficulty level for ${level} positions at ${type} companies

**Adaptation Guidelines:**
- **Company Type**: ${type === 'startup' ? 'Focus on practical problem-solving, adaptability, and hands-on skills. Ask about rapid prototyping, resource constraints, and innovation.' : type === 'enterprise' ? 'Emphasize scalability, process optimization, and large-scale system design. Ask about best practices, standards, and enterprise considerations.' : type === 'faang' ? 'Focus on algorithmic thinking, system design ONLY AT POSITIONS SENIOR AND LEAD AND PRINCIPAL, and technical depth. Ask about optimization, scalability, and technical excellence.' : 'Balance technical rigor with practical application.'}
- **Experience Level**: ${levelDescription[experienceLevel] || 'Adapt to candidate\'s background. Dont aksk system design questions at entry level. Only ask just basics of system design.'}`;
    }

    /**
     * Get resume context for personalized questions
     */
    getResumeContext() {
        if (!this.resumeData || !this.resumeData.rawText) {
            return `**Candidate Background:** No resume provided. Research general questions suitable for ${this.companyInfo.role} at ${this.interviewContext.experienceLevel} level.`;
        }

        const { name, rawText } = this.resumeData;
        
        return `**Candidate Background:**
- Name: ${name || 'Not specified'}
- Experience Level: ${this.interviewContext.experienceLevel}
- Full Resume Content: ${rawText}

**AI-Powered Analysis Instructions:**
- **Auto-analyze** the complete resume content to validate experience level assessment
- **Auto-identify** their technical strengths, weaknesses, and background
- **Auto-determine** appropriate starting difficulty based on their experience and skills
- **Research** questions relevant to their specific skills and technologies mentioned in the resume
- **Adapt** question progression based on their background strength areas
- **No manual categorization** - let AI intelligence handle all determinations

**Experience Level Intelligence:**
- Validate experience level based on years of experience, project complexity, leadership roles, and technical depth
- Research appropriate question difficulty for their experience level
- Adapt interview style to match their background and confidence level
- Continuously reassess and adjust based on their performance

**Resume Analysis Focus:**
- Look for programming languages, frameworks, and technologies mentioned
- Identify project types and complexity levels
- Note any leadership or senior roles
- Consider education and certifications
- Analyze work history and company types
- Use the complete resume text for comprehensive analysis`;
    }

    /**
     * Get interview type specific context
     */
    getInterviewTypeContext() {
        const { interviewType, currentPhase, experienceLevel } = this.interviewContext;
        const { name, type, role } = this.companyInfo;
        
        // Update phase based on time
        this.updatePhaseBasedOnTime();
        
        const interviewTypeStrategies = {
            'dsa': {
                phases: {
                    'introduction': 'Welcome candidate and ask for brief introduction. Focus on DSA and problem-solving skills',
                    'technical_discussion': 'Conduct intensive DSA assessment with coding problems, algorithms, data structures, and problem-solving questions. Focus heavily on problem-solving approach and coding skills',
                    'behavioral': 'Ask behavioral questions related to problem-solving approach, teamwork in technical projects, and handling technical challenges',
                    'closing': 'Allow candidate to ask questions and provide closing remarks. Ask about their problem-solving philosophy and technical goals'
                },
                research: `Research "${name} DSA interview questions ${role}" and "${type} companies coding problems 2024"`,
                focus: 'DSA skills, problem-solving approach, coding ability, algorithm thinking, data structure knowledge'
            },
            'resume_cs': {
                phases: {
                    'introduction': 'Welcome candidate and ask for brief introduction based on their resume',
                    'technical_discussion': 'Conduct resume-based technical discussion including CS fundamentals, projects mentioned in resume, and some DSA questions. Focus on understanding their technical background and projects',
                    'behavioral': 'Ask behavioral questions about their projects, teamwork, challenges faced, and learning experiences',
                    'closing': 'Allow candidate to ask questions and provide closing remarks. Ask about their career goals and learning aspirations'
                },
                research: `Research "${name} technical interview questions ${role}" and "CS fundamentals interview questions"`,
                focus: 'Resume-based questions, CS fundamentals, project experience, some DSA, technical depth'
            },
            'technical_hr': {
                phases: {
                    'introduction': 'Welcome candidate and ask for brief introduction',
                    'technical_discussion': 'Conduct moderate technical assessment with some coding questions and technical concepts',
                    'behavioral': 'Conduct comprehensive HR/behavioral assessment using STAR method, cultural fit questions, and soft skills evaluation',
                    'closing': 'Allow candidate to ask questions and provide closing remarks. Discuss next steps and company culture'
                },
                research: `Research "${name} interview questions ${role}" and "${name} company culture and values"`,
                focus: 'Balanced technical and HR assessment, cultural fit, soft skills, moderate technical skills'
            }
        };

        const strategy = interviewTypeStrategies[interviewType] || interviewTypeStrategies['Technical + HR'];
        
        return `**${interviewType} Interview Strategy:**
- **Current Phase**: ${currentPhase}
- **Phase Description**: ${strategy.phases[currentPhase] || 'Adaptive phase'}

**Interview Flow:**
${Object.entries(strategy.phases).map(([phase, description]) => `- **${phase.replace('_', ' ').toUpperCase()}**: ${description}`).join('\n')}

**Research Requirements**: ${strategy.research}
**Focus Areas**: ${strategy.focus}

**Experience Level Adaptation**: ${experienceLevel} level candidates should be assessed with appropriate complexity and depth

**Natural Interview Flow:**
- Progress naturally through phases based on candidate responses and follow up questions.
- Adapt question difficulty based on real-time performance
- Maintain professional interview atmosphere
- Research company-specific questions and practices

${this.getTimeBasedFlowInstructions()}`;
    }

    /**
     * Get research instructions for AI intelligence
     */
    getResearchInstructions() {
        const { interviewType, experienceLevel } = this.interviewContext;
        const { name, type, role } = this.companyInfo;
        
        let researchPrompt = `**REAL-TIME RESEARCH INSTRUCTIONS:**

**Before Each Interview:**
1. **Company Research**: Search for "${name} interview questions ${role}" to understand their actual interview process
2. **Industry Research**: Research "${this.companyInfo.industry} interview trends 2024" for current best practices
3. **Role Research**: Search for "${role} interview questions ${experienceLevel} level" to understand appropriate difficulty
4. **Company Type Research**: Research "${type} companies interview process 2024" for company-type specific patterns`;

        if (interviewType === 'dsa') {
            researchPrompt += `
5. **DSA Research**: Search for "${name} DSA interview questions" and "${type} companies coding problems 2024"
6. **Problem Solving Research**: Research "${name} problem solving questions" for ${experienceLevel} level
7. **Algorithm Research**: Find DSA problems appropriate for ${experienceLevel} level candidates`;
        } else if (interviewType === 'resume_cs') {
            researchPrompt += `
5. **Resume Research**: Search for "${name} technical interview questions" based on candidate's resume
6. **CS Fundamentals Research**: Research "CS fundamentals interview questions for ${role}"
7. **Project Research**: Research questions about projects and technologies mentioned in resume`;
        } else if (interviewType === 'technical_hr') {
            researchPrompt += `
5. **Technical Research**: Search for "${name} technical interview questions"
6. **HR Research**: Search for "${name} behavioral interview questions" and "${name} company culture"
7. **Balanced Assessment**: Research "${name} interview process ${role}"`;
        }

        researchPrompt += `

**During Interview:**
1. **Dynamic Categorization**: Automatically determine appropriate question types based on interview phase
2. **Difficulty Assessment**: Continuously evaluate if questions are too easy, appropriate, or too hard for ${experienceLevel} level
3. **Progression Logic**: Research appropriate follow-up questions based on candidate performance
4. **Company Alignment**: Ensure questions align with ${name}'s actual interview style
5. **Clarification Intelligence**: Automatically detect and appropriately respond to all candidate requests

**Question Intelligence**: 
- **Auto-determine** the appropriate question category and difficulty level
- **Research** similar questions asked at ${name} or similar companies
- **Adapt** question style to match company culture and interview approach
- **Progressive** difficulty adjustment based on real-time performance analysis
- **Intelligent clarification handling** - respond appropriately to any candidate request without revealing answers`;

        return researchPrompt;
    }

    /**
     * Get enhanced response rules with strict answer protection
     */
    getResponseRules() {
        return `**CRITICAL RESPONSE RULES - NEVER REVEAL ANSWERS:**

**ABSOLUTE PROHIBITIONS:**
- ❌ NEVER provide complete solutions or answers to technical questions
- ❌ NEVER give away the "correct" approach when asked for clarification
- ❌ NEVER share interview evaluation criteria or scoring during the interview
- ❌ NEVER reveal what the "perfect" answer would be
- ❌ NEVER give direct feedback on answer correctness during the interview
- ❌ NEVER provide code solutions, algorithms, or implementation details
- ❌ NEVER confirm or deny if their approach is "right" or "wrong"

**HINT STRATEGY (Minimal and Strategic):**
- ✅ Provide ONLY the most minimal hint possible when candidate is completely stuck
- ✅ Hints should be general direction, not specific solutions
- ✅ Example: "Think about the time complexity" instead of "Use a hash map"
- ✅ Maximum 1 hint per question, only when absolutely necessary
- ✅ If candidate asks for more hints, politely redirect: "I'd like to see your approach first"

**DISCUSSION STYLE (Like Real Interviewer):**
- **For Technical Questions**: Have proper discussion about approaches, complexity, trade-offs, and implementation. If at any point the candidate seems underconfident then aks follow up questions to understand their thinking process.
 - **For Behavioral Questions**: Use STAR method, ask for specific examples and outcomes
- **For System Design**: Discuss requirements, constraints, trade-offs, and scalability
- **Always**: Ask follow-up questions to understand their thinking process
- **Never**: Give away solutions or confirm correctness

**CLARIFICATION INTELLIGENCE:**
- **Auto-detect** all types of clarification requests (help requests, answer requests, confirmation requests, etc.)
- **Intelligently respond** to each request type appropriately without revealing answers
- **Professional redirection** when candidates ask for solutions or confirmations
- **Encouraging guidance** when candidates need direction but not answers
- **Maintain interview flow** while handling all requests naturally

**ALWAYS DO:**
- Ask one question at a time
- Provide minimal, encouraging feedback without revealing answers
- Ask follow-up questions to understand their thinking process. if it is coding problem then ask them to explain their approach and then ask follow up questions to understand their thinking process.
- Redirect to the next question when they ask for solutions
- Maintain professional interview atmosphere
- Research and adapt to company-specific interview patterns
- Handle all clarification requests intelligently and naturally

**When Candidate Asks for Clarification:**
- **Auto-detect** the type of request (help, answer, confirmation, etc.)
- **Provide appropriate response** based on request type
- **Never reveal answers** regardless of request type
- **Maintain professional tone** while redirecting appropriately
- **Encourage independent thinking** in all responses

**When Candidate Asks for the Answer:**
- Politely decline: "I'd like to understand your approach first"
- Encourage them to work through it: "Let's see how you would solve this"
- Redirect: "What's your initial thought on this problem?"
- If they persist: "In a real interview, you'd need to work through this independently"

**Feedback Format:**
- Keep feedback totaly honest according to the analysis.
- Focus on process, not correctness
- Dont hasitate to give negative feedback so that the candidate could be assisted properly.`;
    }

    /**
     * Generate intelligent question prompt with research capabilities
     */
    generateQuestionPrompt(context = {}) {
        const { transcript, toneMetrics, round } = context;
        const { interviewType, currentPhase, experienceLevel } = this.interviewContext;
        const { name, type, role } = this.companyInfo;
        
        // Update phase based on time
        this.updatePhaseBasedOnTime();
        
        let prompt = `**GENERATE NEXT INTERVIEW QUESTION**

**Context:**
- Company: ${name} (${type})
- Role: ${role} (${experienceLevel} level)
- Interview Type: ${interviewType}
- Current Phase: ${currentPhase}
- Round: ${round || this.interviewContext.currentRound + 1}
- Previous Question: "${this.interviewContext.questionHistory[this.interviewContext.questionHistory?.length - 1] || 'First question'}"
- Candidate's Response: "${transcript || 'No response yet'}"
- Tone Analysis: ${this.formatToneAnalysis(toneMetrics)}

**Evaluation Instructions:**
1. Analyze the candidate's previous response
2. Assess their technical understanding, communication, and confidence
3. Consider their experience level and performance
4. Determine appropriate next question difficulty and type

**Question Requirements:**
- Research ${name}'s actual interview questions for ${role}
- Adapt to ${experienceLevel} level difficulty
- Match ${interviewType} interview style
- Consider candidate's performance and tone metrics
- Ask ONE clear, direct question

**RESPONSE FORMAT - JSON ONLY:**
{
  "NEXT_QUESTION": "Your direct question to ask the candidate",
  "FEEDBACK": "Your internal evaluation of their previous response"
}

**CRITICAL**: The NEXT_QUESTION field will be displayed directly to the user. Make it clean, professional, and complete. No thinking text, no explanations.`;

        return prompt;
    }

    /**
     * Generate final summary prompt
     */
    generateFinalSummaryPrompt() {
        const { interviewType, experienceLevel } = this.interviewContext;
        const {questionHistory, toneAnalysis, candidateResponses} = this.interviewContext;
        const { name, role } = this.companyInfo;
        
        let prompt = `**FINAL INTERVIEW SUMMARY AND FEEDBACK**

**Interview Context:**
- Company: ${name}
- Role: ${role}
- Experience Level: ${experienceLevel}
- Interview Type: ${interviewType}
- Total Rounds: ${questionHistory.length}

**Session Data:**
${this.formatSessionData(questionHistory)}

**Summary Requirements:
Carefully analyse all the response and tone matrx for each question and based on the technical knowledge, and the tone judge the candidate.
Give the feedback according to the analysis.**`;

        if (interviewType === 'Technical') {
            prompt += `
1. **Technical Skills**: Evaluate their problem-solving approach and technical understanding
2. **Coding Ability**: Assess their programming skills and algorithmic thinking
3. **System Design**: Evaluate their system design and architecture thinking
4. **Learning Potential**: Assess their ability to learn and adapt during the interview`;
        } else if (interviewType === 'HR') {
            prompt += `
1. **Behavioral Competencies**: Evaluate their responses using STAR method
2. **Cultural Fit**: Assess alignment with ${name}'s values and culture
3. **Soft Skills**: Evaluate communication, teamwork, and leadership skills
4. **Career Goals**: Assess their motivation and career aspirations`;
        } else if (interviewType === 'Technical + HR') {
            prompt += `
1. **Technical Assessment**: Evaluate their technical skills and problem-solving ability
2. **Soft Skills**: Assess their communication, teamwork, and cultural fit
3. **Overall Potential**: Evaluate their suitability for the role and company
4. **Growth Potential**: Assess their learning ability and career trajectory`;
        }

        prompt += `

**Provide a comprehensive summary including:**
- Overall assessment of the candidate
- Strengths and areas for improvement
- Specific examples from the interview
- Recommendations for next steps
- Cultural fit assessment for ${name}
- Suitability for ${role} position at ${experienceLevel} level

**Format the response professionally as a real interview summary.**`;

        return prompt;
    }

    /**
     * Format tone analysis for prompts
     */
    formatToneAnalysis(toneMetrics) {
        if (!toneMetrics) return 'Not available';
        
        const metrics = Object.entries(toneMetrics)
            .map(([key, value]) => `${key}: ${Math.round(value * 100)}%`)
            .join(', ');
        
        return metrics;
    }

    /**
     * Format session data for prompts
     */
    formatSessionData(sessionData) {
        return sessionData.map((entry, index) => {
            const round = index + 1;
            const question = entry.question || 'No question';
            const transcript = entry.transcript || 'No response';
            const category = entry.questionCategory || 'Not categorized';
            
            return `Round ${round}:
- Question: ${question}
- Response: ${transcript}
- Category: ${category}`;
        }).join('\n\n');
    }
} 