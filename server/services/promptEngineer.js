
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
            duration: duration * 60 * 1000,
            experienceLevel: experienceLevel
        };
    }

    setInterviewType(interviewType) {
        this.interviewContext.interviewType = interviewType;
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