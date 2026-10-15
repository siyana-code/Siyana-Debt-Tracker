<#
.SYNOPSIS
    Renders every Siyana Debt Tracker brand asset.

.DESCRIPTION
    Draws the icon, adaptive icon, monochrome icon, splash, favicon and brand
    sheet using System.Drawing, so brand assets can be regenerated on any
    Windows machine with no npm dependencies and no network access.

    The editable design source lives in assets/source/*.svg — those are the
    canonical files. This script renders the raster exports that Expo and the
    app stores consume.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\generate-icons.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Resolve enum members once at script scope; PowerShell cannot reliably look
# up Drawing2D enums from inside a function body.
$script:UnitPixel = [System.Drawing.GraphicsUnit]::Pixel
$script:LineCapRound = [System.Drawing.Drawing2D.LineCap]::Round

Set-Location (Join-Path $PSScriptRoot '..')
$Root       = Get-Location
$Assets     = Join-Path $Root 'assets'
$Sources    = Join-Path $Assets 'source'
$DocsAssets = Join-Path $Root 'docs\assets'

foreach ($dir in @($Assets, $Sources, $DocsAssets)) {
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

# ---------------------------------------------------------------- palette ---
# Siyana Code standard web UI palette — see docs/06-design-system.md
$Bleu       = [System.Drawing.ColorTranslator]::FromHtml('#3484F0')
$BleuDeep   = [System.Drawing.ColorTranslator]::FromHtml('#2A6FD1')
$Tropical   = [System.Drawing.ColorTranslator]::FromHtml('#C4DBFA')
$White      = [System.Drawing.ColorTranslator]::FromHtml('#F7F7F7')
$MatteGray  = [System.Drawing.ColorTranslator]::FromHtml('#757575')
$PureWhite  = [System.Drawing.Color]::White
$Transparent = [System.Drawing.Color]::Transparent

function New-Canvas {
  param([int]$Width, [int]$Height)
  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear($Transparent)
  return @($bitmap, $g)
}

function Save-Canvas {
  param($Bitmap, $Graphics, [string]$Path)
  $Graphics.Dispose()
  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $Bitmap.Dispose()
  $size = (Get-Item $Path).Length
  Write-Host ("  {0,-28} {1,7:N0} bytes" -f (Split-Path $Path -Leaf), $size)
}

# ------------------------------------------------------------------- mark ---
# A coin ring holding two opposing arrows: money out (up-right) and money in
# (down-left). Direction is carried by arrow shape, never by colour.

function Get-ArrowPath {
  param([ValidateSet('up','down')][string]$Direction)
  # Drawn pointing "up" (toward y=0) or "down" (toward y=1024) in a local
  # 1024 canvas, then rotated 45 degrees into place by Draw-Mark.
  # The geometric centre of each arrow is kept at y = 512 so that placement
  # is a simple translate.
  if ($Direction -eq 'up') {
    $tip = 512 - 78; $headBase = 512 - 34; $shaftEnd = 512 + 78
  } else {
    $tip = 512 + 78; $headBase = 512 + 34; $shaftEnd = 512 - 78
  }
  $halfShaft = 10
  $halfHead  = 44

  # Precomputed so PowerShell never has to mix a subtraction with the comma
  # operator inside a constructor call.
  $xShaftL = 512.0 - $halfShaft
  $xShaftR = 512.0 + $halfShaft
  $xHeadL  = 512.0 - $halfHead
  $xHeadR  = 512.0 + $halfHead

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddPolygon([System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point $xShaftL, $shaftEnd),
    (New-Object System.Drawing.Point $xShaftL, $headBase),
    (New-Object System.Drawing.Point $xHeadL,  $headBase),
    (New-Object System.Drawing.Point 512.0,    $tip),
    (New-Object System.Drawing.Point $xHeadR,  $headBase),
    (New-Object System.Drawing.Point $xShaftR, $headBase),
    (New-Object System.Drawing.Point $xShaftR, $shaftEnd)
  ))
  $path.CloseFigure()
  return $path
}

function Draw-Mark {
  param(
    $Graphics,
    [System.Drawing.Color]$Color,
    [double]$RingRadius = 268,
    [double]$RingWidth = 56,
    [double]$ArrowScale = 1.0
  )

  $pen = New-Object System.Drawing.Pen $Color, $RingWidth
  $pen.StartCap = $script:LineCapRound
  $pen.EndCap   = $script:LineCapRound
  $Graphics.DrawEllipse($pen, 512 - $RingRadius, 512 - $RingRadius, $RingRadius * 2, $RingRadius * 2)
  $pen.Dispose()

  $brush = New-Object System.Drawing.SolidBrush $Color

  # Two arrows on the anti-diagonal, pointing away from each other through the
  # centre: "lent" leaves toward the upper right, "borrowed" enters from it.
  $upArrow   = Get-ArrowPath -Direction 'up'
  $downArrow = Get-ArrowPath -Direction 'down'

  $placements = @(
    @{ Path = $upArrow;   CX = 418.0; CY = 606.0 },
    @{ Path = $downArrow; CX = 606.0; CY = 418.0 }
  )

  foreach ($place in $placements) {
    $shape = $place['Path']
    $cx    = [double]$place['CX']
    $cy    = [double]$place['CY']

    $state = $Graphics.Save()
    # Move the arrow's local centre to its slot on the anti-diagonal...
    $Graphics.TranslateTransform(($cx - 512), ($cy - 512))
    # ...then swing it 45 degrees clockwise about the canvas centre, so "up"
    # reads as up-right and "down" reads as down-left.
    $Graphics.TranslateTransform(512, 512)
    $Graphics.RotateTransform(45)
    $Graphics.TranslateTransform(-512, -512)
    # Finally scale about the arrow's OWN centre -- scaling about the canvas
    # origin would drag the glyph across the image.
    $Graphics.TranslateTransform(512, 512)
    $Graphics.ScaleTransform($ArrowScale, $ArrowScale)
    $Graphics.TranslateTransform(-512, -512)
    $Graphics.FillPath($brush, $shape)
    $Graphics.Restore($state)
  }

  $upArrow.Dispose()
  $downArrow.Dispose()
  $brush.Dispose()
}

function Use-Font {
  param([string]$Family, [System.Drawing.FontStyle]$Style, [float]$Size)
  $unit = $script:UnitPixel
  try   { return New-Object System.Drawing.Font $Family, $Size, $Style, $unit }
  catch { return New-Object System.Drawing.Font 'Arial', $Size, $Style, $unit }
}

# ------------------------------------------------------------------ icon ---
function New-AppIcon {
  $canvas = New-Canvas 1024 1024
  $bitmap, $g = $canvas

  # Diagonal gradient from Bleu de France to the deeper shade.
  $rect = New-Object System.Drawing.Rectangle 0, 0, 1024, 1024
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush `
    $rect, $Bleu, $BleuDeep, 45.0
  $g.FillRectangle($brush, $rect)
  $brush.Dispose()

  Draw-Mark -Graphics $g -Color $PureWhite -RingRadius 268 -RingWidth 56
  Save-Canvas $bitmap $g (Join-Path $Assets 'icon.png')
}

function New-AdaptiveIcon {
  $canvas = New-Canvas 1024 1024
  $bitmap, $g = $canvas
  # Android masks this to a circle/squircle; keep the mark inside the safe zone.
  Draw-Mark -Graphics $g -Color $PureWhite -RingRadius 212 -RingWidth 46 -ArrowScale 0.78
  Save-Canvas $bitmap $g (Join-Path $Assets 'adaptive-icon.png')
}

function New-MonochromeIcon {
  $canvas = New-Canvas 1024 1024
  $bitmap, $g = $canvas
  Draw-Mark -Graphics $g -Color ([System.Drawing.Color]::Black) -RingRadius 212 -RingWidth 46 -ArrowScale 0.78
  Save-Canvas $bitmap $g (Join-Path $Assets 'monochrome-icon.png')
}

function New-SplashIcon {
  $canvas = New-Canvas 1024 1024
  $bitmap, $g = $canvas
  $g.Clear($White)

  $state = $g.Save()
  $g.TranslateTransform(0, -10)
  $g.ScaleTransform(0.80, 0.80)
  Draw-Mark -Graphics $g -Color $Bleu -RingRadius 268 -RingWidth 54 -ArrowScale 0.95
  $g.Restore($state)

  $title = Use-Font 'Segoe UI' ([System.Drawing.FontStyle]::Bold) 64
  $brush = New-Object System.Drawing.SolidBrush $Bleu
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString('Siyana Debt Tracker', $title, $brush, (New-Object System.Drawing.RectangleF 0, 660, 1024, 80), $fmt)

  $sub = Use-Font 'Segoe UI' ([System.Drawing.FontStyle]::Bold) 26
  $brush2 = New-Object System.Drawing.SolidBrush $MatteGray
  $fmt2 = New-Object System.Drawing.StringFormat
  $fmt2.Alignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString('S I Y A N A   C O D E', $sub, $brush2, (New-Object System.Drawing.RectangleF 0, 748, 1024, 50), $fmt2)

  $fmt.Dispose(); $fmt2.Dispose(); $brush.Dispose(); $brush2.Dispose()
  $title.Dispose(); $sub.Dispose()

  Save-Canvas $bitmap $g (Join-Path $Assets 'splash-icon.png')
}

function New-Favicon {
  $canvas = New-Canvas 256 256
  $bitmap, $g = $canvas

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $r = 56
  $path.AddArc(0, 0, $r, $r, 180, 90)
  $path.AddArc(256 - $r, 0, $r, $r, 270, 90)
  $path.AddArc(256 - $r, 256 - $r, $r, $r, 0, 90)
  $path.AddArc(0, 256 - $r, $r, $r, 90, 90)
  $path.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush $Bleu), $path)
  $path.Dispose()

  $state = $g.Save()
  $g.ScaleTransform(0.25, 0.25)
  Draw-Mark -Graphics $g -Color $PureWhite -RingRadius 272 -RingWidth 60 -ArrowScale 0.92
  $g.Restore($state)

  Save-Canvas $bitmap $g (Join-Path $Assets 'favicon.png')
}

function New-BrandSheet {
  $canvas = New-Canvas 1200 700
  $bitmap, $g = $canvas
  $g.Clear($White)

  $swatches = @(
    @{ X = 60;  Fill = $Bleu;     Mark = $PureWhite; Alpha = 255 },
    @{ X = 400; Fill = $Tropical; Mark = $Bleu;     Alpha = 255 },
    @{ X = 740; Fill = $Bleu;     Mark = $Bleu;     Alpha = 20 }
  )

  foreach ($s in $swatches) {
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($s.Alpha, $s.Fill.R, $s.Fill.G, $s.Fill.B))
    $r = New-Object System.Drawing.Rectangle $s.X, 130, 300, 300
    $g.FillEllipse($brush, $r)
    $brush.Dispose()

    $state = $g.Save()
    $g.TranslateTransform($s.X, 130)
    $g.ScaleTransform(0.293, 0.293)
    Draw-Mark -Graphics $g -Color $s.Mark -RingRadius 268 -RingWidth 60
    $g.Restore($state)
  }

  $title = Use-Font 'Segoe UI' ([System.Drawing.FontStyle]::Bold) 52
  $brushT = New-Object System.Drawing.SolidBrush $Bleu
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Near
  $g.DrawString('Siyana Debt Tracker', $title, $brushT, (New-Object System.Drawing.PointF 60, 490), $fmt)

  $body = Use-Font 'Segoe UI' ([System.Drawing.FontStyle]::Regular) 25
  $brushB = New-Object System.Drawing.SolidBrush $MatteGray
  $lines = @(
    'Bleu de France  #3484F0',
    'Light Tropical Blue  #C4DBFA',
    'Beautiful White  #F7F7F7    Solid Matte Gray  #757575'
  )
  $y = 552
  foreach ($line in $lines) {
    $g.DrawString($line, $body, $brushB, (New-Object System.Drawing.PointF 60, $y), $fmt)
    $y += 38
  }

  $fmt.Dispose(); $brushT.Dispose(); $brushB.Dispose(); $title.Dispose(); $body.Dispose()
  Save-Canvas $bitmap $g (Join-Path $Assets 'brand-sheet.png')
}

function New-SocialPreview {
  $src = [System.Drawing.Image]::FromFile((Join-Path $Assets 'brand-sheet.png'))
  $canvas = New-Canvas 1280 640
  $bitmap, $g = $canvas

  $bg = New-Object System.Drawing.SolidBrush $White
  $g.FillRectangle($bg, 0, 0, 1280, 640)
  $bg.Dispose()

  # Crop the 1200x700 sheet to a 2:1 band, then centre it.
  $scale = [Math]::Max(1280 / 1200.0, 640 / 700.0)
  $w = [int](1200 * $scale); $h = [int](700 * $scale)
  $x = [int]((1280 - $w) / 2); $y = [int]((640 - $h) / 2)
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle $x, $y, $w, $h))
  $src.Dispose()

  Save-Canvas $bitmap $g (Join-Path $DocsAssets 'social-preview.png')
}

# ------------------------------------------------------------------ main ---
Write-Host ''
Write-Host 'Rendering Siyana Debt Tracker brand assets...'
Write-Host ''

New-AppIcon
New-AdaptiveIcon
New-MonochromeIcon
New-SplashIcon
New-Favicon
New-BrandSheet
New-SocialPreview

Write-Host ''
Write-Host 'Done. Editable SVG sources live in assets/source/.'
Write-Host ''