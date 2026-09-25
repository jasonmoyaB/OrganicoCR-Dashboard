# Genera los iconos del PWA desde el logo de la tienda.
#
#   powershell -ExecutionPolicy Bypass -File scripts/generar-iconos.ps1
#
# Los PNG resultantes se commitean: el logo cambia una vez cada nunca y el
# build no tiene por que depender de System.Drawing, que solo existe en Windows.
#
# La escala del icono maskable no es estetica. Android recorta un circulo de
# 80% del lado. El logo es un cuadrado negro con el dibujo entre el 21% y el
# 82% de cada lado: a escala 0.8 la esquina mas lejana del dibujo queda a 0.34
# del centro, dentro del radio de 0.4. A escala 1 el recorte le come el texto.

Add-Type -AssemblyName System.Drawing

$raiz    = Split-Path -Parent $PSScriptRoot
$origen  = Join-Path $raiz "public\Logo\logoagroambientales.jpeg"
$destino = Join-Path $raiz "public\icons"

if (-not (Test-Path $destino)) { New-Item -ItemType Directory -Path $destino | Out-Null }

$logo = [System.Drawing.Image]::FromFile($origen)

function Guardar-Icono([int]$lado, [double]$escala, [string]$nombre) {
  $lienzo = New-Object System.Drawing.Bitmap($lado, $lado)
  $g = [System.Drawing.Graphics]::FromImage($lienzo)
  $g.InterpolationMode = "HighQualityBicubic"
  $g.SmoothingMode     = "AntiAlias"
  $g.PixelOffsetMode   = "HighQuality"

  # Fondo negro opaco, el mismo del logo: el borde que sobra no se nota.
  $g.Clear([System.Drawing.Color]::Black)

  $ancho = [int]($lado * $escala)
  $alto  = [int]($ancho * $logo.Height / $logo.Width)
  $g.DrawImage($logo, [int](($lado - $ancho) / 2), [int](($lado - $alto) / 2), $ancho, $alto)

  $ruta = Join-Path $destino $nombre
  $lienzo.Save($ruta, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $lienzo.Dispose()
  Write-Output "  $nombre ($lado x $lado)"
}

Guardar-Icono 192 1 "icono-192.png"
Guardar-Icono 512 1 "icono-512.png"
Guardar-Icono 512 0.8 "icono-maskable-512.png"
Guardar-Icono 180 1 "apple-touch-icon.png"

$logo.Dispose()
Write-Output "Iconos generados en public/icons"
