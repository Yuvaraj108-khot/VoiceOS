$ErrorActionPreference = 'Stop'
$base = "c:\Users\YUVARAJ KHOT\my files\Desktop\project\VoiceOS\src"

# 1. groqClient -> groq
$groqFiles = @(
  "$base\conversation\CallSummarizer.ts",
  "$base\conversation\ConversationEngine.ts",
  "$base\conversation\EmotionDetector.ts",
  "$base\conversation\IntentDetector.ts",
  "$base\conversation\LanguageDetector.ts"
)
foreach ($f in $groqFiles) {
  $c = Get-Content $f -Raw
  $c = $c -replace 'import \{ groqClient \} from ''\.\./lib/groq'';', 'import { groq } from ''../lib/groq'';'
  $c = $c -replace 'groqClient', 'groq'
  Set-Content $f -Value $c -NoNewline
}

# 2. redisClient -> redis
$redisFiles = @(
  "$base\conversation\MemoryManager.ts",
  "$base\jobs\queues\email.queue.ts",
  "$base\jobs\schedulers\cleanupScheduler.ts",
  "$base\realtime\SocketServer.ts",
  "$base\server.ts",
  "$base\telephony\CallSessionManager.ts"
)
foreach ($f in $redisFiles) {
  $c = Get-Content $f -Raw
  $c = $c -replace 'redisClient', 'redis'
  Set-Content $f -Value $c -NoNewline
}

# 3. ContextRetriever.ts
$cr = "$base\conversation\ContextRetriever.ts"
$c_cr = Get-Content $cr -Raw
$c_cr = $c_cr -replace 'prisma\.employeeKnowledge\.findMany', 'prisma.knowledgeDocument.findMany'
$c_cr = $c_cr -replace 'select: \{ knowledgeBaseId: true \}', 'select: { id: true }'
$c_cr = $c_cr -replace 'l => l\.knowledgeBaseId', '(l: any) => l.id'
Set-Content $cr -Value $c_cr -NoNewline

# 4. PromptBuilder.ts
$pb = "$base\conversation\PromptBuilder.ts"
$c_pb = Get-Content $pb -Raw
$c_pb = $c_pb -replace 'employee\.prompt', 'employee.systemPrompt'
Set-Content $pb -Value $c_pb -NoNewline

# 5. notification.worker.ts
$nw = "$base\jobs\workers\notification.worker.ts"
$c_nw = Get-Content $nw -Raw
$c_nw = $c_nw -replace 'message: data\.message', 'content: data.message'
Set-Content $nw -Value $c_nw -NoNewline

# 6. SocketServer.ts
$ss = "$base\realtime\SocketServer.ts"
$c_ss = Get-Content $ss -Raw
$c_ss = $c_ss -replace '\.\./api/middlewares/auth\.middleware', '../middleware/authenticate'
Set-Content $ss -Value $c_ss -NoNewline

# 7. CallRouter.ts
$car = "$base\telephony\CallRouter.ts"
$c_car = Get-Content $car -Raw
$c_car = $c_car -replace 'organizationId: string \| null', 'organizationId: string | undefined'
$c_car = $c_car -replace 'employeeId: string \| null', 'employeeId: string'
Set-Content $car -Value $c_car -NoNewline

# 8. TwilioManager.ts
$tm = "$base\telephony\TwilioManager.ts"
$c_tm = Get-Content $tm -Raw
$c_tm = $c_tm -replace 'statusCallbackEvent\s*:', 'statusCallbackEvent: ["initiated", "ringing", "answered", "completed"] as any,'
$c_tm = $c_tm -replace 'twilioSid:', 'country: "US", twilioSid:'
Set-Content $tm -Value $c_tm -NoNewline

# 9. VoiceProfileManager.ts
$vpm = "$base\voice\VoiceProfileManager.ts"
$c_vpm = Get-Content $vpm -Raw
$c_vpm = $c_vpm -replace 'voiceId:', '// voiceId:'
Set-Content $vpm -Value $c_vpm -NoNewline

# 10. workflow.types.ts
$wt = "$base\types\workflow.types.ts"
$c_wt = Get-Content $wt -Raw
$c_wt = $c_wt -replace 'import \{ WorkflowNodeType \} from ''@prisma/client'';', 'export type WorkflowNodeType = "TRIGGER" | "ACTION" | "CONDITION";'
Set-Content $wt -Value $c_wt -NoNewline

# 11. webhooks/calendar.webhook.ts
$wc = "$base\api\webhooks\calendar.webhook.ts"
$c_wc = Get-Content $wc -Raw
$c_wc = $c_wc -replace '\.\.\/\.\.\/\.\.\/lib\/logger', '../../lib/logger'
$c_wc = $c_wc -replace '\.\.\/\.\.\/\.\.\/lib\/prisma', '../../lib/prisma'
Set-Content $wc -Value $c_wc -NoNewline

# 12. webhooks/stripe.webhook.ts
$ws = "$base\api\webhooks\stripe.webhook.ts"
$c_ws = Get-Content $ws -Raw
$c_ws = $c_ws -replace '\.\.\/\.\.\/\.\.\/lib\/logger', '../../lib/logger'
Set-Content $ws -Value $c_ws -NoNewline

# 13. webhooks/twilio.webhook.ts
$wtw = "$base\api\webhooks\twilio.webhook.ts"
$c_wtw = Get-Content $wtw -Raw
$c_wtw = $c_wtw -replace '\.\.\/\.\.\/\.\.\/lib\/prisma', '../../lib/prisma'
$c_wtw = $c_wtw -replace '\.\.\/\.\.\/\.\.\/lib\/logger', '../../lib/logger'
Set-Content $wtw -Value $c_wtw -NoNewline

# 14. server.ts
$srv = "$base\server.ts"
$c_srv = Get-Content $srv -Raw
$c_srv = $c_srv -replace 'logger\.error\(''Failed to start server:'', err\)', 'logger.error({ err }, ''Failed to start server:'')'
$c_srv = $c_srv -replace 'logger\.error\(err, ''Failed to start server:''\)', 'logger.error({ err }, ''Failed to start server:'')'
Set-Content $srv -Value $c_srv -NoNewline
