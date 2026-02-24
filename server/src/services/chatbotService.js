import natural from 'natural';
import ChatConversation from '../models/ChatConversation.js';
import logger from '../config/logger.js';

class ChatbotService {
    constructor() {
        // Initialize tokenizer and sentiment analyzer
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        this.sentiment = null; // Initialize later if needed

        // Emergency keywords for intent recognition
        this.emergencyIntents = {
            medical_emergency: {
                keywords: ['injured', 'hurt', 'bleeding', 'unconscious', 'heart attack', 'stroke', 'medical', 'doctor', 'hospital', 'ambulance', 'sick'],
                urgency: 'critical',
                response: 'This sounds like a medical emergency. I\'m alerting emergency services immediately.'
            },
            fire_emergency: {
                keywords: ['fire', 'burning', 'smoke', 'explosion', 'flames'],
                urgency: 'critical',
                response: 'Fire emergency detected. Fire department is being notified immediately.'
            },
            flood_emergency: {
                keywords: ['flood', 'water', 'drowning', 'rising water', 'evacuation', 'trapped'],
                urgency: 'high',
                response: 'Flood emergency identified. Rescue teams are being alerted.'
            },
            earthquake: {
                keywords: ['earthquake', 'shaking', 'tremor', 'building collapse', 'aftershock'],
                urgency: 'critical',
                response: 'Earthquake emergency. Stay safe and move to open area if possible. Help is being dispatched.'
            },
            landslide: {
                keywords: ['landslide', 'mudslide', 'rocks falling', 'hill collapse'],
                urgency: 'high',
                response: 'Landslide emergency detected. Evacuation may be necessary.'
            },
            general_help: {
                keywords: ['help', 'emergency', 'urgent', 'danger', 'scared', 'trapped'],
                urgency: 'medium',
                response: 'I understand you need help. Let me gather some information to assist you better.'
            },
            shelter: {
                keywords: ['shelter', 'homeless', 'lost', 'nowhere to go', 'safe place'],
                urgency: 'medium',
                response: 'I can help you find nearby shelters and safe locations.'
            },
            food_water: {
                keywords: ['hungry', 'food', 'water', 'thirsty', 'supplies'],
                urgency: 'medium',
                response: 'I can direct you to nearby food distribution points and water sources.'
            },
            information: {
                keywords: ['what', 'how', 'when', 'where', 'info', 'update', 'status'],
                urgency: 'low',
                response: 'I can provide you with current information about the situation.'
            }
        };

        // Predefined responses for common queries
        this.responses = {
            greeting: [
                'Hello! I\'m here to help with emergency information and assistance.',
                'Hi there! How can I assist you during this emergency?',
                'Greetings! I\'m your emergency response assistant. What do you need help with?'
            ],
            location_request: 'Could you please share your current location? This will help me provide more accurate assistance.',
            safety_tips: {
                earthquake: 'Drop, Cover, and Hold On. Get under sturdy furniture and protect your head and neck.',
                flood: 'Move to higher ground immediately. Avoid walking or driving through floodwater.',
                fire: 'Exit the building immediately. Stay low to avoid smoke. Call fire department.',
                general: 'Stay calm, find a safe location, and follow official evacuation orders if any.'
            },
            emergency_contacts: {
                police: '100',
                fire: '101', 
                ambulance: '102',
                disaster_helpline: '1144'
            }
        };

        // Nepal provinces and major districts for location understanding
        this.nepalLocations = {
            'bagmati': ['kathmandu', 'lalitpur', 'bhaktapur', 'chitwan', 'nuwakot'],
            'gandaki': ['kaski', 'gorkha', 'lamjung', 'parbat'],
            'koshi': ['morang', 'sunsari', 'jhapa', 'ilam'],
            'madhesh': ['parsa', 'bara', 'rautahat', 'saptari', 'siraha'],
            'lumbini': ['rupandehi', 'kapilvastu', 'dang', 'banke'],
            'karnali': ['surkhet', 'dailekh', 'jumla'],
            'sudurpaschim': ['kailali', 'kanchanpur', 'doti']
        };
    }

