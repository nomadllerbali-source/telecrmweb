-- Function to safely upsert targets from the app
CREATE OR REPLACE FUNCTION upsert_monthly_targets(
  target_data jsonb
)
RETURNS void AS $$
DECLARE
  target_row jsonb;
  current_user_role text;
BEGIN
  -- Get current user role from session
  current_user_role := get_current_user_role();
  
  -- Only admins can upsert targets
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can manage targets (Current role: %)', current_user_role;
  END IF;

  -- Loop through the JSON array and upsert each target
  FOR target_row IN SELECT * FROM jsonb_array_elements(target_data)
  LOOP
    INSERT INTO targets (
      user_id,
      month,
      year,
      target_leads,
      target_conversions,
      target_revenue,
      updated_at
    )
    VALUES (
      (target_row->>'user_id')::uuid,
      target_row->>'month',
      (target_row->>'year')::integer,
      (target_row->>'target_leads')::integer,
      (target_row->>'target_conversions')::integer,
      (target_row->>'target_revenue')::decimal,
      now()
    )
    ON CONFLICT (user_id, month, year)
    DO UPDATE SET
      target_leads = EXCLUDED.target_leads,
      target_conversions = EXCLUDED.target_conversions,
      target_revenue = EXCLUDED.target_revenue,
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_monthly_targets(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_monthly_targets(jsonb) TO anon;
