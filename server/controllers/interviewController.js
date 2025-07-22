import * as gemini from "../services/gemini.js";
import fs from "fs";
import path from "path";
import speechToText from "../services/speechToText.js";
import { analyzeTone } from "../services/openSmile.js";
import parseResume from "../services/resumeParser.js";
import {PromptEngineer} from "../services/promptEngineer.js";
import { v4 as uuidv4 } from 'uuid';
import {createSession, getSession, deleteSession, hasSession} from "../services/sessionManager.js";
import { generateInterviewSummary } from "../services/gemini.js";




export const uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No resume file uploaded"
            });
        }
        
        console.log('Processing resume upload...');
        const resumePath = req.file.path;
        
        // Parse the resume - just get the text
        const resumeData = await parseResume(resumePath);
        console.log('Resume parsed successfully:', {
            name: resumeData.name,
            textLength: resumeData.rawText.length
        });
        
        // Get company info from request body
        let companyInfo = {};
        if (req.body.companyInfo) {
            // If sent as JSON string
            companyInfo = JSON.parse(req.body.companyInfo);
        } else {
            // If sent as individual fields
            companyInfo = {
                name: req.body.name || 'Tech Company',
                type: req.body.type || 'startup',
                role: req.body.role || 'Software Development Engineer',
                level: req.body.level || 'Entry level'
            };
        }
        
        // Get interview type from request
        const interviewType = req.body.interviewType || 'technical';
        const duration  = req.body.duration || 30;
        
        // Initialize prompt engineer with resume data and company info
        const promptEngineer = new PromptEngineer(resumeData, companyInfo);     
        promptEngineer.setInterviewType(interviewType);
        promptEngineer.setDuration(duration);
        

        //create a session
        const sessionId = uuidv4();
        createSession(sessionId, promptEngineer);
        if(hasSession(sessionId)){
            console.log('Session Created successfully');
        }

        
        res.status(200).json({
            message: "Resume parsed and session created successfully",
            candidateName: resumeData.name || 'Unknown',
            companyInfo: companyInfo,
            interviewType: interviewType,
            sessionId: sessionId 
        });

    } catch (error) {
        console.error("Error in uploadResume:", error);
        res.status(500).json({
            message: "Error processing resume",
            error: error.message
        });
    }
};

export const processAudio = async (req, res) => {
    try {
        // Validate request
        if (!req.file) {
            return res.status(400).json({
                message: "No audio file uploaded"
            });
        }

        const audioPath = req.file.path;
        const stats = fs.statSync(audioPath);
        if (stats.size === 0) {
            return res.status(400).json({
                message: "Audio file is empty"
            });
        }

        if (stats.size > 10 * 1024 * 1024) { // 10MB limit
            return res.status(400).json({
                message: "Audio file too large (max 10MB)"
            });
        }

        console.log('Processing audio file:', audioPath);

        // Process USER audio for speech-to-text and tone analysis
        const [transcriptResult, toneResult] = await Promise.allSettled([
            speechToText.speechToText(audioPath),
            analyzeTone(audioPath) // Analyze USER audio tone
        ]);

        // Handle transcript result
        let finalTranscript = "";
        if (transcriptResult.status === 'fulfilled') {
            finalTranscript = transcriptResult.value;
            console.log('Transcription successful:', finalTranscript);
        } else {
            console.error('Transcription failed:', transcriptResult.reason);
            // Return a meaningful error message instead of fallback
            finalTranscript = "Could not transcribe audio. Please try speaking again.";
        }

        // Handle tone analysis result
        let finalToneMatrix = {
            confidence: 7,
            stress: 3,
            engagement: 8,
            clarity: 8,
            pace: 7,
            volume: 8
        };
        if (toneResult.status === 'fulfilled') {
            finalToneMatrix = toneResult.value;
            console.log('Tone analysis successful:', finalToneMatrix);
        } else {
            console.error('Tone analysis failed:', toneResult.reason);
        }
        
        // Append to request body for downstream processing
        req.body.transcript = finalTranscript;
        req.body.toneMatrix = finalToneMatrix;

        // Clean up audio file after processing (optional)
        try {
            // Keep audio files for debugging in development
            if (process.env.NODE_ENV === 'production') {
                fs.unlinkSync(audioPath);
            }
        } catch (cleanupError) {
            console.warn('Could not clean up USER audio file:', cleanupError.message);
        }

        res.status(200).json({
            message: "USER audio processed successfully",
            transcript: finalTranscript,
            toneMatrix: finalToneMatrix
        });

    } catch (error) {
        console.error("Error in processAudio:", error);
        res.status(500).json({
            message: "Error processing USER audio",
            error: error.message
        });
    }
};

