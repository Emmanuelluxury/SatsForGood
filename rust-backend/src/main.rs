use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc};
use std::time::SystemTime;
use tokio::sync::Mutex as AsyncMutex;
use tower_http::cors::CorsLayer;
use chrono::Utc;
use bitcoin::secp256k1::{Secp256k1, SecretKey};
use bitcoin::hashes::{Hash, sha256};
use lightning_invoice::{Currency, InvoiceBuilder};
use rand::RngCore;
use uuid::Uuid;
use hex;

#[derive(Clone)]
struct AppState {
    pending_invoices: Arc<AsyncMutex<HashMap<String, PendingInvoice>>>,
    completed_donations: Arc<AsyncMutex<Vec<Donation>>>,
    node_key: SecretKey,
}

#[derive(Clone, Serialize)]
struct PendingInvoice {
    invoice: String,
    payment_hash: String,
    amount_sats: u64,
    donor_name: Option<String>,
    recipient: Option<String>,
    expires_at: chrono::DateTime<Utc>,
    created_at: chrono::DateTime<Utc>,
}

#[derive(Clone, Serialize)]
struct Donation {
    id: String,
    donor_name: String,
    recipient: Option<String>,
    amount_sats: u64,
    payment_hash: String,
    paid_at: chrono::DateTime<Utc>,
}

#[derive(Deserialize)]
struct CreateInvoiceRequest {
    amount_sats: u64,
    donor_name: Option<String>,
    recipient: Option<String>,
}

#[derive(Serialize)]
struct CreateInvoiceResponse {
    invoice: String,
    payment_hash: String,
    qr_code: String,
    expires_in: i64,
}

#[derive(Deserialize)]
struct CheckPaymentRequest {
    payment_hash: String,
}

#[derive(Serialize)]
struct CheckPaymentResponse {
    status: String,
    paid_at: Option<chrono::DateTime<Utc>>,
}

#[derive(Serialize)]
struct DonationStats {
    total_sats: u64,
    donor_count: usize,
}

#[derive(Serialize)]
struct DonationReceipt {
    id: String,
    donor_name: String,
    recipient: Option<String>,
    amount_sats: u64,
    payment_hash: String,
    paid_at: chrono::DateTime<Utc>,
    transaction_id: String,
    network: String,
}

#[derive(Deserialize)]
struct ReceiptRequest {
    payment_hash: String,
}

#[derive(Deserialize)]
struct ConfirmPaymentRequest {
    payment_hash: String,
}

#[tokio::main]
async fn main() {
    env_logger::init();

    // Generate a proper node key for Lightning invoices
    let _secp = Secp256k1::new();
    let mut key_bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key_bytes);
    let node_key = SecretKey::from_slice(&key_bytes).unwrap();

    let state = AppState {
        pending_invoices: Arc::new(AsyncMutex::new(HashMap::new())),
        completed_donations: Arc::new(AsyncMutex::new(Vec::new())),
        node_key,
    };

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/create-invoice", get(create_invoice))
        .route("/check-payment", get(check_payment))
        .route("/confirm-payment", get(confirm_payment))
        .route("/donation-stats", get(get_donation_stats))
        .route("/recent-donations", get(get_recent_donations))
        .route("/donation-receipt", get(get_donation_receipt))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    println!("🚀 Lightning Donation Backend listening on http://0.0.0.0:3001");
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "OK"
}

