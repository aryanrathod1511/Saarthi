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

            // Simple JSON parsing
            let question, feedback;
            
            try {
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const jsonResponse = JSON.parse(jsonMatch[0]);
                    question = jsonResponse.question;
                    feedback = jsonResponse.feedback;
                }
            } catch (jsonError) {
                console.log('JSON parsing failed, using fallback');
            }
            
            // Fallback: use the entire response as question
            if (!question) {
                question = cleanResponse(result);
                feedback = "Response parsed as question";
            }

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

/**
 * Generate comprehensive interview analysis and feedback
 */
export const generateInterviewAnalysis = async (interviewData, companyInfo = null) => {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }

    const {
        aiQuestions = [],
        userResponses = [],
        toneAnalysis = [],
        interviewType = 'technical',
        candidateName = 'Not specified',
        totalRounds = 0
    } = interviewData;

    // Calculate tone analysis averages
    const toneSummary = toneAnalysis.length > 0 ? 
        `Average Confidence: ${(toneAnalysis.reduce((sum, entry) => sum + (entry?.confidence || 0), 0) / toneAnalysis.length).toFixed(2)}/10
         Average Stress: ${(toneAnalysis.reduce((sum, entry) => sum + (entry?.stress || 0), 0) / toneAnalysis.length).toFixed(2)}/10
         Average Engagement: ${(toneAnalysis.reduce((sum, entry) => sum + (entry?.engagement || 0), 0) / toneAnalysis.length).toFixed(2)}/10
         Average Clarity: ${(toneAnalysis.reduce((sum, entry) => sum + (entry?.clarity || 0), 0) / toneAnalysis.length).toFixed(2)}/10
         Average Pace: ${(toneAnalysis.reduce((sum, entry) => sum + (entry?.pace || 0), 0) / toneAnalysis.length).toFixed(2)}/10
         Average Volume: ${(toneAnalysis.reduce((sum, entry) => sum + (entry?.volume || 0), 0) / toneAnalysis.length).toFixed(2)}/10` :
        'No tone analysis data available';

    const enhancedPrompt = `**COMPREHENSIVE INTERVIEW ANALYSIS AND FEEDBACK**

**Interview Context:**
- Company: ${companyInfo?.name || 'Tech Company'} (${companyInfo?.type || 'startup'})
- Role: ${companyInfo?.role || 'Software Development Engineer'} (${companyInfo?.level || 'Entry level'})
- Interview Type: ${interviewType}
- Total Rounds: ${totalRounds}
- Candidate: ${candidateName}

**Complete Interview Data:**

**AI Questions Asked:**
${aiQuestions.map((question, index) => 
    `${index + 1}. Round ${index + 1}: ${question}`
).join('\n')}

**User Responses:**
${userResponses.map((response, index) => 
    `${index + 1}. Round ${index + 1}: "${response}"`
).join('\n')}

**Tone Analysis Summary:**
${toneSummary}

**Your Task: Generate a comprehensive interview summary with the following sections:**

**1. Overall Performance Assessment**
Evaluate their overall performance across all questions. Consider technical knowledge, communication skills, and problem-solving approach. Provide a balanced assessment of strengths and areas for improvement.

**2. Technical Skills Evaluation**
Assess their technical knowledge and problem-solving abilities. Evaluate their approach to technical questions and comment on their coding/algorithmic thinking.

**3. Communication Skills Assessment**
Evaluate their verbal communication clarity, ability to explain complex concepts, and consider their tone analysis metrics (confidence, stress, engagement, etc.).

**4. Behavioral Competencies**
Evaluate their responses to behavioral questions, assess their teamwork, leadership, and problem-solving examples, and consider their cultural fit potential.

**5. Specific Strengths**
- List 3-5 specific strengths demonstrated during the interview
- Be specific and reference their actual responses

**6. Areas for Improvement**
- List 3-5 specific areas where they could improve
- Provide constructive feedback with actionable suggestions

**7. Recommendations**
Provide specific recommendations for improvement, suggest resources or practice areas, and give actionable next steps.

**8. Overall Rating**
Provide an overall rating (1-10 scale) with detailed explanation considering all aspects: technical skills, communication, problem-solving, etc.

**Format the response as a professional interview feedback report suitable for HR and hiring managers. Use clear section headers and bullet points where appropriate.**

**Important:** Be thorough, specific, and constructive. Reference their actual responses and tone analysis data in your assessment.`;

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
            temperature: 0.2,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 2048,
        }
    };

    for (let i = 0; i < GEMINI_MODELS.length; i++) {
        const currentUrl = GEMINI_MODELS[i];
        
        try {
            const response = await axios.post(`${currentUrl}?key=${GEMINI_API_KEY}`, body, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000
            });

            if (!response.data.candidates || !response.data.candidates[0]) {
                throw new Error("Invalid response format from Gemini API");
            }

            return response.data.candidates[0].content.parts[0].text.trim();

        } catch (error) {
            console.error(`Model ${i + 1} failed for interview analysis:`, error.message);
            
            if (i === GEMINI_MODELS.length - 1) {
                throw new Error(`Interview analysis generation failed: ${error.message}`);
            }
            continue;
        }
    }
};