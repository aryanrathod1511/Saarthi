import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    picture: {
        type: String,
        default: null
    },
    provider: {
        type: String,
        enum: ['google'],
        default: 'google'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    interviewHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Interview'
    }],
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light'
        },
        notifications: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true
});

// Note: Indexes are automatically created by unique: true in schema definition

// Virtual for user's full profile
userSchema.virtual('profile').get(function() {
    return {
        id: this._id,
        email: this.email,
        name: this.name,
        picture: this.picture,
        provider: this.provider,
        isActive: this.isActive,
        lastLogin: this.lastLogin,
        preferences: this.preferences,
        createdAt: this.createdAt
    };
});

// Method to update last login
userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Method to add interview to history
userSchema.methods.addInterviewToHistory = function(interviewId) {
    if (!this.interviewHistory.includes(interviewId)) {
        this.interviewHistory.push(interviewId);
        return this.save();
    }
    return Promise.resolve(this);
};

const User = mongoose.model('User', userSchema);

export default User; 