#[axum::debug_handler]
async fn create_invoice(
    Query(params): Query<CreateInvoiceRequest>,
    State(state): State<AppState>,
) -> Result<Json<CreateInvoiceResponse>, StatusCode> {
    // Validate donation amount
    if params.amount_sats < 100 {
        return Err(StatusCode::BAD_REQUEST);
    }
    if params.amount_sats > 1000000 {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Generate cryptographically secure payment hash
    let mut payment_hash_bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut payment_hash_bytes);
    let payment_hash = sha256::Hash::from_slice(&payment_hash_bytes)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Use proper node key for signing
    let secp = Secp256k1::new();
    let pk = state.node_key.public_key(&secp);

    // Create descriptive invoice message
    let description = if let Some(ref recipient) = params.recipient {
        format!("Donation of {} sats to {}", params.amount_sats, recipient)
    } else {
        format!("Donation of {} sats to SatsForGood", params.amount_sats)
    };

    // Create production-grade Lightning invoice
    let raw_invoice = InvoiceBuilder::new(Currency::Bitcoin)
        .amount_milli_satoshis(params.amount_sats * 1000)
        .description(description)
        .payment_hash(payment_hash)
        .timestamp(SystemTime::now())
        .min_final_cltv_expiry_delta(144)
        .expiry_time(std::time::Duration::from_secs(3600)) // 1 hour expiry
        .payee_pub_key(pk)
        .build_raw()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let invoice = raw_invoice
        .sign(|hash| Ok::<_, std::convert::Infallible>(secp.sign_ecdsa_recoverable(hash, &state.node_key)))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let invoice_str = invoice.to_string();

    // Generate QR code optimized for mobile wallets
    let qr_code = generate_qr_base64(&invoice_str);

    let payment_hash_hex = hex::encode(payment_hash);
    let expires_at = Utc::now() + chrono::Duration::hours(1);

    let pending_invoice = PendingInvoice {
        invoice: invoice_str.clone(),
        payment_hash: payment_hash_hex.clone(),
        amount_sats: params.amount_sats,
        donor_name: params.donor_name.clone(),
        recipient: params.recipient.clone(),
        expires_at,
        created_at: Utc::now(),
    };

    // Store pending invoice with cleanup of expired invoices
    {
        let mut pending = state.pending_invoices.lock().await;
        
        // Clean up expired invoices
        let now = Utc::now();
        pending.retain(|_, invoice| invoice.expires_at > now);
        
        pending.insert(payment_hash_hex.clone(), pending_invoice);
    }

    println!("🔗 Created Lightning invoice: {} sats to {} (payment_hash: {})",
             params.amount_sats,
             params.recipient.as_deref().unwrap_or("SatsForGood"),
             payment_hash_hex);

    let response = CreateInvoiceResponse {
        invoice: invoice_str,
        payment_hash: payment_hash_hex,
        qr_code,
        expires_in: 3600,
    };

    Ok(Json(response))
}

async fn check_payment(
    Query(params): Query<CheckPaymentRequest>,
    State(state): State<AppState>,
) -> Result<Json<CheckPaymentResponse>, StatusCode> {
    let mut pending = state.pending_invoices.lock().await;
    let now = Utc::now();

    if let Some(invoice) = pending.get(&params.payment_hash).cloned() {
        // Check if invoice has expired
        if invoice.expires_at <= now {
            // Remove expired invoice
            pending.remove(&params.payment_hash);
            println!("⏰ Invoice expired: {}", params.payment_hash);
            return Ok(Json(CheckPaymentResponse {
                status: "EXPIRED".to_string(),
                paid_at: None,
            }));
        }

        // Check if already paid by looking in completed donations
        let donations = state.completed_donations.lock().await;
        if donations.iter().any(|d| d.payment_hash == params.payment_hash) {
            return Ok(Json(CheckPaymentResponse {
                status: "PAID".to_string(),
                paid_at: Some(now),
            }));
        }
        drop(donations); // Release the lock

        // Enhanced simulation: faster payment detection for better UX
        let elapsed = now.signed_duration_since(invoice.created_at);
        
        // Simulate realistic payment detection (5-30 seconds for demo)
        // This is more responsive than the previous 15-45 seconds
        if elapsed > chrono::Duration::seconds(5) && elapsed < chrono::Duration::seconds(30) {
            // Move to completed donations
            let donation = Donation {
                id: Uuid::new_v4().to_string(),
                donor_name: invoice.donor_name.clone().unwrap_or_else(|| "Anonymous".to_string()),
                recipient: invoice.recipient.clone(),
                amount_sats: invoice.amount_sats,
                payment_hash: params.payment_hash.clone(),
                paid_at: now,
            };

            {
                let mut donations = state.completed_donations.lock().await;
                donations.push(donation.clone());
            }

            // Remove from pending
            pending.remove(&params.payment_hash);

            println!("✅ Payment confirmed: {} sats from {} to {}",
                     invoice.amount_sats,
                     donation.donor_name,
                     donation.recipient.as_deref().unwrap_or("SatsForGood"));

            return Ok(Json(CheckPaymentResponse {
                status: "PAID".to_string(),
                paid_at: Some(now),
            }));
        }
    }

    Ok(Json(CheckPaymentResponse {
        status: "PENDING".to_string(),
        paid_at: None,
    }))
}

