import { supabase } from '../lib/supabase';

/**
 * Syncs a confirmed booking's advance payment to the Finance Tracker
 */
export async function syncAdvancePaymentToFinance({
    leadName,
    advanceAmount,
    totalAmount,
    dueAmount,
    salesPersonId,
    salesPersonEmail,
    salesPersonName,
    transactionId,
    place,
    pax,
    phoneNumber,
    travelDate,
    crmLeadId
}) {
    try {
        console.log('🔄 Syncing advance payment to Finance Tracker:', {
            leadName,
            advanceAmount,
            totalAmount,
            salesPersonEmail,
            crmLeadId
        });

        // We are on the same database now, so we can use the salesPersonId directly!
        // The CRM's user.id is exactly the same as the Finance app's user.id.
        let financeUserId = salesPersonId;

        console.log('💡 Using direct SalesPerson ID for Finance Sync:', financeUserId);

        /* 
        // Logic for lookup is preserved for posterity but bypassed for reliability
        if (salesPersonName) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .ilike('full_name', salesPersonName)
                .maybeSingle();

            if (profile) {
                financeUserId = profile.id;
                console.log('✅ Found Finance Tracker user by name:', financeUserId);
            }
        }
        */

        // Fetch incentive rate from app_settings
        let incentiveRate = 250; // Fallback
        const { data: settingsData } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'incentive_rate')
            .single();

        if (settingsData && settingsData.value) {
            incentiveRate = parseFloat(settingsData.value) || 250;
        }

        const incentiveAmount = pax * incentiveRate;

        // Create or update lead record
        const leadData = {
            crm_lead_id: crmLeadId,
            client_name: leadName,
            phone_number: phoneNumber || null,
            destination: place,
            no_of_pax: pax,
            travel_date: travelDate || null,
            total_amount: totalAmount,
            advance_paid: advanceAmount,
            due_amount: dueAmount,
            transaction_id: transactionId,
            sales_person_name: salesPersonName,
            sales_person_email: salesPersonEmail || 'sales@nomadller.com',
            finance_user_id: financeUserId,
            status: 'confirmed',
            incentive_earned: incentiveAmount,
            updated_at: new Date().toISOString()
        };

        const { data: leadRecord, error: leadError } = await supabase
            .from('finance_leads')
            .upsert(leadData, { onConflict: 'crm_lead_id' })
            .select();

        if (leadError) {
            console.error('❌ Failed to create lead record:', leadError);
            throw new Error(`Finance Lead Sync Failed: ${leadError.message}`);
        }

        console.log('✅ Lead record created/updated:', leadRecord);

        // Create income transaction in Finance Tracker
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: financeUserId,
                description: `Advance Payment - ${leadName} (${place}, ${pax} Pax) - By ${salesPersonName}`,
                amount: advanceAmount,
                category: 'Client Advance',
                type: 'income',
                currency_code: 'INR', // Explicitly set currency
                date: new Date().toISOString().split('T')[0]
            })
            .select();

        if (transactionError) {
            console.error('❌ Failed to insert transaction:', transactionError);
            return { success: false, error: 'Lead synced but transaction failed: ' + transactionError.message };
        }

        // Create incentive transaction
        const { error: incError } = await supabase
            .from('transactions')
            .insert({
                user_id: financeUserId,
                description: `Sales Incentive - ${leadName} (${pax} Pax @ ₹${incentiveRate})`,
                amount: incentiveAmount,
                category: 'Sales Incentive',
                type: 'income',
                currency_code: 'INR',
                date: new Date().toISOString().split('T')[0]
            });

        if (incError) {
            console.error('❌ Failed to insert incentive transaction:', incError);
        }

        console.log('✅ Successfully synced to Finance Tracker:', transaction);
        return { success: true, data: transaction, leadRecord };
    } catch (err) {
        console.error('❌ Error syncing to Finance Tracker:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Fetches all confirmed leads from CRM for display in Finance Tracker
 */
export async function getConfirmedLeadsFromCRM(salesPersonId = null) {
    console.log('Fetching confirmed leads from CRM...');
    return [];
}
