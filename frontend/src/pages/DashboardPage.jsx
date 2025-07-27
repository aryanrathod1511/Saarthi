import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import authService from '../services/authService.js';
import { 
    BarChart3, 
    Clock, 
    CheckCircle, 
    XCircle, 
    TrendingUp,
    Calendar,
    Target,
    Award
} from 'lucide-react';
import { LoadingSpinner } from '../components/common';

const DashboardPage = () => {
    const { user } = useAuth();
    const [interviewHistory, setInterviewHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalInterviews: 0,
        completedInterviews: 0,
        averageScore: 0,
        totalTime: 0
    });

    useEffect(() => {
        fetchInterviewHistory();
    }, []);

    const fetchInterviewHistory = async () => {
        try {
            const response = await authService.getInterviewHistory();
            setInterviewHistory(response.interviews || []);
            
            // Calculate stats
            const total = response.interviews?.length || 0;
            const completed = response.interviews?.filter(i => i.status === 'completed').length || 0;
            const scores = response.interviews?.filter(i => i.overallScore > 0).map(i => i.overallScore) || [];
            const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            const totalTime = response.interviews?.reduce((sum, i) => sum + (i.duration || 0), 0) || 0;

            setStats({
                totalInterviews: total,
                completedInterviews: completed,
                averageScore: Math.round(averageScore),
                totalTime: Math.round(totalTime)
            });
        } catch (error) {
            console.error('Error fetching interview history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-50';
            case 'in-progress': return 'text-blue-600 bg-blue-50';
            case 'pending': return 'text-yellow-600 bg-yellow-50';
            case 'cancelled': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4" />;
            case 'in-progress': return <Clock className="w-4 h-4" />;
            case 'pending': return <Clock className="w-4 h-4" />;
            case 'cancelled': return <XCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Welcome Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Welcome back, {user?.name}!
                </h1>
                <p className="text-gray-600">
                    Here's your interview preparation progress and recent activity.
                </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Interviews</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.totalInterviews}</p>
                        </div>
                        <BarChart3 className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Completed</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.completedInterviews}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Average Score</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.averageScore}%</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-purple-500" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Time</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.totalTime}m</p>
                        </div>
                        <Clock className="w-8 h-8 text-orange-500" />
                    </div>
                </div>
            </motion.div>

            {/* Recent Interviews */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">Recent Interviews</h2>
                </div>
                
                <div className="divide-y divide-gray-200">
                    {interviewHistory.length === 0 ? (
                        <div className="px-6 py-8 text-center">
                            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews yet</h3>
                            <p className="text-gray-600 mb-4">
                                Start your first interview to see your progress here.
                            </p>
                            <a
                                href="/interview"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Start Interview
                            </a>
                        </div>
                    ) : (
                        interviewHistory.slice(0, 5).map((interview) => (
                            <div key={interview._id} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                                <span className="text-white font-medium text-sm">
                                                    {interview.type?.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900">
                                                {interview.companyInfo?.name || 'Practice Interview'}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {interview.companyInfo?.role || interview.type} • {interview.companyInfo?.level || 'All Levels'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                                            {getStatusIcon(interview.status)}
                                            <span className="ml-1 capitalize">{interview.status}</span>
                                        </span>
                                        {interview.overallScore > 0 && (
                                            <span className="text-sm font-medium text-gray-900">
                                                {interview.overallScore}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DashboardPage;
