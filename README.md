# PayPal Element Response Viewer

Aplikasi vanilla JavaScript/HTML untuk testing dan melihat response dari PayPal elements dengan mode order dan recurring.

## Fitur

- **Dua Mode Payment:**
  - **Order Mode**: Untuk one-time payments dengan Order ID
  - **Recurring Mode**: Untuk subscription payments dengan Subscription ID

- **Response Viewer:**
  - Menampilkan response dalam format JSON yang sudah di-format (prettified)
  - Support untuk onApprove, onError, dan onCancel responses
  - JSON dengan indentasi 2 spaces untuk readability

- **User-Friendly Interface:**
  - Modern, clean UI
  - Dynamic form fields berdasarkan mode yang dipilih
  - Clear button untuk reset response display

## Setup

### Prerequisites

- Web browser modern (Chrome, Firefox, Safari, atau Edge)
- **Tidak perlu Node.js atau npm** - Project ini menggunakan CDN untuk PayPal SDK

### Installation

1. Clone atau download project ini

2. Buka file `index.html` langsung di browser:
   - Double-click file `index.html`, atau
   - Drag and drop `index.html` ke browser, atau
   - Buka melalui File > Open di browser

**Catatan**: Beberapa browser mungkin memblokir file lokal karena CORS policy. Jika terjadi masalah:
- Gunakan browser dengan flag `--allow-file-access-from-files` (Chrome)
- Atau gunakan simple HTTP server seperti:
  ```bash
  # Python 3
  python -m http.server 8000
  
  # Node.js (jika tersedia)
  npx serve .
  ```
  Kemudian akses `http://localhost:8000`

## Usage

1. **Masukkan PayPal Client ID**
   - Dapatkan Client ID dari [PayPal Developer Dashboard](https://developer.paypal.com/)
   - Masukkan Client ID di form (sandbox atau production)

2. **Pilih Payment Mode**
   - **Order**: Untuk one-time payment
   - **Recurring**: Untuk subscription payment

3. **Masukkan ID yang sesuai**
   - Untuk Order mode: masukkan Order ID yang sudah dibuat sebelumnya
   - Untuk Recurring mode: masukkan Subscription ID yang sudah dibuat sebelumnya

4. **Klik "Initialize PayPal Button"**
   - PayPal button akan muncul di container

5. **Klik PayPal Button**
   - Complete the PayPal flow
   - Response akan ditampilkan di Response section

6. **Lihat Response**
   - Response ditampilkan dalam format JSON yang sudah di-format
   - JSON dengan indentasi 2 spaces untuk kemudahan membaca
   - Untuk Order mode: akan mencoba capture order dan menampilkan hasilnya
   - Untuk Recurring mode: akan mengambil subscription details

## Response Types

### Approve Response
Menampilkan data ketika payment berhasil:
- Order ID / Subscription ID
- Payer ID
- Capture details (untuk Order mode)
- Subscription details (untuk Recurring mode)

### Error Response
Menampilkan error information ketika terjadi masalah:
- Error message
- Error name
- Stack trace (jika tersedia)

### Cancel Response
Menampilkan informasi ketika user membatalkan payment:
- Cancellation message
- Cancellation data

## Important Notes

- **Order Mode dengan Existing Order ID**: 
  - Order ID harus dalam status `CREATED` (belum di-capture)
  - Order harus dibuat dengan `intent: 'CAPTURE'`
  - Pastikan order ID valid dan masih bisa di-approve

- **Recurring Mode dengan Existing Subscription ID**: 
  - Subscription ID harus sudah dibuat sebelumnya
  - Subscription harus dalam status yang bisa di-approve (biasanya `APPROVAL_PENDING` atau `CREATED`)
  - Pastikan subscription ID valid dan belum di-approve sebelumnya

- **Client ID**: Gunakan sandbox Client ID untuk testing. Pastikan environment (sandbox/production) sesuai dengan order/subscription ID yang digunakan.

## Project Structure

```
paypal-element/
├── index.html          # Main HTML file
├── app.js              # JavaScript logic untuk PayPal integration
├── styles.css          # Styling
├── package.json        # Dependencies
└── README.md           # Documentation
```

## Dependencies

- **PayPal JS SDK**: Loaded secara dinamis dari CDN PayPal berdasarkan Client ID yang diinput
- **Tidak ada npm dependencies** - Project ini pure vanilla JavaScript/HTML/CSS

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
# paypal-element-generator
