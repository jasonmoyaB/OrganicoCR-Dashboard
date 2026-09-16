# Genera los iconos del PWA desde el logo de la tienda.
#
#   powershell -ExecutionPolicy Bypass -File scripts/generar-iconos.ps1
#
# Los PNG resultantes se commitean: el logo cambia una vez cada nunca y el
# build no tiene por que depender de System.Drawing, que solo existe en Windows.
#
# La escala del icono maskable no es estetica. Android recorta un circulo de
# 80% del lado, asi que el logo entero tiene que caber ahi: con 816x628 la
# diagonal mide 1030 px, y para que quepa en un circulo de 0.8 el ancho no
# puede pasar de 816 * 0.8 / 1030 = 0.63 del lado. Mas grande y Android le
# come las esquinas al logo en cualquier telefono con iconos redondos.

Add-Type -AssemblyName System.Drawing

$raiz    = Split-Path -Parent $PSScriptRoot
$origen  = Join-Path $raiz "public\Logo\IMG_3180.JPG.jpeg"
$destino = Join-Path $raiz "public\icons"

if (-not (Test-Path $destino)) { New-Item -ItemType Directory -Path $destino | Out-Null }

$logo = [System.Drawing.Image]::FromFile($origen)

function Guardar-Icono([int]$lado, [double]$escala, [string]$nombre) {
  $lienzo = New-Object System.Drawing.Bitmap($lado, $lado)
  $g = [System.Drawing.Graphics]::FromImage($lienzo)
  $g.InterpolationMode = "HighQualityBicubic"
  $g.SmoothingMode     = "AntiAlias"
  $g.PixelOffsetMode   = "HighQuality"

  # Fondo blanco opaco: el logo no tiene canal alfa y un icono translucido se
  # ve sucio sobre cualquier fondo de pantalla.
  $g.Clear([System.Drawing.Color]::White)

  $ancho = [int]($lado * $escala)
  $alto  = [int]($ancho * $logo.Height / $logo.Width)
  $g.DrawImage($logo, [int](($lado - $ancho) / 2), [int](($lado - $alto) / 2), $ancho, $alto)

  $ruta = Join-Path $destino $nombre
  $lienzo.Save($ruta, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $lienzo.Dispose()
  Write-Output "  $nombre ($lado x $lado)"
}

Guardar-Icono 192 0.88 "icono-192.png"
Guardar-Icono 512 0.88 "icono-512.png"
Guardar-Icono 512 0.63 "icono-maskable-512.png"
Guardar-Icono 180 0.86 "apple-touch-icon.png"

$logo.Dispose()
Write-Output "Iconos generados en public/icons"
