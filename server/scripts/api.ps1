function Login-Api($email, $password) {
  try {
    $login = Invoke-RestMethod -Method Post -Uri "$global:ApiBase/auth/login" `
      -ContentType "application/json" `
      -Body (@{ email = $email; password = $password } | ConvertTo-Json)
  } catch {
    $msg = $_.ErrorDetails.Message
    Write-Host "Falha no login: $msg" -ForegroundColor Red
    return
  }
  $global:ApiToken = $login.token
  if (-not $global:ApiToken) {
    Write-Host "Login sem token. Resposta:" -ForegroundColor Yellow
    $login | ConvertTo-Json -Depth 5
    return
  }
  Write-Host "Logado. Token guardado em `$global:ApiToken" -ForegroundColor Green
}