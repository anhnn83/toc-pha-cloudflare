-- sql/schema.sql -- version 2.0 (Final Architecture & Seed Data)

-- 1. Bảng Members (Nhân khẩu học cốt lõi)
CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY, 
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL,
    father_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    mother_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    generation INTEGER,
    rank_in_family INTEGER,
    
    -- Trạng thái Sinh/Tử
    is_alive INTEGER NOT NULL DEFAULT 1,
    birthday TEXT,
    is_birth_approximate INTEGER DEFAULT 0,
    death_date TEXT,
    is_death_approximate INTEGER DEFAULT 0,
    lunar_death_date TEXT,
    
    -- Đặc tính và Vị trí
    relation_status TEXT NOT NULL DEFAULT 'biological',
    location TEXT,
    
    -- Thông tin mở rộng
    alias TEXT,
    biography TEXT,
    notes TEXT,
    avatar_url TEXT,
    
    -- Trạng thái hệ thống
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Marriages (Quan hệ vợ chồng - Ràng buộc 2 chiều)
CREATE TABLE IF NOT EXISTS marriages (
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    spouse_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'current',
    PRIMARY KEY (member_id, spouse_id)
);

-- 3. Bảng FamilyAlbums (Lưu trữ hình ảnh gia tộc - Dự phòng mở rộng)
CREATE TABLE IF NOT EXISTS family_albums (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    caption TEXT,
    album_name TEXT,
    uploaded_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Permissions (Quản lý phân quyền)
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    pin_hash TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    branch_root_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    mod_name TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng SystemSettings (Tham số hệ thống - Dạng Key-Value)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng AuditLogs (Lịch sử thao tác)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_name TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. TẠO CHỈ MỤC (INDEXES) ĐỂ TỐI ƯU TỐC ĐỘ TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_members_father ON members(father_id);
CREATE INDEX IF NOT EXISTS idx_members_mother ON members(mother_id);
CREATE INDEX IF NOT EXISTS idx_members_is_deleted ON members(is_deleted);

-- ==========================================
-- DỮ LIỆU KHỞI TẠO MẶC ĐỊNH (SEED DATA)
-- ==========================================

-- Khởi tạo cấu hình hệ thống mặc định (Bỏ qua nếu đã tồn tại)
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('family_name', 'GIA PHẢ TRỰC TUYẾN');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('view_pin_hash', '');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('about_family', '');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('family_photos', '[]');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('total_page_views', '0');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('r2_storage_size', '0 MB');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('r2_storage_bytes', '0');

-- Khởi tạo tài khoản Trưởng Tộc (SM) mặc định
-- Mã PIN mặc định: 123456 (Mã băm SHA-256)
INSERT OR IGNORE INTO permissions (id, pin_hash, role, branch_root_id, mod_name, created_by) 
VALUES (
    'SM_DEFAULT', 
    '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 
    'sm', 
    NULL, 
    'Trưởng Tộc', 
    'System'
);