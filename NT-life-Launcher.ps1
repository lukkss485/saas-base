Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$script:root = $PSScriptRoot
$script:logDirectory = Join-Path $env:LOCALAPPDATA 'NT-life\launcher-logs'
New-Item -ItemType Directory -Path $script:logDirectory -Force | Out-Null

$script:serviceOrder = @('database', 'api', 'tauri')
$script:services = @{
  database = @{
    Name = 'Banco de dados'
    Detail = 'PostgreSQL local'
    Folder = Join-Path $script:root 'server'
    Command = 'db'
    Port = 5432
    HealthUrl = $null
    Timeout = 120
    Process = $null
    State = 'stopped'
  }
  api = @{
    Name = 'API e servidor'
    Detail = 'Express · localhost:3000'
    Folder = Join-Path $script:root 'server'
    Command = 'dev'
    Port = 3000
    HealthUrl = 'http://127.0.0.1:3000/api/health'
    Timeout = 90
    Process = $null
    State = 'stopped'
  }
  tauri = @{
    Name = 'Aplicativo NT-life'
    Detail = 'Tauri · Vite'
    Folder = Join-Path $script:root 'client'
    Command = 'tauri dev'
    Port = 5173
    HealthUrl = $null
    Timeout = 90
    Process = $null
    State = 'stopped'
  }
}

$script:sequence = @()
$script:sequenceIndex = 0
$script:sequenceStartedAt = $null
$script:operation = $null

function Add-LauncherLog {
  param([string]$Message, [string]$Color = '#AEBBD0')
  $stamp = Get-Date -Format 'HH:mm:ss'
  $script:logBox.SelectionStart = $script:logBox.TextLength
  $script:logBox.SelectionColor = [System.Drawing.ColorTranslator]::FromHtml($Color)
  $script:logBox.AppendText("[$stamp] $Message`r`n")
  $script:logBox.SelectionColor = [System.Drawing.ColorTranslator]::FromHtml('#AEBBD0')
  $script:logBox.SelectionStart = $script:logBox.TextLength
  $script:logBox.ScrollToCaret()
}

function Update-ServiceCard {
  param([string]$Id, [string]$State, [string]$Message)
  $service = $script:services[$Id]
  $service.State = $State
  $script:serviceCards[$Id].Status.Text = $Message

  switch ($State) {
    'running' {
      $script:serviceCards[$Id].Dot.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#45D483')
      $script:serviceCards[$Id].Status.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#8DE9B1')
    }
    'external' {
      $script:serviceCards[$Id].Dot.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#58A6FF')
      $script:serviceCards[$Id].Status.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#8DC4FF')
    }
    'starting' {
      $script:serviceCards[$Id].Dot.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#F3B74E')
      $script:serviceCards[$Id].Status.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#F3C875')
    }
    'error' {
      $script:serviceCards[$Id].Dot.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#F06464')
      $script:serviceCards[$Id].Status.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#FF9292')
    }
    default {
      $script:serviceCards[$Id].Dot.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#5B6578')
      $script:serviceCards[$Id].Status.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#8995A9')
    }
  }
}

function Test-TcpPort {
  param([int]$Port)
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $pending = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    if (-not $pending.AsyncWaitHandle.WaitOne(250, $false)) {
      return $false
    }
    $client.EndConnect($pending)
    return $client.Connected
  }
  catch {
    return $false
  }
  finally {
    $client.Close()
  }
}

function Test-ServiceReady {
  param([string]$Id)
  $service = $script:services[$Id]

  if ($Id -eq 'tauri') {
    $process = $service.Process
    return $null -ne $process -and -not $process.HasExited -and (Test-TcpPort -Port $service.Port)
  }

  if (-not (Test-TcpPort -Port $service.Port)) {
    return $false
  }

  if ($service.HealthUrl) {
    try {
      $request = [System.Net.HttpWebRequest]::Create($service.HealthUrl)
      $request.Method = 'GET'
      $request.Timeout = 700
      $request.ReadWriteTimeout = 700
      $response = $request.GetResponse()
      try {
        return [int]$response.StatusCode -eq 200
      }
      finally {
        $response.Close()
      }
    }
    catch {
      return $false
    }
  }

  return $true
}

