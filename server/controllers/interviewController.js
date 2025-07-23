import * as gemini from "../services/gemini.js";
import fs from "fs";
import path from "path";
import speechToText from "../services/speechToText.js";
import { analyzeTone } from "../services/openSmile.js";
import parseResume from "../services/resumeParser.js";
import {PromptEngineer} from "../services/promptEngineer.js";
import { v4 as uuidv4 } from 'uuid';
import {createSession, getSession, deleteSession, hasSession} from "../services/sessionManager.js";
import { ask, generateInterviewAnalysis } from "../services/gemini.js";

import dsaProblemService from "../services/dsaProblemService.js";
import codeEvaluationService from "../services/codeEvaluationService.js";
import interviewFlowService from "../services/interviewFlowService.js";




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



export const nextQuestion = async (req, res) => {
    try {
        const { sessionId, transcript, toneMatrix, round, code } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({
                error: 'Session ID is required'
            });
        }

        const promptEngineer = getSession(sessionId);
        if (!promptEngineer) {
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        // Update context with candidate's response
        const elapsedMinutes = Math.floor((new Date().getTime() - promptEngineer.interviewContext.startTime) / (1000 * 60));
        
        promptEngineer.updateContext({
            currentRound: round || promptEngineer.interviewContext.questionHistory.length + 1,
            transcript: transcript,
            toneMetrics: toneMatrix || {}
        });

        // Generate next question using flow service
        const context = {
            transcript: transcript,
            toneMetrics: toneMatrix || {},
            elapsedMinutes: elapsedMinutes
        };

        const nextQuestionResponse = await interviewFlowService.generateNextQuestion(promptEngineer, context);

        // Update context with the new question
        promptEngineer.updateContext({
            currentRound: (promptEngineer.interviewContext.questionHistory.length + 1),
            currentQuestion: nextQuestionResponse.question
        });

        res.status(200).json({
            question: nextQuestionResponse.question,
            phase: nextQuestionResponse.phase,
            shouldMoveToNextProblem: nextQuestionResponse.shouldMoveToNextProblem,
            showDSAProblem: nextQuestionResponse.showDSAProblem,
            isWrapUp: nextQuestionResponse.isWrapUp,
            round: promptEngineer.interviewContext.questionHistory.length
        });

    } catch (error) {
        console.error('Error in nextQuestion:', error);
        res.status(500).json({ error: 'Failed to generate next question' });
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



        // Initialize interview context with time tracking
        const startTime = new Date();
        promptEngineer.interviewContext = {
            ...promptEngineer.interviewContext,
            startTime: startTime,
            currentRound: 0,
            questionHistory: [],
            currentQuestion: '',
            currentPhase: 'introduction',
            elapsedMinutes: 0
        };

        // For DSA interviews, load problems
        if (promptEngineer.interviewContext.interviewType.toLowerCase() === 'dsa') {
            try {
                const problems = dsaProblemService.selectRandomProblems(4);
                promptEngineer.interviewContext.dsaProblems = problems;
                promptEngineer.interviewContext.currentProblemIndex = 0;
                console.log(`Loaded ${problems.length} DSA problems for interview`);
            } catch (error) {
                console.error('Error loading DSA problems:', error);
                return res.status(500).json({
                    error: 'Failed to load DSA problems'
                });
            }
        }

        // Generate welcome message using the new flow service
        const welcomeResponse = await interviewFlowService.generateWelcomeMessage(promptEngineer);

        // Update context
        promptEngineer.updateContext({
            currentRound: 1,
            currentQuestion: welcomeResponse.question,
            transcript: '',
            toneMetrics: {}
        });

        const config = interviewFlowService.getInterviewConfig(promptEngineer.interviewContext.interviewType);

        res.status(200).json({
            question: welcomeResponse.question,
            questionCategory: 'Introduction',
            round: 1,
            message: 'Interview started successfully',
            interviewType: promptEngineer.interviewContext.interviewType,
            startTime: startTime,
            maxDuration: config.maxDuration,
            wrapUpThreshold: config.wrapUpThreshold
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

        // Prepare interview data for analysis
        const interviewData = {
            aiQuestions,
            userResponses,
            toneAnalysis,
            interviewType: promptEngineer.interviewContext.interviewType,
            candidateName: promptEngineer.resumeData?.name || 'Not specified',
            totalRounds: aiQuestions.length
        };

        console.log('Sending interview data to Gemini for analysis...');
        
        // Generate detailed summary using the new generateInterviewAnalysis function
        const summary = await generateInterviewAnalysis(interviewData, currentCompanyInfo);

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

// DSA-specific controller functions

export const getDSAProblems = async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        const promptEngineer = getSession(sessionId);

        if (!promptEngineer) {
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        // Check if this is a DSA interview
        if (promptEngineer.interviewContext.interviewType.toLowerCase() !== 'dsa') {
            return res.status(400).json({
                error: 'This endpoint is only available for DSA interviews'
            });
        }

        // Get or generate DSA problems for this session
        let dsaProblems = promptEngineer.interviewContext.dsaProblems;
        
        if (!dsaProblems) {
            // Generate 4 random problems
            dsaProblems = dsaProblemService.selectRandomProblems(4);
            
            // Store in session
            promptEngineer.interviewContext.dsaProblems = dsaProblems;
            promptEngineer.interviewContext.currentProblemIndex = 0;
        }

        res.status(200).json({
            problems: dsaProblems,
            currentProblemIndex: promptEngineer.interviewContext.currentProblemIndex || 0,
            totalProblems: dsaProblems.length
        });

    } catch (error) {
        console.error('Error in getDSAProblems:', error);
        res.status(500).json({ error: 'Failed to get DSA problems' });
    }
};

export const getCurrentProblem = async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        const promptEngineer = getSession(sessionId);

        if (!promptEngineer) {
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        const dsaProblems = promptEngineer.interviewContext.dsaProblems;
        const currentIndex = promptEngineer.interviewContext.currentProblemIndex || 0;

        if (!dsaProblems || currentIndex >= dsaProblems.length) {
            return res.status(404).json({
                error: 'No more problems available'
            });
        }

        const currentProblem = dsaProblems[currentIndex];

        res.status(200).json({
            problem: currentProblem,
            currentIndex: currentIndex,
            totalProblems: dsaProblems.length,
            isLastProblem: currentIndex === dsaProblems.length - 1
        });

    } catch (error) {
        console.error('Error in getCurrentProblem:', error);
        res.status(500).json({ error: 'Failed to get current problem' });
    }
};

export const submitCode = async (req, res) => {
    try {
        const { sessionId, code, language = 'javascript' } = req.body;

        if (!sessionId || !code) {
            return res.status(400).json({
                error: 'Session ID and code are required'
            });
        }

        const promptEngineer = getSession(sessionId);

        if (!promptEngineer) {
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        // Check if this is a DSA interview
        if (promptEngineer.interviewContext.interviewType.toLowerCase() !== 'dsa') {
            return res.status(400).json({
                error: 'Code submission is only available for DSA interviews'
            });
        }

        const dsaProblems = promptEngineer.interviewContext.dsaProblems;
        const currentIndex = promptEngineer.interviewContext.currentProblemIndex || 0;

        if (!dsaProblems || currentIndex >= dsaProblems.length) {
            return res.status(404).json({
                error: 'No current problem available'
            });
        }

        const currentProblem = dsaProblems[currentIndex];

        // Evaluate the code
        const evaluation = await codeEvaluationService.evaluateCode(code, currentProblem, language);

        // Get the current question that was asked
        const currentQuestion = promptEngineer.interviewContext.questionHistory[promptEngineer.interviewContext.questionHistory.length - 1];
        
        // Generate follow-up question based on evaluation
        const followUp = await codeEvaluationService.generateFollowUpQuestion(evaluation, currentProblem, code, currentQuestion);

        // Store evaluation in session
        if (!promptEngineer.interviewContext.codeEvaluations) {
            promptEngineer.interviewContext.codeEvaluations = [];
        }
        
        promptEngineer.interviewContext.codeEvaluations.push({
            problemId: currentProblem.id,
            problemTitle: currentProblem.title,
            code: code,
            language: language,
            evaluation: evaluation,
            timestamp: new Date().toISOString()
        });

        // Get both the DSA problem context and the AI's follow-up question
        const dsaProblemContext = `DSA Problem: ${currentProblem.title} - ${currentProblem.description}`;
        const aiFollowUpQuestion = currentQuestion || 'No specific question asked yet';
        
        // Generate next question using flow service
        const context = {
            transcript: `Code submitted for problem: ${currentProblem.title}`,
            toneMetrics: {},
            elapsedMinutes: Math.floor((new Date() - promptEngineer.interviewContext.startTime) / (1000 * 60)),
            currentProblem: currentProblem,
            dsaProblemContext: dsaProblemContext,
            aiFollowUpQuestion: aiFollowUpQuestion
        };

        const nextQuestionResponse = await interviewFlowService.generateNextQuestion(promptEngineer, context);

        // Update context with the new question
        promptEngineer.updateContext({
            currentRound: (promptEngineer.interviewContext.questionHistory.length + 1),
            currentQuestion: nextQuestionResponse.question,
            transcript: `Code submitted for problem: ${currentProblem.title}`,
            toneMetrics: {}
        });

        res.status(200).json({
            evaluation: evaluation,
            followUpQuestion: followUp,
            nextQuestion: nextQuestionResponse.question,
            currentProblem: currentProblem,
            currentIndex: currentIndex,
            totalProblems: dsaProblems.length,
            isLastProblem: currentIndex === dsaProblems.length - 1,
            round: promptEngineer.interviewContext.questionHistory.length,
            shouldMoveToNextProblem: nextQuestionResponse.shouldMoveToNextProblem,
            isWrapUp: nextQuestionResponse.isWrapUp
        });

    } catch (error) {
        console.error('Error in submitCode:', error);
        res.status(500).json({ error: 'Failed to evaluate code' });
    }
};


