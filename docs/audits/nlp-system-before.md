# NLP System Audit Report (Pre-Refactoring)

This document provides a detailed mapping and audit of the Natural Language Processing (NLP) pipeline in the AidFlow backend prior to refactoring, updated to include hybrid architecture justifications.

---

## 1. What Exists & Why It Exists

The NLP pipeline is designed to analyze emergency messages submitted by citizens to determine their urgency, sentiment, emotions, and mentioned entities. This intelligence is crucial for:
1. **Urgency Classification**: Sorting emergency reports by priority so high-urgency reports can trigger autonomous dispatch.
2. **Resource Allocation**: Determining the quantities and categories of emergency supplies (e.g., medical kits, rescue boats) to allocate based on emotion and sentiment features.
3. **Smart Routing**: Tuning response vehicle routing priorities using the calculated severity.

The NLP logic is divided into:
- **`nlpEngine.js`**: Orchestrates NLP queries. It attempts to make concurrent HTTP requests to the Hugging Face Inference API to run three transformer models:
  - **Sentiment**: `cardiffnlp/twitter-roberta-base-sentiment-latest`
  - **Emotion**: `j-hartmann/emotion-english-distilroberta-base`
  - **NER**: `dbmdz/bert-large-cased-finetuned-conll03-english`
- **Rule-Based Urgency Engine**: A hybrid custom algorithm inside `nlpEngine.js` that fuses the sentiment/emotion outputs with keyword/phrase matching lists and linguistic heuristics (caps ratio, exclamation count, repeated words).
- **Offline Fallback System**: A fallback implementation inside `nlpEngine.js` using basic keyword matching lists and regexes to mimic sentiment, emotion, and location detection.

---

## 2. Rationale for Layered Hybrid Architecture & Tradeoffs

The system utilizes a hybrid model where a **Transformer NLP Extraction Layer** extracts deterministic structured features, and a downstream **Groq Decision & Reasoning Layer** orchestrates dispatch and plans resources.

### Tradeoffs: Transformer Classifiers vs. Pure LLM Extraction

| Dimension | Dedicated Transformer Classifiers (RoBERTa/BERT) | Pure LLM Extraction (e.g. Groq/Llama) |
| :--- | :--- | :--- |
| **Determinism** | **High**: Outputs are stable probability distributions or fixed class tokens. Zero risk of format deviation. | **Medium-Low**: LLMs can hallucinate or output inconsistent synonyms (e.g., "panic" vs. "extreme fear") unless highly constrained. |
| **Explainability** | **High**: Intermediate signals (e.g. emotion vectors, NER tokens) are clear and directly traceable to specific classification models. | **Low**: Decisions are formed in a monolithic generation pass, hiding the specific reasoning features. |
| **Latency & Cost** | **High/Varies**: Multiple API endpoints increase network overhead. Local execution requires dedicated GPU/RAM. | **Low**: A single LLM call is made, and API pricing is based on a single prompt. |
| **Instruction Tuning** | **Not Required**: Pre-trained on specific tasks (sentiment, NER, emotion). | **Required**: Prompts must be carefully structured to avoid format breaks or leaking instructions. |

### Why Preserving the Transformer Layer is Intentional
1. **Explainable Intermediate Signals**: Emergency dispatchers need to see the exact structured inputs (like primary emotion and extracted entities) that led the AI to make a dispatch decision.
2. **Reduced Hallucinations**: Standard LLMs are prone to hallucinating location coordinates or creating non-existent resource requests. Extracting location nouns via BERT and checking keywords reduces search space.
3. **Groq's Role as Reasoning Engine**: Groq SDK is optimized for high-speed agent reasoning. Offloading classification to small, specialized classification models (RoBERTa/BERT) allows the Groq LLM to focus entirely on resource planning, spatial distance analysis, and human-readable justification.

---

## 3. Where It Is Used & Dependency Mapping

### Call Chain
```
[POST /api/emergency/request] (routes/emergency.js)
  └─► [processEmergencyRequest] (services/aiAgent.js)
        ├─► [analyzeEmergencyText] (services/nlpEngine.js)
        │     ├─► [analyzeSentimentWithAI]
        │     ├─► [analyzeEmotionWithAI]
        │     └─► [extractEntitiesWithAI]
        └─► [determineResourceNeeds] (services/aiAgent.js)
```

### Downstream Dependencies
- **Database Schema (`Emergency.js`)**: Expects `aiAnalysis.sentiment` to hold `{ urgency, emotion, keywords, score }` fields.
- **Routing Engine (`smartRouting.js`)**: Reads `aiAnalysis.severity` and `aiAnalysis.disaster.type` to calculate routing scores.
- **Decision Engine (`emergencyDecisionAgent.js`)**: Passes `bertAnalysis` (the output of the NLP/disaster analysis) to Groq prompts and uses `bertAnalysis.severity` and `bertAnalysis.sentiment.urgency` to make autonomous dispatch decisions.
- **Frontend Dashboard (`EmergencyDashboard.jsx`)**: Displays `selectedEmergency.aiAnalysis.sentiment.urgency`.

---

## 4. What Is Broken & Production-Risky

1. **Hugging Face API Key is Missing**:
   - `backend/.env` has no `HUGGINGFACE_API_KEY` set. The system falls back to `hf_demo_key`.
   - **Risk**: Hugging Face rate limits or rejects requests for the demo key, causing the API requests to fail with unauthorized or rate-limit errors. As a result, the "real ML" path is effectively dead in local runs.
2. **Schema Mapping Defect (Critical)**:
   - `aiAgent.js` returns `nlp` (as `nlpAnalysis`). The Express route saves `aiAnalysis: aiResponse.analysis` into MongoDB.
   - However, the `Emergency` schema expects `aiAnalysis.sentiment` and does not define `nlp`. Mongoose silently discards the `nlp` field.
   - Since `sentiment` is never mapped inside `aiAgent.js`'s return object, **no sentiment or urgency data is actually saved to the database**.
   - This causes `selectedEmergency.aiAnalysis.sentiment.urgency` in the frontend dashboard to be undefined, potentially leading to client-side page crashes or empty displays.
3. **Fragile and Fake Fallback Logic**:
   - The fallback emotion analyzer fakes confidence scores using `Math.random()`, making analysis non-deterministic.
   - The fallback entity extractor treats *any capitalized word* as a Location. In a message like *"HELP! John is trapped under debris"*, it classifies `"HELP"` and `"John"` as locations.

---

## 5. What Is Duplicated

- **Duplicate Analyzers in `aiAgent.js`**:
  - `aiAgent.js` contains a large block of code defining `analyzeSentiment`, `detectEmotion`, `findRepeatedWords`, and `extractTimeIndicators`.
  - These methods contain identical keyword/phrase dictionaries to those in `nlpEngine.js` but are **completely dead code** that is never invoked.

---

## 6. What Is Dead Code

- **`this.models.urgency`**:
  - Pointing to `microsoft/DialoGPT-medium` (a chat model, not an urgency model). This configuration is declared in `nlpEngine.js`'s constructor but is never referenced or called anywhere else.
- **Duplicate methods in `aiAgent.js`** as listed above.
