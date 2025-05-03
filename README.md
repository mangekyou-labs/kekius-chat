# Kekius App

Kekius is a Next.js-based AI Copilot application that integrates with Hedera Blockchain and uses Supabase for data storage. This application allows users to interact with an AI Copilot that can perform various blockchain-related tasks like checking balances, staking, swapping tokens, and more.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Hedera](https://img.shields.io/badge/Hedera-002FA7?style=for-the-badge&logo=hedera&logoColor=white)

<img src="https://pbs.twimg.com/profile_images/1887520476555046912/wxXggXte_400x400.jpg" alt="Kekius" width="100" height="100">

## Features

- AI-powered Copilot interface
- Blockchain wallet integration (HashPack, Blade)
- User authentication via wallet signatures
- Chat history storage and retrieval
- Token balance checking
- HBAR staking functionality
- Unstaking functionality
- DefiLlama integration for TVL information of the ecosystem
- Token swapping capabilities
- Token sending functionality
- Portfolio management
- Portfolio analysis
- Transaction search & AI-powered analysis
- Search latest Hedera news with Venice API
- Token analysis using Sonia
- Hedera HCS-10 agent communication

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Supabase
- **Authentication**: JWT with wallet signature verification
- **Blockchain Integration**: Hedera JavaScript/TypeScript SDK
- **AI Integration**: OpenRouter API

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account
- OpenRouter API key (for AI functionality)
- Basic knowledge of blockchain concepts

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/kekius-ai/kekius-app
cd kekius-app
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up environment variables

Copy the `.env.example` file to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_JWT_SECRET`: Secret key for JWT token generation
- `OPENROUTER_API_KEY`: API key for OpenRouter
- `OPENROUTER_BASE_URL`: Base URL for OpenRouter API
- `MODEL`: AI model to use
- `BEARER_TOKEN`: Bearer token for API authentication
- `MAX_POSTS`: Maximum number of posts to retrieve
- `NEXT_PUBLIC_HEDERA_NETWORK`: Network selection (testnet, mainnet, previewnet)
- `HEDERA_ACCOUNT_ID`: Your Hedera account ID
- `HEDERA_PRIVATE_KEY`: Your Hedera private key

### 4. Database Setup

You need to set up the following tables in your Supabase PostgreSQL database:

#### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  nonce UUID
);
```

#### Chats Table

```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY,
  ai_id UUID,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT
);
```

#### Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  chat_id UUID REFERENCES chats(id),
  sender_id UUID REFERENCES users(id),
  message JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Project Structure

- `/app`: Main application code
  - `/api`: API routes for backend functionality
  - `/components`: React components
  - `/providers`: Context providers
  - `/services`: Service functions for API calls
- `/lib`: Utility libraries
- `/public`: Static assets
- `/ai`: AI-related functionality
- `/wallet`: Wallet integration code

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).

This means you are free to:

- Share — copy and redistribute the material in any medium or format
- Adapt — remix, transform, and build upon the material

Under the following terms:

- Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made.
- NonCommercial — You may not use the material for commercial purposes.

See the LICENSE file for more details.

## Hedera HCS-10 Integration

This application integrates the HCS-10 standard for AI agent communication on the Hedera network. The HCS-10 standard provides a structured protocol for autonomous AI agents to establish connections and communicate with each other using Hedera's Consensus Service (HCS).

### Key Features of HCS-10 Integration:

1. **Standardized Agent Communication** - Follows the HCS-10 specification for interoperability between different AI agents.
2. **Topic-based Messaging** - Utilizes HCS topics for secure, verifiable, and timestamped communication.
3. **Connection Lifecycle Management** - Handles establishing, maintaining, and closing connections between agents.
4. **Agent Discovery** - Agents can discover and connect with other agents through inbound topics.

### Implementation Details:

- **HCS10Client**: Core client that implements the HCS-10 protocol for agent communication
- **Agent Topics**: Each agent maintains inbound and outbound topics for communication
- **Connection Topics**: Shared topics created when two agents establish a connection
- **Message Operations**: Includes connection requests, connection creation, messaging, and connection closing

### Environment Variables:

```
NEXT_PUBLIC_HEDERA_NETWORK=testnet  # Network selection (testnet, mainnet, previewnet)
HEDERA_ACCOUNT_ID=0.0.XXXXX         # Your Hedera account ID
HEDERA_PRIVATE_KEY=302e...          # Your Hedera private key
```

To use the Hedera HCS-10 integration, connect your Hedera wallet in the application, and you'll be able to interact with other agents that support the HCS-10 protocol.
