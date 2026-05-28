import fetch from 'node-fetch';

/**
 * Advanced NLP Engine for Emergency Text Analysis
 * Integrates multiple AI/ML models for comprehensive text understanding
 */
class NLPEngine {
    constructor() {
        this.models = {
            // Hugging Face Transformers API
            sentiment: 'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest',
            emotion: 'https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base',
            ner: 'https://api-inference.huggingface.co/models/dbmdz/bert-large-cased-finetuned-conll03-english'
        };
        
        this.apiKey = process.env.HUGGINGFACE_API_KEY || 'hf_demo_key';
        
        // In-memory cache for recent messages to reduce latency and API cost
        this.cache = new Map();
        this.maxCacheSize = 100;
        
        // Fallback rule-based patterns for offline mode
        this.fallbackPatterns = {
            urgency: {
                critical: {
                    keywords: ['dying', 'death', 'bleeding', 'unconscious', 'trapped', 'can\'t breathe', 'heart attack', 'stroke'],
                    phrases: ['going to die', 'losing consciousness', 'severe bleeding', 'can\'t move'],
                    weight: 0.95
                },
                high: {
                    keywords: ['hurt', 'injured', 'pain', 'emergency', 'urgent', 'help', 'scared', 'stuck'],
                    phrases: ['need help now', 'very scared', 'in pain', 'please hurry'],
                    weight: 0.75
                },
                medium: {
                    keywords: ['assistance', 'support', 'worried', 'concerned', 'need'],
                    phrases: ['need assistance', 'could use help', 'bit worried'],
                    weight: 0.5
                },
                low: {
                    keywords: ['check', 'update', 'status', 'information'],
                    phrases: ['just checking', 'status update'],
                    weight: 0.25
                }
            },
            emotions: {
                panic: ['panic', 'terrified', 'freaking out', 'losing it'],
                fear: ['scared', 'afraid', 'frightened', 'worried', 'anxious'],
                pain: ['hurt', 'pain', 'agony', 'suffering', 'aching'],
                desperation: ['desperate', 'hopeless', 'giving up', 'can\'t take it'],
                anger: ['angry', 'mad', 'furious', 'pissed'],
                sadness: ['sad', 'crying', 'devastated', 'heartbroken'],
                calm: ['okay', 'fine', 'stable', 'under control', 'managing']
            }
        };
    }

