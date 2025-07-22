import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Check if API key is available
if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is not set in environment variables!");
    console.error("Please set your Google Gemini API key in a .env file:");
    console.error("GEMINI_API_KEY=your_api_key_here");
}

// Updated model endpoints - using current Gemini API models
const GEMINI_MODELS = [
    "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
    "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent",
    "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent"
];

let GEMINI_API_URL = GEMINI_MODELS[0]; // Start with the first model

// Enhanced system prompt with strict JSON format requirement
const systemPrompt = `You are an expert AI interviewer. Your ONLY job is to ask questions and evaluate responses.

**CRITICAL RESPONSE FORMAT - YOU MUST FOLLOW THIS EXACTLY:**

You MUST respond with ONLY a JSON object like this:
{
  "question": "Your direct question to ask the candidate",
  "feedback": "Your internal evaluation of their previous response"
}

**STRICT RULES:**
1. **question field**: This will be displayed directly to the user
   - Make it direct and clear
   - Professional and complete
   - NO thinking text, NO explanations
   - Just the question you want to ask and any statement you want to make to the candidate
   - Include any brief encouragement if needed

2. **feedback field**: This is for internal analysis only
   - Honest and detailed evaluation
   - Include technical assessment
   - Include communication evaluation
   - Include confidence/stress analysis
   - Be critical when needed for improvement

**ABSOLUTELY NO:**
- Thinking text like "Let me think about this..."
- Explanations of your process
- Verbose responses
- Multiple questions
- Any text outside the JSON object

**ONLY:**
- The JSON object with question and feedback fields
- Clean, professional questions
- Honest internal feedback

**Remember**: The question is what the candidate sees. Make it perfect.`;

export const ask = async(prompt, companyInfo = null) => {
    // Check if API key is available
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY in your environment variables.");
    }

    // Enhanced prompt with strict format requirements
    let enhancedPrompt = prompt;
    if (companyInfo) {
        enhancedPrompt = `**Company Context: ${companyInfo.name} (${companyInfo.type})**
**Role: ${companyInfo.role} (${companyInfo.level})**

${prompt}

**REMEMBER**: Respond with ONLY JSON containing question and feedback fields. NO thinking text, NO explanations.`;
    }

    const body = {
        contents: [
            {
                parts: [
                    { text: systemPrompt },
                    { text: enhancedPrompt }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent responses
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 1024, // Reduced for cleaner responses
        }
    };

    // Try different models if one fails
    for (let i = 0; i < GEMINI_MODELS.length; i++) {
        const currentUrl = GEMINI_MODELS[i];
        console.log(`Trying Gemini API with model ${i + 1}/${GEMINI_MODELS.length}: ${currentUrl.split('/').pop()}`);
        
        try {
            const response = await axios.post(`${currentUrl}?key=${GEMINI_API_KEY}`, body, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 45000
            });

            console.log("Gemini API response received successfully");
            
            if (!response.data.candidates || !response.data.candidates[0]) {
                throw new Error("Invalid response format from Gemini API");
            }

            const result = response.data.candidates[0].content.parts[0].text;

            // Enhanced parsing with better cleaning
            let question, feedback;
            
            // First, try to parse as JSON
            try {
                // Look for JSON structure
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const jsonResponse = JSON.parse(jsonMatch[0]);
                    question = jsonResponse.question || jsonResponse.NEXT_QUESTION || jsonResponse.next_question;
                    feedback = jsonResponse.feedback || jsonResponse.FEEDBACK;
                }
            } catch (jsonError) {
                console.log('JSON parsing failed, trying text parsing');
            }
            
            // If JSON parsing didn't work, try text-based parsing
            if (!question || !feedback) {
                // Look for question and feedback patterns
                if (result.includes('question:') && result.includes('feedback:')) {
                    const questionMatch = result.match(/question:\s*([\s\S]*?)(?=feedback:|$)/i);
                    const feedbackMatch = result.match(/feedback:\s*([\s\S]*?)$/i);
                    
                    if (questionMatch) question = questionMatch[1].trim();
                    if (feedbackMatch) feedback = feedbackMatch[1].trim();
                } else if (result.includes('"question"') && result.includes('"feedback"')) {
                    const questionMatch = result.match(/"question"\s*:\s*"([^"]*)"/i);
                    const feedbackMatch = result.match(/"feedback"\s*:\s*"([^"]*)"/i);
                    
                    if (questionMatch) question = questionMatch[1].trim();
                    if (feedbackMatch) feedback = feedbackMatch[1].trim();
                } else {
                    // Fallback: clean the response and use it as question
                    question = cleanResponse(result);
                    feedback = "Response parsed as question due to format issues.";
                }
            }

            // Clean the question to remove any thinking text
            question = cleanResponse(question);

            return {
                question: question ? question.trim() : "Please provide your response to continue the interview.",
                feedback: feedback ? feedback.trim() : "No specific feedback for this round."
            };
        } catch (error) {
            console.error(`Model ${i + 1} failed:`, error.message);
            
            if (i === GEMINI_MODELS.length - 1) {
                if (error.response) {
                    console.error("Response status:", error.response.status);
                    console.error("Response data:", error.response.data);
                    
                    if (error.response.status === 404) {
                        throw new Error("All Gemini API models failed. Please check your API key and ensure it's valid.");
                    } else if (error.response.status === 403) {
                        throw new Error("Access denied. Please check your API key permissions.");
                    } else if (error.response.status === 400) {
                        throw new Error("Bad request. Please check your prompt format.");
                    }
                } else if (error.request) {
                    throw new Error("No response received from Gemini API. Please check your internet connection.");
                } else {
                    throw new Error(`Gemini API error: ${error.message}`);
                }
            }
            continue;
        }
    }
}

