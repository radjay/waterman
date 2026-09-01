# Waterman

Waterman is a watersports monitoring system that grabs weather forecasts and notifies users when conditions will suit their needs.

## Features

- **Multi-Sport Support**: Currently supports wingfoiling and surfing, with easy extensibility for more sports
- **Real-Time Forecasts**: Scrapes forecast data from Windy.app for multiple spots
- **Smart Filtering**: Shows only the best times based on sport-specific criteria (wind speed, direction, swell, tide, etc.)
- **Spot Management**: Each spot can support multiple sports with sport-specific configuration
- **Webcam Integration**: View live webcam feeds for supported spots
- **Tide Information**: Detailed tide data for surfing spots
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Convex (database, actions, crons)
- **Hosting**: Cloudflare Workers (OpenNext)
- **Scoring**: OpenRouter (`openai/gpt-5.6-luna`)
- **Icons**: Lucide React
- **Video Streaming**: HLS.js for webcam streams

## Project Structure

```
waterman/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (scraping, calendar)
│   ├── page.js            # Main page component
│   ├── layout.js           # Root layout
│   └── globals.css         # Global styles
├── components/             # React components (feature-based organization)
│   ├── ui/                # Reusable UI primitives (Arrow, Badge, Icon, Metric)
│   ├── forecast/          # Forecast-related components (DaySection, ForecastSlot, etc.)
│   ├── tide/              # Tide-related components (TideChart, TideTable, etc.)
│   ├── layout/            # Layout components (Header, Footer, MainLayout, etc.)
│   └── common/            # Shared components (EmptyState, WebcamModal)
├── convex/                # Convex backend
│   ├── _archive/          # Archived migration scripts (historical reference)
│   ├── schema.ts          # Database schema definition
│   ├── spots.ts           # Spot-related queries and mutations
│   └── seed.ts            # Database seeding script
├── lib/                   # Shared utilities
│   ├── scraper.js         # Web scraping logic
│   └── utils.js           # Utility functions
├── scripts/               # Utility scripts
│   ├── scrape.mjs         # Main scraping script
│   └── README.md          # Scripts documentation
└── planning/              # Planning documents
    └── prds/              # Product requirements documents
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Convex account and project

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd waterman
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:

   ```env
   NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
   ```

4. **Set up Convex**

   ```bash
   npx convex dev
   ```

   This will:
   - Create a Convex project (if needed)
   - Deploy your schema and functions
   - Set up the database

5. **Seed the database** (optional)

   ```bash
   npx convex run seed:seedSpots
   ```

6. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3010](http://localhost:3010) in your browser.

## Usage

### Scraping Forecast Data

Scheduled scrape is a Convex cron (`00, 06, 12, 18` UTC). Manual:

```bash
npx convex run ingest:scrapeAllSpots
# or
npm run scrape
```

### Adding a New Spot

You can add spots via the Convex dashboard or by creating a mutation. See `convex/seed.ts` for examples.

### Configuring Spot Criteria

Each spot needs a configuration for each sport it supports. The configuration defines:

- **For Wingfoiling**: Minimum wind speed, minimum gust, wind direction range
- **For Surfing**: Swell height range, swell direction range, minimum period, optimal tide

See `convex/schema.ts` for the full schema definition.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run scrape` - Manual forecast scrape (cron is Convex)
- `npm run preview` - Build and serve the Worker locally
- `npm run deploy` - Build and deploy the Worker to Cloudflare

See `scripts/README.md` for detailed documentation on utility scripts.

## Database Schema

The application uses Convex with the following main tables:

- **spots**: Water sports locations
- **spotConfigs**: Sport-specific condition criteria for each spot
- **forecast_slots**: Time-series forecast data
- **scrapes**: Scrape execution tracking

See `convex/schema.ts` for the complete schema with documentation.

## Component Organization

Components are organized by feature:

- **`components/ui/`**: Reusable UI primitives (Arrow, Badge, Icon, Metric)
- **`components/forecast/`**: Forecast display components
- **`components/tide/`**: Tide-related components
- **`components/layout/`**: Layout and navigation components
- **`components/common/`**: Shared utility components

## Deployment

Production is a Cloudflare Worker (`waterman-web`) plus Convex.

```bash
npx convex deploy          # push Convex functions (see dashboard for deployment)
npx convex dev --once      # dev deployment (adorable-anteater-323)
npm run deploy             # OpenNext Worker
```

Do not put custom domains on the lab Worker. `watermanreport.com` is the live Worker.

Lab Convex keeps five forecast spots: Guincho, Lagoa da Albufeira, Marina de Cascais, Carcavelos, and Bico. After you copy data from lab to prod, run `npx convex run spots:setLabRoster` on lab only.

### Environment Variables

Required:

- `NEXT_PUBLIC_CONVEX_URL` — `https://adorable-anteater-323.convex.cloud` (production GHA + wrangler.jsonc; set in `.env.local` for local dev)
- `NEXT_PUBLIC_APP_URL` — `https://www.watermanreport.com` in production
- `OPENROUTER_API_KEY` — Convex env, scoring

Optional:

- `SCRAPE_SECRET_TOKEN` — token for `/api/scrape` if you still use that route

## Development

### Code Style

- Components use functional React with hooks
- TypeScript for Convex backend functions
- JavaScript for Next.js app and components
- Tailwind CSS for styling

### Adding a New Sport

1. Update the schema if needed (add sport-specific fields to `spotConfigs`)
2. Add the sport to the sport selector in `components/layout/SportSelector.js`
3. Update filtering logic in `app/page.js` to handle the new sport's criteria
4. Update the scraper if the new sport requires different data

### Database Migrations

Historical migration scripts are archived in `convex/_archive/`. See `convex/_archive/README.md` for details.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

ISC

## Support

For issues or questions, please open an issue on the repository.
