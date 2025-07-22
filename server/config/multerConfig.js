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
        fileSize: 10 * 1024 * 1024, // 10MB limit
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