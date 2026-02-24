import mongoose from 'mongoose';

const chatConversationSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // Can be null for anonymous users
    },
    userInfo: {
        location: {
            province: String,
            district: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },
        emergencyType: String,
        urgencyLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'low'
        }
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant', 'system'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        intent: {
            name: String,
            confidence: Number
        },
        entities: [{
            entity: String,
            value: String,
            confidence: Number
        }],
        response_type: {
            type: String,
            enum: ['text', 'quick_reply', 'image', 'location', 'contact'],
            default: 'text'
        },
        metadata: {
            responseTime: Number, // ms
            nlpProvider: String,
            processed: { type: Boolean, default: false }
        }
    }],
    context: {
        currentStep: String,
        collectedData: mongoose.Schema.Types.Mixed,
        followUpRequired: { type: Boolean, default: false },
        escalatedToHuman: { type: Boolean, default: false },
        emergencyAction: {
            type: String,
            enum: ['none', 'alert_sent', 'responder_notified', 'emergency_services_called']
        }
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned', 'escalated'],
        default: 'active'
    },
    analytics: {
        totalMessages: { type: Number, default: 0 },
        averageResponseTime: { type: Number, default: 0 },
        satisfactionRating: {
            type: Number,
            min: 1,
            max: 5
        },
        resolvedSuccessfully: { type: Boolean, default: false }
    },
    tags: [String], // For categorization
    language: { type: String, default: 'en' }
}, {
    timestamps: true
});

// Indexes for efficient queries  
// sessionId already has unique index from schema definition
chatConversationSchema.index({ userId: 1 });
chatConversationSchema.index({ status: 1, createdAt: -1 });
chatConversationSchema.index({ 'userInfo.emergencyType': 1 });
chatConversationSchema.index({ 'context.emergencyAction': 1 });

export default mongoose.model('ChatConversation', chatConversationSchema);
