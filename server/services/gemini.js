import axios from "axios";
import dotenv from "dotenv";
import {
    GENERAL_SYSTEM_PROMPT,
    INTERVIEW_ANALYSIS_PROMPT,
    quality_questions_prompt,
    buildCompanyContext,
    buildResumeContext,
    buildInterviewContext,
    getInterviewTypeInstructions,
    DSA_STAGE_SYSTEM_PROMPT,
} from "../prompts.js";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set in environment variables!");
}

const GEMINI_MODEL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent";

export const ask = async(prompt, companyInfo = null, resumeData = null, interviewContext = null) => {
    // Check if API key is available
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY in your environment variables.");
    }

    // ask() is only called for non-DSA interviews. DSA uses askDSA() instead.
    const interviewType = interviewContext?.interviewType?.toLowerCase() || 'general';

    // Build the complete prompt with all context
    let enhancedPrompt = prompt;

    if (companyInfo) {
        enhancedPrompt = buildCompanyContext(companyInfo) + '\n\n' + enhancedPrompt;
    }

    if (resumeData) {
        enhancedPrompt = buildResumeContext(resumeData) + '\n\n' + enhancedPrompt;
    }

    if (interviewContext) {
        enhancedPrompt = buildInterviewContext(interviewContext) + '\n\n' + enhancedPrompt;
    }

    const typeInstructions = getInterviewTypeInstructions(interviewType);
    enhancedPrompt = typeInstructions + '\n\n' + enhancedPrompt;

    enhancedPrompt = enhancedPrompt + '\n\n' + quality_questions_prompt;

    const body = {
        contents: [
            {
                role: "user", 
                parts: [
                    { text: GENERAL_SYSTEM_PROMPT + "\n" + enhancedPrompt },
                    
                ]
            }
        ],
        generationConfig: {
            temperature: 0.5, 
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 1024,
        }
    };

    try {
        console.log(`Sending request with ${enhancedPrompt.length} characters`);
        const response = await axios.post(`${GEMINI_MODEL}?key=${GEMINI_API_KEY}`, body, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 45000
        });
       
        // Check response structure
        if (!response.data) {
            console.error("No response data from Gemini");
            throw new Error("Invalid response format from Gemini API");
        }

        if (!response.data.candidates || response.data.candidates.length === 0) {
            console.error("No candidates in response:", JSON.stringify(response.data, null, 2));
            throw new Error("Invalid response format from Gemini API - no candidates");
        }

        if (!response.data.candidates[0].content || !response.data.candidates[0].content.parts || response.data.candidates[0].content.parts.length === 0) {
            console.error("No content/parts in response:", JSON.stringify(response.data.candidates[0], null, 2));
            throw new Error("Invalid response format from Gemini API - no content");
        }

        const result = response.data.candidates[0].content.parts[0].text;

        let question, feedback, shouldMoveToNextProblem, isWrapUp, currentStage, stageProgress;
        
        try {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                question = jsonResponse.question;
                feedback = jsonResponse.feedback;
                shouldMoveToNextProblem = jsonResponse.shouldMoveToNextProblem;
                isWrapUp = jsonResponse.isWrapUp;
                currentStage = jsonResponse.currentStage;
                stageProgress = jsonResponse.stageProgress;
            }
        } catch  {
            console.log('JSON parsing failed, using fallback');
        }
     
        // Ensure feedback is an object with the correct structure
        if (typeof feedback === 'string') {
            feedback = {
                score: null,
                overallFeedback: feedback,
                strengths: ["No feedback received from AI"],
                weaknesses: ["No feedback received from AI"]
            };
        }

        return {
            question: question ? question.trim() : "Please provide your response to continue the interview.",
            feedback: feedback || {
                score: null,
                overallFeedback: "No specific feedback for this round.",
                strengths: ["No feedback received from AI"],
                weaknesses: ["No feedback received from AI"]
            },
            shouldMoveToNextProblem: shouldMoveToNextProblem,
            isWrapUp: isWrapUp || false,
            currentStage: currentStage,
            stageProgress: stageProgress
        };
    } catch (error) {
        console.error(`Gemini API failed:`, error.message);
        throw new Error(`Some server side error occurred`);
    }
};

/**
 * askDSA — Focused AI call for the new DSA interview architecture.
 *
 * Receives a pre-built prompt string (from buildDSAPrompt) that contains only
 * the current stage, current problem, and current-problem conversation history.
 * No full interview context. No cross-problem history.
 *
 * Expected AI response shape:
 *   { question, feedback: { score, observation }, stageReadiness }
 */
export const askDSA = async (prompt) => {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }

    const body = {
        contents: [
            {
                role: "user",
                parts: [{ text: DSA_STAGE_SYSTEM_PROMPT + "\n\n" + prompt }],
            },
        ],
        generationConfig: {
            temperature: 0.4,   // Lower than general ask() — more consistent stage adherence
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 512, // Questions are short; no need for large output
        },
    };

    try {
        console.log(`[askDSA] Sending prompt: ${prompt.length} chars`);
        const response = await axios.post(
            `${GEMINI_MODEL}?key=${GEMINI_API_KEY}`,
            body,
            { headers: { "Content-Type": "application/json" }, timeout: 30000 }
        );

        if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error("Invalid response structure from Gemini API");
        }

        const raw = response.data.candidates[0].content.parts[0].text;

        // Parse JSON response
        let parsed = {};
        try {
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) parsed = JSON.parse(match[0]);
        } catch {
            console.warn("[askDSA] JSON parse failed, using fallback");
        }

        return {
            question: (parsed.question || "Can you walk me through your thinking on this?").trim(),
            feedback: parsed.feedback || { score: null, observation: "" },
            stageReadiness: parsed.stageReadiness === "ready_to_advance"
                ? "ready_to_advance"
                : "continue",
        };
    } catch (error) {
        console.error("[askDSA] Gemini API failed:", error.message);
        throw new Error("Failed to generate interview question");
    }
};

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

${INTERVIEW_ANALYSIS_PROMPT}`;

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
            temperature: 0.5,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 2048,
        }
    };

    try {
        console.log(`Sending request with ${body.contents[0].parts[0].text.length} characters`);
        const response = await axios.post(`${GEMINI_MODEL}?key=${GEMINI_API_KEY}`, body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        });
        console.log("Received response");

        if (!response.data.candidates || !response.data.candidates[0]) {
            throw new Error("Invalid response format from Gemini API");
        }

        return response.data.candidates[0].content.parts[0].text.trim();

    } catch (error) {
        console.error(`Gemini API failed for interview analysis:`, error.message);
        throw new Error(`Some server side error occurred`);
    }
};