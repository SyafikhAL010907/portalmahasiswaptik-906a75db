graph LR
    %% --- TIER 0: THE ROOT ---
    subgraph Root [Primary Root]
        AUTH((auth.users))
    end

    %% --- TIER 1: IDENTITY ---
    subgraph Identity [Core Identity]
        PROFILES[profiles]
    end

    %% --- TIER 2: MODULE GROUPS ---
    subgraph Security [Security & Access]
        ROLES[user_roles]
        SNIP[user_snippets]
        PUSH[push_subscriptions]
        DLOGS[download_logs]
    end

    subgraph Academic [Academic Infrastructure]
        CLASSES[classes]
        SUBJECTS[subjects]
        SEM[semesters]
        SCHED[schedules]
        MEET[meetings]
    end

    subgraph Operation [Operational Engine]
        ASESS[attendance_sessions]
        AREC[attendance_records]
        TRANS[transactions]
        WDUE[weekly_dues]
    end

    subgraph Social [Engagement & Social]
        ANN[announcements]
        MAT[materials]
        COMP[competitions]
        ACHIEVE[class_achievements]
        MSG[messages]
        CHAT[public_chat_messages]
    end

    subgraph System [System Configs]
        GCONF[global_configs]
        GSETT[global_settings]
    end

    %% --- RELATIONSHIPS (STRATEGIC ORDERING TO AVOID TANGLES) ---
    
    %% Main Identity Flow
    AUTH --- PROFILES

    %% Top Branch (Security)
    AUTH --- ROLES
    AUTH --- SNIP
    AUTH --- DLOGS
    PROFILES --- PUSH

    %% Middle Branch (Academic)
    PROFILES --- CLASSES
    PROFILES --- SCHED
    SUBJECTS --- SEM
    SUBJECTS --- SCHED
    SUBJECTS --- MEET
    MEET --- ASESS
    CLASSES --- ASESS
    CLASSES --- ACHIEVE

    %% Bottom Branch (Operational)
    AUTH --- ASESS
    AUTH --- AREC
    AUTH --- TRANS
    AUTH --- WDUE
    ASESS --- AREC
    PROFILES --- AREC

    %% Side Branch (Social)
    PROFILES --- MSG
    PROFILES --- CHAT
    AUTH --- ANN
    AUTH --- MAT
    AUTH --- COMP
    AUTH --- ACHIEVE

    %% Styling
    style AUTH fill:#f1c40f,stroke:#333,stroke-width:4px
    style PROFILES fill:#3498db,stroke:#fff,color:#fff
    style Root fill:none,stroke:none