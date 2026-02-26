-- Migration: Automatic Lead Sync Trigger (V2)
-- Description: Automatically synchronizes confirmed leads to the Finance Tracker when a confirmation is saved.
-- Tables covered: follow_ups, confirmations

-- 1. Create the sync function
CREATE OR REPLACE FUNCTION public.handle_lead_confirmation_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_lead_name TEXT;
    v_phone TEXT;
    v_destination TEXT;
    v_pax INTEGER;
    v_travel_date DATE;
    v_sales_person_name TEXT;
    v_sales_person_email TEXT;
    v_incentive_rate NUMERIC;
    v_incentive_amount NUMERIC;
    v_sales_person_id UUID;
    v_total_amount NUMERIC;
    v_advance_amount NUMERIC;
    v_due_amount NUMERIC;
    v_transaction_id TEXT;
BEGIN
    -- Only run for confirmed_advance_paid action in follow_ups
    -- OR always for confirmations table
    IF TG_TABLE_NAME = 'follow_ups' AND NEW.action_type != 'confirmed_advance_paid' THEN
        RETURN NEW;
    END IF;

    -- Mapping variables based on which table triggered this
    IF TG_TABLE_NAME = 'follow_ups' THEN
        v_sales_person_id := NEW.sales_person_id;
        v_total_amount := NEW.total_amount;
        v_advance_amount := NEW.advance_amount;
        v_due_amount := NEW.due_amount;
        v_transaction_id := NEW.transaction_id;
    ELSIF TG_TABLE_NAME = 'confirmations' THEN
        v_sales_person_id := NEW.confirmed_by;
        v_total_amount := NEW.total_amount;
        v_advance_amount := NEW.advance_amount;
        v_due_amount := NEW.total_amount - NEW.advance_amount;
        v_transaction_id := NEW.transaction_id;
    END IF;

    -- 1. Fetch Lead Details
    SELECT client_name, contact_number, place, COALESCE(no_of_pax, 1), travel_date
    INTO v_lead_name, v_phone, v_destination, v_pax, v_travel_date
    FROM leads
    WHERE id = NEW.lead_id;

    -- 2. Fetch SalesPerson Details
    SELECT full_name, email
    INTO v_sales_person_name, v_sales_person_email
    FROM profiles
    WHERE id = v_sales_person_id;

    -- 3. Fetch Incentive Rate
    SELECT (value::numeric) INTO v_incentive_rate
    FROM app_settings
    WHERE key = 'incentive_rate';
    
    IF v_incentive_rate IS NULL THEN
        v_incentive_rate := 250; -- Fallback
    END IF;

    v_incentive_amount := v_pax * v_incentive_rate;

    -- 4. Sync to finance_leads (Upsert based on crm_lead_id)
    INSERT INTO finance_leads (
        crm_lead_id, client_name, phone_number, destination, no_of_pax,
        travel_date, total_amount, advance_paid, due_amount,
        transaction_id, sales_person_name, sales_person_email,
        finance_user_id, status, incentive_earned, updated_at
    )
    VALUES (
        NEW.lead_id, v_lead_name, v_phone, v_destination, v_pax,
        v_travel_date, v_total_amount, v_advance_amount, v_due_amount,
        v_transaction_id, v_sales_person_name, v_sales_person_email,
        v_sales_person_id, 'confirmed', v_incentive_amount, now()
    )
    ON CONFLICT (crm_lead_id) DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        advance_paid = EXCLUDED.advance_paid,
        due_amount = EXCLUDED.due_amount,
        transaction_id = EXCLUDED.transaction_id,
        updated_at = now();

    -- 5. Create Income Transaction (Client Advance)
    -- prevent duplicates if the app also sends the request (checks last 5 mins)
    IF NOT EXISTS (
        SELECT 1 FROM transactions 
        WHERE user_id = v_sales_person_id 
        AND amount = v_advance_amount
        AND description LIKE '%Advance Payment - ' || v_lead_name || '%'
        AND created_at > now() - interval '5 minutes'
    ) THEN
        INSERT INTO transactions (
            user_id, description, amount, category, type, currency_code, date
        )
        VALUES (
            v_sales_person_id,
            'Advance Payment - ' || v_lead_name || ' (' || v_destination || ', ' || v_pax || ' Pax) - By ' || v_sales_person_name,
            v_advance_amount,
            'Client Advance',
            'income',
            'INR',
            CURRENT_DATE
        );
    END IF;

    -- 6. Create Incentive Transaction
    IF NOT EXISTS (
        SELECT 1 FROM transactions 
        WHERE user_id = v_sales_person_id 
        AND amount = v_incentive_amount
        AND description LIKE '%Sales Incentive - ' || v_lead_name || '%'
        AND created_at > now() - interval '5 minutes'
    ) THEN
        INSERT INTO transactions (
            user_id, description, amount, category, type, currency_code, date
        )
        VALUES (
            v_sales_person_id,
            'Sales Incentive - ' || v_lead_name || ' (' || v_pax || ' Pax @ ₹' || v_incentive_rate || ')',
            v_incentive_amount,
            'Sales Incentive',
            'income',
            'INR',
            CURRENT_DATE
        );
    END IF;

    -- 7. Ensure lead status is confirmed
    UPDATE leads SET status = 'confirmed' WHERE id = NEW.lead_id AND status != 'confirmed';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the triggers
DROP TRIGGER IF EXISTS tr_sync_confirmed_lead_followup ON follow_ups;
CREATE TRIGGER tr_sync_confirmed_lead_followup
AFTER INSERT ON follow_ups
FOR EACH ROW
EXECUTE FUNCTION public.handle_lead_confirmation_sync();

DROP TRIGGER IF EXISTS tr_sync_confirmed_lead_confirmation ON confirmations;
CREATE TRIGGER tr_sync_confirmed_lead_confirmation
AFTER INSERT ON confirmations
FOR EACH ROW
EXECUTE FUNCTION public.handle_lead_confirmation_sync();
