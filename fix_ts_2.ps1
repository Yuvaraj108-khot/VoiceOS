$ErrorActionPreference = 'Stop'
$base = "c:\Users\YUVARAJ KHOT\my files\Desktop\project\VoiceOS\src"

# 1. integrations.service.ts
$ins = "$base\api\v1\integrations\integrations.service.ts"
$c_ins = Get-Content $ins -Raw
$c_ins = $c_ins -replace 'type: options\.type', 'provider: options.type'
$c_ins = $c_ins -replace 'type: true', 'provider: true'
$c_ins = $c_ins -replace 'config: data\.config', 'config: data.config ? data.config as any : undefined'
Set-Content $ins -Value $c_ins -NoNewline

# 2. integrations.validator.ts
$inv = "$base\api\v1\integrations\integrations.validator.ts"
$c_inv = Get-Content $inv -Raw
$c_inv = $c_inv -replace 'import \{ IntegrationType \} from ''@prisma/client'';', 'export type IntegrationType = "STRIPE" | "TWILIO" | "SENDGRID" | "HUBSPOT" | "SALESFORCE" | "GOOGLE_CALENDAR" | "WHATSAPP";'
Set-Content $inv -Value $c_inv -NoNewline

# 3. knowledge.routes.ts
$kr = "$base\api\v1\knowledge\knowledge.routes.ts"
$c_kr = Get-Content $kr -Raw
$c_kr = $c_kr -replace '\.\.\/\.\.\/\.\.\/middleware\/upload', '../../middleware/upload'
Set-Content $kr -Value $c_kr -NoNewline

# 4. notifications.service.ts
$ns = "$base\api\v1\notifications\notifications.service.ts"
$c_ns = Get-Content $ns -Raw
$c_ns = $c_ns -replace 'readAt: null', 'isRead: false'
$c_ns = $c_ns -replace 'readAt: new Date\(\)', 'isRead: true'
Set-Content $ns -Value $c_ns -NoNewline

# 5. Groq Chat 
$groqFiles = @(
  "$base\conversation\CallSummarizer.ts",
  "$base\conversation\ConversationEngine.ts",
  "$base\conversation\EmotionDetector.ts",
  "$base\conversation\IntentDetector.ts",
  "$base\conversation\LanguageDetector.ts"
)
foreach ($f in $groqFiles) {
  $c = Get-Content $f -Raw
  $c = $c -replace 'await groq\.chat\(', 'await chatCompletion('
  $c = $c -replace 'import \{ groq \} from ''\.\./lib/groq'';', "import { groq, chatCompletion } from '../lib/groq';"
  Set-Content $f -Value $c -NoNewline
}

# 6. MemoryManager.ts
$mm = "$base\conversation\MemoryManager.ts"
$c_mm = Get-Content $mm -Raw
$c_mm = $c_mm -replace 'if \(!redis\.isOpen\)', 'if (redis.status !== "ready")'
$c_mm = $c_mm -replace 'redis\.rPush', 'redis.rpush'
$c_mm = $c_mm -replace 'redis\.lRange', 'redis.lrange'
$c_mm = $c_mm -replace 'item =>', '(item: any) =>'
Set-Content $mm -Value $c_mm -NoNewline

# 7. SocketServer.ts
$ss = "$base\realtime\SocketServer.ts"
$c_ss = Get-Content $ss -Raw
$c_ss = $c_ss -replace 'authenticateSocket', 'authenticate'
$c_ss = $c_ss -replace 'redis\.isOpen', 'redis.status === "ready"'
Set-Content $ss -Value $c_ss -NoNewline

# 8. server.ts
$srv = "$base\server.ts"
$c_srv = Get-Content $srv -Raw
$c_srv = $c_srv -replace 'redis\.isOpen', 'redis.status === "ready"'
Set-Content $srv -Value $c_srv -NoNewline

# 9. CallSessionManager.ts
$csm = "$base\telephony\CallSessionManager.ts"
$c_csm = Get-Content $csm -Raw
$c_csm = $c_csm -replace 'redis\.isOpen', 'redis.status === "ready"'
$c_csm = $c_csm -replace 'redis\.setEx', 'redis.setex'
Set-Content $csm -Value $c_csm -NoNewline

# 10. TwilioManager.ts
$tm = "$base\telephony\TwilioManager.ts"
$c_tm = Get-Content $tm -Raw
$c_tm = $c_tm -replace 'statusCallbackEvent: \["initiated", "ringing", "answered", "completed"\] as any,', ''
Set-Content $tm -Value $c_tm -NoNewline

# 11. VoiceProfileManager.ts
$vpm = "$base\voice\VoiceProfileManager.ts"
$c_vpm = Get-Content $vpm -Raw
$c_vpm = $c_vpm -replace 'metadata: \{ voiceId, \.\.\.settings \}', 'voiceId'
Set-Content $vpm -Value $c_vpm -NoNewline
