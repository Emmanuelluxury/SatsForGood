# SatsForGood - Lightning Donation App

A modern, full-stack donation application built with Next.js frontend and Rust backend, featuring Lightning Network payments.

## Features

- ⚡ Lightning Network invoice generation
- 📱 Responsive, modern UI with professional design
- 🔒 Secure payment processing
- 📊 Real-time donation statistics
- 🎯 Recipient-specific donations
- 🐳 Docker containerization for easy deployment

## Architecture

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, and shadcn/ui
- **Backend**: Rust with Axum web framework
- **Payments**: Lightning Network invoices with QR code generation
- **Containerization**: Docker and Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Rust 1.75+ (for local development)

### Running with Docker (Recommended)

1. Clone the repository
2. Run the application:
   ```bash
   docker-compose up --build
   ```
3. Open http://localhost:3000 in your browser

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Local Development

#### Backend (Rust)
```bash
cd rust-backend
cargo run
```

#### Frontend (Next.js)
```bash
npm install
npm run dev
```

## API Endpoints

### Backend (Rust) - Port 3001

- `GET /health` - Health check
- `GET /create-invoice?amount_sats=1000&donor_name=John&recipient=Charity` - Create Lightning invoice
- `GET /check-payment?payment_hash=abc123` - Check payment status
- `GET /donation-stats` - Get donation statistics
- `GET /recent-donations` - Get recent donations

### Frontend (Next.js) - Port 3000

- `/` - Main donation page
- Responsive design with mobile support

## Environment Variables

### Frontend
- `NEXT_PUBLIC_RUST_BACKEND_URL` - Backend API URL (default: http://localhost:3001)

### Backend
- `RUST_LOG` - Log level (default: info)

## Development

### Project Structure

```
SatsForGood/
├── rust-backend/          # Rust API server
│   ├── src/main.rs       # Main application logic
│   ├── Cargo.toml        # Rust dependencies
│   └── Dockerfile        # Backend container
├── src/                  # Next.js frontend
│   ├── app/             # Next.js app router
│   ├── components/      # React components
│   └── lib/             # Utilities and API client
├── docker-compose.yml    # Multi-service orchestration
├── Dockerfile           # Frontend container
└── README.md           # This file
```

### Key Components

- **DonateForm**: Professional donation form with preset amounts
- **InvoiceQR**: QR code display with payment polling
- **DonationStats**: Real-time impact dashboard
- **RecentDonations**: Donation history table

## Security Notes

- In production, use proper Lightning Network node credentials
- Implement proper error handling and rate limiting
- Use HTTPS in production
- Secure the private keys for invoice signing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
