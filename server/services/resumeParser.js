import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const parseResume = async (filePath) => {
    try {
        // Extract text from PDF using pdftotext
        const extractedText = await extractFromPDF(filePath);
        
        // Return simple object with raw text
        return {
            rawText: extractedText,
            name: extractBasicName(extractedText)
        };
        
    } catch (error) {
        console.error('Error parsing resume:', error);
        throw error;
    }
};

const extractFromPDF = async (filePath) => {
    try {
        console.log('Extracting text from PDF:', filePath);
        
        // Use pdftotext directly
        const { stdout } = await execAsync(`pdftotext "${filePath}" -`);
        
        if (!stdout || !stdout.trim()) {
            throw new Error('No text extracted from PDF');
        }
        
        return stdout;
    } catch (error) {
        console.error('pdftotext failed:', error.message);
        throw new Error(`PDF parsing failed: ${error.message}.`);
    }
};


const extractBasicName = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        // Look for patterns that indicate a name
        if (line.match(/^[A-Z][a-z]+ [A-Z][a-z]+/) && 
            !line.toLowerCase().includes('resume') && 
            !line.toLowerCase().includes('cv') &&
            !line.toLowerCase().includes('phone') &&
            !line.toLowerCase().includes('email') &&
            !line.toLowerCase().includes('linkedin') &&
            !line.toLowerCase().includes('github') &&
            !line.toLowerCase().includes('portfolio')) {
            return line;
        }
    }
    return 'Unknown';
};

export default parseResume; 