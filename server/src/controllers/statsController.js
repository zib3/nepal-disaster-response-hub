import Disaster from '../models/Disaster.js';
import Alert from '../models/Alert.js';
import User from '../models/User.js';

// @desc    Get dashboard statistics
// @route   GET /api/stats/dashboard
// @access  Private
export const getDashboardStats = async (req, res) => {
    try {
        // Get active disasters count
        const activeDisasters = await Disaster.countDocuments({ 
            severity: { $in: ['Critical', 'High', 'Medium'] } 
        });

        // Get total people affected
        const peopleAffectedResult = await Disaster.aggregate([
            { $group: { _id: null, total: { $sum: '$affected' } } }
        ]);
        const peopleAffected = peopleAffectedResult.length > 0 ? peopleAffectedResult[0].total : 0;

        // Get active response teams (users with responder role)
        const responseTeams = await User.countDocuments({ 
            role: 'responder', 
            isActive: true 
        });

        // Calculate average response time (mock data for now)
        const avgResponseTime = '14 min';

        const stats = {
            activeDisasters: {
                value: activeDisasters.toString(),
                change: '+3', // This could be calculated based on time period
                description: 'Currently monitored events'
            },
            peopleAffected: {
                value: peopleAffected.toLocaleString(),
                change: '+1,234',
                description: 'Requiring assistance'
            },
            responseTeams: {
                value: responseTeams.toString(),
                change: '+5',
                description: 'Deployed in field'
            },
            avgResponseTime: {
                value: avgResponseTime,
                change: '-2 min',
                description: 'Emergency response'
            }
        };

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get disaster statistics by type
// @route   GET /api/stats/disasters-by-type
// @access  Private
export const getDisastersByType = async (req, res) => {
    try {
        const stats = await Disaster.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalAffected: { $sum: '$affected' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};
