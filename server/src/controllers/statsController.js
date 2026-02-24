import Disaster from '../models/Disaster.js';
import Alert from '../models/Alert.js';
import User from '../models/User.js';

// @desc    Get dashboard statistics
// @route   GET /api/stats/dashboard
// @access  Private
export const getDashboardStats = async (req, res) => {
    try {
        // Get previous period (7 days ago)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        // Get active disasters count
        const [activeDisasters, prevActiveDisasters] = await Promise.all([
            Disaster.countDocuments({ 
                severity: { $in: ['Critical', 'High', 'Medium'] } 
            }),
            Disaster.countDocuments({ 
                severity: { $in: ['Critical', 'High', 'Medium'] },
                createdAt: { $lte: sevenDaysAgo }
            })
        ]);

        // Get total people affected
        const [currentAffectedResult, prevAffectedResult] = await Promise.all([
            Disaster.aggregate([
                { $group: { _id: null, total: { $sum: '$affected.totalAffected' } } }
            ]),
            Disaster.aggregate([
                { $match: { createdAt: { $lte: sevenDaysAgo } } },
                { $group: { _id: null, total: { $sum: '$affected.totalAffected' } } }
            ])
        ]);
        
        const peopleAffected = currentAffectedResult.length > 0 ? currentAffectedResult[0].total : 0;
        const prevPeopleAffected = prevAffectedResult.length > 0 ? prevAffectedResult[0].total : 0;

        // Get active response teams (users with responder role)
        const [responseTeams, prevResponseTeams] = await Promise.all([
            User.countDocuments({ 
                role: 'responder', 
                isActive: true 
            }),
            User.countDocuments({ 
                role: 'responder', 
                isActive: true,
                createdAt: { $lte: sevenDaysAgo }
            })
        ]);

        // Calculate average response time from alerts
        const [currentResponseTime, prevResponseTime] = await Promise.all([
            Alert.aggregate([
                { 
                    $match: { 
                        responseTime: { $exists: true } 
                    } 
                },
                { 
                    $group: { 
                        _id: null, 
                        avgTime: { $avg: '$responseTime' } 
                    } 
                }
            ]),
            Alert.aggregate([
                { 
                    $match: { 
                        responseTime: { $exists: true },
                        createdAt: { $lte: sevenDaysAgo }
                    } 
                },
                { 
                    $group: { 
                        _id: null, 
                        avgTime: { $avg: '$responseTime' } 
                    } 
                }
            ])
        ]);

        const avgResponseTime = currentResponseTime.length > 0 ? 
            Math.round(currentResponseTime[0].avgTime) : 0;
        const prevAvgResponseTime = prevResponseTime.length > 0 ? 
            Math.round(prevResponseTime[0].avgTime) : 0;

        // Calculate changes
        const changes = {
            disasters: activeDisasters - prevActiveDisasters,
            affected: peopleAffected - prevPeopleAffected,
            teams: responseTeams - prevResponseTeams,
            responseTime: prevAvgResponseTime - avgResponseTime // Negative means improvement
        };

        const stats = {
            activeDisasters,
            peopleAffected,
            responseTeams,
            avgResponseTime,
            changes
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
                    totalAffected: { $sum: '$affected.totalAffected' }
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
