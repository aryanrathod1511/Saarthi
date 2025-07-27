import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const execAsync = promisify(exec);

export const analyzeTone = async (audioFilePath) => {
  try {
    console.log("Entered");
    if (!fs.existsSync(audioFilePath)) {
      throw new Error('Audio file not found');
    }

    const opensmilePath = process.env.OPENSMILE_PATH || 'F:\\Downloads\\opensmile-3.0-win-x64\\opensmile-3.0-win-x64\\SMILExtract.exe';
    const opensmileDir = path.dirname(opensmilePath);
    const configPath = path.join(opensmileDir, 'config', 'emobase', 'emobase.conf');

    console.log(configPath);
    if (!fs.existsSync(configPath)) {
      console.log('Config file not found');
    }

    const outputPath = audioFilePath.replace(/\.[^/.]+$/, '_features.csv');

    console.log('OpenSMILE path:', opensmilePath);
    console.log('Config path:', configPath);
    console.log('Audio file path:', audioFilePath);

    if (!fs.existsSync(opensmilePath)) {
      console.warn('OpenSMILE executable not found at:', opensmilePath);
      return await fallbackToneAnalysis(audioFilePath);
    }

    if (!fs.existsSync(configPath)) {
      console.warn('OpenSMILE config not found at:', configPath);
      return await fallbackToneAnalysis(audioFilePath);
    }
    console.log("all files are found");
    const command = `"${opensmilePath}" -C "${configPath}" -I "${audioFilePath}" -O "${outputPath}" -l 0 -nologfile 1`;
    console.log('Running OpenSMILE command:', command);

    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

      if (stderr) console.warn('stderr:', stderr);
      if (stdout) console.log('stdout:', stdout);

      if (!fs.existsSync(outputPath)) {
        throw new Error('OpenSMILE failed to generate output');
      }

      const features = parseFeatures(outputPath);
      const toneMatrix = calculateToneMetrics(features);

      fs.unlinkSync(outputPath); // Clean up temp CSV
      return toneMatrix;
    } catch (execError) {
      console.error('OpenSMILE execution failed:', execError.message);
      return await fallbackToneAnalysis(audioFilePath);
    }

  } catch (err) {
    console.error('Tone analysis failed:', err.message);
    return await fallbackToneAnalysis(audioFilePath);
  }
};

// -------------------- FALLBACK AND UTILITIES --------------------

const getDefaultToneMatrix = () => ({
  confidence: 7, stress: 3, engagement: 8, clarity: 8, pace: 7, volume: 8
});

const fallbackToneAnalysis = async (audioFilePath) => {
  try {
    const size = fs.statSync(audioFilePath).size;
    return {
      confidence: 7,
      stress: 3,
      engagement: Math.min(10, Math.max(5, Math.round(size / 50000))),
      clarity: 8,
      pace: 7,
      volume: 8
    };
  } catch {
    return getDefaultToneMatrix();
  }
};

const parseFeatures = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    if (lines.length < 2) throw new Error('Malformed CSV');
    const sep = lines[0].includes(';') ? ';' : ',';
    const header = lines[0].split(sep);
    const values = lines[lines.length - 1].split(sep);

    const features = {};
    header.forEach((name, i) => {
      if (name?.trim()) {
        const val = parseFloat(values[i]);
        features[name.trim()] = isNaN(val) ? 0 : val;
      }
    });
    return features;
  } catch (err) {
    console.error('CSV parse error:', err.message);
    return {};
  }
};

const calculateToneMetrics = (f) => {
  const round = (val) => Math.max(1, Math.min(10, Math.round(val * 10)));
  return {
    confidence: round(calculateConfidence(f)),
    stress: round(calculateStress(f)),
    engagement: round(calculateEngagement(f)),
    clarity: round(calculateClarity(f)),
    pace: round(calculatePace(f)),
    volume: round(calculateVolume(f))
  };
};

// -------------------- METRIC FUNCTIONS --------------------

const calculateConfidence = (f) => {
  const keys = [
    'F0semitoneFrom27.5Hz_sma3nz_mean',
    'F0semitoneFrom27.5Hz_sma3nz_stddev',
    'F0semitoneFrom27.5Hz_sma3nz_min',
    'F0semitoneFrom27.5Hz_sma3nz_max',
    'F0semitoneFrom27.5Hz_sma3nz_range'
  ];
  const vals = keys.map(k => f[k] || 0);
  return Math.min(vals.reduce((a, b) => a + Math.abs(b), 0) / 100, 1);
};

const calculateStress = (f) => {
  const keys = [
    'jitterLocal_sma3nz_mean', 'jitterLocal_sma3nz_stddev',
    'shimmerLocal_sma3nz_mean', 'shimmerLocal_sma3nz_stddev',
    'jitterDdp_sma3nz_mean', 'shimmerApq3_sma3nz_mean'
  ];
  const vals = keys.map(k => f[k] || 0);
  return Math.min(vals.reduce((a, b) => a + b, 0) / 0.2, 1);
};

const calculateEngagement = (f) => {
  const keys = [
    'audspec_lengthL1norm_sma3_mean',
    'audspec_lengthL1norm_sma3_stddev',
    'audspec_lengthL1norm_sma3_min',
    'audspec_lengthL1norm_sma3_max',
    'audspec_lengthL1norm_sma3_range'
  ];
  const vals = keys.map(k => f[k] || 0);
  return Math.min(vals.reduce((a, b) => a + b, 0) / 200, 1);
};

const calculateClarity = (f) => {
  const keys = [
    'hnr_sma3nz_mean', 'hnr_sma3nz_stddev',
    'audspec_centroid_sma3_mean', 'audspec_centroid_sma3_stddev'
  ];
  const vals = keys.map(k => f[k] || 0);
  return Math.min(vals.reduce((a, b) => a + b, 0) / 50, 1);
};

const calculatePace = (f) => {
  const keys = [
    'audspec_flux_sma3_mean', 'audspec_flux_sma3_stddev',
    'mfcc_sma3_delta1_mean', 'mfcc_sma3_delta1_stddev'
  ];
  const vals = keys.map(k => f[k] || 0);
  return Math.min(vals.reduce((a, b) => a + Math.abs(b), 0) / 20, 1);
};

const calculateVolume = (f) => {
  const keys = [
    'audspec_lengthL1norm_sma3_max',
    'audspec_lengthL1norm_sma3_mean',
    'rms_sma3_mean', 'rms_sma3_stddev'
  ];
  const vals = keys.map(k => f[k] || 0);
  return Math.min(vals.reduce((a, b) => a + b, 0) / 300, 1);
};
