# ThingsBoard Rule Engine — Dynamic Telemetry Telegram Alert Guide

This guide describes how to configure the **Telegram Alert Chain** to automatically compare incoming telemetry against the flat room asset thresholds (`co2Max`, `laeqMax`, etc.) saved by your Angular Control Panel.

This is a self-contained setup. You do **not** need to manually configure Alarm Rules on your Device Profiles. The Rule Chain does the checks, creates the alarms, and dispatches Telegram notifications.

---

## How It Works
1. When you save thresholds in the **Angular Control Panel**, the UI saves them as **flat server attributes** (e.g. `co2Max`, `laeqMax`, `telegram_botToken`, `telegram_chatId`, `telegram_enabled`) directly on your Room Assets.
2. The **Root Rule Chain** routes telemetry from your Milesight sensors to this **Telegram Alert Chain**.
3. The chain fetches the room asset attributes, compares them directly (e.g., `msg.co2 >= metadata.co2Max`), creates an alarm, and pushes the alert to Telegram.

---

## Step 1: Import the Rule Chain

1. Open **ThingsBoard Admin** → **Rule Chains** (left sidebar).
2. Click the **+** button → **Import Rule Chain**.
3. Upload the file: `thingsboard/telegram-alert-rule-chain.json`.
4. Click **Import** → You should see "Telegram Alert Chain" appear.

The imported chain contains 6 nodes:
```
Filter Room Devices → Fetch Hotel Config → Threshold Check → Create Alert Alarm → Build Telegram Payload → Send Telegram
```

---

## Step 2: Route Telemetry in the Root Rule Chain

To check thresholds on incoming sensor data, connect your telemetry flow to the new `Telegram Alert Chain`:

1. Open your **Root Rule Chain**.
2. Add a new node: **Flow** → **Rule Chain** node.
   - **Name:** `Telegram Alerts`
   - **Rule Chain:** Select `Telegram Alert Chain`
3. Locate the **Message Type Switch** node.
4. Draw a wire from the output relation **`Post telemetry`** → connect it to the new **Telegram Alerts** node.
5. Click **Apply Changes** (checkmark button, bottom-right).

---

## Step 3: Configure Telegram in the Angular Dashboard

1. Open the Revelton Dashboard in your browser.
2. Click **Settings** (gear icon) → navigate to the **Telegram** tab.
3. Toggle **Enabled** ON.
4. Enter:
   - **Bot Token:** The token from @BotFather (e.g., `7123456789:AAH...`)
   - **Chat ID:** Your group chat ID (e.g., `-1001234567890`)
   - **Topic ID:** The forum thread ID (optional, e.g., `42`)
5. Click **Save thresholds**.

This will write `telegram_botToken`, `telegram_chatId`, `telegram_topicId`, and `telegram_enabled = true` along with all thresholds as flat server attributes on your Room Assets.

---

## Step 4: Verify and Test

1. Trigger a breach (e.g., set `co2Max` to `100` ppm in the Control Panel, save thresholds, and blow air onto your CO₂ sensor).
2. Look at the **Events** tab of the **Threshold Check** node in the rule chain to verify `Success` outcomes.
3. You will see a new alarm in the **Alarms list** named `Threshold Alert`, and the Telegram message will fire:
   ```
   🚨 THRESHOLD ALERT
   🏨 Device: RST-KLV-AM308-017-5
   ⏰ Time: 2026-06-22T13:26:00.000Z

   CO₂: 450 ppm (limit: 100)
   ```
4. **Important:** Remember to clear/resolve the `Threshold Alert` alarm on your alarm list to receive subsequent test alerts for that device, and restore your thresholds to normal!
