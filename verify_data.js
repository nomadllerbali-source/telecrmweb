
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('--- Checking Follow-ups Data ---');

    // 1. Get the latest follow-ups
    const { data: followUps, error } = await supabase
        .from('follow_ups')
        .select('id, lead_id, itinerary_id, update_type, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching follow-ups:', error);
        return;
    }

    console.log(`Found ${followUps.length} recent follow-ups:`);
    followUps.forEach(f => {
        console.log(`- ID: ${f.id}, Lead: ${f.lead_id}, Itinerary: ${f.itinerary_id}, Type: ${f.update_type}`);
    });

    // 2. Check for any itineraries
    const { data: itineraries } = await supabase
        .from('itineraries')
        .select('id, name')
        .limit(5);

    console.log('\n--- Sample Itineraries ---');
    console.log(itineraries);

    // 3. Check for specific orphaned links (Lead has itinerary but follow-up doesn't)
    if (followUps.length > 0) {
        const sampleLeadId = followUps[0].lead_id;
        console.log(`\n--- Checking interactions for Lead ${sampleLeadId} ---`);
        const { data: leadInteractions } = await supabase
            .from('follow_ups')
            .select('id, itinerary_id, update_type')
            .eq('lead_id', sampleLeadId);
        console.log(leadInteractions);
    }
}

checkData();