function cleanAIResponse(response) {
    if (!response || !response.question) return response;
    
    // Remove common thinking patterns from the question
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
        /next question:/i,
        /here's my question:/i,
        /i'll ask:/i
    ];
    
    let cleanedQuestion = response.question;
    thinkingPatterns.forEach(pattern => {
        cleanedQuestion = cleanedQuestion.replace(pattern, '');
    });
    
    // Remove extra whitespace and newlines
    cleanedQuestion = cleanedQuestion.replace(/\s+/g, ' ').trim();
    
    // If the question starts with quotes, remove them
    cleanedQuestion = cleanedQuestion.replace(/^["']|["']$/g, '');
    
    return {
        ...response,
        question: cleanedQuestion
    };
}

export const nextQuestion = async (req, res) => {
    try{
        //get session
        const sessionId = req.body.sessionId;
        const promptEngineer = getSession(sessionId);

        if(!promptEngineer){
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        // Get request data
        const { transcript, toneMatrix, round } = req.body;
        const currentCompanyInfo = promptEngineer.companyInfo;

        // Store the response temporarily
        const currentResponse = {
            transcript: transcript || '',
            toneMetrics: toneMatrix || {}
        };

        // Generate next question prompt
        const questionPrompt = promptEngineer.generateQuestionPrompt({
            transcript: transcript || '',
            toneMetrics: toneMatrix || {},
            round: round || (promptEngineer.interviewContext.questionHistory.length + 1),
        });

        // Get next question from Gemini
        const aiResponse = await gemini.ask(questionPrompt, currentCompanyInfo);

        // Clean the response before sending
        const cleanedResponse = cleanAIResponse(aiResponse);

        // NOW push both the previous answer AND the new question
        promptEngineer.updateContext({
            currentRound: round || (promptEngineer.interviewContext.questionHistory.length + 1),
            currentQuestion: cleanedResponse.question,
            transcript: currentResponse.transcript,
            toneMetrics: currentResponse.toneMetrics
        });

        res.status(200).json({
            question: cleanedResponse.question,
            questionCategory: 'Next Question',
            round: round || (promptEngineer.interviewContext.questionHistory.length),
            message: 'Next question generated successfully'
        });

    } catch (err) {
        console.error('Error in nextQuestion:', err);
        res.status(500).json({ error: 'Failed to generate question' });
    }
};

export const startInterview = async (req, res) => {
    try {
        console.log('Starting interview...');
        
        //get session
        const sessionId = req.body.sessionId;
        
        const promptEngineer = getSession(sessionId);

        if(!promptEngineer){
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        const currentCompanyInfo = promptEngineer.companyInfo;

        // Generate welcome message prompt
        const welcomePrompt = promptEngineer.getSystemPrompt() + `**INTERVIEW START - WELCOME MESSAGE**

You are starting a ${promptEngineer.interviewContext.interviewType.toUpperCase()} interview at ${currentCompanyInfo.name}. 

**Your Task:**
1. **Welcome the candidate** warmly and professionally
2. **Introduce yourself** as the interviewer from ${currentCompanyInfo.name}
3. **Ask for their brief introduction** (name, background)
4. **Set the interview context** - mention this is a ${promptEngineer.interviewContext.interviewType} interview for ${currentCompanyInfo.role} position
5. Let the candidate introduce his/herself and then move the interview based on the candidtes response.

**Interview Type Specific Instructions:**
${promptEngineer.interviewContext.interviewType.toLowerCase() === 'technical'? 
    '- After their introduction, aks some follow up question to know more about the candidate and then ask: "Let\'s start with a technical problem. Can you solve this DSA question for me?" Then provide ONE specific DSA problem. For the DSA problem you have to reseach about the company on the web, read previous interview experiences or fetch questions asked in the company from some popular platforms like leetcode, interviewbit, gfg, etc.' :
    promptEngineer.interviewContext.interviewType.toLowerCase() === 'hr' ? 
    '- After their introduction, ask: "I\'ve reviewed your resume. Let\'s discuss one of your projects. Can you tell me about [specific project from their resume]?"' : ''
}

**Important:** 
- You speak FIRST, don't wait for the candidate
- Be warm but professional
- Ask only ONE question to start
- Research ${currentCompanyInfo.name}'s interview style and ask appropriate questions
- Make it feel like a real interview starting

**Candidate Info:**
- Name: ${promptEngineer.resumeData?.name || 'Not specified'}
- Resume: ${promptEngineer.resumeData?.rawText}`;

        // Get welcome message from Gemini
        const aiResponse = await gemini.ask(welcomePrompt, currentCompanyInfo);

        // Clean the response before sending
        const cleanedResponse = cleanAIResponse(aiResponse);

        // Update interview context
        promptEngineer.updateContext({
            currentRound: 1,
            currentQuestion: cleanedResponse.question,

        });

        res.status(200).json({
            question: cleanedResponse.question,
            questionCategory: 'Welcome Message',
            round: 1,
            message: 'Interview started successfully'
        });

    } catch (err) {
        console.error('Error in startInterview:', err);
        res.status(500).json({ error: 'Failed to start interview' });
    }
};

export const getFinalFeedback = async (req, res) => {
    try {
        // Get session
        const sessionId = req.body.sessionId;
        const promptEngineer = getSession(sessionId);

        if(!promptEngineer){
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        // Get data from prompt engineer context
        const interviewContext = promptEngineer.interviewContext;
        
        if (!interviewContext || !interviewContext.questionHistory || interviewContext.questionHistory.length === 0) {
            return res.status(400).json({
                error: 'No interview data available for analysis'
            });
        }

        console.log('Generating detailed summary for interview context');

        // Extract data from interview context
        const aiQuestions = interviewContext.questionHistory;
        const userResponses = interviewContext.candidateResponses || [];
        const toneAnalysis = interviewContext.toneAnalysis || [];

        console.log('AI Questions:', aiQuestions.length);
        console.log('User Responses:', userResponses.length);
        console.log('Tone Analysis:', toneAnalysis.length);

        // Get company info
        const currentCompanyInfo = promptEngineer.companyInfo;

        // Generate comprehensive final summary prompt
        const finalPrompt = `**COMPREHENSIVE INTERVIEW ANALYSIS AND FEEDBACK**

**Interview Context:**
- Company: ${currentCompanyInfo.name} (${currentCompanyInfo.type})
- Role: ${currentCompanyInfo.role} (${currentCompanyInfo.level})
- Interview Type: ${promptEngineer.interviewContext.interviewType}
- Total Rounds: ${aiQuestions.length}
- Candidate: ${promptEngineer.resumeData?.name || 'Not specified'}

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
${toneAnalysis.length > 0 ? 
    `Average Confidence: ${(toneAnalysis.reduce((sum, entry) => sum + (entry?.confidence || 0), 0) / toneAnalysis.length).toFixed(2)}/10
     Average Stress: ${(toneAnalysis.reduce((sum, entry) => sum + (entry?.stress || 0), 0) / toneAnalysis.length).toFixed(2)}/10
     Average Engagement: ${(toneAnalysis.reduce((sum, entry) => sum + (entry?.engagement || 0), 0) / toneAnalysis.length).toFixed(2)}/10
     Average Clarity: ${(toneAnalysis.reduce((sum, entry) => sum + (entry?.clarity || 0), 0) / toneAnalysis.length).toFixed(2)}/10
     Average Pace: ${(toneAnalysis.reduce((sum, entry) => sum + (entry?.pace || 0), 0) / toneAnalysis.length).toFixed(2)}/10
     Average Volume: ${(toneAnalysis.reduce((sum, entry) => sum + (entry?.volume || 0), 0) / toneAnalysis.length).toFixed(2)}/10` :
    'No tone analysis data available'
}

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

        console.log('Sending detailed prompt to Gemini for analysis...');
        
        // Generate detailed summary using Gemini
        const summary = await generateInterviewSummary(finalPrompt, currentCompanyInfo);

        console.log('Summary generated successfully, length:', summary.length);

        //delete the session
        deleteSession(sessionId);

        res.status(200).json({ 
            summary: summary,
            totalRounds: aiQuestions.length,
            companyInfo: currentCompanyInfo,
            aiQuestionsCount: aiQuestions.length,
            userResponsesCount: userResponses.length,
            toneAnalysisCount: toneAnalysis.length
        });
    } catch (err) {
        console.error('Error in getFinalFeedback:', err);
        res.status(500).json({ error: 'Failed to get final feedback' });
    }
};


