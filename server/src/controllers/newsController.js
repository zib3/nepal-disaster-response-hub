import NewsArticle from '../models/NewsArticle.js';
import Disaster from '../models/Disaster.js';

// @desc    Get all news articles with filtering and pagination
// @route   GET /api/news
// @access  Public
export const getNews = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Build filter object
        let filter = {};
        if (req.query.category) filter.category = req.query.category;
        if (req.query.priority) filter.priority = req.query.priority;
        if (req.query.province) filter['location.province'] = req.query.province;
        if (req.query.verified) filter.isVerified = req.query.verified === 'true';
        if (req.query.tags) filter.tags = { $in: req.query.tags.split(',') };

        // Date range filter
        if (req.query.from || req.query.to) {
            filter.publishedAt = {};
            if (req.query.from) filter.publishedAt.$gte = new Date(req.query.from);
            if (req.query.to) filter.publishedAt.$lte = new Date(req.query.to);
        }

        const total = await NewsArticle.countDocuments(filter);
        const news = await NewsArticle.find(filter)
            .populate('createdBy', 'name organization')
            .populate('verifiedBy', 'name')
            .populate('relatedDisasters', 'title type location')
            .sort({ publishedAt: -1, priority: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: news.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: news
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get breaking news
// @route   GET /api/news/breaking
// @access  Public
export const getBreakingNews = async (req, res) => {
    try {
        const news = await NewsArticle.find({
            category: 'Breaking',
            publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        })
            .populate('createdBy', 'name organization')
            .populate('relatedDisasters', 'title type location')
            .sort({ publishedAt: -1, priority: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            count: news.length,
            data: news
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Create news article
// @route   POST /api/news
// @access  Private (Admin/Coordinator)
export const createNews = async (req, res) => {
    try {
        const newsData = {
            ...req.body,
            createdBy: req.user.id
        };

        // Auto-generate excerpt if not provided
        if (!newsData.excerpt && newsData.content) {
            newsData.excerpt = newsData.content.substring(0, 200) + '...';
        }

        const news = await NewsArticle.create(newsData);
        
        // Populate the response
        const populatedNews = await NewsArticle.findById(news._id)
            .populate('createdBy', 'name organization')
            .populate('relatedDisasters', 'title type location');

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to('disaster-monitoring').emit('news-update', {
                type: 'new',
                data: populatedNews
            });

            // If it's breaking news, send urgent notification
            if (news.category === 'Breaking' || news.priority === 'Critical') {
                io.to('disaster-monitoring').emit('breaking-news', populatedNews);
                
                // Send as notification to all users
                io.emit('news-update', {
                    id: news._id,
                    title: news.title,
                    isBreaking: news.category === 'Breaking',
                    priority: news.priority
                });
            }
        }

        res.status(201).json({
            success: true,
            data: populatedNews
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get single news article and increment views
// @route   GET /api/news/:id
// @access  Public
export const getNewsById = async (req, res) => {
    try {
        const news = await NewsArticle.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        )
            .populate('createdBy', 'name organization')
            .populate('verifiedBy', 'name')
            .populate('relatedDisasters', 'title type location');

        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'News article not found'
            });
        }

        res.status(200).json({
            success: true,
            data: news
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Update news article
// @route   PUT /api/news/:id
// @access  Private (Admin/Coordinator/Creator)
export const updateNews = async (req, res) => {
    try {
        let news = await NewsArticle.findById(req.params.id);

        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'News article not found'
            });
        }

        // Check ownership or admin rights
        if (news.createdBy.toString() !== req.user.id && !['admin', 'coordinator'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this news article'
            });
        }

        news = await NewsArticle.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('createdBy', 'name organization')
            .populate('verifiedBy', 'name')
            .populate('relatedDisasters', 'title type location');

        // Emit real-time update
        const io = req.app.get('io');
        io.to('disaster-monitoring').emit('news-updated', news);

        res.status(200).json({
            success: true,
            data: news
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Verify news article
// @route   PUT /api/news/:id/verify
// @access  Private (Admin/Coordinator)
export const verifyNews = async (req, res) => {
    try {
        const news = await NewsArticle.findByIdAndUpdate(
            req.params.id,
            {
                isVerified: true,
                verifiedBy: req.user.id
            },
            { new: true }
        )
            .populate('createdBy', 'name organization')
            .populate('verifiedBy', 'name');

        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'News article not found'
            });
        }

        res.status(200).json({
            success: true,
            data: news,
            message: 'News article verified successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Delete news article
// @route   DELETE /api/news/:id
// @access  Private (Admin/Creator)
export const deleteNews = async (req, res) => {
    try {
        const news = await NewsArticle.findById(req.params.id);

        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'News article not found'
            });
        }

        // Check ownership or admin rights
        if (news.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this news article'
            });
        }

        await NewsArticle.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'News article deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Search news articles
// @route   GET /api/news/search
// @access  Public
export const searchNews = async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const skip = (page - 1) * limit;

        const searchFilter = {
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { content: { $regex: q, $options: 'i' } },
                { tags: { $regex: q, $options: 'i' } },
                { 'source.name': { $regex: q, $options: 'i' } }
            ]
        };

        const total = await NewsArticle.countDocuments(searchFilter);
        const news = await NewsArticle.find(searchFilter)
            .populate('createdBy', 'name organization')
            .populate('relatedDisasters', 'title type location')
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: news.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: news,
            query: q
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};
