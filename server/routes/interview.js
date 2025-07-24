import express from "express";
import { 
    processAudio, 
    uploadResume, 
    startInterview,
    nextQuestion,
    getFinalFeedback,
    submitCode,
    getDSAProblems,
    getCurrentProblem,
    terminateSession
} from "../controllers/interviewController.js";
import { 
    handleResumeUploadError, 
    handleAudioUploadError 
} from "../config/uploadErrorHandler.js";

const router = express.Router();

router.post("/upload-resume", handleResumeUploadError, uploadResume);

router.post("/upload", handleAudioUploadError, processAudio);

router.post("/start", startInterview);

router.post("/next-question", nextQuestion);

router.post("/summary", getFinalFeedback);

// DSA-specific routes
router.post("/submit-code", submitCode);
router.get("/dsa-problems", getDSAProblems);
router.get("/current-problem", getCurrentProblem);
router.post("/terminate", terminateSession);

export default router;
