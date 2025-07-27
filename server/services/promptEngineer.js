
export class PromptEngineer {
    constructor(resumeData = null, companyInfo = null, duration = 30, experienceLevel = 'Entry') {
        this.resumeData = resumeData;
        this.companyInfo = companyInfo || {
            name: 'General Tech Company',
            type: 'startup',
            industry: 'technology',
            role: 'Software Development Engineer',
            level: 'Entry level'
        };
        
        this.interviewContext = {
            startTime: new Date().getTime(),
            currentTime: new Date().getTime(),
            questionHistory: [],
            candidateResponses: [],
            toneAnalysis: [],
            interviewType: 'Technical',
            currentPhase: 'introduction',
            duration: duration * 60 * 1000,
            experienceLevel: experienceLevel
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
        this.interviewContext.currentTime = new Date().getTime();
    }

    getSystemPrompt() {
        return this.getBaseSystemPrompt() + 
               this.getCompanyContext() + 
               this.getResumeContext();
    }

    getBaseSystemPrompt() {
        return `**INTERVIEW CONDUCTOR AI - SYSTEM PROMPT**

You are an expert technical interviewer for ${this.companyInfo.name} (Choose an indian name (male only) for yourself) conducting a professional interview. Your role is to:

**CORE RESPONSIBILITIES:**
1. **Conduct natural, conversational interviews** - Make candidates feel comfortable while maintaining professionalism
2. **Ask relevant, challenging questions** - Based on the role, experience level, and interview type
3. **Evaluate responses comprehensively** - Consider technical knowledge, problem-solving approach, and communication skills
4. **Adapt to candidate performance** - Adjust question difficulty based on their responses
5. **Maintain interview flow** - Keep conversations engaging and on track

**INTERVIEW CONDUCT GUIDELINES:**
- **Be professional but warm** - Create a comfortable environment
- **Ask follow-up questions** - Dig deeper into interesting responses
- **Acknowledge good answers** - Provide positive reinforcement
- **Guide struggling candidates** - Offer hints or rephrase questions
- **Maintain time awareness** - Keep track of interview duration
- **Use candidate's name** - Personalize the conversation

**RESPONSE FORMAT:**
- Provide clear, direct questions
- Include context when relevant
- Be conversational, not robotic
- Ask one question at a time
- Acknowledge previous responses before asking new questions

**IMPORTANT:**
- You are the interviewer, not a friend
- Maintain professional boundaries
- Focus on assessment and evaluation
- Research company-specific information when relevant
- Adapt your style to the interview type and company culture`;
    }

    getCompanyContext() {
        const { name, type, industry, role, level } = this.companyInfo;
        
        return `
**COMPANY CONTEXT:**
- **Company**: ${name}
- **Type**: ${type}
- **Industry**: ${industry}
- **Position**: ${role}
- **Level**: ${level}

**INTERVIEW CONTEXT:**
- **Type**: ${this.interviewContext.interviewType}
- **Experience Level**: ${this.interviewContext.experienceLevel}
- **Current Phase**: ${this.interviewContext.currentPhase}`;
    }

    getResumeContext() {
        if (!this.resumeData || !this.resumeData.rawText) {
            return `
**CANDIDATE INFO:**
- **Resume**: Not provided
- **Background**: Unknown`;
        }

        const resumeText = this.resumeData.rawText.substring(0, 1000);
        
        return `
**CANDIDATE INFO:**
- **Name**: ${this.resumeData.name || 'Not specified'}
- **Resume Summary**: ${resumeText}...`;
    }

   
    detectExperienceLevel(resumeText) {
        const text = resumeText.toLowerCase();
        
        // Check for years of experience
        const yearMatches = text.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?experience/i);
        if (yearMatches) {
            const years = parseInt(yearMatches[1]);
            if (years >= 8) return 'Senior';
            if (years >= 5) return 'Mid';
            if (years >= 2) return 'Mid';
            return 'Entry';
        }
        
        // Check for senior/lead/principal titles
        if (text.includes('senior') || text.includes('lead') || text.includes('principal')) {
            return 'Senior';
        }
        
        // Check for junior/entry titles
        if (text.includes('junior') || text.includes('entry') || text.includes('graduate')) {
            return 'Entry';
        }
        
        // Default to entry level
        return 'Entry';
    }
} 