    /**
     * Helper to call Hugging Face Inference API with timeout and retries
     */
    async callModelAPIWithTimeoutAndRetry(url, text, retries = 2, timeoutMs = 5000) {
        let attempt = 0;
        while (attempt <= retries) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ inputs: text }),
                    signal: controller.signal
                });

                clearTimeout(timeout);

                if (response.ok) {
                    return await response.json();
                }

                // If transient server error or rate limited, we can attempt a retry
                if (response.status === 429 || response.status === 503) {
                    console.warn(`⚠️ Hugging Face API transient error ${response.status} on attempt ${attempt + 1}. Retrying...`);
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (error) {
                clearTimeout(timeout);
                if (error.name === 'AbortError') {
                    console.warn(`⚠️ Hugging Face API request timed out on attempt ${attempt + 1}. Retrying...`);
                } else {
                    console.warn(`⚠️ Hugging Face API request failed on attempt ${attempt + 1}: ${error.message}`);
                }
            }

            attempt++;
            if (attempt <= retries) {
                // Wait briefly before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, attempt * 500));
            }
        }
        throw new Error('All API retries failed.');
    }

    /**
     * Main NLP analysis function - uses multiple AI models
     */
    async analyzeEmergencyText(message) {
        console.log('🧠 Starting advanced NLP analysis...');
        
        // Check cache first
        const cached = this.cache.get(message);
        if (cached) {
            console.log('🧠 NLP cache hit for message.');
            // Return cached result with 0ms updated processingTime
            return {
                ...cached,
                processingTime: 0
            };
        }

        const analysis = {
            originalText: message,
            preprocessed: this.preprocessText(message),
            sentiment: null,
            emotion: null,
            urgency: null,
            entities: null,
            linguisticFeatures: null,
            aiConfidence: 0,
            modelUsed: 'hybrid',
            processingTime: Date.now()
        };

        try {
            // Run multiple AI models in parallel
            const [sentimentResult, emotionResult, entitiesResult] = await Promise.allSettled([
                this.analyzeSentimentWithAI(message),
                this.analyzeEmotionWithAI(message),
                this.extractEntitiesWithAI(message)
            ]);

            // Process results
            if (sentimentResult.status === 'fulfilled') {
                analysis.sentiment = sentimentResult.value;
            }
            
            if (emotionResult.status === 'fulfilled') {
                analysis.emotion = emotionResult.value;
            }
            
            if (entitiesResult.status === 'fulfilled') {
                analysis.entities = entitiesResult.value;
            }

            // Analyze urgency using custom emergency-trained logic
            analysis.urgency = await this.analyzeUrgencyWithAI(message, analysis);
            
            // Extract linguistic features
            analysis.linguisticFeatures = this.extractLinguisticFeatures(message);
            
            // Calculate overall confidence
            analysis.aiConfidence = this.calculateOverallConfidence(analysis);
            
            analysis.processingTime = Date.now() - analysis.processingTime;
            
            console.log(`✅ NLP analysis complete in ${analysis.processingTime}ms`);

            // Save to cache
            if (this.cache.size >= this.maxCacheSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            this.cache.set(message, analysis);

            return analysis;

        } catch (error) {
            console.warn('⚠️ AI models unavailable, using fallback NLP');
            return this.fallbackAnalysis(message);
        }
    }

    /**
     * Sentiment Analysis using Transformer Models
     */
    async analyzeSentimentWithAI(text) {
        try {
            const result = await this.callModelAPIWithTimeoutAndRetry(this.models.sentiment, text);
            return this.processSentimentResult(result);
        } catch (error) {
            console.warn('Sentiment API error, using fallback:', error.message);
            return this.fallbackSentimentAnalysis(text);
        }
    }

    /**
     * Emotion Detection using DistilRoBERTa
     */
    async analyzeEmotionWithAI(text) {
        try {
            const result = await this.callModelAPIWithTimeoutAndRetry(this.models.emotion, text);
            return this.processEmotionResult(result);
        } catch (error) {
            console.warn('Emotion API error, using fallback:', error.message);
            return this.fallbackEmotionAnalysis(text);
        }
    }

    /**
     * Named Entity Recognition using BERT
     */
    async extractEntitiesWithAI(text) {
        try {
            const result = await this.callModelAPIWithTimeoutAndRetry(this.models.ner, text);
            return this.processNERResult(result);
        } catch (error) {
            console.warn('NER API error, using fallback:', error.message);
            return this.fallbackEntityExtraction(text);
        }
    }

    /**
     * Emergency-specific urgency analysis
     */
    async analyzeUrgencyWithAI(text, context) {
        // Custom emergency urgency model combining multiple signals
        const urgencyScore = this.calculateUrgencyScore(text, context);
        
        return {
            level: this.mapScoreToUrgencyLevel(urgencyScore),
            score: urgencyScore,
            factors: this.getUrgencyFactors(text, context),
            confidence: this.calculateUrgencyConfidence(text, context)
        };
    }

    /**
     * Advanced linguistic feature extraction
     */
    extractLinguisticFeatures(text) {
        const features = {
            // Basic metrics
            length: text.length,
            wordCount: text.split(/\s+/).length,
            sentenceCount: text.split(/[.!?]+/).length,
            
            // Punctuation analysis
            exclamationCount: (text.match(/!/g) || []).length,
            questionCount: (text.match(/\?/g) || []).length,
            capsCount: (text.match(/[A-Z]/g) || []).length,
            
            // Ratios
            capsRatio: (text.match(/[A-Z]/g) || []).length / text.length,
            punctuationRatio: (text.match(/[!?.,;:]/g) || []).length / text.length,
            
            // Advanced features
            repeatedWords: this.findRepeatedWords(text),
            timeExpressions: this.extractTimeExpressions(text),
            intensifiers: this.findIntensifiers(text),
            negations: this.findNegations(text),
            
            // Readability
            avgWordsPerSentence: 0,
            complexWords: this.findComplexWords(text),
            
            // Emergency-specific
            bodyParts: this.findBodyParts(text),
            locationReferences: this.findLocationReferences(text),
            actionWords: this.findActionWords(text)
        };

        features.avgWordsPerSentence = features.wordCount / Math.max(features.sentenceCount, 1);
        
        return features;
    }

    // Processing helper methods
    processSentimentResult(result) {
        if (Array.isArray(result) && result.length > 0) {
            const topResult = result[0];
            return {
                label: topResult.label,
                score: topResult.score,
                polarity: this.mapSentimentToPolarity(topResult.label),
                confidence: topResult.score
            };
        }
        return { label: 'NEUTRAL', score: 0.5, polarity: 0, confidence: 0.3 };
    }

    processEmotionResult(result) {
        if (Array.isArray(result) && result.length > 0) {
            // Sort by confidence and get top emotions
            const sortedEmotions = result.sort((a, b) => b.score - a.score);
            return {
                primary: sortedEmotions[0],
                secondary: sortedEmotions[1] || null,
                all: sortedEmotions,
                confidence: sortedEmotions[0]?.score || 0.3
            };
        }
        return { primary: { label: 'neutral', score: 0.5 }, confidence: 0.3 };
    }

    processNERResult(result) {
        if (Array.isArray(result)) {
            const entities = {
                persons: [],
                locations: [],
                organizations: [],
                miscellaneous: [],
                all: result
            };

            result.forEach(entity => {
                switch (entity.entity_group || entity.entity) {
                    case 'PER':
                    case 'PERSON':
                        entities.persons.push(entity);
                        break;
                    case 'LOC':
                    case 'LOCATION':
                        entities.locations.push(entity);
                        break;
                    case 'ORG':
                    case 'ORGANIZATION':
                        entities.organizations.push(entity);
                        break;
                    default:
                        entities.miscellaneous.push(entity);
                }
            });

            return entities;
        }
        return { persons: [], locations: [], organizations: [], miscellaneous: [], all: [] };
    }

    // Urgency calculation methods
    calculateUrgencyScore(text, context) {
        let score = 0.5; // Base score
        
        // Sentiment contribution
        if (context.sentiment) {
            if (context.sentiment.label === 'NEGATIVE') score += 0.2;
            if (context.sentiment.score > 0.8) score += 0.1;
        }
        
        // Emotion contribution
        if (context.emotion && context.emotion.primary) {
            const emotionWeights = {
                'fear': 0.3, 'anger': 0.2, 'sadness': 0.15,
                'surprise': 0.1, 'disgust': 0.1, 'joy': -0.1
            };
            score += emotionWeights[context.emotion.primary.label] || 0;
        }
        
        // Keyword-based scoring
        score += this.calculateKeywordUrgencyScore(text);
        
        // Linguistic features
        const features = this.extractLinguisticFeatures(text);
        if (features.exclamationCount > 2) score += 0.1;
        if (features.capsRatio > 0.3) score += 0.15;
        if (features.repeatedWords.length > 0) score += 0.1;
        
        return Math.min(Math.max(score, 0), 1);
    }

    calculateKeywordUrgencyScore(text) {
        const lowerText = text.toLowerCase();
        let score = 0;
        
        for (const [level, pattern] of Object.entries(this.fallbackPatterns.urgency)) {
            for (const keyword of pattern.keywords) {
                if (lowerText.includes(keyword)) {
                    score = Math.max(score, pattern.weight);
                }
            }
            for (const phrase of pattern.phrases) {
                if (lowerText.includes(phrase)) {
                    score = Math.max(score, pattern.weight * 1.2);
                }
            }
        }
        
        return Math.min(score, 0.4); // Cap keyword contribution
    }

    mapScoreToUrgencyLevel(score) {
        if (score >= 0.8) return 'critical';
        if (score >= 0.6) return 'high';
        if (score >= 0.4) return 'medium';
        return 'low';
    }

    getUrgencyFactors(text, context) {
        return {
            sentiment: context.sentiment?.label || 'unknown',
            emotion: context.emotion?.primary?.label || 'unknown',
            keywordMatches: this.getMatchedKeywords(text),
            linguisticSignals: this.getLinguisticSignals(text)
        };
    }

    calculateUrgencyConfidence(text, context) {
        let confidence = 0.5;
        
        if (context.sentiment && context.sentiment.confidence > 0.7) confidence += 0.2;
        if (context.emotion && context.emotion.confidence > 0.7) confidence += 0.2;
        if (this.getMatchedKeywords(text).length > 0) confidence += 0.1;
        
        return Math.min(confidence, 1.0);
    }

    calculateOverallConfidence(analysis) {
        const confidences = [
            analysis.sentiment?.confidence || 0.3,
            analysis.emotion?.confidence || 0.3,
            analysis.urgency?.confidence || 0.3
        ];
        
        return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    }

    // Fallback methods for offline operation
    fallbackAnalysis(message) {
        return {
            originalText: message,
            preprocessed: this.preprocessText(message),
            sentiment: this.fallbackSentimentAnalysis(message),
            emotion: this.fallbackEmotionAnalysis(message),
            urgency: this.fallbackUrgencyAnalysis(message),
            entities: this.fallbackEntityExtraction(message),
            linguisticFeatures: this.extractLinguisticFeatures(message),
            aiConfidence: 0.6,
            modelUsed: 'fallback',
            processingTime: 50
        };
    }

    fallbackSentimentAnalysis(text) {
        const positiveWords = ['good', 'fine', 'okay', 'stable', 'safe', 'better'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hurt', 'pain', 'scared', 'emergency'];
        
        const lowerText = text.toLowerCase();
        let score = 0.5;
        
        positiveWords.forEach(word => {
            if (lowerText.includes(word)) score += 0.1;
        });
        
        negativeWords.forEach(word => {
            if (lowerText.includes(word)) score -= 0.1;
        });
        
        score = Math.max(0, Math.min(1, score));
        
        return {
            label: score > 0.6 ? 'POSITIVE' : score < 0.4 ? 'NEGATIVE' : 'NEUTRAL',
            score: score,
            polarity: (score - 0.5) * 2,
            confidence: 0.6
        };
    }

    fallbackEmotionAnalysis(text) {
        const lowerText = text.toLowerCase();
        let detectedEmotion = 'neutral';
        let maxScore = 0;
        
        for (const [emotion, keywords] of Object.entries(this.fallbackPatterns.emotions)) {
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    // Deterministic score based on match
                    const score = 0.85;
                    if (score > maxScore) {
                        maxScore = score;
                        detectedEmotion = emotion;
                    }
                }
            }
        }
        
        return {
            primary: { label: detectedEmotion, score: maxScore || 0.5 },
            confidence: maxScore || 0.5
        };
    }

    fallbackUrgencyAnalysis(text) {
        const score = this.calculateKeywordUrgencyScore(text);
        return {
            level: this.mapScoreToUrgencyLevel(score),
            score: score,
            factors: { keywordBased: true },
            confidence: 0.7
        };
    }

    fallbackEntityExtraction(text) {
        // Simple regex-based entity extraction
        const entities = {
            persons: [],
            locations: [],
            organizations: [],
            miscellaneous: [],
            all: []
        };
        
        // Extract potential location names (capitalized words)
        const locationPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
        const matches = text.match(locationPattern) || [];
        
        // Filter out common non-entity capitalized words
        const blacklisted = new Set([
            'Help', 'Urgent', 'Emergency', 'Please', 'Sos', 'Need', 'I', 'We', 
            'The', 'A', 'An', 'Our', 'They', 'He', 'She', 'It', 'Is', 'Are', 
            'Was', 'Were', 'Have', 'Has', 'Had', 'Trapped', 'Dying', 'Bleeding',
            'Fire', 'Flood', 'Earthquake', 'Landslide', 'Storm', 'Attention'
        ]);

        const uniqueMatches = [...new Set(matches)];
        uniqueMatches.forEach(match => {
            if (!blacklisted.has(match)) {
                const entityObj = {
                    word: match,
                    entity: 'LOCATION',
                    confidence: 0.7
                };
                entities.locations.push(entityObj);
                entities.all.push(entityObj);
            }
        });
        
        return entities;
    }

    // Utility methods
    preprocessText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s!?.,]/g, '') // Keep basic punctuation
            .trim();
    }

    mapSentimentToPolarity(label) {
        const mapping = {
            'POSITIVE': 1,
            'NEGATIVE': -1,
            'NEUTRAL': 0
        };
        return mapping[label] || 0;
    }

    findRepeatedWords(text) {
        const words = text.toLowerCase().split(/\s+/);
        const wordCount = {};
        const repeated = [];
        
        words.forEach(word => {
            if (word.length > 3) {
                wordCount[word] = (wordCount[word] || 0) + 1;
                if (wordCount[word] === 2) {
                    repeated.push(word);
                }
            }
        });
        
        return repeated;
    }

    extractTimeExpressions(text) {
        const timePatterns = [
            /\b(now|immediately|asap|urgent|quickly|fast|soon)\b/gi,
            /\b(\d+)\s*(minutes?|hours?|seconds?)\b/gi,
            /\b(right now|right away|this instant)\b/gi
        ];
        
        const matches = [];
        timePatterns.forEach(pattern => {
            const found = text.match(pattern);
            if (found) matches.push(...found);
        });
        
        return matches;
    }

    findIntensifiers(text) {
        const intensifiers = ['very', 'extremely', 'really', 'so', 'too', 'quite', 'rather', 'pretty'];
        return intensifiers.filter(word => 
            text.toLowerCase().includes(word)
        );
    }

    findNegations(text) {
        const negations = ['not', 'no', 'never', 'nothing', 'nobody', 'nowhere', 'can\'t', 'won\'t', 'don\'t'];
        return negations.filter(word => 
            text.toLowerCase().includes(word)
        );
    }

    findComplexWords(text) {
        return text.split(/\s+/).filter(word => 
            word.length > 6 && /^[a-zA-Z]+$/.test(word)
        );
    }

    findBodyParts(text) {
        const bodyParts = ['head', 'arm', 'leg', 'chest', 'back', 'neck', 'hand', 'foot', 'heart', 'lung'];
        return bodyParts.filter(part => 
            text.toLowerCase().includes(part)
        );
    }

    findLocationReferences(text) {
        const locationWords = ['building', 'house', 'room', 'floor', 'street', 'road', 'bridge', 'hospital', 'school'];
        return locationWords.filter(word => 
            text.toLowerCase().includes(word)
        );
    }

    findActionWords(text) {
        const actionWords = ['trapped', 'stuck', 'falling', 'burning', 'drowning', 'bleeding', 'running', 'hiding'];
        return actionWords.filter(word => 
            text.toLowerCase().includes(word)
        );
    }

    getMatchedKeywords(text) {
        const matches = [];
        const lowerText = text.toLowerCase();
        
        for (const [level, pattern] of Object.entries(this.fallbackPatterns.urgency)) {
            pattern.keywords.forEach(keyword => {
                if (lowerText.includes(keyword)) {
                    matches.push({ keyword, level, type: 'keyword' });
                }
            });
            pattern.phrases.forEach(phrase => {
                if (lowerText.includes(phrase)) {
                    matches.push({ keyword: phrase, level, type: 'phrase' });
                }
            });
        }
        
        return matches;
    }

    getLinguisticSignals(text) {
        const features = this.extractLinguisticFeatures(text);
        const signals = [];
        
        if (features.exclamationCount > 2) signals.push('high_exclamation');
        if (features.capsRatio > 0.3) signals.push('excessive_caps');
        if (features.repeatedWords.length > 0) signals.push('word_repetition');
        if (features.timeExpressions.length > 0) signals.push('time_urgency');
        
        return signals;
    }
}

export default NLPEngine;