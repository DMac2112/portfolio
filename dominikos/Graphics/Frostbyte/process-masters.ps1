# process-masters.ps1 — downscale the painted room masters into Frostbyte's game assets.
#
#   run:  powershell -ExecutionPolicy Bypass -File process-masters.ps1
#
# Reads every masters/room-*.png (2528x1696, ~3:2) and writes ./frostbyte/assets/room-*.png at the
# exact 480x320 the game loads (KAPLAY scales x3 to the 1440x960 world). The masters keep all their
# framing: the tiny 0.6% aspect difference is absorbed as an invisible vertical squash rather than a
# crop, so every door/landmark stays at the same fractional position the prompts were built around.
#
# These 12 room files are owned by the painted pipeline now — gen-assets.js no longer regenerates
# them (their build functions remain as a code-drawn fallback + door-layout reference). Sprites,
# furniture, cosmetics and portraits stay code-drawn in gen-assets.js.
Add-Type -AssemblyName System.Drawing
$here    = Split-Path -Parent $MyInvocation.MyCommand.Path
$masters = Join-Path $here 'masters'
$assets  = Resolve-Path (Join-Path $here '..\..\frostbyte\assets')
$TW = 480; $TH = 320

# The plaza's master carries the style-reference name; it maps to room-plaza.png in the game.
$jobs = @{}
$plaza = Join-Path $masters 'plaza-master.png'
if (Test-Path $plaza) { $jobs[$plaza] = 'room-plaza.png' }
foreach ($f in Get-ChildItem (Join-Path $masters 'room-*.png')) { $jobs[$f.FullName] = $f.Name }
if ($jobs.Count -eq 0) { Write-Error "No masters found in $masters"; exit 1 }

foreach ($src in $jobs.Keys) {
  $f = [pscustomobject]@{ FullName = $src; Name = $jobs[$src] }
  $img = [System.Drawing.Image]::FromFile($f.FullName)
  $bmp = New-Object System.Drawing.Bitmap $TW, $TH
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($img, 0, 0, $TW, $TH)
  $out = Join-Path $assets $f.Name
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
  Write-Host ("  {0,-28} {1}x{2}  ->  assets/{0}" -f $f.Name, $TW, $TH)
}
Write-Host ("Processed {0} room masters -> {1}" -f $jobs.Count, $assets)
