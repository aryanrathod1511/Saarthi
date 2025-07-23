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

    async generateFollowUpQuestion(evaluation, problem, userCode, currentQuestion = null) {
        try {
            const followUpPrompt = this.buildFollowUpPrompt(evaluation, problem, userCode, currentQuestion);
            const followUp = await ask(followUpPrompt);
            
            return this.parseFollowUpResponse(followUp);
        } catch (error) {
            console.error('Error generating follow-up question:', error);
            return {
                question: "Can you explain your approach to this problem?",
                type: "explanation",
                hints: []
            };
        }
    }

    buildFollowUpPrompt(evaluation, problem, userCode, currentQuestion = null) {
        const score = evaluation.score || 50;
        let questionType = "explanation";
        let focus = "";

        if (score < 30) {
            questionType = "guidance";
            focus = "The candidate's solution needs significant improvement. Ask guiding questions to help them understand the problem better.";
        } else if (score < 60) {
            questionType = "optimization";
            focus = "The candidate has a basic solution but it can be optimized. Ask about improving efficiency or handling edge cases.";
        } else if (score < 80) {
            questionType = "advanced";
            focus = "The candidate has a good solution. Ask about alternative approaches or more complex variations.";
        } else {
            questionType = "challenge";
            focus = "The candidate has an excellent solution. Challenge them with a harder variation or related problem.";
        }

        return `Based on the candidate's code evaluation, generate a follow-up question.

**PROBLEM:** ${problem.title}
**PROBLEM DESCRIPTION:** ${problem.description}
**CANDIDATE'S SCORE:** ${score}/100
**FOCUS:** ${focus}

${currentQuestion ? `**CURRENT QUESTION CONTEXT:**
- DSA Problem: "${problem.title} - ${problem.description}"
- AI Follow-up Question: "${currentQuestion}"
- The candidate submitted code in response to this question` : ''}

**CANDIDATE'S CODE:**
\`\`\`
${userCode}
\`\`\`

**EVALUATION SUMMARY:**
${evaluation.feedback}

Generate a follow-up question that:
1. Is appropriate for the candidate's current level (score: ${score})
2. Helps them improve or demonstrates deeper understanding
3. Is specific to their code and approach
4. Can be answered in 2-3 minutes
5. Continues the natural interview flow from the previous question
6. References both the DSA problem and their code solution

**RESPONSE FORMAT:**
{
  "question": "<the follow-up question>",
  "type": "${questionType}",
  "hints": ["<hint_1>", "<hint_2>"],
  "expectedAnswer": "<brief description of what a good answer would include>"
}

Make the question engaging and interview-like, continuing the conversation naturally while referencing the specific problem and their solution.`;
    }

    parseFollowUpResponse(response) {
        try {
            // Ensure response is a string
            const responseText = typeof response === 'string' ? response : JSON.stringify(response);
            
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            return {
                question: responseText.substring(0, 200) + "...",
                type: "explanation",
                hints: [],
                expectedAnswer: "A clear explanation of the approach"
            };
        } catch (error) {
            console.error('Error parsing follow-up response:', error);
            return {
                question: "Can you explain your approach to this problem?",
                type: "explanation",
                hints: [],
                expectedAnswer: "A clear explanation of the approach"
            };
        }
    }
}

export default new CodeEvaluationService(); 