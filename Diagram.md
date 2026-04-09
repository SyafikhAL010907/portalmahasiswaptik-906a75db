Diagram FlowChart


    // --- DUMMY INTERNAL SUPABASE TABLE ---
    Table auth.users {
    id uuid [pk]
    }

    // --- CORE TABLES ---
    Table profiles {
    id uuid [pk]
    user_id uuid [unique]
    nim text
    full_name text
    class_id uuid
    avatar_url text
    whatsapp text
    role text [default: 'mahasiswa']
    payment_status text
    last_language text
    created_at timestamp
    }

    Table classes {
    id uuid [pk]
    name text [unique]
    }

    Table subjects {
    id uuid [pk]
    name text
    code text [unique]
    semester integer
    }

    Table semesters {
    id integer [pk]
    name text
    drive_folder_id text
    }

    // --- MODUL ABSENSI ---
    Table attendance_records {
    id uuid [pk]
    session_id uuid
    student_id uuid
    status text
    scanned_at timestamp
    latitude double_precision
    longitude double_precision
    method text
    updated_by uuid
    }

    Table attendance_sessions {
    id uuid [pk]
    meeting_id uuid
    class_id uuid
    lecturer_id uuid
    qr_code text [unique]
    expires_at timestamp
    is_active boolean
    }

    Table meetings {
    id uuid [pk]
    subject_id uuid
    meeting_number integer
    topic text
    }

    Table schedules {
    id uuid [pk]
    subject_id uuid
    class_id uuid
    day text
    start_time time
    end_time time
    room text
    lecturer_id uuid
    }

    // --- MODUL KEUANGAN ---
    Table transactions {
    id uuid [pk]
    class_id uuid
    type text
    category text
    amount numeric
    description text
    created_by uuid
    transaction_date date
    }

    Table weekly_dues {
    id uuid [pk]
    student_id uuid
    week_number integer
    year integer
    amount numeric
    status text
    paid_at timestamp
    verified_by uuid  // <-- Sudah ditambahkan
    month integer
    }

    // --- MODUL FITUR & KOMUNIKASI ---
    Table announcements {
    id uuid [pk]
    title text
    content text
    category text
    is_pinned boolean
    created_by uuid
    created_at timestamp
    }

    Table materials {
    id uuid [pk]
    subject_id uuid
    semester integer
    title text
    file_type text
    file_url text
    uploaded_by uuid
    }

    Table competitions {
    id uuid [pk]
    title text
    organizer text
    deadline date
    category text
    created_by uuid
    }

    Table messages {
    id uuid [pk]
    content text
    user_id uuid
    recipient_id uuid
    is_read boolean
    }

    Table public_chat_messages {
    id uuid [pk]
    user_id uuid
    content text
    created_at timestamp
    }

    Table user_snippets {
    id uuid [pk]
    user_id uuid [unique]
    language text
    code_content text
    }

    Table class_achievements {
    id uuid [pk]
    class_id uuid
    competition_name text
    student_names text
    rank text
    event_date date
    created_by uuid   // <-- Sudah ditambahkan (Fixed the error)
    }

    // --- LOGS & CONFIGS ---
    Table download_logs {
    id uuid [pk]
    user_id uuid
    download_type text
    downloaded_at timestamp
    }

    Table global_configs {
    key character_varying [pk]
    value text
    }

    Table global_settings {
    key text [pk]
    value jsonb
    }

    Table push_subscriptions {
    id uuid [pk]
    user_id uuid
    subscription_data jsonb
    }

    Table user_roles {
    id uuid [pk]
    user_id uuid
    role text
    }

    // --- RELATIONSHIPS (GARIS RELASI) ---
    Ref: profiles.id > auth.users.id
    Ref: profiles.class_id > classes.id
    Ref: subjects.semester > semesters.id
    Ref: attendance_records.student_id > profiles.user_id
    Ref: attendance_records.session_id > attendance_sessions.id
    Ref: attendance_records.updated_by > auth.users.id
    Ref: attendance_sessions.meeting_id > meetings.id
    Ref: attendance_sessions.class_id > classes.id
    Ref: attendance_sessions.lecturer_id > auth.users.id
    Ref: meetings.subject_id > subjects.id
    Ref: schedules.subject_id > subjects.id
    Ref: schedules.class_id > classes.id
    Ref: schedules.lecturer_id > profiles.id
    Ref: transactions.created_by > auth.users.id
    Ref: weekly_dues.student_id > auth.users.id
    Ref: weekly_dues.verified_by > auth.users.id
    Ref: announcements.created_by > auth.users.id
    Ref: materials.uploaded_by > auth.users.id
    Ref: competitions.created_by > auth.users.id
    Ref: messages.user_id > profiles.id
    Ref: public_chat_messages.user_id > profiles.id
    Ref: push_subscriptions.user_id > profiles.user_id
    Ref: user_roles.user_id > auth.users.id
    Ref: user_snippets.user_id > auth.users.id
    Ref: class_achievements.class_id > classes.id
    Ref: class_achievements.created_by > auth.users.id
    Ref: download_logs.user_id > auth.users.id



    // --- PENGELOMPOKAN MODUL (BIAR RAPI OTOMATIS) ---

    TableGroup User_Management {
    auth.users
    profiles
    user_roles
    user_snippets
    }

    TableGroup Akademik_Absensi {
    attendance_records
    attendance_sessions
    meetings
    subjects
    schedules
    semesters
    }

    TableGroup Keuangan {
    transactions
    weekly_dues
    }

    TableGroup Fitur_Lainnya {
    announcements
    materials
    competitions
    class_achievements
    messages
    public_chat_messages
    }
















