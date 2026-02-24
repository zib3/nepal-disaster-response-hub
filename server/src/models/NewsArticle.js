import mongoose from 'mongoose';

const newsArticleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'News title is required'],
        trim: true
    },
    content: {
        type: String,
        required: [true, 'News content is required'],
        trim: true
    },
    excerpt: {
        type: String,
        trim: true,
        maxlength: 200
    },
    category: {
        type: String,
        enum: ['Breaking', 'Update', 'Recovery', 'Prevention', 'Analysis'],
        default: 'Update'
    },
    priority: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low'],
        default: 'Medium'
    },
    tags: [{
        type: String,
        trim: true
    }],
    location: {
        province: String,
        district: String,
        municipality: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    relatedDisasters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Disaster'
    }],
    source: {
        name: String,
        url: String,
        type: {
            type: String,
            enum: ['Official', 'Media', 'Social', 'Field Report'],
            default: 'Official'
        }
    },
    images: [{
        url: String,
        caption: String,
        credit: String
    }],
    publishedAt: {
        type: Date,
        default: Date.now
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    views: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient searching
newsArticleSchema.index({ publishedAt: -1 });
newsArticleSchema.index({ category: 1, priority: -1 });
newsArticleSchema.index({ tags: 1 });
newsArticleSchema.index({ 'location.province': 1 });

export default mongoose.model('NewsArticle', newsArticleSchema);
