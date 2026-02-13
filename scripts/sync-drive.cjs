const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/portalmahasiswaptik/.env') });

const PARENT_FOLDER_ID = '1b4bby3CRLAX9pL1QKD87HU0Os0slKaIi';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Google Drive
const KEYFILEPATH = path.join(__dirname, '../google-drive-key.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

async function createFolder(name, parentId) {
    try {
        const fileMetadata = {
            name: name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        };
        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        return folder.data.id;
    } catch (error) {
        console.error(`Error creating folder ${name}:`, error.message);
        throw error;
    }
}

async function sync() {
    console.log('Starting sync...');

    // 1. Fetch Semesters
    const { data: semesters, error: semError } = await supabase.from('semesters').select('*').order('id');
    if (semError) {
        console.error('Error fetching semesters:', semError.message);
        return;
    }

    console.log(`Found ${semesters.length} semesters.`);

    for (const sem of semesters) {
        let semFolderId = sem.drive_folder_id;

        if (!semFolderId) {
            console.log(`Creating folder for Semester: ${sem.name}...`);
            semFolderId = await createFolder(sem.name, PARENT_FOLDER_ID);

            const { error: updateError } = await supabase
                .from('semesters')
                .update({ drive_folder_id: semFolderId })
                .eq('id', sem.id);

            if (updateError) {
                console.error(`Error updating semester ${sem.name}:`, updateError.message);
            } else {
                console.log(`Updated semester ${sem.name} with Drive ID: ${semFolderId}`);
            }
        } else {
            console.log(`Semester ${sem.name} already has Drive ID: ${semFolderId}`);
        }

        // 2. Fetch Subjects for this Semester
        const { data: subjects, error: subError } = await supabase
            .from('subjects')
            .select('*')
            .eq('semester', sem.id);

        if (subError) {
            console.error(`Error fetching subjects for semester ${sem.id}:`, subError.message);
            continue;
        }

        console.log(`Found ${subjects.length} subjects for ${sem.name}.`);

        for (const sub of subjects) {
            if (!sub.drive_folder_id) {
                console.log(`Creating folder for Subject: ${sub.name}...`);
                const subFolderId = await createFolder(sub.name, semFolderId);

                const { error: updateSubError } = await supabase
                    .from('subjects')
                    .update({ drive_folder_id: subFolderId })
                    .eq('id', sub.id);

                if (updateSubError) {
                    console.error(`Error updating subject ${sub.name}:`, updateSubError.message);
                } else {
                    console.log(`Updated subject ${sub.name} with Drive ID: ${subFolderId}`);
                }
            } else {
                console.log(`Subject ${sub.name} already has Drive ID: ${sub.drive_folder_id}`);
            }
        }
    }

    console.log('Sync finished successfully!');
}

sync().catch(err => {
    console.error('Sync failed:', err);
});