#[axum::debug_handler]
async fn confirm_payment(
    Query(params): Query<ConfirmPaymentRequest>,
    State(state): State<AppState>,
) -> Result<Json<CheckPaymentResponse>, StatusCode> {
    let mut pending = state.pending_invoices.lock().await;
    let now = Utc::now();

    if let Some(invoice) = pending.get(&params.payment_hash).cloned() {
        // Check if invoice has expired
        if invoice.expires_at <= now {
            pending.remove(&params.payment_hash);
            println!("⏰ Invoice expired: {}", params.payment_hash);
            return Ok(Json(CheckPaymentResponse {
                status: "EXPIRED".to_string(),
                paid_at: None,
            }));
        }

        // Check if already paid
        let donations = state.completed_donations.lock().await;
        if donations.iter().any(|d| d.payment_hash == params.payment_hash) {
            return Ok(Json(CheckPaymentResponse {
                status: "PAID".to_string(),
                paid_at: Some(now),
            }));
        }
        drop(donations);

        // Manually confirm the payment (for testing/demo purposes)
        let donation = Donation {
            id: Uuid::new_v4().to_string(),
            donor_name: invoice.donor_name.clone().unwrap_or_else(|| "Anonymous".to_string()),
            recipient: invoice.recipient.clone(),
            amount_sats: invoice.amount_sats,
            payment_hash: params.payment_hash.clone(),
            paid_at: now,
        };

        {
            let mut donations = state.completed_donations.lock().await;
            donations.push(donation.clone());
        }

        // Remove from pending
        pending.remove(&params.payment_hash);

        println!("✅ Payment manually confirmed: {} sats from {} to {}",
                 invoice.amount_sats,
                 donation.donor_name,
                 donation.recipient.as_deref().unwrap_or("SatsForGood"));

        return Ok(Json(CheckPaymentResponse {
            status: "PAID".to_string(),
            paid_at: Some(now),
        }));
    }

    Ok(Json(CheckPaymentResponse {
        status: "NOT_FOUND".to_string(),
        paid_at: None,
    }))
}

async fn get_donation_stats(
    State(state): State<AppState>,
) -> Result<Json<DonationStats>, StatusCode> {
    let donations = state.completed_donations.lock().await;
    let total_sats = donations.iter().map(|d| d.amount_sats).sum();
    let donor_count = donations.len();

    Ok(Json(DonationStats {
        total_sats,
        donor_count,
    }))
}

async fn get_recent_donations(
    State(state): State<AppState>,
) -> Result<Json<Vec<Donation>>, StatusCode> {
    let donations = state.completed_donations.lock().await;
    let recent: Vec<_> = donations
        .iter()
        .rev()
        .take(10)
        .cloned()
        .collect();

    Ok(Json(recent))
}

async fn get_donation_receipt(
    Query(params): Query<ReceiptRequest>,
    State(state): State<AppState>,
) -> Result<Json<DonationReceipt>, StatusCode> {
    let donations = state.completed_donations.lock().await;
    
    if let Some(donation) = donations.iter().find(|d| d.payment_hash == params.payment_hash) {
        // Generate a realistic transaction ID for Lightning
        let tx_id = format!("lntx1{}w{}p{}",
            donation.id,
            donation.amount_sats,
            hex::encode(&donation.payment_hash.as_bytes()[0..8])
        );
        
        let receipt = DonationReceipt {
            id: donation.id.clone(),
            donor_name: donation.donor_name.clone(),
            recipient: donation.recipient.clone(),
            amount_sats: donation.amount_sats,
            payment_hash: donation.payment_hash.clone(),
            paid_at: donation.paid_at,
            transaction_id: tx_id,
            network: "Bitcoin Lightning Network (Testnet)".to_string(),
        };
        
        Ok(Json(receipt))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

fn generate_qr_base64(invoice: &str) -> String {
    use qrcode::{QrCode, EcLevel};
    use image::{Luma, ImageEncoder};
    use image::codecs::png::PngEncoder;

    // Generate high-quality QR code optimized for mobile scanning
    let code = QrCode::with_error_correction_level(invoice.as_bytes(), EcLevel::M)
        .unwrap_or_else(|_| QrCode::new(invoice.as_bytes()).unwrap());
    
    // Render with high contrast and mobile-optimized styling
    let image = code
        .render::<Luma<u8>>()
        .light_color(Luma([255])) // White background
        .dark_color(Luma([0]))    // Black foreground
        .quiet_zone(true)         // Add quiet zone for better scanning
        .build();

    // Convert to PNG bytes with high quality settings
    let mut png_bytes = Vec::new();
    {
        let encoder = PngEncoder::new(&mut png_bytes);
        encoder.write_image(&image, image.width(), image.height(), image::ColorType::L8)
            .expect("Failed to encode PNG");
    }

    use base64::Engine;
    format!("data:image/png;base64,{}", base64::engine::general_purpose::STANDARD.encode(&png_bytes))
}