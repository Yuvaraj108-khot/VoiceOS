# VoiceOS Backend

VoiceOS is an Enterprise AI Telephony Platform (Stripe-meets-Twilio).

## Architecture

*   **REST APIs:** Express.js + Prisma + PostgreSQL
*   **Telephony:** Twilio WebSockets (TwiML Stream)
*   **Conversation Engine:** Retrieval-Augmented Generation (RAG) + LLM (Gemini 3.1 Pro)
*   **Voice (STT/TTS):** Deepgram / ElevenLabs
*   **Background Jobs:** BullMQ + Redis
*   **Realtime:** Socket.io + Redis Adapter

## Getting Started

1.  **Environment Variables:** Copy `.env.example` to `.env` and fill in the values.
2.  **Generate Keys:** Run `bash scripts/generate-keys.sh` to generate JWT ECDSA keys.
3.  **Database Setup:** Run `bash scripts/migrate.sh` to apply Prisma migrations.
4.  **Seed Database (Optional):** Run `bash scripts/seed.sh`.
5.  **Start Server:** Run `npm run dev`.

## Folder Structure

*   `src/api`: REST Controllers, Services, and Webhooks
*   `src/telephony`: Twilio WebSocket Handlers
*   `src/conversation`: LLM, Prompting, and Intent engines
*   `src/knowledge`: RAG, Embeddings (pgvector)
*   `src/workflow`: Visual Node Execution Engine
*   `src/analytics`: Metrics aggregation
*   `src/jobs`: BullMQ queues and workers
*   `src/realtime`: Socket.io live events

## License
MIT
