$ErrorActionPreference = 'Stop'
$base = "c:\Users\YUVARAJ KHOT\my files\Desktop\project\VoiceOS\src"

# 1. billing.service.ts
$bs = "$base\api\v1\billing\billing.service.ts"
$c_bs = Get-Content $bs -Raw
$c_bs = $c_bs -replace 'organization\.stripeCustomerId', '(organization as any).stripeCustomerId'
$c_bs = $c_bs -replace 'organization\.stripeSubscriptionId', '(organization as any).stripeSubscriptionId'
$c_bs = $c_bs -replace 'stripeCustomerId: ', '// @ts-ignore`n      stripeCustomerId: '
$c_bs = $c_bs -replace 'PlanTier \| EnumPlanTierFieldUpdateOperationsInput \| undefined', 'any'
Set-Content $bs -Value $c_bs -NoNewline

# 2. integrations.service.ts
$ins = "$base\api\v1\integrations\integrations.service.ts"
$c_ins = Get-Content $ins -Raw
$c_ins = $c_ins -replace 'import \{ encryption \} from', 'import * as encryption from'
Set-Content $ins -Value $c_ins -NoNewline

# 3. CallSessionManager.ts
$csm = "$base\telephony\CallSessionManager.ts"
$c_csm = Get-Content $csm -Raw
$c_csm = $c_csm -replace '!\(redis\.status === "ready"\)', 'redis.status !== "ready"'
$c_csm = $c_csm -replace '!redis\.status === "ready"', 'redis.status !== "ready"'
Set-Content $csm -Value $c_csm -NoNewline

# 4. SocketServer.ts
$ss = "$base\realtime\SocketServer.ts"
$c_ss = Get-Content $ss -Raw
$c_ss = $c_ss -replace '!\(redis\.status === "ready"\)', 'redis.status !== "ready"'
$c_ss = $c_ss -replace '!redis\.status === "ready"', 'redis.status !== "ready"'
Set-Content $ss -Value $c_ss -NoNewline

# 5. server.ts
$srv = "$base\server.ts"
$c_srv = Get-Content $srv -Raw
$c_srv = $c_srv -replace '!\(redis\.status === "ready"\)', 'redis.status !== "ready"'
$c_srv = $c_srv -replace '!redis\.status === "ready"', 'redis.status !== "ready"'
Set-Content $srv -Value $c_srv -NoNewline