graph LR
    %% --- KONFIGURASI LAYOUT ---
    %% Kita pake LR (Left to Right) biar modelnya kayak pohon menyamping

    %% --- TIER 0: THE ROOT ---
    subgraph Root [Primary Authentication]
        AUTH(("<b>auth.users</b><br/>(id: uuid, PK)"))
    end

    %% --- TIER 1: CORE IDENTITY ---
    subgraph Identity [Core Identity Hub]
        PROFILES["<b>profiles</b><br/>- id (uuid, PK)<br/>- user_id (uuid, U)<br/>- nim (text)<br/>- full_name (text)<br/>- class_id (uuid)<br/>- avatar_url (text)<br/>- whatsapp (text)<br/>- role (text)<br/>- pay_status (text)<br/>- last_lang (text)<br/>- created_at (timestamp)"]
    end

    %% --- TIER 2: SECURITY & CONFIGS ---
    subgraph Security_System [Access & System]
        ROLES["<b>user_roles</b><br/>- id (uuid, PK)<br/>- user_id (uuid)<br/>- role (text)"]
        SNIP["<b>user_snippets</b><br/>- id (uuid, PK)<br/>- user_id (uuid)<br/>- language (text)<br/>- code_content (text)"]
        GCONF["<b>global_configs</b><br/>- key (string, PK)<br/>- value (text)"]
        GSETT["<b>global_settings</b><br/>- key (text, PK)<br/>- value (jsonb)"]
        DLOGS["<b>download_logs</b><br/>- id (uuid, PK)<br/>- user_id (uuid)<br/>- type (text)<br/>- downloaded_at (ts)"]
    end

    %% --- TIER 3: ACADEMIC INFRASTRUCTURE ---
    subgraph Academic_Core [Academic Infrastructure]
        CLASSES["<b>classes</b><br/>- id (uuid, PK)<br/>- name (text, U)<br/>- created_at (ts)"]
        SUBJECTS["<b>subjects</b><br/>- id (uuid, PK)<br/>- name (text)<br/>- code (text, U)<br/>- semester (int)<br/>- created_at (ts)"]
        SEMESTERS["<b>semesters</b><br/>- id (int, PK)<br/>- name (text)<br/>- drive_id (text)"]
        MEETINGS["<b>meetings</b><br/>- id (uuid, PK)<br/>- subject_id (uuid)<br/>- number (int)<br/>- topic (text)"]
        SCHED["<b>schedules</b><br/>- id (uuid, PK)<br/>- sub_id (uuid)<br/>- class_id (uuid)<br/>- day (text)<br/>- room (text)<br/>- lec_id (uuid)"]
    end

    %% --- TIER 4: OPERATIONAL ENGINE ---
    subgraph Operation_Engine [Operational & Finance]
        ASESS["<b>attendance_sessions</b><br/>- id (uuid, PK)<br/>- meet_id (uuid)<br/>- class_id (uuid)<br/>- qr_code (text)<br/>- expires (ts)<br/>- active (bool)"]
        AREC["<b>attendance_records</b><br/>- id (uuid, PK)<br/>- session_id (uuid)<br/>- student_id (uuid)<br/>- status (text)<br/>- lat/long (double)"]
        TRANS["<b>transactions</b><br/>- id (uuid, PK)<br/>- class_id (uuid)<br/>- type (text)<br/>- amount (numeric)<br/>- created_by (uuid)"]
        WDUE["<b>weekly_dues</b><br/>- id (uuid, PK)<br/>- student_id (uuid)<br/>- status (text)<br/>- paid_at (ts)<br/>- verified_by (uuid)"]
    end

    %% --- TIER 5: ENGAGEMENT ---
    subgraph Engagement [Engagement & Achievement]
        ANN["<b>announcements</b><br/>- id (uuid, PK)<br/>- title (text)<br/>- category (text)<br/>- created_by (uuid)"]
        MAT["<b>materials</b><br/>- id (uuid, PK)<br/>- subject_id (uuid)<br/>- file_url (text)<br/>- uploaded_by (uuid)"]
        COMP["<b>competitions</b><br/>- id (uuid, PK)<br/>- title (text)<br/>- created_by (uuid)"]
        ACHIEVE["<b>class_achievements</b><br/>- id (uuid, PK)<br/>- class_id (uuid)<br/>- rank (text)<br/>- created_by (uuid)"]
        MSG["<b>messages</b><br/>- id (uuid, PK)<br/>- content (text)<br/>- user_id (uuid)"]
        CHAT["<b>public_chat_messages</b><br/>- id (uuid, PK)<br/>- content (text)<br/>- user_id (uuid)"]
        PUSH["<b>push_subscriptions</b><br/>- id (uuid, PK)<br/>- user_id (uuid)<br/>- sub_data (jsonb)"]
    end

    %% --- RELATIONSHIPS (STRATEGIC ROUTING) ---
    AUTH --- PROFILES
    
    %% Jalur Atas (Security & Logs)
    AUTH --- ROLES
    AUTH --- SNIP
    AUTH --- DLOGS
    
    %% Jalur Tengah (Academic)
    PROFILES --- CLASSES
    SUBJECTS --- SEMESTERS
    CLASSES --- SCHED
    SUBJECTS --- SCHED
    SUBJECTS --- MEETINGS
    MEETINGS --- ASESS
    CLASSES --- ASESS
    
    %% Jalur Bawah (Operational & Finance)
    AUTH --- ASESS
    AUTH --- AREC
    AUTH --- TRANS
    AUTH --- WDUE
    PROFILES --- AREC
    ASESS --- AREC

    %% Jalur Samping (Social & Achievements)
    PROFILES --- MSG
    PROFILES --- CHAT
    PROFILES --- PUSH
    AUTH --- ANN
    AUTH --- MAT
    AUTH --- COMP
    AUTH --- ACHIEVE
    CLASSES --- ACHIEVE

    %% Styling
    style AUTH fill:#f1c40f,stroke:#333,stroke-width:4px
    style PROFILES fill:#3498db,stroke:#fff,color:#fff
    style Root fill:none,stroke:none