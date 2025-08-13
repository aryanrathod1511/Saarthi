import axios from "axios";
import dotenv from "dotenv";
import {
    DSA_SYSTEM_PROMPT,
    GENERAL_SYSTEM_PROMPT,
    INTERVIEW_ANALYSIS_PROMPT, 
    quality_questions_prompt,
    dsa_quality_questions_prompt,
    buildCompanyContext,
    buildResumeContext,
    buildInterviewContext,
    getInterviewTypeInstructions
} from "../prompts";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is not set in environment variables!");
    console.error("Please set your Google Gemini API key in a .env file:");
    console.error("GEMINI_API_KEY=your_api_key_here");
}

const GEMINI_MODEL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export const ask = async(prompt, companyInfo = null, resumeData = null, interviewContext = null) => {
    // Check if API key is available
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY in your environment variables.");
    }

    // Determine which system prompt to use based on interview type
    const interviewType = interviewContext?.interviewType?.toLowerCase() || 'general';
    const isDSAInterview = interviewType === 'dsa';
    
    const systemPrompt = isDSAInterview ? DSA_SYSTEM_PROMPT : GENERAL_SYSTEM_PROMPT;
    const qualityPrompt = isDSAInterview ? dsa_quality_questions_prompt : quality_questions_prompt;

    // Build the complete prompt with all context
    let enhancedPrompt = prompt;
    
    // Add company context if available
    if (companyInfo) {
        enhancedPrompt = buildCompanyContext(companyInfo) + '\n\n' + enhancedPrompt;
    }
    
    // Add resume context only for non-DSA interviews
    if (!isDSAInterview && resumeData) {
        enhancedPrompt = buildResumeContext(resumeData) + '\n\n' + enhancedPrompt;
    }
    
    // Add interview context if available
    if (interviewContext) {
        enhancedPrompt = buildInterviewContext(interviewContext) + '\n\n' + enhancedPrompt;
    }
    
    // Add interview type specific instructions
    const typeInstructions = getInterviewTypeInstructions(interviewType, resumeData);
    enhancedPrompt = typeInstructions + '\n\n' + enhancedPrompt;
    
    // Add quality questions prompt
    enhancedPrompt = enhancedPrompt + '\n\n' + qualityPrompt;

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
            temperature: 0.5, 
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 1024,
        }
    };

    try {
        console.log(`Sending request with ${body.contents[0].parts[0].text.length} characters`);
        const response = await axios.post(`${GEMINI_MODEL}?key=${GEMINI_API_KEY}`, body, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 45000
        });
        console.log("Received response");
        
        if (!response.data.candidates || !response.data.candidates[0]) {
            throw new Error("Invalid response format from Gemini API");
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
        } catch (jsonError) {
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