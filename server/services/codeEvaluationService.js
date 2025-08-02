import { ask } from "./gemini.js";

class CodeEvaluationService {
    constructor() {
        this.evaluationCriteria = {
            correctness: "Does the code produce the correct output for all test cases including edge cases?",
            efficiency: "Is the time and space complexity optimal?",
            readability: "Is the code clean, well-structured, and easy to understand?",
            edgeCases: "Does the code handle edge cases and boundary conditions?",
            bestPractices: "Does the code follow language-specific best practices?"
        };
    }

    async evaluateCode(userCode, problem, language = 'java') {
        try {
            const evaluationPrompt = this.buildEvaluationPrompt(userCode, problem, language);
            const evaluation = await ask(evaluationPrompt);
            
            return this.parseEvaluationResponse(evaluation);
        } catch (error) {
            console.error('Error evaluating code:', error);
            return {
                score: 0,
                overallFeedback: "Error evaluating code. Please try again.",
                strengths: [],
                weaknesses: ["Unable to evaluate code due to system error"]
            };
        }
    }

    buildEvaluationPrompt(userCode, problem, language) {
        return `You are a senior software engineer evaluating a candidate's DSA solution.

**Problem:** ${problem.title}
**Description:** ${problem.description}
**Difficulty:** ${problem.difficulty}

**Candidate's Code (${language}):**
\`\`\`${language}
${userCode}
\`\`\`

**Evaluation Criteria:**
- Correctness (40%): Does it solve the problem correctly?
- Efficiency (25%): Is time/space complexity optimal?
- Code Quality (20%): Is it readable and well-structured?
- Edge Cases (10%): Does it handle boundary conditions?
- Best Practices (5%): Does it follow language conventions?

**Scoring:** 0-50 scale
- 40-50: Excellent, optimal solution
- 30-39: Good, minor issues
- 20-29: Average, needs improvement
- 10-19: Below average, significant issues
- 0-9: Poor, major errors

**Response Format (JSON only):**
{
  "score": <0-50>,
  "overallFeedback": "<comprehensive_feedback>",
  "strengths": ["<strength_1>", "<strength_2>"],
  "weaknesses": ["<weakness_1>", "<weakness_2>"]
}

Be thorough, constructive, and specific. Focus on algorithmic thinking and implementation quality.`;
    }

    parseEvaluationResponse(response) {
        try {
            const responseText = typeof response === 'string' ? response : JSON.stringify(response);
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                return {
                    score: Math.max(0, Math.min(50, parseInt(parsed.score) || 25)),
                    overallFeedback: parsed.overallFeedback || "No feedback provided",
                    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
                    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : []
                };
            }
            
            return this.fallbackParsing(responseText);
        } catch (error) {
            console.error('Error parsing evaluation response:', error);
            return this.fallbackParsing(typeof response === 'string' ? response : 'Invalid response format');
        }
    }

    fallbackParsing(response) {
        try {
            const responseText = typeof response === 'string' ? response : JSON.stringify(response);
            const scoreMatch = responseText.match(/score[:\s]*(\d+)/i);
            const extractedScore = scoreMatch ? parseInt(scoreMatch[1]) : 25;
            
            return {
                score: Math.max(0, Math.min(50, extractedScore)),
                overallFeedback: responseText.substring(0, 300) + "...",
                strengths: ["Code evaluation completed"],
                weaknesses: ["Unable to parse detailed feedback"]
            };
        } catch (error) {
            console.error('Error in fallback parsing:', error);
            return {
                score: 25,
                overallFeedback: "Unable to parse evaluation response",
                strengths: ["Evaluation attempted"],
                weaknesses: ["System error in parsing feedback"]
            };
        }
    }

    determineNextAction(score) {
        if (score >= 35) {
            return {
                action: 'nextProblem',
                reason: 'High score achieved - ready for next problem'
            };
        } else if (score >= 20) {
            return {
                action: 'followup',
                reason: 'Medium score - need followup questions'
            };
        } else {
            return {
                action: 'followup',
                reason: 'Low score - extensive followup needed'
            };
        }
    }
}

export default new CodeEvaluationService(); 