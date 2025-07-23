import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const ASSEMBLY_AI_API_KEY = process.env.ASSEMBLY_AI_API_KEY;
console.log(ASSEMBLY_AI_API_KEY);
const ASSEMBLY_AI_BASE_URL = "https://api.assemblyai.com/v2";

const CONFIG = {
  uploadTimeout: 30000,
  transcriptionTimeout: 120000,
  pollInterval: 1000,
  maxPollAttempts: 120,
  maxFileSize: 10 * 1024 * 1024,
  supportedFormats: ['.wav', '.mp3', '.m4a', '.webm']
};

/**
 * Production-ready speech-to-text service
 * @param {string} audioPath - Path to the audio file
 * @returns {Promise<string>} - Transcribed text
 */
export const speechToText = async (audioPath) => {
  try {
    // Validate API key first
    if (!ASSEMBLY_AI_API_KEY || ASSEMBLY_AI_API_KEY === 'your_assembly_ai_api_key_here') {
      throw new Error('Assembly AI API key not configured. Please set ASSEMBLY_AI_API_KEY in your environment variables.');
    }

    console.log("Starting production speech-to-text processing for:", audioPath);
    
    // Validate audio file
    await validateAudioFile(audioPath);
    
    // Read the audio file
    const audioFile = fs.readFileSync(audioPath);
    console.log(`Audio file loaded: ${audioFile.length} bytes`);
    
    // Upload the audio file to Assembly AI
    const uploadUrl = await uploadAudioFile(audioFile);
    console.log("Audio uploaded successfully:", uploadUrl);
    
    // Submit transcription request
    const transcriptId = await submitTranscription(uploadUrl);
    console.log("Transcription submitted with ID:", transcriptId);
    
    // Poll for completion
    const transcript = await pollForCompletion(transcriptId);
    console.log("Transcription completed successfully");
    
    return transcript || "No speech detected";
    
  } catch (error) {
    console.error("Error in speechToText:", error);
    throw error; // Re-throw to let caller handle the error
  }
};

/**
 * Validate audio file before processing
 * @param {string} audioPath - Path to audio file
 */
const validateAudioFile = async (audioPath) => {
  try {
    const stats = fs.statSync(audioPath);
    
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }
    
    if (stats.size === 0) {
      throw new Error('Audio file is empty');
    }
    
    if (stats.size > CONFIG.maxFileSize) {
      throw new Error(`Audio file too large: ${stats.size} bytes (max ${CONFIG.maxFileSize})`);
    }
    
    // Check file extension
    const ext = audioPath.toLowerCase().split('.').pop();
    if (!CONFIG.supportedFormats.includes(`.${ext}`)) {
      console.warn(`Unsupported audio format: .${ext}`);
    }
    
    console.log(`Audio file validation passed: ${stats.size} bytes`);
  } catch (error) {
    throw new Error(`Audio file validation failed: ${error.message}`);
  }
};

/**
 * Upload audio file to Assembly AI
 * @param {Buffer} audioFile - Audio file buffer
 * @returns {Promise<string>} - Upload URL
 */
const uploadAudioFile = async (audioFile) => {
  try {
    const response = await axios.post(
      `${ASSEMBLY_AI_BASE_URL}/upload`,
      audioFile,
      {
        headers: {
          'Authorization': ASSEMBLY_AI_API_KEY,
          'Content-Type': 'application/octet-stream'
        },
        timeout: CONFIG.uploadTimeout
      }
    );
    
    return response.data.upload_url;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('Assembly AI API key is invalid or expired. Please check your API key.');
      } else if (error.response.status === 413) {
        throw new Error('Audio file is too large for upload. Please use a smaller file.');
      } else {
        throw new Error(`Upload failed: ${error.response.status} - ${error.response.data.error || 'Unknown error'}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Upload timeout - file may be too large or network is slow');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Cannot connect to Assembly AI. Please check your internet connection.');
    } else {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
};

/**
 * Submit transcription request to Assembly AI
 * @param {string} uploadUrl - Uploaded audio URL
 * @returns {Promise<string>} - Transcription ID
 */
const submitTranscription = async (uploadUrl) => {
  try {
    const response = await axios.post(
      `${ASSEMBLY_AI_BASE_URL}/transcript`,
      {
        audio_url: uploadUrl,
        language_code: "en",
        punctuate: true,
        format_text: true,
        speaker_labels: false,
        auto_highlights: false,
        entity_detection: false,
        iab_categories: false,
        auto_chapters: false,
        sentiment_analysis: false,
        content_safety: false,
        // Fixed boost_param value
        boost_param: "high",
        word_boost: ["interview", "question", "answer", "problem", "solution", "algorithm", "code", "system", "design"],
        filter_profanity: false
      },
      {
        headers: {
          'Authorization': ASSEMBLY_AI_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: CONFIG.uploadTimeout
      }
    );
    
    return response.data.id;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('Assembly AI API key is invalid or expired. Please check your API key.');
      } else if (error.response.status === 400) {
        const errorMsg = error.response.data.error || 'Bad request';
        throw new Error(`Transcription request failed: ${errorMsg}`);
      } else {
        throw new Error(`Transcription submission failed: ${error.response.status} - ${error.response.data.error || 'Unknown error'}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Transcription request timeout. Please try again.');
    } else {
      throw new Error(`Transcription submission failed: ${error.message}`);
    }
  }
};

/**
 * Poll for transcription completion
 * @param {string} transcriptId - Transcription ID
 * @returns {Promise<string>} - Transcribed text
 */
const pollForCompletion = async (transcriptId) => {
  let attempts = 0;
  
  while (attempts < CONFIG.maxPollAttempts) {
    try {
      const response = await axios.get(
        `${ASSEMBLY_AI_BASE_URL}/transcript/${transcriptId}`,
        {
          headers: {
            'Authorization': ASSEMBLY_AI_API_KEY
          },
          timeout: 10000 // 10 second timeout for status checks
        }
      );
      
      const status = response.data.status;
      console.log(`Transcription status (attempt ${attempts + 1}): ${status}`);
      
      if (status === 'completed') {
        const transcript = response.data.text;
        if (!transcript || transcript.trim().length === 0) {
          throw new Error('Transcription completed but no text was generated');
        }
        return transcript;
      } else if (status === 'error') {
        throw new Error(`Transcription failed: ${response.data.error || 'Unknown error'}`);
      } else if (status === 'queued' || status === 'processing') {
        // Continue polling
      } else {
        console.warn("Unknown transcription status:", status);
      }
      
    } catch (error) {
      console.warn(`Status check failed (attempt ${attempts + 1}):`, error.message);
      
      // If it's a network error, continue polling
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
        console.log('Network error, retrying...');
      } else if (error.response && error.response.status >= 500) {
        console.log('Server error, retrying...');
      } else {
        // For other errors, throw immediately
        throw error;
      }
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, CONFIG.pollInterval));
    attempts++;
  }
  
  throw new Error(`Transcription timed out after ${CONFIG.maxPollAttempts} attempts`);
};

export const fallbackSpeechToText = async (audioPath) => {
  console.log('Using fallback speech-to-text');
  throw new Error('Speech-to-text service is not available. Please check your Assembly AI API configuration.');
};

export default { speechToText };