    async processMessage(sessionId, userMessage, userInfo = {}) {
        try {
            const startTime = Date.now();
            
            // Get or create conversation
            let conversation = await this.getOrCreateConversation(sessionId, userInfo);
            
            // Analyze the message
            const analysis = this.analyzeMessage(userMessage, conversation.context);
            
            // Generate response
            const response = await this.generateResponse(analysis, conversation);
            
            // Update conversation
            const responseTime = Date.now() - startTime;
            conversation = await this.updateConversation(
                conversation, 
                userMessage, 
                response, 
                analysis,
                responseTime
            );

            // Handle emergency actions if needed
            if (analysis.urgency === 'critical') {
                await this.handleEmergencyEscalation(conversation, analysis);
            }

            return {
                message: response.content,
                responseType: response.type,
                urgency: analysis.urgency,
                intent: analysis.intent,
                followUp: response.followUp,
                quickReplies: response.quickReplies,
                metadata: {
                    sessionId,
                    responseTime,
                    confidence: analysis.confidence
                }
            };

        } catch (error) {
            logger.error('Error processing chatbot message:', error.message);
            return {
                message: 'I apologize, but I\'m experiencing technical difficulties. For immediate emergency assistance, please call 100 (Police), 101 (Fire), or 102 (Ambulance).',
                responseType: 'text',
                urgency: 'low',
                intent: 'error'
            };
        }
    }

    analyzeMessage(message, context = {}) {
        const tokens = this.tokenizer.tokenize(message.toLowerCase());
        const stemmedTokens = tokens.map(token => this.stemmer.stem(token));
        
        let bestMatch = { intent: 'general_help', confidence: 0, urgency: 'low' };
        
        // Check for emergency intents
        for (const [intent, config] of Object.entries(this.emergencyIntents)) {
            let matchCount = 0;
            for (const keyword of config.keywords) {
                if (stemmedTokens.some(token => 
                    this.stemmer.stem(keyword).includes(token) || 
                    token.includes(this.stemmer.stem(keyword)))) {
                    matchCount++;
                }
            }
            
            const confidence = matchCount / config.keywords.length;
            if (confidence > bestMatch.confidence) {
                bestMatch = {
                    intent,
                    confidence,
                    urgency: config.urgency,
                    keywords: config.keywords.filter(k => 
                        stemmedTokens.some(t => this.stemmer.stem(k).includes(t)))
                };
            }
        }

        // Extract location if mentioned
        const location = this.extractLocation(message);
        
        // Analyze sentiment (simplified)
        const negativeWords = ['bad', 'terrible', 'awful', 'scared', 'help', 'emergency', 'urgent'];
        const positiveWords = ['good', 'thanks', 'okay', 'fine', 'safe'];
        
        const negCount = tokens.filter(t => negativeWords.includes(t.toLowerCase())).length;
        const posCount = tokens.filter(t => positiveWords.includes(t.toLowerCase())).length;
        const sentimentScore = posCount - negCount;
        
        return {
            ...bestMatch,
            location,
            sentiment: sentimentScore > 0 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral',
            entities: this.extractEntities(message, tokens),
            rawTokens: tokens
        };
    }

    extractLocation(message) {
        const lowerMessage = message.toLowerCase();
        
        for (const [province, districts] of Object.entries(this.nepalLocations)) {
            if (lowerMessage.includes(province)) {
                const district = districts.find(d => lowerMessage.includes(d));
                return { province, district: district || null };
            }
            
            const foundDistrict = districts.find(d => lowerMessage.includes(d));
            if (foundDistrict) {
                return { province, district: foundDistrict };
            }
        }
        
        return null;
    }

    extractEntities(message, tokens) {
        const entities = [];
        
        // Extract numbers (could be casualties, people affected, etc.)
        const numbers = message.match(/\d+/g);
        if (numbers) {
            entities.push({ type: 'number', values: numbers.map(Number) });
        }
        
        // Extract time references
        const timeKeywords = ['now', 'urgent', 'immediately', 'quickly', 'asap'];
        const timeFound = timeKeywords.filter(keyword => 
            tokens.some(token => token.toLowerCase().includes(keyword)));
        if (timeFound.length > 0) {
            entities.push({ type: 'urgency', values: timeFound });
        }
        
        return entities;
    }

    async generateResponse(analysis, conversation) {
        const { intent, urgency, location, confidence } = analysis;
        
        let response = {
            content: '',
            type: 'text',
            followUp: null,
            quickReplies: []
        };

        // Handle based on intent
        if (this.emergencyIntents[intent]) {
            response.content = this.emergencyIntents[intent].response;
            
            if (urgency === 'critical') {
                response.content += ' Please stay on the line while I connect you with emergency services.';
                response.followUp = 'emergency_escalation';
            }
        }

        // Add location-specific information if available
        if (location) {
            response.content += ` I see you're in ${location.district || location.province}. `;
            
            // Add local emergency contacts or shelters info
            const localInfo = await this.getLocalEmergencyInfo(location);
            if (localInfo) {
                response.content += localInfo;
            }
        }

        // Add safety tips based on emergency type
        if (intent in this.responses.safety_tips) {
            response.content += `\\n\\nSafety tip: ${this.responses.safety_tips[intent]}`;
        }

        // Add quick replies for common follow-ups
        response.quickReplies = this.getQuickReplies(intent, conversation.context);

        // If no specific response, provide general help
        if (!response.content) {
            response.content = this.getGeneralHelpResponse(analysis);
        }

        return response;
    }

