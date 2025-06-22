# AI Decision Maker Workflow System

## 🚀 Overview

This is a powerful AI-powered workflow automation system that intelligently routes leads based on configurable conditions, similar to the HighLevel Workflow AI Decision Maker.

## ✨ Key Features

- **AI-Powered Routing**: Automatically route leads to the most relevant workflow path
- **Context-Aware Decisions**: Evaluates form data, contact history, and custom conditions
- **Default Branch Safety**: Built-in fallback for unmatched conditions
- **Real-time Processing**: Sub-second decision making via Supabase Edge Functions
- **Visual Workflow Builder**: Intuitive interface for creating and managing workflows
- **Comprehensive Logging**: Track all decisions with confidence scores

## 🛠️ Tech Stack

- **Frontend**: React, Next.js, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **Icons**: Lucide React
- **Deployment**: Vercel (Frontend), Supabase (Backend)

## 📦 Installation

1. **Clone the repository**
   ```bash
   cd /Users/giovannigarcia/Desktop/ScaleModeMethod
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   ```bash
   # Initialize Supabase (if not already done)
   supabase init
   
   # Link to your Supabase project
   supabase link --project-ref your-project-ref
   ```

4. **Configure environment variables**
   Create a `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

5. **Run database migrations**
   ```bash
   npm run db:push
   ```

6. **Deploy Edge Functions**
   ```bash
   npm run deploy:functions
   ```

## 🚀 Quick Start

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## 📝 Usage Example

### 1. Create a Workflow
```typescript
// Navigate to /workflows in your app
// Click "Create New Workflow"
// Configure your branches and conditions
```

### 2. Implement Lead Capture
```typescript
import { LeadCaptureForm } from '@/components/LeadCaptureForm';

// Add to your page
<LeadCaptureForm formId="pricing-form" />
```

### 3. Process Leads Programmatically
```typescript
import { processLead } from '@/lib/supabase';

const result = await processLead({
  email: 'lead@example.com',
  name: 'John Doe',
  form_id: 'pricing-form',
  form_data: {
    budget: 'over_25k',
    timeline: 'immediate'
  }
});

// AI will route to appropriate branch:
// - "Assign Sales Call" for high-value leads
// - "Send Case Study" for mid-funnel leads
// - "Send Discount Offer" for price-sensitive leads
// - "Default Branch" for all others
```

## 🔧 Configuration

### Branch Conditions Example
```json
{
  "high_value_lead": {
    "conditions": {
      "budget": {
        "operator": "greater_than",
        "value": 25000
      },
      "timeline": {
        "operator": "equals",
        "value": "immediate"
      }
    },
    "priority": 10
  }
}
```

## 📊 Monitoring & Analytics

- View decision logs in Supabase Dashboard
- Track conversion rates per branch
- Monitor execution times
- Analyze routing patterns

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License

## 🆘 Support

For questions or issues:
- Check the [documentation](./docs/workflow-documentation.md)
- Open an issue on GitHub
- Contact support@unboxedcommunities.com

---

Built with ❤️ for Unboxed Communities