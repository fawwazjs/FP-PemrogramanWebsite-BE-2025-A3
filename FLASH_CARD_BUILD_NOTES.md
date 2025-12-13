# Flash Card Module - Build Notes & Documentation

**Project:** WordIT - FP Pemrograman Website BE 2025  
**Tanggal Build:** 10 Desember 2025 - 13 Desember 2025  
**Module:** Flash Card (Game Type)  
**Tech Stack:** Bun + ExpressJS + TypeScript + Prisma ORM

---

## 📋 Daftar Isi
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Struktur Folder & File](#struktur-folder--file)
4. [API Endpoints](#api-endpoints)
5. [Payload & Response Examples](#payload--response-examples)
6. [Alur Backend Flash Card](#alur-backend-flash-card)
7. [Cara Setup & Run](#cara-setup--run)
8. [Testing di Apidog](#testing-di-apidog)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Modul Flash Card adalah game edukatif berbasis tanya-jawab dengan kartu flip, dibangun sesuai standar WordIT yang sudah ada (mengikuti pola game Quiz).

**Fitur utama:**
- ✅ Create flash card games dengan drag-drop/upload image
- ✅ Edit/update cards dan settings
- ✅ Publish/unpublish untuk membuat game publik/private
- ✅ Play mode dengan counter
- ✅ Soft delete (via is_published flag)
- ✅ Support text & image questions/answers
- ✅ Settings JSON untuk konfigurasi (shuffle, difficulty, lang, dll)
- ✅ File upload handling (thumbnail + card images)

---

## Database Schema

### Model: FlashCard
```prisma
model FlashCard {
  id              String           @id @default(uuid())
  game_id         String           @unique
  title           String
  description     String?
  thumbnail       String?
  settings        Json?
  is_published    Boolean          @default(false)
  total_played    Int              @default(0)

  game            Games            @relation(fields: [game_id], references: [id], onDelete: Cascade, onUpdate: Cascade)
  items           FlashCardItem[]

  created_at      DateTime         @default(now())
  updated_at      DateTime         @default(now()) @updatedAt

  @@index([game_id])
}
```

**Penjelasan field:**
- `id` — unique identifier untuk flash card
- `game_id` — FK ke Games table (1:1 relation), unik karena 1 game = 1 flash card
- `title` — nama game
- `description` — deskripsi singkat
- `thumbnail` — path ke file thumbnail (uploads/game/flash-card/...)
- `settings` — JSON object untuk config (misal: `{shuffle: true, lang: "en"}`)
- `is_published` — status publikasi (false=draft, true=published)
- `total_played` — counter jumlah user yang main
- `created_at/updated_at` — timestamps
- `game` — relasi ke Games (untuk cek creator, template, dll)
- `items` — relasi 1:N ke FlashCardItem

### Model: FlashCardItem
```prisma
model FlashCardItem {
  id               String    @id @default(uuid())
  flash_card_id    String
  position         Int       @default(0)

  question_type    String      // "text" | "image"
  question_text    String?
  question_image   String?

  back_type        String      // "text" | "image"
  answer_text      String
  back_image       String?
  is_correct       Boolean   @default(false)

  flash_card       FlashCard @relation(fields: [flash_card_id], references: [id], onDelete: Cascade, onUpdate: Cascade)

  created_at       DateTime  @default(now())
  updated_at       DateTime  @default(now()) @updatedAt

  @@index([flash_card_id, position])
}
```

**Penjelasan field:**
- `flash_card_id` — FK ke FlashCard
- `position` — urutan card (0, 1, 2, ...)
- `question_type` — tipe pertanyaan ("text" atau "image")
- `question_text` — teks pertanyaan (nullable jika image)
- `question_image` — path ke file gambar pertanyaan
- `back_type` — tipe jawaban ("text" atau "image")
- `answer_text` — teks jawaban
- `back_image` — path ke file gambar jawaban
- `is_correct` — flag untuk tracking (bisa digunakan di frontend)

### Relasi dengan Games Table
```prisma
model Games {
  // ... existing fields ...
  flash_card        FlashCard?    // ← NEW: opposite relation field
}
```

Alasan penambahan: Prisma memerlukan opposite relation field untuk relasi 1:1 yang bermakna.

---

## Struktur Folder & File

```
src/api/game/game-list/flash-card/
├── flash-card.controller.ts       # Express route handlers
├── flash-card.service.ts          # Business logic (CRUD, play count)
├── flash-card.validation.ts       # Zod schemas untuk input validation

src/common/interface/games/
├── flash-card.interface.ts        # TypeScript interfaces

prisma/
├── schema.prisma                  # ✅ Updated dengan model FlashCard & FlashCardItem
├── migrations/
│   └── 20251213065127_add_flashcard_models/
│       └── migration.sql          # ✅ Migration file

prisma/seeder/seed/
├── flash-card.seed.ts             # ✅ NEW: Seeder untuk sample data
├── index.ts                       # ✅ Updated: export flashCardSeed

prisma/seeder/
└── seeder.ts                      # ✅ Updated: call flashCardSeed()
```

---

## API Endpoints

### Base URL
```
http://localhost:4000/api/game/game-type/flash-card
```

### 1. POST /:gameId — Create Flash Card
**Deskripsi:** Membuat data flash card untuk game yang sudah ada (first-time setup)

**Request:**
- **Method:** POST
- **Headers:** 
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: multipart/form-data`
- **URL Params:** `:gameId` (UUID dari Games table)
- **Body (FormData):**
  ```
  name                      : string (max 128 char)
  description               : string (max 256 char, optional)
  is_publish_immediately    : string ('true' atau 'false', default 'false')
  settings                  : string (JSON object stringified, optional)
  thumbnail                 : File (optional)
  files_to_upload[]         : File[] (0-50 files, optional)
  cards                     : string (JSON array stringified, required)
  ```

**Example Form Data:**
```
name: "English Vocabulary"
description: "Learn basic english words"
is_publish_immediately: "false"
settings: '{"shuffle":true,"lang":"en"}'
thumbnail: [File: thumbnail.jpg]
files_to_upload: [File: image1.png, File: image2.png]
cards: '[
  {
    "question_type":"text",
    "question_text":"What is cat?",
    "question_image_array_index":null,
    "back_type":"text",
    "answer_text":"A furry animal",
    "back_image_array_index":null,
    "is_correct":true
  },
  {
    "question_type":"image",
    "question_text":null,
    "question_image_array_index":0,
    "back_type":"text",
    "answer_text":"This is a cat",
    "back_image_array_index":null,
    "is_correct":false
  }
]'
```

**Response Success (201):**
```json
{
  "status": 201,
  "message": "Flash card created",
  "data": {
    "id": "fc-uuid-123",
    "game_id": "game-uuid-456"
  }
}
```

**Response Error:**
```json
{
  "status": 422,
  "message": "Validation error: cards must have at least 1 item"
}
```
atau
```json
{
  "status": 400,
  "message": "Flash card already exists for this game"
}
```

---

### 2. GET /:gameId — Get Flash Card Detail
**Deskripsi:** Ambil detail flash card (untuk edit/play mode)

**Request:**
- **Method:** GET
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **URL:** `/api/game/game-type/flash-card/:gameId`

**Response Success (200):**
```json
{
  "status": 200,
  "message": "Get flash card successfully",
  "data": {
    "id": "fc-uuid-123",
    "game_id": "game-uuid-456",
    "title": "English Vocabulary",
    "description": "Learn basic english words",
    "thumbnail": "uploads/game/flash-card/game-uuid-456/thumbnail_1702476123456.jpg",
    "settings": {
      "shuffle": true,
      "lang": "en"
    },
    "is_published": false,
    "total_played": 5,
    "items": [
      {
        "question_type": "text",
        "question_text": "What is cat?",
        "question_image": null,
        "back_type": "text",
        "answer_text": "A furry animal",
        "back_image": null,
        "is_correct": true,
        "position": 0
      }
    ]
  }
}
```

---

### 3. PATCH /:gameId — Update Flash Card
**Deskripsi:** Update data flash card (edit + publish/unpublish)

**Request:**
- **Method:** PATCH
- **Headers:** `Authorization: Bearer <JWT_TOKEN>` + `Content-Type: multipart/form-data`
- **Body (FormData):** Same as POST (semua field optional)

**Example (Update publish status only):**
```
is_publish: "true"
```

**Response Success (200):**
```json
{
  "status": 200,
  "message": "Flash card updated",
  "data": {
    "id": "fc-uuid-123"
  }
}
```

---

### 4. DELETE /:gameId — Delete Flash Card
**Deskripsi:** Hapus flash card dan semua items-nya

**Request:**
- **Method:** DELETE
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

**Response Success (200):**
```json
{
  "status": 200,
  "message": "Flash card deleted",
  "data": {
    "id": "fc-uuid-123"
  }
}
```

**Response Error (403):**
```json
{
  "status": 403,
  "message": "User cannot delete this flash-card"
}
```

---

### 5. POST /:gameId/play — Increment Play Count
**Deskripsi:** Tambah play counter (dipanggil saat user mulai main)

**Request:**
- **Method:** POST
- **Headers:** `Authorization: Bearer <JWT_TOKEN>` (optional)

**Response Success (200):**
```json
{
  "status": 200,
  "message": "Play count updated"
}
```

---

### 6. GET /api/auth/me/game — List User's Games (termasuk flash-card)
**Deskripsi:** List semua game milik user (quiz + flash-card)

**Request:**
- **Method:** GET
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Query Params:** `?page=1&perPage=20`

**Response Success (200):**
```json
{
  "status": 200,
  "message": "Get all user game (private) successfully",
  "data": [
    {
      "id": "fc-001-vocab-english",
      "name": "English Vocabulary Level 1",
      "description": "Learn basic English vocabulary with flash cards",
      "thumbnail_image": "uploads/game/flash-card/fc-001-vocab-english/...",
      "total_played": 0,
      "is_published": true,
      "game_template": "flash-cards",
      "is_game_liked": false,
      "total_liked": 0
    },
    {
      "id": "quiz-xyz",
      "name": "Quiz tes 1",
      "description": "...",
      "thumbnail_image": "...",
      "total_played": 3,
      "is_published": true,
      "game_template": "quiz",
      "is_game_liked": true,
      "total_liked": 1
    }
  ],
  "meta": {
    "total": 2,
    "lastPage": 1,
    "currentPage": 1,
    "perPage": 20,
    "prev": null,
    "next": null
  }
}
```

---

## Payload & Response Examples

### Example 1: Create Flash Card (Text Only)
**FormData:**
```javascript
const fd = new FormData();
fd.append('name', 'Belajar Kosakata');
fd.append('description', 'Vocab level 1 - text only');
fd.append('is_publish_immediately', 'false');
fd.append('settings', JSON.stringify({shuffle: true, difficulty: 'easy'}));
fd.append('cards', JSON.stringify([
  {
    "question_type": "text",
    "question_text": "What is 'kucing'?",
    "question_image_array_index": null,
    "back_type": "text",
    "answer_text": "Cat",
    "back_image_array_index": null,
    "is_correct": true
  },
  {
    "question_type": "text",
    "question_text": "Translate 'anjing'",
    "question_image_array_index": null,
    "back_type": "text",
    "answer_text": "Dog",
    "back_image_array_index": null,
    "is_correct": true
  }
]));
```

**cURL:**
```bash
curl -X POST http://localhost:4000/api/game/game-type/flash-card/<gameId> \
  -H "Authorization: Bearer <TOKEN>" \
  -F "name=Belajar Kosakata" \
  -F "description=Vocab level 1 - text only" \
  -F "is_publish_immediately=false" \
  -F 'settings={"shuffle":true,"difficulty":"easy"}' \
  -F 'cards=[{"question_type":"text","question_text":"What is kucing?","back_type":"text","answer_text":"Cat","is_correct":true}]'
```

### Example 2: Create Flash Card (With Images)
**FormData:**
```javascript
const fd = new FormData();
fd.append('name', 'Picture Vocab');
fd.append('description', 'Learn with images');
fd.append('is_publish_immediately', 'true');
fd.append('settings', JSON.stringify({shuffle: false}));
fd.append('thumbnail', file1); // File object
fd.append('files_to_upload', file2); // File object
fd.append('files_to_upload', file3); // File object
fd.append('cards', JSON.stringify([
  {
    "question_type": "image",
    "question_text": null,
    "question_image_array_index": 0,    // ref ke files_to_upload[0]
    "back_type": "text",
    "answer_text": "This is a cat",
    "back_image_array_index": null,
    "is_correct": true
  },
  {
    "question_type": "text",
    "question_text": "What animal?",
    "question_image_array_index": null,
    "back_type": "image",
    "answer_text": "Answer image",
    "back_image_array_index": 1,        // ref ke files_to_upload[1]
    "is_correct": false
  }
]));
```

### Example 3: Update Flash Card (Publish)
**FormData:**
```javascript
const fd = new FormData();
fd.append('is_publish', 'true');  // Publish game

fetch(`/api/game/game-type/flash-card/${gameId}`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` },
  body: fd
});
```

### Example 4: Update Flash Card (Edit Cards)
**FormData:**
```javascript
const fd = new FormData();
fd.append('name', 'Updated Name');
fd.append('cards', JSON.stringify([
  // updated cards array
]));
fd.append('files_to_upload', newImageFile);
```

---

## Alur Backend Flash Card

### Flow: Create → Draft → Publish → Edit → Play → Delete

#### 1. **Create (POST)**
```
Frontend kirim FormData
         ↓
Controller.createFlashCard(gameId, data, userId)
         ↓
Service: existsGameCheck() → cek game ada & milik user
         ↓
Upload thumbnail → FileManager.upload()
         ↓
Upload card images → FileManager.upload() loop
         ↓
Transform cards + map image paths
         ↓
Prisma.flashCard.create({
  game_id, title, description, thumbnail, settings,
  items: { create: [...] }
})
         ↓
Sinkron preview ke games.game_json
         ↓
Return { id, game_id }
```

**State after create:**
- `FlashCard.is_published = false` (default)
- `Games.is_published = false` (default, atau sesuai `is_publish_immediately`)
- Data siap untuk ditambah/diedit sebelum publish

---

#### 2. **Draft**
Game berada di status draft (is_published=false)
- Hanya **creator** atau **SUPER_ADMIN** yang bisa akses/edit
- **Tidak tampil** di listing publik (`GET /api/game`)
- **Tampil** di `GET /api/auth/me/game` (user's private games)

---

#### 3. **Publish (PATCH)**
```
Frontend kirim PATCH dengan is_publish: true
         ↓
Service.updateFlashCard(gameId, {is_publish: true}, userId, role)
         ↓
Validasi ownership
         ↓
Prisma.flashCard.update({ is_published: true })
         ↓
Prisma.games.update({ is_published: true })
         ↓
Return { id }
```

**State after publish:**
- `FlashCard.is_published = true`
- `Games.is_published = true`
- Game **tampil** di listing publik
- User lain bisa **play** game ini

---

#### 4. **Edit (PATCH)**
```
Frontend kirim PATCH dengan field yang diubah
         ↓
Service.updateFlashCard(gameId, data, userId, role)
         ↓
Validasi ownership & existence
         ↓
If thumbnail provided:
  - Upload file baru
  - Simpan path baru
         ↓
If cards provided:
  - Upload image files baru (jika ada)
  - Hapus semua FlashCardItem lama
  - Create FlashCardItem baru
         ↓
Update FlashCard record
Sinkron ke games.game_json
         ↓
Return { id }
```

**Note:** Edit bisa dilakukan kapan saja (draft atau published)

---

#### 5. **Play (POST /:gameId/play)**
```
Frontend request POST /api/game/game-type/flash-card/:gameId/play
         ↓
Service.incrementPlay(gameId, userId?)
         ↓
Validasi game published
         ↓
Transaction:
  - FlashCard.total_played++
  - Games.total_played++
  - Users.total_game_played++ (if userId present)
         ↓
Commit transaction
```

**State after play:**
- Play counter bertambah
- User's total_game_played bertambah (jika logged in)

---

#### 6. **Delete (DELETE)**
```
Frontend kirim DELETE
         ↓
Service.deleteFlashCard(gameId, userId, role)
         ↓
Validasi ownership
         ↓
Get FlashCard & Game records
         ↓
Delete thumbnail file (if exists)
         ↓
Delete all FlashCardItem (via CASCADE)
         ↓
Delete FlashCard record (via CASCADE)
         ↓
Return { id }
```

**Note:** Games record tetap ada (cascade delete FlashCard, tapi Games tetap), untuk history. Jika ingin hapus Games juga perlu endpoint terpisah.

---

## Cara Setup & Run

### 1. Prerequisites
```bash
# Pastikan sudah install Bun
bun --version

# Pastikan DATABASE_URL di .env.development valid
cat .env.development | grep DATABASE_URL
```

### 2. Generate Prisma Client
```bash
bun run generate
# atau
bunx prisma generate
```

### 3. Run Prisma Migration
```bash
bun run migrate:dev -- --name add_flashcard_models
# atau explicit dengan dotenv
dotenv -e .env.development -- bunx prisma migrate dev --name add_flashcard_models
```

### 4. Run Seeder (untuk sample data)
```bash
bun run seed:dev
```

Ini akan seed:
- Users (test users)
- Game Templates (semua game types termasuk flash-cards)
- Quiz Games (sample quiz)
- **Flash Card Games** (3 sample: English vocab, Spanish vocab, Math basics)

### 5. Start Server
```bash
bun run start:dev
# Server listening di http://localhost:4000
```

### 6. Verify
```bash
# Cek health (optional, tergantung ada endpoint / atau tidak)
curl http://localhost:4000/api/game?page=1&perPage=10

# Atau di Apidog test endpoints
```

---

## Testing di Apidog

### Setup Apidog
1. Login ke https://5ukrdk4sxo.apidog.io (pass: `pwebFP#2025`)
2. Navigasi ke: **Game** → **Game List** → **flash-card** (buat folder jika belum ada)
3. Buat endpoints sesuai API Endpoints di atas

### Quick Test Flow
1. **GET /api/auth/login** → copy JWT token
2. **GET /api/auth/me/game?page=1&perPage=20** → lihat flash-card games (dari seeder)
3. **GET /api/game/game-type/flash-card/:gameId** → ambil detail (gunakan gameId dari step 2)
4. **POST /api/game/game-type/flash-card/:gameId/play** → increment play
5. **PATCH /api/game/game-type/flash-card/:gameId** → publish (is_publish: true)
6. **DELETE /api/game/game-type/flash-card/:gameId** → delete

---

## File yang Dibuat/Diubah

### ✅ Dibuat Baru
```
src/api/game/game-list/flash-card/
├── flash-card.controller.ts
├── flash-card.service.ts
├── flash-card.validation.ts

src/common/interface/games/
├── flash-card.interface.ts

prisma/seeder/seed/
└── flash-card.seed.ts
```

### ✅ Diubah
```
prisma/schema.prisma
  - Tambah model FlashCard
  - Tambah model FlashCardItem
  - Tambah field flash_card ke Games

prisma/seeder/seed/index.ts
  - Export flashCardSeed

prisma/seeder/seeder.ts
  - Call flashCardSeed()

src/common/interface/games/index.ts
  - Export flash-card.interface.ts

src/api/game/game-list/game-list.router.ts
  - Mount FlashCardController di /flash-card
```

### Migrasi
```
prisma/migrations/20251213065127_add_flashcard_models/migration.sql
  - CREATE TABLE FlashCard
  - CREATE TABLE FlashCardItem
  - ADD COLUMN flash_card TO Games
```

---

## Validation & Error Handling

### Zod Schemas (flash-card.validation.ts)
```typescript
// Create
CreateFlashCardSchema = {
  name: string (1-128)
  description: string (0-256, optional)
  thumbnail: File (optional)
  is_publish_immediately: boolean (string '0'/'1' → coerce)
  settings: object (JSON string → parse)
  files_to_upload: File[] (0-50)
  cards: FlashCardItem[] (1-200 items, JSON string)
}

// Update
UpdateFlashCardSchema = {
  ...same as Create, but all optional
}

// Card Item
FlashCardItemSchema = {
  question_type: 'text' | 'image'
  question_text: string | null
  question_image_array_index: number | null
  back_type: 'text' | 'image'
  answer_text: string
  back_image_array_index: number | null
  is_correct: boolean
}
```

### Common Errors
| Error | Cause | Solution |
|-------|-------|----------|
| 422 Validation | cards missing/invalid | Pastikan cards JSON valid, min 1 item |
| 400 Flash card exists | Create ulang untuk game yang sudah punya | Delete dulu atau gunakan PATCH update |
| 403 Forbidden | Bukan creator/SUPER_ADMIN | Login dengan user yang create game |
| 404 Not Found | Game ID invalid atau bukan flash-card type | Cek game ID & template slug |
| 422 File too large | Image > max size | Gunakan image < 2MB |

---

## Troubleshooting

### Issue: Migration gagal (checksum mismatch)
**Solution:**
```bash
# Lihat detail di
ls -la prisma/migrations/20251213065127_add_flashcard_models/

# Reset ke awal (warning: hapus data)
bun run migrate:dev:reset

# Atau resolve konflik
bunx prisma migrate resolve --rolled-back 20251213065127_add_flashcard_models
```

### Issue: Prisma client error
**Solution:**
```bash
bun run generate
# atau
bunx prisma generate
```

### Issue: Database connection error
**Solution:**
```bash
# Cek .env.development
cat .env.development | grep DATABASE_URL

# Test koneksi
bunx prisma db push

# Jika perlu reset
bunx prisma db push --skip-generate --force-reset
```

### Issue: File upload tidak masuk uploads folder
**Solution:**
```bash
# Pastikan folder exists
mkdir -p ./uploads/game/flash-card

# Check permission
ls -la uploads/
```

### Issue: Query empty (page=1&perPage=10 return 0 items)
**Solution:**
- Pastikan tidak ada parameter kosong lain (misal `gameTypeSlug=""`)
- Gunakan curl untuk test tanpa UI ambiguity:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/auth/me/game?page=1&perPage=20"
```

---

## Sample Data (dari Seeder)

### Game 1: English Vocabulary Level 1
- **ID:** `fc-001-vocab-english`
- **Status:** Published
- **Items:** 5 vocab cards (text only)
- **Settings:** `{shuffle: true, lang: 'en'}`

### Game 2: Spanish Vocabulary Beginner
- **ID:** `fc-002-vocab-spanish`
- **Status:** Published
- **Items:** 4 vocab cards (text only)
- **Settings:** `{shuffle: false, lang: 'es'}`

### Game 3: Math Basics - Numbers
- **ID:** `fc-003-math-basics`
- **Status:** Draft (tidak published)
- **Items:** 4 math cards
- **Settings:** `{shuffle: true, difficulty: 'easy'}`

---

## Next Steps / TODO

- [ ] Frontend: Build UI untuk flash card (flip animation, tombol benar/salah)
- [ ] Backend: Add endpoint untuk save play results/statistics (optional)
- [ ] Backend: Add search/filter untuk cards (optional)
- [ ] Documentation: Update Apidog dengan collection lengkap (optional)
- [ ] Testing: Unit test untuk flash-card service (optional)

---

## References

**WordIT Standards:**
- Game structure mengikuti pola Quiz game
- Response format sesuai WordIT success/error response
- File upload menggunakan FileManager utility yang sudah ada

**Related Files:**
- `src/api/game/game-list/quiz/` — Reference implementation
- `src/utils/file-management.util.ts` — File upload/delete
- `src/common/middleware/validator.middleware.ts` — Input validation

**Database:**
- Prisma docs: https://www.prisma.io/docs/
- PostgreSQL docs: https://www.postgresql.org/docs/

---

## Contact & Support
Untuk questions atau updates terkait Flash Card module, hubungi team development.

**Last Updated:** 13 Desember 2025  
**Status:** ✅ Complete & Ready for Testing

//Cuma nambahin ini, tadi lupa belum sesuai template
---
