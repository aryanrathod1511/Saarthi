import React from 'react';
import { Upload, FileText } from 'lucide-react';

const ResumeUpload = ({ selectedFile, onFileSelect }) => {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <FileText className="w-5 h-5 mr-2 text-blue-600" />
        Resume Upload
      </h3>
      
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          accept=".pdf"
          onChange={onFileSelect}
          className="hidden"
          id="resume-upload"
        />
        <label htmlFor="resume-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            {selectedFile ? selectedFile.name : 'Click to upload your resume (PDF)'}
          </p>
          <p className="text-sm text-gray-500">
            {selectedFile ? 'File selected successfully' : 'Supports PDF format only'}
          </p>
        </label>
      </div>
    </div>
  );
};

export default ResumeUpload; 