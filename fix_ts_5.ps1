$ErrorActionPreference = 'Stop'
$base = "c:\Users\YUVARAJ KHOT\my files\Desktop\project\VoiceOS\src"

$files = @(
  "$base\conversation\CallSummarizer.ts",
  "$base\conversation\EmotionDetector.ts",
  "$base\conversation\IntentDetector.ts",
  "$base\conversation\LanguageDetector.ts"
)

foreach ($f in $files) {
  $c = Get-Content $f -Raw
  $c = $c -replace 'import \{ groq, chatCompletion \} from ''\.\./lib/groq'';', "import { groq, chatCompletion, ChatMessage } from '../lib/groq';"
  $c = $c -replace 'const messages = \[', 'const messages: ChatMessage[] = ['
  Set-Content $f -Value $c -NoNewline
}
