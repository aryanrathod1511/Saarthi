import { ask } from './gemini.js';

class ComprehensiveFeedbackService {
    async generateComprehensiveFeedback(interviewData, allEvaluations) {
        try {
            const feedbackPrompt = this.buildComprehensiveFeedbackPrompt(interviewData, allEvaluations);
            const comprehensiveFeedback = await ask(feedbackPrompt);
            
            return this.parseComprehensiveFeedback(comprehensiveFeedback);
        } catch (error) {
            console.error('Error generating comprehensive feedback:', error);
            return this.generateFallbackFeedback(interviewData, allEvaluations);
        }
    }

    buildComprehensiveFeedbackPrompt(interviewData, allEvaluations) {
        const { companyInfo, resumeData } = interviewData;
        const { name, role } = companyInfo;
        const candidateName = resumeData?.name || 'the candidate';
        
        const totalProblems = allEvaluations.length;
        const averageScore = allEvaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / totalProblems;
        const highestScore = Math.max(...allEvaluations.map(evaluation => evaluation.score));
        const lowestScore = Math.min(...allEvaluations.map(evaluation => evaluation.score));
        
        const allStrengths = allEvaluations.flatMap(evaluation => evaluation.strengths);
        const allWeaknesses = allEvaluations.flatMap(evaluation => evaluation.weaknesses);
        
        return `You are a senior technical interviewer providing comprehensive feedback for a DSA interview.

**Interview Context:**
- Company: ${name} | Role: ${role}
- Candidate: ${candidateName}
- Problems Attempted: ${totalProblems}
- Average Score: ${averageScore.toFixed(1)}/50
- Score Range: ${lowestScore}-${highestScore}/50

**Problem Evaluations:**
${allEvaluations.map((evaluation, index) => `
Problem ${index + 1}: ${evaluation.score}/50
- Feedback: ${evaluation.overallFeedback}
- Strengths: ${evaluation.strengths.join(', ')}
- Weaknesses: ${evaluation.weaknesses.join(', ')}
`).join('\n')}

**Common Strengths:** ${[...new Set(allStrengths)].slice(0, 5).join(', ')}
**Common Weaknesses:** ${[...new Set(allWeaknesses)].slice(0, 5).join(', ')}

**Generate comprehensive feedback report with:**
1. Executive Summary (overall assessment, recommendation)
2. Technical Skills Assessment (algorithmic thinking, code quality, complexity analysis)
3. Communication Skills (clarity, technical communication)
4. Problem-Solving Methodology (approach, debugging, adaptability)
5. Specific Strengths (5-7 with examples)
6. Areas for Improvement (5-7 with actionable suggestions)
7. Recommendations (resources, practice areas, timeline, next steps)
8. Overall Ratings (technical, problem-solving, communication, overall: 1-10 each)

**Response Format (JSON only):**
{
  "executiveSummary": {
    "overallAssessment": "<assessment>",
    "keyStrengths": ["<strength>"],
    "primaryWeaknesses": ["<weakness>"],
    "recommendation": "<Strong Yes/Yes/Maybe/No>",
    "reasoning": "<explanation>"
  },
  "technicalAssessment": {
    "algorithmicThinking": "<assessment>",
    "codeQuality": "<assessment>",
    "complexityAnalysis": "<assessment>",
    "edgeCaseHandling": "<assessment>"
  },
  "communicationAssessment": {
    "clarity": "<assessment>",
    "technicalCommunication": "<assessment>",
    "thoughtProcess": "<assessment>"
  },
  "problemSolvingAssessment": {
    "approach": "<assessment>",
    "debugging": "<assessment>",
    "adaptability": "<assessment>"
  },
  "specificStrengths": ["<strength>"],
  "areasForImprovement": ["<area>"],
  "recommendations": {
    "resources": ["<resource>"],
    "practiceAreas": ["<area>"],
    "timeline": "<timeline>",
    "nextSteps": ["<step>"]
  },
  "ratings": {
    "technicalSkills": <1-10>,
    "problemSolving": <1-10>,
    "communication": <1-10>,
    "overall": <1-10>
  }
}

Be thorough, professional, and constructive. Provide specific, actionable feedback.`;
    }

    parseComprehensiveFeedback(response) {
        try {
            const responseText = typeof response === 'string' ? response : JSON.stringify(response);
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            return this.generateFallbackFeedback();
        } catch (error) {
            console.error('Error parsing comprehensive feedback:', error);
            return this.generateFallbackFeedback();
        }
    }

    generateFallbackFeedback(interviewData = {}, allEvaluations = []) {
        const averageScore = allEvaluations.length > 0 
            ? allEvaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / allEvaluations.length 
            : 25;
        
        return {
            executiveSummary: {
                overallAssessment: "Interview completed with mixed results",
                keyStrengths: ["Completed all problems", "Showed engagement"],
                primaryWeaknesses: ["Need more detailed analysis"],
                recommendation: "Maybe",
                reasoning: "Requires more detailed evaluation"
            },
            technicalAssessment: {
                algorithmicThinking: "Needs assessment",
                codeQuality: "Needs assessment",
                complexityAnalysis: "Needs assessment",
                edgeCaseHandling: "Needs assessment"
            },
            communicationAssessment: {
                clarity: "Needs assessment",
                technicalCommunication: "Needs assessment",
                thoughtProcess: "Needs assessment"
            },
            problemSolvingAssessment: {
                approach: "Needs assessment",
                debugging: "Needs assessment",
                adaptability: "Needs assessment"
            },
            specificStrengths: ["Interview participation"],
            areasForImprovement: ["Detailed feedback needed"],
            recommendations: {
                resources: ["Practice DSA problems"],
                practiceAreas: ["Algorithmic thinking"],
                timeline: "3-6 months",
                nextSteps: ["Practice regularly", "Review fundamentals"]
            },
            ratings: {
                technicalSkills: Math.floor(averageScore / 5),
                problemSolving: Math.floor(averageScore / 5),
                communication: 5,
                overall: Math.floor(averageScore / 5)
            }
        };
    }
}

export default new ComprehensiveFeedbackService();