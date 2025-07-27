import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['dsa', 'non-dsa', 'ai'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    companyInfo: {
        name: String,
        role: String,
        level: String
    },
    questions: [{
        question: String,
        answer: String,
        code: String,
        evaluation: {
            score: Number,
            feedback: String,
            detailedAnalysis: Object
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    overallScore: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number, // in minutes
        default: 0
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    },
    feedback: {
        strengths: [String],
        weaknesses: [String],
        suggestions: [String]
    }
}, {
    timestamps: true
});

// Index for better query performance
interviewSchema.index({ userId: 1, createdAt: -1 });
interviewSchema.index({ status: 1 });

const Interview = mongoose.model('Interview', interviewSchema);

export default Interview; 