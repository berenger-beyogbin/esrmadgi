param(
  [Parameter(Mandatory = $true)]
  [string]$Matricule
)

$ErrorActionPreference = 'Stop'
$supabaseUrl = 'https://supabase.madgiesr.com'
$sshKey = 'C:\Users\BBY\.ssh\codex_madgi_esr'
$server = 'root@31.207.39.27'

$serviceKey = (& ssh -i $sshKey $server "sed -n 's/^SERVICE_ROLE_KEY=//p' /opt/supabase/.env").Trim()
if (-not $serviceKey) { throw 'Impossible de recuperer la cle de service.' }

$headers = @{
  apikey = $serviceKey
  Authorization = "Bearer $serviceKey"
}

$normalized = $Matricule.Trim().ToUpperInvariant()
$encodedMatricule = [Uri]::EscapeDataString($normalized)
$rows = Invoke-RestMethod -Method Get `
  -Uri "$supabaseUrl/rest/v1/utilisateurs?matricule=eq.$encodedMatricule&select=id_utilisateur,matricule,email,profil,user_actif" `
  -Headers $headers

if (-not $rows -or $rows.Count -ne 1) { throw "Utilisateur $normalized introuvable ou ambigu." }
$row = $rows[0]
if (-not $row.email) { throw "Aucune adresse de connexion n'est associee a $normalized." }

$securePassword = Read-Host "Nouveau mot de passe pour $normalized" -AsSecureString
$confirmPassword = Read-Host 'Confirmez le mot de passe' -AsSecureString

function ConvertFrom-Secure([Security.SecureString]$value) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$password = ConvertFrom-Secure $securePassword
$confirmation = ConvertFrom-Secure $confirmPassword
if ($password -cne $confirmation) { throw 'Les deux mots de passe ne correspondent pas.' }
if ($password.Length -lt 8) { throw 'Le mot de passe doit contenir au moins 8 caracteres.' }

$usersResponse = Invoke-RestMethod -Method Get -Uri "$supabaseUrl/auth/v1/admin/users?page=1&per_page=1000" -Headers $headers
$authUser = $usersResponse.users | Where-Object { $_.email -eq $row.email } | Select-Object -First 1
$metadata = @{ matricule = $normalized; profil = $row.profil; must_change_password = $false }

if ($authUser) {
  $authUser = Invoke-RestMethod -Method Put -Uri "$supabaseUrl/auth/v1/admin/users/$($authUser.id)" `
    -Headers $headers -ContentType 'application/json' `
    -Body (@{ password = $password; email_confirm = $true; user_metadata = $metadata } | ConvertTo-Json)
} else {
  $authUser = Invoke-RestMethod -Method Post -Uri "$supabaseUrl/auth/v1/admin/users" `
    -Headers $headers -ContentType 'application/json' `
    -Body (@{ email = $row.email; password = $password; email_confirm = $true; user_metadata = $metadata } | ConvertTo-Json)
}

Invoke-RestMethod -Method Patch `
  -Uri "$supabaseUrl/rest/v1/utilisateurs?matricule=eq.$encodedMatricule" `
  -Headers ($headers + @{ Prefer = 'return=minimal' }) `
  -ContentType 'application/json' `
  -Body (@{ auth_user_id = $authUser.id; user_actif = $true } | ConvertTo-Json) | Out-Null

$password = $null
$confirmation = $null
Write-Host "Compte $normalized active avec succes." -ForegroundColor Green
