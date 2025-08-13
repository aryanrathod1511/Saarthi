import multer from "multer";
import fs from "fs";
import path from "path";

// Create directories if they don't exist
const createDirectories = () => {
    const uploadDir = "uploads/";
    const resumesDir = "uploads/resumes/";
    
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(resumesDir)) {
        fs.mkdirSync(resumesDir, { recursive: true });
    }
};

// Audio storage configuration
const audioStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        createDirectories();
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const extension = path.extname(file.originalname);
        cb(null, `audio_${timestamp}_${randomId}${extension}`);
    },
});

// Resume storage configuration
const resumeStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        createDirectories();
        console.log('Resume upload destination:', "uploads/resumes/");
        cb(null, "uploads/resumes/");
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const filename = `resume_${timestamp}_${file.originalname}`;
        console.log('Resume filename:', filename);
        cb(null, filename);
    },
});

// Audio file filter
const audioFileFilter = function (req, file, cb) {
    const allowedTypes = ['audio/wav', 'audio/webm', 'audio/mp3', 'audio/m4a', 'audio/ogg'];
    const allowedExtensions = ['.wav', '.webm', '.mp3', '.m4a', '.ogg'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidType = allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext);
    
    if (!isValidType) {
        return cb(new Error('Only audio files (.wav, .webm, .mp3, .m4a, .ogg) are allowed'));
    }
    
    if (file.size > 10 * 1024 * 1024) {
        return cb(new Error('Audio file size must be less than 10MB'));
    }
    
    cb(null, true);
};

// Resume file filter
const resumeFileFilter = function (req, file, cb) {
    console.log('Resume file filter - originalname:', file.originalname);
    const ext = path.extname(file.originalname).toLowerCase();
    console.log('Resume file extension:', ext);
    if(ext !== '.pdf'){
        return cb(new Error('Only PDF files are allowed for resumes'));
    }
    cb(null, true);
};

// Multer instances
export const audioUpload = multer({ 
    storage: audioStorage,
    fileFilter: audioFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only one file at a time
    }
});

export const resumeUpload = multer({ 
    storage: resumeStorage,
    fileFilter: resumeFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Export the configuration object for backward compatibility
export const multerConfig = {
    storage: resumeStorage,
    fileFilter: resumeFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
};

// Export error handler
export const handleUploadError = (req, res, next) => {
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