// Helper function to clean responses
function cleanResponse(text) {
    if (!text) return "";
    
    // Remove common thinking patterns
    const thinkingPatterns = [
        /let me think about this/i,
        /let me analyze/i,
        /based on the context/i,
        /considering the candidate/i,
        /looking at their response/i,
        /i would ask/i,
        /my next question would be/i,
        /the next question is/i,
        /question:/i,
        /next question:/i
    ];
    
    let cleaned = text;
    thinkingPatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove extra whitespace and newlines
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // If the response starts with quotes, remove them
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    return cleaned;
}

export const buildPrompt = async(transcript, toneMetrics, companyInfo = null) => {
    const toneAnalysis = toneMetrics ? `
Tone Analysis:
- Confidence Level: ${toneMetrics.confidence || 'N/A'}/10
- Stress Level: ${toneMetrics.stress || 'N/A'}/10
- Engagement: ${toneMetrics.engagement || 'N/A'}/10
- Clarity: ${toneMetrics.clarity || 'N/A'}/10
- Speaking Pace: ${toneMetrics.pace || 'N/A'}/10
- Volume: ${toneMetrics.volume || 'N/A'}/10
` : '';

    const companyContext = companyInfo ? `
Company Context: ${companyInfo.name} (${companyInfo.type})
Role: ${companyInfo.role} (${companyInfo.level})
` : '';

    return `The candidate's response is: "${transcript}"

${companyContext}
${toneAnalysis}

**RESEARCH AND INTELLIGENCE TASKS:**
1. Research ${companyInfo ? companyInfo.name : 'current'} interview patterns for this response type
2. Auto-determine appropriate follow-up question category and difficulty
3. Adapt question style to match ${companyInfo ? companyInfo.name + "'s" : 'company'} culture
4. Auto-analyze candidate experience level from their response and background
5. Handle any clarification requests naturally within your response

Based on this response and tone analysis, please:
1. **Provide internal feedback** (for final analysis only - NOT for user display): Brief evaluation of their answer (technical accuracy, communication, confidence, specially tonematrics.)
2. Ask the next appropriate question that builds upon their response or explores a different area
3. Consider their confidence and stress levels when formulating your next question
4. Ensure the question aligns with real interview experiences
5. Auto-handle any clarification requests without revealing answers

If the candidate seems:
- Not confident: Research encouraging questions that build confidence
- Stressed: Research simpler, more approachable questions
- Very confident: Research challenging questions or edge cases
- Unclear: Research clarification techniques used in real interviews
- Asking for help/answers: Politely redirect while maintaining professional tone

Keep your response professional and constructive. Use real-time research to make this as accurate as possible. Auto-handle all clarification requests intelligently.

**IMPORTANT**: The internal feedback is for crafting the final comprehensive analysis, not for immediate user display. so be honest with the feedback, dont hesited to include negative points so the at the end candidate can improve his skills.`;
}