function Start-ServiceProcess {
  param([string]$Id)
  $service = $script:services[$Id]

  if (-not (Test-Path -LiteralPath $service.Folder)) {
    throw "Pasta do serviço não encontrada: $($service.Folder)"
  }

  if (Test-ServiceReady -Id $Id) {
    Update-ServiceCard -Id $Id -State 'external' -Message 'Já estava ativo'
    Add-LauncherLog "$($service.Name) já está ativo; não será iniciado outro processo." '#8DC4FF'
    return
  }

  if ($null -ne $service.Process -and -not $service.Process.HasExited) {
    Update-ServiceCard -Id $Id -State 'starting' -Message 'Iniciando...'
    return
  }

  if ($Id -eq 'database' -and (Test-TcpPort -Port $service.Port)) {
    Update-ServiceCard -Id $Id -State 'external' -Message 'Banco externo ativo'
    Add-LauncherLog 'A porta 5432 já está ocupada. O banco existente será usado, sem ser encerrado.' '#8DC4FF'
    return
  }

  $stdout = Join-Path $script:logDirectory "$Id-out.log"
  Set-Content -LiteralPath $stdout -Value '' -Encoding UTF8

  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $env:ComSpec
  $startInfo.Arguments = "/d /c pnpm $($service.Command) >> `"$stdout`" 2>&1"
  $startInfo.WorkingDirectory = $service.Folder
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $startInfo

  if (-not $process.Start()) {
    throw "Não foi possível iniciar $($service.Name)."
  }
  $service.Process = $process
  $service.Stdout = $stdout
  Update-ServiceCard -Id $Id -State 'starting' -Message 'Iniciando...'
  Add-LauncherLog "Iniciando $($service.Name)..."
}

function Get-ServiceError {
  param([string]$Id)
  $service = $script:services[$Id]
  $lines = @()
  if ($service.Stdout -and (Test-Path -LiteralPath $service.Stdout)) {
    $lines = @(Get-Content -LiteralPath $service.Stdout -Tail 8 -ErrorAction SilentlyContinue)
  }
  if ($lines.Count -gt 0) {
    return ($lines -join ' | ')
  }
  return 'O processo encerrou antes de ficar pronto. Consulte os logs em ' + $script:logDirectory
}

function Start-Sequence {
  param([string[]]$Ids, [string]$Label)
  if ($script:operation) {
    Add-LauncherLog 'Aguarde a operação atual terminar.' '#F3C875'
    return
  }

  $script:sequence = @($Ids)
  $script:sequenceIndex = 0
  $script:sequenceStartedAt = $null
  $script:operation = $Label
  $script:progress.Value = 0
  $script:operationLabel.Text = $Label
  $script:timer.Start()
  Advance-Sequence
}

function Advance-Sequence {
  if (-not $script:operation) {
    return
  }

  if ($script:sequenceIndex -ge $script:sequence.Count) {
    $finished = $script:operation
    $script:timer.Stop()
    $script:operation = $null
    $script:sequence = @()
    $script:progress.Value = 100
    $script:operationLabel.Text = 'Pronto'
    Add-LauncherLog "$finished concluído." '#8DE9B1'
    return
  }

  $id = $script:sequence[$script:sequenceIndex]
  $service = $script:services[$id]
  $ready = Test-ServiceReady -Id $id

  if ($ready) {
    $isExternal = $service.State -eq 'external' -or
      ($null -eq $service.Process) -or
      $service.Process.HasExited
    $message = if ($isExternal) { 'Já estava ativo' } else { 'Em execução' }
    $state = if ($isExternal) { 'external' } else { 'running' }
    Update-ServiceCard -Id $id -State $state -Message $message
    $script:progress.Value = [Math]::Min(100, [int](($script:sequenceIndex + 1) * 100 / $script:sequence.Count))
    $script:sequenceIndex++
    $script:sequenceStartedAt = $null
    if ($id -ne 'tauri' -and $state -eq 'running') {
      Add-LauncherLog "$($service.Name) pronto."
    }
    Advance-Sequence
    return
  }

  if ($null -eq $script:sequenceStartedAt) {
    try {
      Start-ServiceProcess -Id $id
      $script:sequenceStartedAt = Get-Date
      return
    }
    catch {
      Update-ServiceCard -Id $id -State 'error' -Message 'Falha ao iniciar'
      Add-LauncherLog $_.Exception.Message '#FF9292'
      $script:timer.Stop()
      $script:operation = $null
      return
    }
  }

  if ($null -ne $service.Process -and $service.Process.HasExited) {
    $errorText = Get-ServiceError -Id $id
    Update-ServiceCard -Id $id -State 'error' -Message 'Falha ao iniciar'
    Add-LauncherLog "$($service.Name) encerrou: $errorText" '#FF9292'
    $script:timer.Stop()
    $script:operation = $null
    return
  }

  $elapsed = ((Get-Date) - $script:sequenceStartedAt).TotalSeconds
  if ($elapsed -ge $service.Timeout) {
    Update-ServiceCard -Id $id -State 'error' -Message 'Tempo esgotado'
    Add-LauncherLog "$($service.Name) não ficou pronto após $($service.Timeout) segundos. Verifique os logs em $script:logDirectory" '#FF9292'
    $script:timer.Stop()
    $script:operation = $null
    return
  }

  $script:operationLabel.Text = "Aguardando $($service.Name)..."
}

function Get-ProcessTreeIds {
  param([int]$RootId)
  $all = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
  $found = New-Object 'System.Collections.Generic.List[int]'
  $pending = New-Object 'System.Collections.Generic.Queue[int]'
  $pending.Enqueue($RootId)

  while ($pending.Count -gt 0) {
    $parentId = $pending.Dequeue()
    foreach ($child in $all | Where-Object { [int]$_.ParentProcessId -eq $parentId }) {
      $childId = [int]$child.ProcessId
      $found.Add($childId)
      $pending.Enqueue($childId)
    }
  }

  $found.Reverse()
  $found.Add($RootId)
  return $found.ToArray()
}

function Stop-ManagedService {
  param([string]$Id)
  $service = $script:services[$Id]

  if ($service.State -eq 'external') {
    Update-ServiceCard -Id $Id -State 'external' -Message 'Ativo (não gerenciado)'
    Add-LauncherLog "$($service.Name) foi iniciado fora deste launcher e não será encerrado." '#8DC4FF'
    return
  }

  $process = $service.Process
  if ($null -eq $process) {
    Update-ServiceCard -Id $Id -State 'stopped' -Message 'Parado'
    return
  }

  try {
    if (-not $process.HasExited) {
      $processIds = @(Get-ProcessTreeIds -RootId $process.Id)
      foreach ($processId in $processIds) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
      }
      $process.WaitForExit(3000) | Out-Null
    }
  }
  catch {
    Add-LauncherLog "Não foi possível encerrar $($service.Name): $($_.Exception.Message)" '#FF9292'
  }
  finally {
    $service.Process = $null
    Update-ServiceCard -Id $Id -State 'stopped' -Message 'Parado'
    Add-LauncherLog "$($service.Name) parado."
  }
}

function Stop-Services {
  param([string[]]$Ids, [string]$Label)
  if ($script:operation) {
    $script:timer.Stop()
    $script:operation = $null
    $script:sequence = @()
    Add-LauncherLog 'Inicialização cancelada.'
  }
  foreach ($id in $Ids) {
    Stop-ManagedService -Id $id
  }
  $script:progress.Value = 0
  $script:operationLabel.Text = $Label
}

function Start-OneService {
  param([string]$Id)
  switch ($Id) {
    'database' { Start-Sequence -Ids @('database') -Label 'Iniciando banco de dados' }
    'api' { Start-Sequence -Ids @('database', 'api') -Label 'Iniciando servidor' }
    'tauri' { Start-Sequence -Ids @('database', 'api', 'tauri') -Label 'Iniciando aplicativo' }
  }
}

function Restart-OneService {
  param([string]$Id)
  switch ($Id) {
    'database' {
      Stop-Services -Ids @('tauri', 'api', 'database') -Label 'Reiniciando ambiente'
      Start-Sequence -Ids @('database', 'api', 'tauri') -Label 'Reiniciando ambiente'
    }
    'api' {
      $restartTauri = $script:services.tauri.State -in @('running', 'starting')
      Stop-Services -Ids @('tauri', 'api') -Label 'Reiniciando servidor'
      $ids = if ($restartTauri) { @('database', 'api', 'tauri') } else { @('database', 'api') }
      Start-Sequence -Ids $ids -Label 'Reiniciando servidor'
    }
    'tauri' {
      Stop-Services -Ids @('tauri') -Label 'Reiniciando aplicativo'
      Start-Sequence -Ids @('database', 'api', 'tauri') -Label 'Reiniciando aplicativo'
    }
  }
}

$form = [System.Windows.Forms.Form]::new()
$form.Text = 'NT-life'
$form.StartPosition = 'CenterScreen'
$form.Size = [System.Drawing.Size]::new(900, 760)
$form.MinimumSize = [System.Drawing.Size]::new(820, 700)
$form.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#0B1020')
$form.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#E8EDF7')
$form.Font = [System.Drawing.Font]::new('Segoe UI', 9)
$form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi

$brand = [System.Windows.Forms.Label]::new()
$brand.Text = 'NT'
$brand.Font = [System.Drawing.Font]::new('Segoe UI Semibold', 42, [System.Drawing.FontStyle]::Bold)
$brand.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#F4F7FF')
$brand.TextAlign = 'MiddleCenter'
$brand.SetBounds(350, 24, 200, 66)
$form.Controls.Add($brand)

$brandLife = [System.Windows.Forms.Label]::new()
$brandLife.Text = 'life'
$brandLife.Font = [System.Drawing.Font]::new('Segoe UI', 10)
$brandLife.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#8EA0BD')
$brandLife.TextAlign = 'MiddleCenter'
$brandLife.SetBounds(350, 82, 200, 20)
$form.Controls.Add($brandLife)

$title = [System.Windows.Forms.Label]::new()
$title.Text = 'Inicializador do ambiente'
$title.Font = [System.Drawing.Font]::new('Segoe UI Semibold', 18, [System.Drawing.FontStyle]::Bold)
$title.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#F4F7FF')
$title.TextAlign = 'MiddleCenter'
$title.SetBounds(160, 112, 580, 34)
$form.Controls.Add($title)

$subtitle = [System.Windows.Forms.Label]::new()
$subtitle.Text = 'Preparando seu espaço de desenvolvimento'
$subtitle.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#8EA0BD')
$subtitle.TextAlign = 'MiddleCenter'
$subtitle.SetBounds(160, 148, 580, 24)
$form.Controls.Add($subtitle)

$script:operationLabel = [System.Windows.Forms.Label]::new()
$script:operationLabel.Text = 'Aguardando para iniciar'
$script:operationLabel.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#AEBBD0')
$script:operationLabel.SetBounds(48, 188, 804, 22)
$form.Controls.Add($script:operationLabel)

$script:progress = [System.Windows.Forms.ProgressBar]::new()
$script:progress.SetBounds(48, 214, 804, 5)
$script:progress.Style = [System.Windows.Forms.ProgressBarStyle]::Continuous
$script:progress.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#5894FF')
$script:progress.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#202A3D')
$form.Controls.Add($script:progress)

$script:serviceCards = @{}
$serviceY = 236
foreach ($id in $script:serviceOrder) {
  $service = $script:services[$id]
  $card = [System.Windows.Forms.Panel]::new()
  $card.SetBounds(48, $serviceY, 804, 92)
  $card.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#121A2B')
  $card.Anchor = 'Top, Left, Right'
  $form.Controls.Add($card)

  $dot = [System.Windows.Forms.Panel]::new()
  $dot.SetBounds(20, 33, 12, 12)
  $dot.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#5B6578')
  $card.Controls.Add($dot)

  $name = [System.Windows.Forms.Label]::new()
  $name.Text = $service.Name
  $name.Font = [System.Drawing.Font]::new('Segoe UI Semibold', 10, [System.Drawing.FontStyle]::Bold)
  $name.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#E8EDF7')
  $name.SetBounds(46, 16, 260, 22)
  $card.Controls.Add($name)

  $detail = [System.Windows.Forms.Label]::new()
  $detail.Text = $service.Detail
  $detail.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#8290A7')
  $detail.SetBounds(46, 42, 260, 20)
  $card.Controls.Add($detail)

  $status = [System.Windows.Forms.Label]::new()
  $status.Text = 'Parado'
  $status.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#8995A9')
  $status.TextAlign = 'MiddleRight'
  $status.SetBounds(310, 32, 132, 24)
  $status.Anchor = 'Top, Right'
  $card.Controls.Add($status)

  $startButton = [System.Windows.Forms.Button]::new()
  $startButton.Text = 'Iniciar'
  $startButton.SetBounds(456, 27, 96, 36)
  $startButton.Anchor = 'Top, Right'
  $card.Controls.Add($startButton)
  $startButton.Add_Click({ Start-OneService -Id $id }.GetNewClosure())

  $restartButton = [System.Windows.Forms.Button]::new()
  $restartButton.Text = 'Reiniciar'
  $restartButton.SetBounds(560, 27, 104, 36)
  $restartButton.Anchor = 'Top, Right'
  $card.Controls.Add($restartButton)
  $restartButton.Add_Click({ Restart-OneService -Id $id }.GetNewClosure())

  $stopButton = [System.Windows.Forms.Button]::new()
  $stopButton.Text = 'Parar'
  $stopButton.SetBounds(672, 27, 96, 36)
  $stopButton.Anchor = 'Top, Right'
  $card.Controls.Add($stopButton)
  $stopButton.Add_Click({
    switch ($id) {
      'database' { Stop-Services -Ids @('tauri', 'api', 'database') -Label 'Ambiente parado' }
      'api' { Stop-Services -Ids @('tauri', 'api') -Label 'Servidor parado' }
      'tauri' { Stop-Services -Ids @('tauri') -Label 'Aplicativo parado' }
    }
  }.GetNewClosure())

  foreach ($button in @($startButton, $restartButton, $stopButton)) {
    $button.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $button.FlatAppearance.BorderColor = [System.Drawing.ColorTranslator]::FromHtml('#34425B')
    $button.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#1B263A')
    $button.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#E8EDF7')
    $button.Cursor = [System.Windows.Forms.Cursors]::Hand
  }

  $script:serviceCards[$id] = @{
    Dot = $dot
    Status = $status
  }
  $serviceY += 102
}

$script:logBox = [System.Windows.Forms.RichTextBox]::new()
$script:logBox.SetBounds(48, 556, 804, 92)
$script:logBox.Anchor = 'Top, Left, Right'
$script:logBox.ReadOnly = $true
$script:logBox.BorderStyle = [System.Windows.Forms.BorderStyle]::None
$script:logBox.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#080D18')
$script:logBox.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#AEBBD0')
$script:logBox.Font = [System.Drawing.Font]::new('Consolas', 9)
$script:logBox.DetectUrls = $false
$form.Controls.Add($script:logBox)

$startAll = [System.Windows.Forms.Button]::new()
$startAll.Text = 'Iniciar ambiente'
$startAll.SetBounds(48, 666, 190, 42)
$form.Controls.Add($startAll)
$startAll.Add_Click({
  Start-Sequence -Ids @('database', 'api', 'tauri') -Label 'Iniciando ambiente NT-life'
})

$restartAll = [System.Windows.Forms.Button]::new()
$restartAll.Text = 'Reiniciar tudo'
$restartAll.SetBounds(250, 666, 160, 42)
$form.Controls.Add($restartAll)
$restartAll.Add_Click({
  Stop-Services -Ids @('tauri', 'api', 'database') -Label 'Reiniciando ambiente'
  Start-Sequence -Ids @('database', 'api', 'tauri') -Label 'Reiniciando ambiente NT-life'
})

$stopAll = [System.Windows.Forms.Button]::new()
$stopAll.Text = 'Parar tudo'
$stopAll.SetBounds(662, 666, 190, 42)
$form.Controls.Add($stopAll)
$stopAll.Add_Click({
  Stop-Services -Ids @('tauri', 'api', 'database') -Label 'Ambiente parado'
})

foreach ($button in @($startAll, $restartAll, $stopAll)) {
  $button.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $button.FlatAppearance.BorderColor = [System.Drawing.ColorTranslator]::FromHtml('#34425B')
  $button.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#1B263A')
  $button.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#E8EDF7')
  $button.Cursor = [System.Windows.Forms.Cursors]::Hand
}
$startAll.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#2459A6')
$startAll.FlatAppearance.BorderColor = [System.Drawing.ColorTranslator]::FromHtml('#3976CE')

$script:timer = [System.Windows.Forms.Timer]::new()
$script:timer.Interval = 700
$script:timer.Add_Tick({ Advance-Sequence })

$form.Add_FormClosing({
  param($sender, $eventArgs)
  $hasManagedServices = $false
  foreach ($id in @('tauri', 'api', 'database')) {
    $process = $script:services[$id].Process
    if ($null -ne $process -and -not $process.HasExited) {
      $hasManagedServices = $true
      break
    }
  }

  if ($hasManagedServices) {
    $choice = [System.Windows.Forms.MessageBox]::Show(
      'Deseja parar os serviços iniciados por este launcher antes de fechar?',
      'NT-life',
      [System.Windows.Forms.MessageBoxButtons]::YesNoCancel,
      [System.Windows.Forms.MessageBoxIcon]::Question
    )
    if ($choice -eq [System.Windows.Forms.DialogResult]::Cancel) {
      $eventArgs.Cancel = $true
      return
    }
    if ($choice -eq [System.Windows.Forms.DialogResult]::Yes) {
      Stop-Services -Ids @('tauri', 'api', 'database') -Label 'Ambiente parado'
    }
  }

  $script:timer.Stop()
})

Add-LauncherLog 'Launcher pronto. O banco, a API e o aplicativo iniciam em sequência.'
[void]$form.ShowDialog()