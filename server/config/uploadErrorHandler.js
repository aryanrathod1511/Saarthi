import multer from "multer";
import fs from "fs";
import path from "path";
import { audioUpload, resumeUpload } from "./multerConfig.js";

// Error handling middleware for file uploads
export const handleResumeUploadError = (req, res, next) => {
    resumeUpload.single("resume")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Multer-specific errors
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    error: 'Resume file too large (max 5MB)' 
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ 
                    error: 'Only one resume file allowed' 
                });
            }
            return res.status(400).json({ 
                error: `Upload error: ${err.message}` 
            });
        } else if (err) {
            // Other errors (file type, etc.)
            return res.status(400).json({ 
                error: `File error: ${err.message}` 
            });
        }
        // No error, proceed to controller
        next();
    });
};

export const handleAudioUploadError = (req, res, next) => {
    audioUpload.single("audio")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Multer-specific errors
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    error: 'Audio file too large (max 10MB)' 
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ 
                    error: 'Only one audio file allowed' 
                });
            }
            return res.status(400).json({ 
                error: `Upload error: ${err.message}` 
            });
        } else if (err) {
            return res.status(400).json({ 
                error: `File error: ${err.message}` 
            });
        }
        next();
    });
};