export const buildFinalSummaryPrompt = (sessionData, companyInfo = null) => {
    const companyContext = companyInfo ? `
**Company-Specific Analysis:**
- Target Company: ${companyInfo.name} (${companyInfo.type})
- Role: ${companyInfo.role} (${companyInfo.level})
- Research ${companyInfo.name}'s evaluation criteria and standards
` : '';

    let prompt = `Here's the complete interview session data. Please provide a comprehensive analysis and summary within 300-400 words including:

${companyContext}

Session Overview:
- Total Questions Asked: ${sessionData.length}
- Interview Duration: Based on timestamps

**RESEARCH-BASED ANALYSIS:**

1. **Experience Level Assessment** (20% weight)
   - Auto-analyze the candidate's actual experience level based on their performance
   - Compare their demonstrated skills against their resume background
   - Assess if the interview difficulty was appropriate for their level
   - Provide insights on their true experience level

2. **Company-Specific Assessment** (25% weight)
   - Research ${companyInfo ? companyInfo.name : 'target company'}'s evaluation criteria
   - Assess cultural alignment and fit
   - Compare against industry standards

3. **Technical Assessment** (30% weight)
   - Key strengths demonstrated
   - Areas needing improvement
   - Technical depth and breadth
   - Problem-solving approach

4. **Communication Skills** (15% weight)
   - Clarity of expression
   - Confidence level throughout interview
   - Response structure and organization

5. **Overall Evaluation** (10% weight)
   - Confidence score (1-10)
   - Technical proficiency score (1-10)
   - Communication score (1-10)
   - Cultural fit score (1-10)
   - Overall recommendation

6. **Specific Recommendations**
   - Immediate areas to focus on
   - Long-term development suggestions
   - Company-specific preparation advice

Session Data:
`;

    sessionData.forEach((round, i) => {
        prompt += `\n=== Round ${i + 1} ===\n`;
        if (round.question) prompt += `Question: ${round.question}\n`;
        if (round.transcript) prompt += `Answer: ${round.transcript}\n`;
        if (round.feedback) prompt += `Feedback: ${round.feedback}\n`;
        if (round.toneMetrics) {
            prompt += `Tone Analysis: Confidence(${round.toneMetrics.confidence || 'N/A'}), Stress(${round.toneMetrics.stress || 'N/A'}), Engagement(${round.toneMetrics.engagement || 'N/A'})\n`;
        }
        if (round.questionCategory) {
            prompt += `Category: ${round.questionCategory}\n`;
        }
    });

    prompt += `\n\nPlease provide a professional, constructive, and detailed analysis based on this complete interview session. Use research to ensure accuracy and relevance to ${companyInfo ? companyInfo.name : 'the target company'}. Include experience level insights based on performance.`;

    return prompt;
};

export const generateInterviewSummary = async (prompt, companyInfo = null) => {
    // Check if API key is available
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY in your environment variables.");
    }

    // Enhanced prompt for summary generation
    let enhancedPrompt = prompt;
    if (companyInfo) {
        enhancedPrompt = `**Company Context: ${companyInfo.name} (${companyInfo.type})**
**Role: ${companyInfo.role} (${companyInfo.level})**

${prompt}

**REMEMBER**: Provide a comprehensive, professional interview summary with clear sections and actionable feedback.`;
    }

    const body = {
        contents: [
            {
                parts: [
                    { text: "You are an expert HR professional and technical interviewer. Your task is to provide comprehensive, professional interview feedback and summary." },
                    { text: enhancedPrompt }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.2, // Lower temperature for more consistent summaries
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 2048, // Higher limit for detailed summaries
        }
    };

    // Try different models if one fails
    for (let i = 0; i < GEMINI_MODELS.length; i++) {
        const currentUrl = GEMINI_MODELS[i];
        console.log(`Generating summary with model ${i + 1}/${GEMINI_MODELS.length}: ${currentUrl.split('/').pop()}`);
        
        try {
            const response = await axios.post(`${currentUrl}?key=${GEMINI_API_KEY}`, body, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 60000 // Longer timeout for summary generation
            });

            console.log("Summary generation successful");
            
            if (!response.data.candidates || !response.data.candidates[0]) {
                throw new Error("Invalid response format from Gemini API");
            }

            const summary = response.data.candidates[0].content.parts[0].text;
            return summary.trim();

        } catch (error) {
            console.error(`Model ${i + 1} failed for summary:`, error.message);
            
            if (i === GEMINI_MODELS.length - 1) {
                if (error.response) {
                    console.error("Response status:", error.response.status);
                    console.error("Response data:", error.response.data);
                    
                    if (error.response.status === 404) {
                        throw new Error("All Gemini API models failed. Please check your API key and ensure it's valid.");
                    } else if (error.response.status === 403) {
                        throw new Error("Access denied. Please check your API key permissions.");
                    } else if (error.response.status === 400) {
                        throw new Error("Bad request. Please check your prompt format.");
                    }
                } else if (error.request) {
                    throw new Error("No response received from Gemini API. Please check your internet connection.");
                } else {
                    throw new Error(`Gemini API error: ${error.message}`);
                }
            }
            continue;
        }
    }
};

export default { ask, buildPrompt, buildFinalSummaryPrompt, generateInterviewSummary };