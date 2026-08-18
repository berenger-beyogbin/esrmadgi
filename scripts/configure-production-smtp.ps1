param(
  [string]$Recipient = 'info@madgiesr.com'
)

$ErrorActionPreference = 'Stop'
$sshKey = 'C:\Users\BBY\.ssh\codex_madgi_esr'
$server = 'root@31.207.39.27'
$projectDir = '/opt/madgi-esr'
$email = 'info@madgiesr.com'

function ConvertFrom-Secure([Security.SecureString]$Value) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

Write-Host 'Configuration SMTP OVH Zimbra pour MADGI ESR' -ForegroundColor Cyan
Write-Host "Compte : $email"
$securePassword = Read-Host 'Mot de passe de la boite email (saisie masquee)' -AsSecureString
$password = ConvertFrom-Secure $securePassword
if ([string]::IsNullOrWhiteSpace($password)) { throw 'Le mot de passe ne peut pas etre vide.' }

$payload = @{
  SMTP_HOST = 'smtp.mail.ovh.net'
  SMTP_PORT = '465'
  SMTP_SECURE = 'true'
  SMTP_USER = $email
  SMTP_PASSWORD = $password
  SMTP_FROM = "MADGI ESR <$email>"
} | ConvertTo-Json -Compress
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($payload))
$password = $null
$payload = $null

$remotePython = @'
import base64, json, os, shutil, sys, time
path = "/opt/madgi-esr/deploy/production.env"
data = json.loads(base64.b64decode(sys.stdin.read()).decode("utf-8"))
backup = path + ".before-smtp-" + time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
shutil.copy2(path, backup)
with open(path, "r", encoding="utf-8") as f:
    lines = f.read().splitlines()
seen = set()
out = []
for line in lines:
    key = line.split("=", 1)[0] if "=" in line and not line.lstrip().startswith("#") else None
    if key in data:
        out.append(key + "=" + data[key])
        seen.add(key)
    else:
        out.append(line)
for key, value in data.items():
    if key not in seen:
        out.append(key + "=" + value)
tmp = path + ".tmp"
with open(tmp, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(out) + "\n")
os.chmod(tmp, 0o600)
os.replace(tmp, path)
print("Configuration enregistree; sauvegarde creee.")
'@

try {
  $pythonEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($remotePython))
  $envelope = @{ script = $pythonEncoded; payload = $encoded } | ConvertTo-Json -Compress
  $bootstrap = 'import sys,json,base64,io; x=json.load(sys.stdin); sys.stdin=io.StringIO(x["payload"]); exec(base64.b64decode(x["script"]))'
  $bootstrapEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($bootstrap))
  & ssh -i $sshKey -o BatchMode=yes $server "echo '$bootstrapEncoded' | base64 -d > /tmp/madgi-smtp-bootstrap.py && chmod 700 /tmp/madgi-smtp-bootstrap.py"
  if ($LASTEXITCODE -ne 0) { throw 'Impossible de preparer le canal securise.' }
  $envelope | & ssh -i $sshKey -o BatchMode=yes $server "python3 /tmp/madgi-smtp-bootstrap.py; code=`$?; rm -f /tmp/madgi-smtp-bootstrap.py; exit `$code"
  if ($LASTEXITCODE -ne 0) { throw 'Impossible de mettre a jour la configuration distante.' }

  & ssh -i $sshKey -o BatchMode=yes $server "cd $projectDir && docker compose --env-file deploy/production.env -f compose.production.yml up -d --force-recreate api"
  if ($LASTEXITCODE -ne 0) { throw "L'API n'a pas pu etre redemarree." }

  Write-Host 'Attente du controle de sante de l API...' -ForegroundColor Cyan
  $healthy = $false
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 2
    $status = (& ssh -i $sshKey -o BatchMode=yes $server "docker inspect --format='{{.State.Health.Status}}' madgi-esr-app-api-1 2>/dev/null").Trim()
    if ($status -eq 'healthy') { $healthy = $true; break }
  }
  if (-not $healthy) { throw "L'API n'est pas redevenue saine apres sa recreation." }

  $testScript = @"
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});
transport.sendMail({
  from: process.env.SMTP_FROM,
  to: '$Recipient',
  subject: 'Test SMTP MADGI ESR',
  text: 'La configuration SMTP de la plateforme MADGI ESR fonctionne correctement.'
}).then(() => { console.log('EMAIL_TEST_ENVOYE'); }).catch((error) => {
  console.error('EMAIL_TEST_ECHOUE:', error.message);
  process.exit(1);
});
"@
  $testEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($testScript))
  & ssh -i $sshKey -o BatchMode=yes $server "echo '$testEncoded' | base64 -d | docker exec -i madgi-esr-app-api-1 node"
  if ($LASTEXITCODE -ne 0) { throw "La configuration est enregistree, mais l'envoi du message test a echoue." }

  Write-Host "SMTP configure. Verifiez la reception du message dans $Recipient." -ForegroundColor Green
} finally {
  $password = $null
  $encoded = $null
  $pythonEncoded = $null
  $bootstrapEncoded = $null
  $envelope = $null
}
