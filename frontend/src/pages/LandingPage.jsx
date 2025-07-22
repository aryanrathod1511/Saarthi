import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Mic, 
  Brain, 
  BarChart3, 
  Zap, 
  ArrowRight,
  Play,
  Star,
  Sparkles
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50/30" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300/20 rounded-full blur-3xl animate-pulse-gentle" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl animate-pulse-gentle" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl animate-pulse-gentle" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Powered by Google Gemini AI</span>
            </div>
            
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white font-bold text-2xl">S</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">
                Saarthi
              </h1>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              Your AI Interview Companion
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Experience the future of interview preparation with our AI-powered platform. 
              Get personalized questions, real-time feedback, and comprehensive analysis 
              to ace your next interview.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Link 
              to="/interview" 
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 group shadow-lg"
            >
              <Play className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
              Start Free Interview
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link 
              to="/dashboard" 
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-blue-600 text-blue-600 text-lg font-semibold rounded-xl hover:bg-blue-50 transition-all duration-300"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              View Demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Mic className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                10K+
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Interviews Conducted
              </div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                95%
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Success Rate
              </div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                4.9
              </div>
              <div className="text-sm text-gray-600 font-medium">
                User Rating
              </div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                &lt; 5min
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Setup Time
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;