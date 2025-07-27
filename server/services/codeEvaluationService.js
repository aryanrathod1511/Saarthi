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
                feedback: "Error evaluating code. Please try again.",
                detailedAnalysis: {
                    correctness: "Unable to evaluate",
                    efficiency: "Unable to evaluate",
                    readability: "Unable to evaluate",
                    edgeCases: "Unable to evaluate",
                    bestPractices: "Unable to evaluate"
                },
                suggestions: [],
                timeComplexity: "Unable to determine",
                spaceComplexity: "Unable to determine"
            };
        }
    }

    buildEvaluationPrompt(userCode, problem, language) {
        return `You are an expert programming interviewer evaluating a candidate's solution to a DSA problem.

**PROBLEM DETAILS:**
Title: ${problem.title}
Description: ${problem.description}
Difficulty: ${problem.difficulty}
Topics: ${problem.topics.join(', ')}

**CANDIDATE'S CODE (${language.toUpperCase()}):**
\`\`\`${language}
${userCode}
\`\`\`

**EVALUATION TASK:**
Please provide a comprehensive evaluation of the candidate's code. Consider the following aspects:

1. **Correctness (60% weight)**: Does the code solve the problem correctly? Test with the provided examples and consider edge cases.

2. **Efficiency (10% weight)**: Analyze time and space complexity. Is it optimal for this problem?

3. **Code Quality (10% weight)**: Is the code readable, well-structured, and maintainable?

4. **Edge Cases (20% weight)**: Does the code handle boundary conditions and edge cases?

**RESPONSE FORMAT:**
Provide your evaluation in the following JSON format:

{
  "score": <overall_score_0_100>,
  "feedback": "<brief_overall_feedback>",
  "detailedAnalysis": {
    "correctness": "<analysis_of_correctness>",
    "efficiency": "<analysis_of_time_space_complexity>",
    "readability": "<analysis_of_code_quality>",
    "edgeCases": "<analysis_of_edge_case_handling>",
    "bestPractices": "<analysis_of_coding_practices>"
  },
  "suggestions": ["<suggestion_1>", "<suggestion_2>", ...],
  "timeComplexity": "<O(n) notation>",
  "spaceComplexity": "<O(n) notation>",
  "testCases": [
    {
      "input": "<test_input>",
      "expectedOutput": "<expected_output>",
      "actualOutput": "<what_code_would_produce>",
      "passed": <true/false>
    }
  ]
}

**IMPORTANT:**
- Be thorough but constructive in your feedback
- Provide specific suggestions for improvement
- Consider the problem's difficulty level when evaluating
- If the code has syntax errors, explain them clearly
- Suggest optimizations if applicable

Please provide your evaluation in valid JSON format only.`;
    }

    parseEvaluationResponse(response) {
        try {
            // Ensure response is a string
            const responseText = typeof response === 'string' ? response : JSON.stringify(response);
            
            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback parsing
            return this.fallbackParsing(responseText);
        } catch (error) {
            console.error('Error parsing evaluation response:', error);
            return this.fallbackParsing(typeof response === 'string' ? response : 'Invalid response format');
        }
    }

    fallbackParsing(response) {
        try {
            // Ensure response is a string
            const responseText = typeof response === 'string' ? response : JSON.stringify(response);
            
            // Extract key information from text response
            const scoreMatch = responseText.match(/score[:\s]*(\d+)/i);
            const timeComplexityMatch = responseText.match(/time.*complexity[:\s]*(O\([^)]+\))/i);
            const spaceComplexityMatch = responseText.match(/space.*complexity[:\s]*(O\([^)]+\))/i);
            
            return {
                score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
                feedback: responseText.substring(0, 200) + "...",
                detailedAnalysis: {
                    correctness: "Analysis not available",
                    efficiency: "Analysis not available",
                    readability: "Analysis not available",
                    edgeCases: "Analysis not available",
                    bestPractices: "Analysis not available"
                },
                suggestions: [],
                timeComplexity: timeComplexityMatch ? timeComplexityMatch[1] : "Unknown",
                spaceComplexity: spaceComplexityMatch ? spaceComplexityMatch[1] : "Unknown"
            };
        } catch (error) {
            console.error('Error in fallback parsing:', error);
            return {
                score: 50,
                feedback: "Unable to parse evaluation response",
                detailedAnalysis: {
                    correctness: "Analysis not available",
                    efficiency: "Analysis not available",
                    readability: "Analysis not available",
                    edgeCases: "Analysis not available",
                    bestPractices: "Analysis not available"
                },
                suggestions: [],
                timeComplexity: "Unknown",
                spaceComplexity: "Unknown"
            };
        }
    }

}

export default new CodeEvaluationService(); 