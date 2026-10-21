-- Migrate LIGHT sensor readings from raw ADC (0–1280) to brightness percentage (0–100).
-- Run ONCE after deploying the new code that stores light values as percentage.
-- Safe to run multiple times: values already in 0–100 range will clamp correctly,
-- but running twice WILL corrupt data, so track whether it has been applied.

-- Convert existing readings in sensor_data.
UPDATE sensor_data sd
JOIN sensors s ON sd.sensor_id = s.id
SET sd.reading_value = GREATEST(0, 100 - LEAST(100, ROUND((sd.reading_value / 1280) * 100)))
WHERE s.sensor_type = 'LIGHT';

-- Convert cached last_value on the light sensor row.
UPDATE sensors
SET last_value = GREATEST(0, 100 - LEAST(100, ROUND((last_value / 1280) * 100)))
WHERE sensor_type = 'LIGHT'
  AND last_value IS NOT NULL;
