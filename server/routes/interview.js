import express from "express";
import { 
    processAudio, 
    uploadResume, 
    startInterview,
    nextQuestion,
    getFinalFeedback,
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

export default router;