    getQuickReplies(intent, context) {
        const commonReplies = [
            { text: 'I need medical help', intent: 'medical_emergency' },
            { text: 'Find nearest shelter', intent: 'shelter' },
            { text: 'Emergency contacts', intent: 'contacts' },
            { text: 'Safety tips', intent: 'safety' }
        ];

        switch (intent) {
            case 'medical_emergency':
                return [
                    { text: 'Call ambulance now', action: 'call_ambulance' },
                    { text: 'First aid tips', intent: 'first_aid' }
                ];
            case 'shelter':
                return [
                    { text: 'Nearest shelter', action: 'find_shelter' },
                    { text: 'Food distribution', intent: 'food_water' }
                ];
            default:
                return commonReplies.slice(0, 3);
        }
    }

    async getLocalEmergencyInfo(location) {
        // This would typically query a database of local emergency resources
        // For now, return generic info
        return `Local emergency services in ${location.district || location.province} have been notified.`;
    }

    getGeneralHelpResponse(analysis) {
        if (analysis.confidence < 0.3) {
            return "I want to help you, but I'm not sure what specific assistance you need. Could you please tell me more about your situation? For immediate emergencies, call 100 (Police), 101 (Fire), or 102 (Ambulance).";
        }
        
        return "I'm here to help with emergency assistance. Please let me know what kind of help you need - medical, shelter, safety information, or other emergency support.";
    }

    async getOrCreateConversation(sessionId, userInfo) {
        let conversation = await ChatConversation.findOne({ sessionId });
        
        if (!conversation) {
            conversation = new ChatConversation({
                sessionId,
                userInfo,
                messages: [],
                context: { currentStep: 'initial' },
                analytics: { totalMessages: 0 }
            });
            await conversation.save();
        }
        
        return conversation;
    }

    async updateConversation(conversation, userMessage, response, analysis, responseTime) {
        conversation.messages.push(
            {
                role: 'user',
                content: userMessage,
                intent: { name: analysis.intent, confidence: analysis.confidence },
                entities: analysis.entities || []
            },
            {
                role: 'assistant',
                content: response.content,
                response_type: response.type,
                metadata: { responseTime, processed: true }
            }
        );

        conversation.analytics.totalMessages += 2;
        conversation.analytics.averageResponseTime = 
            (conversation.analytics.averageResponseTime + responseTime) / 2;

        if (analysis.urgency === 'critical') {
            conversation.userInfo.urgencyLevel = 'critical';
            conversation.userInfo.emergencyType = analysis.intent;
        }

        if (analysis.location) {
            conversation.userInfo.location = {
                province: analysis.location.province,
                district: analysis.location.district
            };
        }

        await conversation.save();
        return conversation;
    }

    async handleEmergencyEscalation(conversation, analysis) {
        try {
            // Log critical emergency
            logger.warn(`Critical emergency detected: ${analysis.intent} - Session: ${conversation.sessionId}`);
            
            // Update conversation context
            conversation.context.escalatedToHuman = true;
            conversation.context.emergencyAction = 'alert_sent';
            
            // In a real system, this would trigger:
            // 1. Alert emergency services
            // 2. Notify response teams
            // 3. Create incident report
            // 4. Send SMS/email alerts
            
            await conversation.save();
            
            return true;
        } catch (error) {
            logger.error('Error handling emergency escalation:', error.message);
            return false;
        }
    }

    async getConversationHistory(sessionId, limit = 20) {
        try {
            const conversation = await ChatConversation.findOne({ sessionId });
            if (!conversation) return [];
            
            return conversation.messages
                .slice(-limit)
                .map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    intent: msg.intent
                }));
        } catch (error) {
            logger.error('Error fetching conversation history:', error.message);
            return [];
        }
    }

    async getActiveEmergencies() {
        try {
            return await ChatConversation.find({
                'userInfo.urgencyLevel': { $in: ['high', 'critical'] },
                status: 'active',
                'context.escalatedToHuman': false
            }).sort({ updatedAt: -1 }).limit(50);
        } catch (error) {
            logger.error('Error fetching active emergencies:', error.message);
            return [];
        }
    }
}

export default new ChatbotService();
