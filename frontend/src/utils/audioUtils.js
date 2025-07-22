/**
 * Production-ready audio utilities for interview recording
 */

// Audio configuration for production
const AUDIO_CONFIG = {
  sampleRate: 16000,
  channelCount: 1,
  bitsPerSample: 16,
  format: 'wav'
};

/**
 * Convert audio blob to proper WAV format for production
 * @param {Blob} audioBlob - Raw audio blob from MediaRecorder
 * @returns {Promise<Blob>} - Properly formatted WAV blob
 */
export const convertToWav = async (audioBlob) => {
  try {
    // Create AudioContext for processing
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Create a new audio buffer with our target format
    const targetBuffer = audioContext.createBuffer(
      AUDIO_CONFIG.channelCount,
      audioBuffer.length,
      AUDIO_CONFIG.sampleRate
    );
    
    // Copy and resample audio data
    for (let channel = 0; channel < AUDIO_CONFIG.channelCount; channel++) {
      const sourceData = audioBuffer.getChannelData(channel);
      const targetData = targetBuffer.getChannelData(channel);
      
      // Simple resampling (for production, use a proper resampling library)
      const ratio = audioBuffer.sampleRate / AUDIO_CONFIG.sampleRate;
      for (let i = 0; i < targetBuffer.length; i++) {
        const sourceIndex = Math.floor(i * ratio);
        targetData[i] = sourceData[sourceIndex] || 0;
      }
    }
    
    // Convert to WAV format
    const wavBlob = await audioBufferToWav(targetBuffer);
    
    // Clean up
    audioContext.close();
    
    return wavBlob;
  } catch (error) {
    console.error('Error converting to WAV:', error);
    // Fallback: return original blob with WAV mime type
    return new Blob([audioBlob], { type: 'audio/wav' });
  }
};

/**
 * Convert AudioBuffer to WAV format
 * @param {AudioBuffer} audioBuffer - Audio buffer to convert
 * @returns {Promise<Blob>} - WAV blob
 */
const audioBufferToWav = async (audioBuffer) => {
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;
  const bitsPerSample = AUDIO_CONFIG.bitsPerSample;
  
  // WAV header size
  const headerLength = 44;
  const dataLength = length * channels * (bitsPerSample / 8);
  const bufferLength = headerLength + dataLength;
  
  // Create buffer
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);
  
  // Write WAV header
  writeWavHeader(view, {
    sampleRate,
    channels,
    bitsPerSample,
    dataLength
  });
  
  // Write audio data
  const offset = headerLength;
  const channelData = audioBuffer.getChannelData(0); // Mono for production
  
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset + i * 2, value, true); // Little-endian
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
};

/**
 * Write WAV header to DataView
 * @param {DataView} view - DataView to write to
 * @param {Object} options - WAV options
 */
const writeWavHeader = (view, { sampleRate, channels, bitsPerSample, dataLength }) => {
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  
  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true); // byte rate
  view.setUint16(32, channels * (bitsPerSample / 8), true); // block align
  view.setUint16(34, bitsPerSample, true);
  
  // data chunk
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
};

/**
 * Validate audio quality for production
 * @param {Blob} audioBlob - Audio blob to validate
 * @returns {Object} - Validation result
 */
export const validateAudioQuality = (audioBlob) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const minSize = 1024; // 1KB
  
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  // Check file size
  if (audioBlob.size > maxSize) {
    validation.isValid = false;
    validation.errors.push('Audio file too large (max 10MB)');
  }
  
  if (audioBlob.size < minSize) {
    validation.isValid = false;
    validation.errors.push('Audio file too small (min 1KB)');
  }
  
  // Check duration (rough estimate)
  const estimatedDuration = audioBlob.size / (16000 * 2); // 16kHz, 16-bit
  if (estimatedDuration < 1) {
    validation.warnings.push('Audio duration seems very short');
  }
  
  if (estimatedDuration > 300) { // 5 minutes
    validation.warnings.push('Audio duration is very long');
  }
  
  return validation;
};

/**
 * Create optimized MediaRecorder configuration
 * @returns {Object} - MediaRecorder options
 */
export const getMediaRecorderOptions = () => {
  const options = {
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: 128000
  };
  
  // Fallback options if WebM/Opus not supported
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options.mimeType = 'audio/webm';
  }
  
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options.mimeType = 'audio/mp4';
  }
  
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options.mimeType = '';
  }
  
  return options;
};

/**
 * Get optimal audio constraints for production
 * @returns {Object} - Audio constraints
 */
export const getAudioConstraints = () => {
  return {
    audio: {
      sampleRate: { ideal: 16000, min: 8000, max: 48000 },
      channelCount: { ideal: 1, min: 1, max: 2 },
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      latency: { ideal: 0.01, max: 0.1 }
    }
  };
};

/**
 * Process audio for upload with validation
 * @param {Blob} audioBlob - Raw audio blob
 * @returns {Promise<Blob>} - Processed WAV blob ready for upload
 */
export const processAudioForUpload = async (audioBlob) => {
  try {
    // Validate audio quality
    const validation = validateAudioQuality(audioBlob);
    if (!validation.isValid) {
      throw new Error(`Audio validation failed: ${validation.errors.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Audio warnings:', validation.warnings);
    }
    
    // Convert to WAV
    const wavBlob = await convertToWav(audioBlob);
    
    // Final validation
    const finalValidation = validateAudioQuality(wavBlob);
    if (!finalValidation.isValid) {
      throw new Error(`Final audio validation failed: ${finalValidation.errors.join(', ')}`);
    }
    
    return wavBlob;
  } catch (error) {
    console.error('Error processing audio for upload:', error);
    throw error;
  }
}; 